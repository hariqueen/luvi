/**
 * 자동저장 패치를 Firestore 부분 업데이트로 바꿉니다.
 *
 * 에디터는 바뀐 필드만 `{ 'core.greeting.message': '...' }` 형태로 보냅니다.
 * 이걸 `draft.core.greeting.message` 필드 경로와 중첩 본문으로 변환합니다.
 *
 * ─── 왜 검증이 필요한가 ─────────────────────────────────────
 *
 * 경로는 **클라이언트가 주는 값**이라 그대로 쓰면 안 됩니다.
 *  - `ownerUid` 같은 경로가 들어오면 소유권을 남이 바꿀 수 있습니다 → 최상위를 core·theme 로 제한
 *  - 점이 든 키는 Firestore 필드 경로를 깨뜨립니다 → 세그먼트 형식을 제한
 *  - `core.gallery.0` 같은 배열 인덱스는 **Firestore 가 지원하지 않습니다** → 배열은 통째로 보내야 함
 *  - `core.cover` 와 `core.cover.layers` 를 함께 보내면 updateMask 가 거부됩니다 → 접두어 충돌 검사
 */
import type { FsFields, FsValue } from './firestore';
import { encode } from './firestore';

/** Firestore 문서 상한은 1 MiB 입니다. 여유를 두고 자릅니다. */
const MAX_PATCH_BYTES = 700_000;
const MAX_PATHS = 60;
const MAX_DEPTH = 10;

const SEGMENT = /^[A-Za-z_][A-Za-z0-9_]*$/;
const ALLOWED_ROOTS = new Set(['core', 'theme']);

export class PatchError extends Error {
  constructor(
    message: string,
    public readonly path?: string,
  ) {
    super(message);
  }
}

export interface PreparedPatch {
  /** PATCH 본문의 `fields` */
  fields: FsFields;
  /** `updateMask.fieldPaths` */
  updateMask: string[];
}

function validatePath(path: string): string[] {
  const segments = path.split('.');

  if (segments.length === 0 || segments.length > MAX_DEPTH) {
    throw new PatchError('편집할 수 없는 항목입니다', path);
  }
  if (!ALLOWED_ROOTS.has(segments[0] ?? '')) {
    // 여기서 막지 않으면 ownerUid·slug 같은 문서 필드를 클라이언트가 덮어쓸 수 있습니다
    throw new PatchError('편집할 수 없는 항목입니다', path);
  }
  for (const segment of segments) {
    if (!SEGMENT.test(segment)) {
      // 숫자 세그먼트(배열 인덱스)도 여기서 걸립니다 — 배열은 통째로 보내야 합니다
      throw new PatchError('편집할 수 없는 항목입니다', path);
    }
  }
  return segments;
}

/** `a.b` 와 `a.b.c` 가 함께 오면 Firestore 가 updateMask 를 거부합니다 */
function assertNoPrefixConflict(paths: string[]): void {
  const sorted = [...paths].sort();
  for (let i = 1; i < sorted.length; i += 1) {
    const prev = sorted[i - 1] ?? '';
    const cur = sorted[i] ?? '';
    if (cur.startsWith(`${prev}.`)) {
      throw new PatchError(`상위 항목과 하위 항목을 함께 저장할 수 없습니다 (${prev})`, cur);
    }
  }
}

function setNested(root: FsFields, segments: string[], value: unknown): void {
  let fields = root;

  for (let i = 0; i < segments.length - 1; i += 1) {
    const segment = segments[i] as string;
    const existing = fields[segment];

    if (existing && 'mapValue' in existing) {
      existing.mapValue.fields ??= {};
      fields = existing.mapValue.fields;
    } else {
      const next: FsValue = { mapValue: { fields: {} } };
      fields[segment] = next;
      fields = (next as { mapValue: { fields: FsFields } }).mapValue.fields;
    }
  }

  fields[segments[segments.length - 1] as string] = encode(value);
}

/**
 * 에디터 패치 → Firestore PATCH 입력.
 * `features`·`sections` 는 ContentDoc 밖의 문서 필드라 따로 받습니다.
 */
export function prepareDraftPatch(input: {
  patch?: Record<string, unknown>;
  features?: Record<string, unknown>;
  sections?: unknown;
  /** 갱신 시각 (문서의 updatedAt) */
  updatedAt: FsValue;
}): PreparedPatch {
  const patch = input.patch ?? {};
  const paths = Object.keys(patch);

  if (paths.length > MAX_PATHS) {
    throw new PatchError(`한 번에 ${MAX_PATHS}개 항목까지만 저장할 수 있습니다`);
  }

  const serialized = JSON.stringify(patch);
  if (serialized.length > MAX_PATCH_BYTES) {
    throw new PatchError('저장할 내용이 너무 큽니다. 사진은 업로드로 올려주세요');
  }

  assertNoPrefixConflict(paths);

  const fields: FsFields = {};
  const updateMask: string[] = ['updatedAt'];
  fields.updatedAt = input.updatedAt;

  // 초안만 건드립니다 — published 는 발행할 때만 바뀝니다.
  // (하객에게 이미 공유된 청첩장이라 편집 중 화면이 흔들려선 안 됩니다)
  const draftFields: FsFields = {};

  for (const path of paths) {
    const segments = validatePath(path);
    setNested(draftFields, segments, patch[path]);
    updateMask.push(['draft', ...segments].join('.'));
  }

  if (Object.keys(draftFields).length > 0) {
    fields.draft = { mapValue: { fields: draftFields } };
  }

  if (input.features && Object.keys(input.features).length > 0) {
    for (const [key, value] of Object.entries(input.features)) {
      if (!SEGMENT.test(key)) throw new PatchError('알 수 없는 연출 설정입니다', key);
      if (typeof value !== 'boolean') throw new PatchError('연출 설정은 on/off 값이어야 합니다', key);
      setNested(fields, ['features', key], value);
      updateMask.push(`features.${key}`);
    }
  }

  if (input.sections !== undefined) {
    if (!Array.isArray(input.sections) || input.sections.some((s) => typeof s !== 'string')) {
      throw new PatchError('섹션 구성이 올바르지 않습니다', 'sections');
    }
    fields.sections = encode(input.sections);
    updateMask.push('sections');
  }

  return { fields, updateMask };
}
