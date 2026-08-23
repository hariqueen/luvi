/**
 * 초안 ↔ 발행본 비교. 발행 화면의 "변경사항 요약" 과 발행 차단 검사에 씁니다.
 *
 * 라벨은 테마 매니페스트에서 가져옵니다 — 여기에 문구를 또 적으면 매니페스트를 고칠 때
 * 한쪽만 바뀝니다. 매니페스트에 없는 경로가 바뀐 경우는 "그 외 변경" 으로 정직하게 보고합니다
 * (조용히 빠뜨리면 사용자가 발행 후에야 알게 됩니다).
 */
import type { ContentDoc, DraftDiff, SectionKey } from '@luvi/schema';
import { CORE_SECTIONS, type FieldDef, type SectionDef } from '@luvi/schema';

/** 매니페스트 섹션 키 중 사용자가 뺄 수 있는 것 — 빠진 섹션의 필수 검사는 건너뜁니다 */
const REMOVABLE: Record<string, SectionKey> = {
  cover: 'cover',
  greeting: 'greeting',
  gallery: 'gallery',
  minigame: 'minigame',
  location: 'location',
  account: 'account',
  guestbook: 'guestbook',
};

function readPath(doc: unknown, path: string): unknown {
  let cursor: unknown = doc;
  for (const segment of path.split('.')) {
    if (cursor === null || typeof cursor !== 'object') return undefined;
    cursor = (cursor as Record<string, unknown>)[segment];
  }
  return cursor;
}

function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

/** 매니페스트의 (경로 → 라벨). repeat 하위 필드는 부모 경로 하나로 묶습니다 */
function labelIndex(): Map<string, string> {
  const index = new Map<string, string>();
  const walk = (section: SectionDef, field: FieldDef) => {
    index.set(field.path, `${section.label} · ${field.label}`);
  };
  for (const section of CORE_SECTIONS) {
    for (const field of section.fields) walk(section, field);
  }
  return index;
}

const LABELS = labelIndex();

/** 매니페스트에 없지만 사용자에게 보여줄 이름이 있는 경로 */
const EXTRA_LABELS: Record<string, string> = {
  'core.cover.image': '커버 · 대표 사진',
  'core.cover.layers': '커버 · 사진 위 문구',
  'core.gallery': '갤러리 · 사진',
  'theme.classic1.game': '미니게임 설정',
  // 섹션별 배경색. 섹션마다 한 줄씩 늘어놓지 않습니다 — 색만 바꿨는데 발행 요약이
  // 아홉 줄로 뜨면 정작 무엇이 바뀌었는지 안 보입니다
  'core.design.sectionBg': '꾸미기 · 섹션 배경색',
  // 카드 문구도 같은 이유로 한 줄입니다 (섹션×칸 만큼 늘어놓으면 요약이 요약이 아닙니다)
  'core.sectionText': '카드 문구',
};

export interface DiffInput {
  draft: ContentDoc;
  published: ContentDoc | null;
  sections: SectionKey[];
  /** 발행 대상 슬러그 (필수 항목 검사에 필요 — ContentDoc 밖의 값입니다) */
  slug: string;
}

/**
 * 변경 목록과 누락된 필수 항목을 계산합니다.
 * `missing` 이 하나라도 있으면 발행을 막습니다 — 하객이 빈칸을 보게 되는 것보다 낫습니다.
 */
export function computeDiff(input: DiffInput): DraftDiff {
  const { draft, published, sections, slug } = input;

  const changes: { path: string; label: string }[] = [];
  const missing: { path: string; label: string }[] = [];

  const compare = (path: string, label: string) => {
    if (!published) return;
    const before = readPath(published, path);
    const after = readPath(draft, path);
    // 객체·배열도 있으므로 JSON 직렬화로 비교합니다 (키 순서는 우리 코드가 만들어 안정적입니다)
    if (JSON.stringify(before ?? null) !== JSON.stringify(after ?? null)) {
      changes.push({ path, label });
    }
  };

  const known = new Set<string>();

  for (const section of CORE_SECTIONS) {
    const sectionKey = REMOVABLE[section.key];
    // 청첩장에서 뺀 섹션은 검사·비교 대상이 아닙니다
    if (sectionKey && !sections.includes(sectionKey)) continue;

    for (const field of section.fields) {
      // 슬러그는 ContentDoc 이 아니라 문서 필드입니다
      if (field.path === 'slug') {
        if (field.required && isEmpty(slug)) {
          missing.push({ path: 'slug', label: `${section.label} · ${field.label}` });
        }
        continue;
      }

      known.add(field.path);
      compare(field.path, LABELS.get(field.path) ?? field.label);

      if (field.required && isEmpty(readPath(draft, field.path))) {
        missing.push({ path: field.path, label: LABELS.get(field.path) ?? field.label });
      }
    }
  }

  for (const [path, label] of Object.entries(EXTRA_LABELS)) {
    if (known.has(path)) continue;
    known.add(path);
    compare(path, label);
  }

  // 커버는 캔버스 편집이라 매니페스트에 필드가 없습니다. 사진 없이는 편집 자체가 불가능하므로 필수입니다
  if (sections.includes('cover') && isEmpty(readPath(draft, 'core.cover.image'))) {
    missing.push({ path: 'core.cover.image', label: '커버 · 대표 사진' });
  }

  // 위에서 훑지 않은 경로가 바뀐 경우까지 잡습니다 — "변경 없음" 이라고 잘못 말하지 않기 위해
  if (published && changes.length === 0 && JSON.stringify(draft) !== JSON.stringify(published)) {
    changes.push({ path: '', label: '그 외 변경' });
  }

  return { changes, missing };
}

/** 대시보드 배지용 — 변경 건수만 필요합니다 */
export function countChanges(input: DiffInput): number {
  return computeDiff(input).changes.length;
}
