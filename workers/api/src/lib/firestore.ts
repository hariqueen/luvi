/**
 * Firestore REST v1 클라이언트.
 *
 * Admin SDK 를 쓸 수 없으므로 (Node 전용) REST 를 직접 호출합니다.
 * 인증은 `googleAuth.ts` 의 서비스 계정 액세스 토큰입니다.
 *
 * ─── 여기서 반드시 지켜야 하는 것 ───────────────────────────────
 *
 * 1. **PATCH 에는 항상 `updateMask` 를 붙인다.** 마스크 없이 PATCH 하면 요청 본문에 없는
 *    필드가 **삭제됩니다.** 자동저장이 인사말만 보냈는데 갤러리가 사라지는 사고가 이렇게 납니다.
 *
 * 2. **`weddingAt` 같은 콘텐츠 문자열을 timestampValue 로 저장하지 않는다.**
 *    `'2026-10-24T13:00:00'` 은 타임존이 없는 한국 시간 표기입니다. timestamp 로 넣으면
 *    UTC 로 해석되어 D-day 와 캘린더가 9시간 어긋납니다. 날짜처럼 보이는 문자열을
 *    자동 판별하지 않고, 메타데이터 시각만 `fsTimestamp()` 로 명시해 넣습니다.
 *
 * 3. **배열 안에 배열을 넣을 수 없다** (Firestore 제약). 조용히 깨지지 않도록 던집니다.
 *
 * 4. **복합 색인이 필요한 쿼리를 쓰지 않는다.** 색인 배포는 별도 작업이라,
 *    등호 하나 또는 정렬 하나까지만 씁니다 (단일 필드 색인은 자동 생성됩니다).
 *    소유자별 목록처럼 둘이 필요한 경우는 등호로만 가져와 Worker 에서 정렬합니다.
 */
import { getAccessToken } from './googleAuth';
import type { ServiceAccount } from './jwt';

// ─────────────────────────── 값 표현 ───────────────────────────

export type FsValue =
  | { nullValue: null }
  | { booleanValue: boolean }
  | { integerValue: string }
  | { doubleValue: number | string }
  | { stringValue: string }
  | { timestampValue: string }
  | { bytesValue: string }
  | { referenceValue: string }
  | { geoPointValue: { latitude?: number; longitude?: number } }
  | { arrayValue: { values?: FsValue[] } }
  | { mapValue: { fields?: Record<string, FsValue> } };

export type FsFields = Record<string, FsValue>;

export class FirestoreError extends Error {
  constructor(
    message: string,
    public readonly httpStatus: number,
    /** 구글 오류 status 문자열 (예: 'NOT_FOUND', 'FAILED_PRECONDITION') */
    public readonly status?: string,
  ) {
    super(message);
  }
}

/** 문서 존재/updateTime 조건이 어긋났을 때 — 슬러그 선점·인계 경합 판별에 씁니다. */
export function isPreconditionFailure(e: unknown): boolean {
  if (!(e instanceof FirestoreError)) return false;
  if (e.status === 'FAILED_PRECONDITION' || e.status === 'ALREADY_EXISTS' || e.status === 'ABORTED') {
    return true;
  }
  return e.httpStatus === 409;
}

const MAX_DEPTH = 20;

/** JS 값 → Firestore Value. `undefined` 는 필드를 아예 만들지 않습니다. */
export function encode(value: unknown, depth = 0): FsValue {
  if (depth > MAX_DEPTH) throw new FirestoreError('중첩이 너무 깊습니다', 400);
  if (value === null || value === undefined) return { nullValue: null };

  switch (typeof value) {
    case 'boolean':
      return { booleanValue: value };
    case 'number':
      if (!Number.isFinite(value)) {
        throw new FirestoreError('숫자가 아닌 값(NaN·Infinity)은 저장할 수 없습니다', 400);
      }
      // 정수/실수를 구분해 넣습니다. Firestore 는 정렬 시 두 타입을 함께 비교하므로
      // 랭킹 점수(소수)와 잡은 개수(정수)가 섞여도 문제없습니다.
      return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
    case 'string':
      return { stringValue: value };
    default:
      break;
  }

  if (Array.isArray(value)) {
    return {
      arrayValue: {
        values: value.map((item) => {
          if (Array.isArray(item)) {
            throw new FirestoreError('배열 안에 배열을 넣을 수 없습니다 (Firestore 제약)', 400);
          }
          return encode(item, depth + 1);
        }),
      },
    };
  }

  if (typeof value === 'object') {
    return { mapValue: { fields: encodeFields(value as Record<string, unknown>, depth + 1) } };
  }

  throw new FirestoreError(`저장할 수 없는 값입니다 (${typeof value})`, 400);
}

export function encodeFields(obj: Record<string, unknown>, depth = 0): FsFields {
  const fields: FsFields = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    fields[key] = encode(value, depth);
  }
  return fields;
}

/** Firestore Value → JS 값. timestamp 는 ISO 문자열로 돌려줍니다. */
export function decode(value: FsValue): unknown {
  if ('nullValue' in value) return null;
  if ('booleanValue' in value) return value.booleanValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) {
    // 구글은 NaN·Infinity 를 문자열로 보냅니다
    return typeof value.doubleValue === 'string' ? Number(value.doubleValue) : value.doubleValue;
  }
  if ('stringValue' in value) return value.stringValue;
  if ('timestampValue' in value) return value.timestampValue;
  if ('bytesValue' in value) return value.bytesValue;
  if ('referenceValue' in value) return value.referenceValue;
  if ('geoPointValue' in value) return value.geoPointValue;
  if ('arrayValue' in value) return (value.arrayValue.values ?? []).map(decode);
  if ('mapValue' in value) return decodeFields(value.mapValue.fields ?? {});
  return null;
}

export function decodeFields(fields: FsFields): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) out[key] = decode(value);
  return out;
}

/** 메타데이터 시각은 이걸로 명시해 넣습니다 (콘텐츠 문자열은 절대 이걸 쓰지 않습니다) */
export const fsTimestamp = (iso: string): FsValue => ({ timestampValue: iso });

// ─────────────────────────── 필드 경로 ───────────────────────────

const SIMPLE_SEGMENT = /^[A-Za-z_][A-Za-z0-9_]*$/;

/**
 * 세그먼트 배열 → Firestore 필드 경로.
 * 단순 식별자가 아닌 세그먼트는 백틱으로 감쌉니다 (점·공백이 든 맵 키가 경로를 깨뜨립니다).
 */
export function fieldPath(...segments: string[]): string {
  return segments
    .map((s) => (SIMPLE_SEGMENT.test(s) ? s : `\`${s.replace(/[\\`]/g, (m) => `\\${m}`)}\``))
    .join('.');
}

// ─────────────────────────── 문서 ───────────────────────────

export interface FsDocument {
  /** 문서 ID (경로 마지막 세그먼트) */
  id: string;
  /** 컬렉션 기준 상대 경로 (예: 'invitations/abc') */
  path: string;
  fields: FsFields;
  createTime: string;
  /** 낙관적 동시성 제어(compare-and-swap)에 씁니다 */
  updateTime: string;
}

interface RawDocument {
  name?: string;
  fields?: FsFields;
  createTime?: string;
  updateTime?: string;
}

export interface FsPrecondition {
  /** false → "없을 때만 생성". 슬러그 선점의 핵심 */
  exists?: boolean;
  /** 읽은 시점의 updateTime — 그 사이 바뀌었으면 실패 (인계 경합 방지) */
  updateTime?: string;
}

export type FsWrite =
  | {
      update: { name: string; fields: FsFields };
      updateMask?: { fieldPaths: string[] };
      updateTransforms?: FsFieldTransform[];
      currentDocument?: FsPrecondition;
    }
  | { delete: string; currentDocument?: FsPrecondition };

export interface FsFieldTransform {
  fieldPath: string;
  appendMissingElements?: { values: FsValue[] };
  removeAllFromArray?: { values: FsValue[] };
  setToServerValue?: 'REQUEST_TIME';
  increment?: FsValue;
}

export type FsOperator =
  | 'EQUAL'
  | 'NOT_EQUAL'
  | 'LESS_THAN'
  | 'LESS_THAN_OR_EQUAL'
  | 'GREATER_THAN'
  | 'GREATER_THAN_OR_EQUAL'
  | 'ARRAY_CONTAINS'
  | 'IN';

export interface FsFilter {
  fieldFilter: { field: { fieldPath: string }; op: FsOperator; value: FsValue };
}

export function where(path: string, op: FsOperator, value: unknown): FsFilter {
  return { fieldFilter: { field: { fieldPath: path }, op, value: encode(value) } };
}

export interface FsQuery {
  from: { collectionId: string; allDescendants?: boolean }[];
  where?: { compositeFilter: { op: 'AND'; filters: FsFilter[] } } | FsFilter;
  orderBy?: { field: { fieldPath: string }; direction: 'ASCENDING' | 'DESCENDING' }[];
  limit?: number;
  offset?: number;
}

// ─────────────────────────── 클라이언트 ───────────────────────────

export class Firestore {
  private readonly documentsUrl: string;
  private readonly databaseUrl: string;
  private readonly rootName: string;

  constructor(
    projectId: string,
    private readonly serviceAccount: ServiceAccount,
  ) {
    this.databaseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)`;
    this.documentsUrl = `${this.databaseUrl}/documents`;
    this.rootName = `projects/${projectId}/databases/(default)/documents`;
  }

  /** 상대 경로 → 전체 문서 이름 (commit 의 write 에 필요) */
  docName(path: string): string {
    return `${this.rootName}/${path}`;
  }

  private async send(method: string, url: string, body?: unknown): Promise<Response> {
    const token = await getAccessToken(this.serviceAccount);
    return fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  private async json<T>(method: string, url: string, body?: unknown): Promise<T> {
    const res = await this.send(method, url, body);
    const text = await res.text();
    const parsed: unknown = text ? JSON.parse(text) : null;

    if (!res.ok) {
      const err = (parsed as { error?: { message?: string; status?: string } } | null)?.error;
      throw new FirestoreError(
        `Firestore ${method} 실패: ${err?.message ?? res.statusText}`,
        res.status,
        err?.status,
      );
    }
    return parsed as T;
  }

  private toDocument(raw: RawDocument): FsDocument {
    const name = raw.name ?? '';
    const path = name.startsWith(`${this.rootName}/`) ? name.slice(this.rootName.length + 1) : name;
    return {
      id: path.slice(path.lastIndexOf('/') + 1),
      path,
      fields: raw.fields ?? {},
      createTime: raw.createTime ?? '',
      updateTime: raw.updateTime ?? '',
    };
  }

  /** 없으면 null (404 를 예외로 만들지 않습니다 — 호출부가 매번 try 를 쓰게 되니까) */
  async get(path: string): Promise<FsDocument | null> {
    const res = await this.send('GET', `${this.documentsUrl}/${path}`);
    if (res.status === 404) {
      await res.body?.cancel();
      return null;
    }

    const text = await res.text();
    if (!res.ok) {
      const err = (JSON.parse(text || '{}') as { error?: { message?: string; status?: string } })
        .error;
      throw new FirestoreError(
        `Firestore GET 실패: ${err?.message ?? res.statusText}`,
        res.status,
        err?.status,
      );
    }
    return this.toDocument(JSON.parse(text) as RawDocument);
  }

  /**
   * 부분 업데이트. 문서가 없으면 만들어집니다.
   * `updateMask` 는 필수입니다 — 없으면 본문에 없는 필드가 삭제됩니다.
   */
  async patch(
    path: string,
    fields: FsFields,
    updateMask: string[],
    precondition?: FsPrecondition,
  ): Promise<FsDocument> {
    if (updateMask.length === 0) {
      throw new FirestoreError('updateMask 없이 PATCH 하면 다른 필드가 삭제됩니다', 400);
    }

    const url = new URL(`${this.documentsUrl}/${path}`);
    for (const p of updateMask) url.searchParams.append('updateMask.fieldPaths', p);
    if (precondition?.exists !== undefined) {
      url.searchParams.set('currentDocument.exists', String(precondition.exists));
    }
    if (precondition?.updateTime) {
      url.searchParams.set('currentDocument.updateTime', precondition.updateTime);
    }

    const raw = await this.json<RawDocument>('PATCH', url.toString(), { fields });
    return this.toDocument(raw);
  }

  /**
   * 새 문서 생성. `documentId` 를 비우면 Firestore 가 ID 를 만듭니다 —
   * **비워두는 편이 낫습니다.** 순차 ID 는 한 샤드에 쓰기가 몰려(hotspotting) 느려집니다.
   */
  async create(
    parentPath: string,
    collectionId: string,
    fields: FsFields,
    documentId?: string,
  ): Promise<FsDocument> {
    const base = parentPath
      ? `${this.documentsUrl}/${parentPath}/${collectionId}`
      : `${this.documentsUrl}/${collectionId}`;
    const url = new URL(base);
    if (documentId) url.searchParams.set('documentId', documentId);

    const raw = await this.json<RawDocument>('POST', url.toString(), { fields });
    return this.toDocument(raw);
  }

  async delete(path: string, precondition?: FsPrecondition): Promise<void> {
    const url = new URL(`${this.documentsUrl}/${path}`);
    if (precondition?.exists !== undefined) {
      url.searchParams.set('currentDocument.exists', String(precondition.exists));
    }
    if (precondition?.updateTime) {
      url.searchParams.set('currentDocument.updateTime', precondition.updateTime);
    }
    await this.json('DELETE', url.toString());
  }

  /**
   * 여러 문서를 **원자적으로** 씁니다. 트랜잭션 없이도 commit 은 전부 성공하거나 전부 실패합니다.
   * 슬러그 선점 + 청첩장 갱신처럼 반쪽만 반영되면 안 되는 쌍에 씁니다.
   */
  async commit(writes: FsWrite[]): Promise<void> {
    if (writes.length === 0) return;
    if (writes.length > 500) {
      throw new FirestoreError('commit 한 번에 500개까지만 쓸 수 있습니다', 400);
    }
    await this.json(`POST`, `${this.documentsUrl}:commit`, { writes });
  }

  async query(parentPath: string, structuredQuery: FsQuery): Promise<FsDocument[]> {
    const url = parentPath
      ? `${this.documentsUrl}/${parentPath}:runQuery`
      : `${this.documentsUrl}:runQuery`;

    const rows = await this.json<{ document?: RawDocument }[]>('POST', url, { structuredQuery });
    // 결과가 없으면 document 없는 항목 하나가 옵니다 — 걸러야 합니다
    return (rows ?? [])
      .filter((r): r is { document: RawDocument } => Boolean(r.document))
      .map((r) => this.toDocument(r.document));
  }

  /**
   * 건수만 셉니다. 문서를 받아오지 않아 읽기 과금이 훨씬 적습니다
   * (방명록 도배 차단에 씁니다).
   */
  async count(parentPath: string, structuredQuery: FsQuery): Promise<number> {
    const url = parentPath
      ? `${this.documentsUrl}/${parentPath}:runAggregationQuery`
      : `${this.documentsUrl}:runAggregationQuery`;

    const rows = await this.json<
      { result?: { aggregateFields?: Record<string, FsValue> } }[]
    >('POST', url, {
      structuredAggregationQuery: {
        structuredQuery,
        aggregations: [{ alias: 'total', count: {} }],
      },
    });

    const value = rows?.[0]?.result?.aggregateFields?.total;
    return value ? Number(decode(value)) : 0;
  }

  /**
   * 컬렉션 전체 삭제 (청첩장을 지울 때 방명록·랭킹 정리용).
   * Firestore 에는 컬렉션 삭제 API 가 없어 문서를 모아 지웁니다.
   */
  async deleteCollection(parentPath: string, collectionId: string): Promise<number> {
    let deleted = 0;

    // 한 번에 300개씩. commit 상한(500)보다 여유를 둡니다
    for (;;) {
      const docs = await this.query(parentPath, {
        from: [{ collectionId }],
        limit: 300,
      });
      if (docs.length === 0) return deleted;

      await this.commit(docs.map((d) => ({ delete: this.docName(d.path) })));
      deleted += docs.length;

      if (docs.length < 300) return deleted;
    }
  }
}
