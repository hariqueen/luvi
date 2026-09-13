/**
 * 고객문의 저장소.
 *
 * 문서 구조는 `docs/08-support-plan.md` 5장입니다. 요점 둘:
 *
 * 1. **메시지는 서브컬렉션**(`inquiries/{id}/messages`)입니다. 상위 문서를 목록용으로 가볍게
 *    유지해, 운영자 목록의 읽기 비용이 스레드 길이와 무관하게 만듭니다. 대신 상위 문서에
 *    `lastMessage*` 를 비정규화해 목록에서 서브컬렉션을 읽지 않습니다.
 * 2. **조회 토큰은 해시만** 보관합니다. 원문은 접수 응답과 메일에만 나갑니다.
 *
 * 🔴 `adminNote` 와 `ipHash` 는 고객 경로 응답에 **필드 자체를 만들지 않습니다.**
 *    "화면에서 숨긴다" 가 아니라 "내려보내지 않는다" 입니다.
 */
import {
  decodeFields,
  encode,
  fsTimestamp,
  where,
  type Firestore,
  type FsDocument,
} from '../lib/firestore';
import type {
  AdminInquirySummary,
  InquiryAttachment,
  InquiryCategory,
  InquiryContext,
  InquiryMessage,
  InquiryStatus,
} from '@luvi/schema';

export const COLLECTION = 'inquiries';

export interface StoredInquiry {
  id: string;
  number: string;
  status: InquiryStatus;
  category: InquiryCategory;
  subject: string;
  name: string;
  email: string;
  phone: string;
  uid: string | null;
  invitationId: string | null;
  slug: string | null;
  entry: string;
  path: string;
  sessionId: string | null;
  weddingDate: string;
  services: string;
  attachments: InquiryAttachment[];
  messageCount: number;
  unreadForAdmin: boolean;
  unreadForUser: boolean;
  lastMessageAt: string;
  createdAt: string;
}

/**
 * 사람이 전화로 부를 수 있는 번호. `L-260913-7K2M`.
 *
 * **순번을 쓰지 않는 이유:** 순번은 카운터 문서에 쓰기가 몰리고(경합), 무엇보다
 * **총 문의 건수가 외부에 드러납니다.** 날짜 + 난수면 충분합니다.
 *
 * 알파벳에서 `0·O·1·I` 를 뺐습니다 — 전화로 불러주다 틀리는 조합입니다.
 */
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

export function makeNumber(now: Date = new Date()): string {
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  let suffix = '';
  for (const b of bytes) suffix += ALPHABET[b % ALPHABET.length];
  return `L-${yy}${mm}${dd}-${suffix}`;
}

export interface NewInquiry {
  number: string;
  category: InquiryCategory;
  subject: string;
  message: string;
  name: string;
  email: string;
  phone: string;
  uid: string | null;
  weddingDate: string;
  services: string;
  context: InquiryContext;
  accessTokenHash: string;
  tokenExpiresAt: string;
  ipHash: string;
  userAgent: string;
}

/** 조회 링크 유효 기간. 메시지가 오갈 때마다 갱신합니다 (M2) */
export const TOKEN_TTL_DAYS = 180;

export async function createInquiry(db: Firestore, input: NewInquiry): Promise<string> {
  const now = new Date().toISOString();

  const doc = await db.create('', COLLECTION, {
    number: encode(input.number),
    status: encode('new' satisfies InquiryStatus),
    category: encode(input.category),
    subject: encode(input.subject),

    name: encode(input.name),
    email: encode(input.email),
    phone: encode(input.phone),
    uid: encode(input.uid),

    weddingDate: encode(input.weddingDate),
    services: encode(input.services),

    entry: encode(input.context.entry),
    path: encode(input.context.path ?? ''),
    invitationId: encode(input.context.invitationId ?? null),
    slug: encode(input.context.slug ?? null),
    sessionId: encode(input.context.sessionId ?? null),
    userAgent: encode(input.userAgent),

    accessTokenHash: encode(input.accessTokenHash),
    tokenExpiresAt: fsTimestamp(input.tokenExpiresAt),

    attachments: encode([] as InquiryAttachment[]),
    messageCount: encode(1),
    unreadForAdmin: encode(true),
    unreadForUser: encode(false),
    lastMessageAt: fsTimestamp(now),
    lastMessageFrom: encode('user'),
    lastMessagePreview: encode(input.message.slice(0, 80)),

    adminNote: encode(''),
    ipHash: encode(input.ipHash),
    createdAt: fsTimestamp(now),
    updatedAt: fsTimestamp(now),
  });

  // 첫 글도 메시지 하나로 남깁니다 — 본문이 상위 문서와 서브컬렉션에 나뉘어 있으면
  // 스레드를 그릴 때마다 두 곳을 합쳐야 하고, 언젠가 한쪽만 지우는 실수가 납니다.
  await db.create(`${COLLECTION}/${doc.id}`, 'messages', {
    author: encode('user'),
    body: encode(input.message),
    attachments: encode([] as InquiryAttachment[]),
    createdAt: fsTimestamp(now),
  });

  return doc.id;
}

function toStored(doc: FsDocument): StoredInquiry {
  const f = decodeFields(doc.fields) as Record<string, unknown>;
  const str = (v: unknown): string => (typeof v === 'string' ? v : '');
  return {
    id: doc.id,
    number: str(f.number),
    status: (['new', 'open', 'answered', 'closed'] as const).includes(f.status as InquiryStatus)
      ? (f.status as InquiryStatus)
      : 'new',
    category: str(f.category) as InquiryCategory,
    subject: str(f.subject),
    name: str(f.name),
    email: str(f.email),
    phone: str(f.phone),
    uid: typeof f.uid === 'string' && f.uid ? f.uid : null,
    invitationId: typeof f.invitationId === 'string' && f.invitationId ? f.invitationId : null,
    slug: typeof f.slug === 'string' && f.slug ? f.slug : null,
    entry: str(f.entry),
    path: str(f.path),
    sessionId: typeof f.sessionId === 'string' && f.sessionId ? f.sessionId : null,
    weddingDate: str(f.weddingDate),
    services: str(f.services),
    attachments: Array.isArray(f.attachments) ? (f.attachments as InquiryAttachment[]) : [],
    messageCount: typeof f.messageCount === 'number' ? f.messageCount : 1,
    unreadForAdmin: f.unreadForAdmin === true,
    unreadForUser: f.unreadForUser === true,
    lastMessageAt: str(f.lastMessageAt) || str(f.createdAt),
    createdAt: str(f.createdAt),
  };
}

export async function findInquiry(db: Firestore, id: string): Promise<StoredInquiry | null> {
  const doc = await db.get(`${COLLECTION}/${id}`);
  return doc ? toStored(doc) : null;
}

/**
 * 조회 링크의 열쇠로 찾습니다.
 *
 * 단일 필드라 Firestore 가 자동으로 색인합니다 — 복합 색인을 따로 만들 필요가 없습니다.
 */
export async function findByTokenHash(
  db: Firestore,
  tokenHash: string,
): Promise<StoredInquiry | null> {
  const docs = await db.query('', {
    from: [{ collectionId: COLLECTION }],
    where: where('accessTokenHash', 'EQUAL', tokenHash),
    limit: 1,
  });
  return docs[0] ? toStored(docs[0]) : null;
}

export async function listMessages(db: Firestore, id: string): Promise<InquiryMessage[]> {
  const docs = await db.query(`${COLLECTION}/${id}`, {
    from: [{ collectionId: 'messages' }],
    orderBy: [{ field: { fieldPath: 'createdAt' }, direction: 'ASCENDING' }],
    limit: 100,
  });

  return docs.map((d) => {
    const f = decodeFields(d.fields) as Record<string, unknown>;
    return {
      id: d.id,
      author: f.author === 'admin' ? 'admin' : 'user',
      body: typeof f.body === 'string' ? f.body : '',
      attachments: Array.isArray(f.attachments) ? (f.attachments as InquiryAttachment[]) : [],
      createdAt: typeof f.createdAt === 'string' ? f.createdAt : '',
    };
  });
}

/**
 * 첨부를 문서에 기록합니다.
 *
 * 파일은 이미 R2 에 있습니다. 여기서 실패하면 R2 에 파일만 남는데, 그건 문의 본문이
 * 사라지는 것보다 훨씬 나은 실패입니다 (그래서 글을 먼저, 사진을 뒤에 올립니다).
 */
export async function setAttachments(
  db: Firestore,
  id: string,
  attachments: InquiryAttachment[],
): Promise<void> {
  await db.patch(
    `${COLLECTION}/${id}`,
    {
      attachments: encode(attachments),
      updatedAt: fsTimestamp(new Date().toISOString()),
    },
    ['attachments', 'updatedAt'],
  );
}

export interface AdminListOptions {
  status?: InquiryStatus;
  limit?: number;
}

/**
 * 운영자 목록.
 *
 * 최신순으로 훑기만 합니다. 검색(이름·번호)은 화면에서 걸러도 충분합니다 —
 * Firestore 에 부분일치 검색이 없고, 그걸 위해 색인 서비스를 붙일 규모가 아닙니다.
 */
export async function listForAdmin(
  db: Firestore,
  options: AdminListOptions = {},
): Promise<AdminInquirySummary[]> {
  /**
   * 🔴 **상태로 거를 때는 정렬을 Firestore 에 맡기지 않습니다.** `listForUser` 와 같은
   *    이유입니다 — `where + orderBy` 는 복합 색인을 요구하고, 이 프로젝트는 복합 색인을
   *    만들지 않습니다. 필터 없이 부를 때의 `orderBy` 는 단일 필드라 색인 없이 됩니다.
   *
   *    ⚠️ 거를 때는 `limit` 이 **정렬 전에** 걸립니다. 문의가 `limit` 을 넘어가면
   *    "최근 N건" 이 아니라 "아무 N건 중 최근 순" 이 됩니다. 지금 건수에서는 차이가
   *    없지만, 문의가 백 단위로 늘면 그때 페이징을 넣어야 합니다.
   */
  const filtered = Boolean(options.status);
  const docs = await db.query('', {
    from: [{ collectionId: COLLECTION }],
    ...(options.status ? { where: where('status', 'EQUAL', options.status) } : {}),
    ...(filtered
      ? {}
      : { orderBy: [{ field: { fieldPath: 'lastMessageAt' }, direction: 'DESCENDING' as const }] }),
    limit: options.limit ?? 100,
  });

  const rows = docs.map(toStored);
  if (filtered) {
    rows.sort((a, b) =>
      a.lastMessageAt < b.lastMessageAt ? 1 : a.lastMessageAt > b.lastMessageAt ? -1 : 0,
    );
  }

  return rows.map((s) => {
    return {
      id: s.id,
      number: s.number,
      status: s.status,
      category: s.category,
      subject: s.subject,
      name: s.name,
      email: s.email,
      phone: s.phone,
      uid: s.uid,
      invitationId: s.invitationId,
      entry: s.entry,
      attachmentCount: s.attachments.length,
      messageCount: s.messageCount,
      unreadForAdmin: s.unreadForAdmin,
      createdAt: s.createdAt,
      lastMessageAt: s.lastMessageAt,
    };
  });
}

/** 내 문의 (회원) */
/**
 * 🔴 **정렬을 Firestore 에 맡기지 않습니다.**
 *
 * `where(uid) + orderBy(lastMessageAt)` 는 **복합 색인을 요구합니다.** 색인이 없으면
 * 질의가 400(FAILED_PRECONDITION)으로 떨어지고, 이 라우트는 500 이 됩니다.
 * 실제로 그렇게 죽어 있었습니다 — 이 함수를 쓰는 `/api/inquiries/mine` 과
 * 운영자 회원 상세가 둘 다 500 이었고, 2026-09-13 에 발견했습니다.
 * (`apps/invitation/firestore.indexes.json` 은 비어 있습니다. 이 프로젝트는 복합 색인을
 * 만들지 않는 쪽을 택했습니다 — 색인은 배포 절차가 하나 더 늘고, 빠뜨리면 지금처럼
 * 코드가 멀쩡한데 질의만 죽습니다.)
 *
 * 한 사람의 문의는 많아야 수십 건이라 받아서 정렬하는 편이 안전합니다.
 * `listConsents` · `listByOwner` 도 같은 이유로 JS 에서 정렬합니다.
 */
export async function listForUser(db: Firestore, uid: string): Promise<StoredInquiry[]> {
  const docs = await db.query('', {
    from: [{ collectionId: COLLECTION }],
    where: where('uid', 'EQUAL', uid),
    limit: 50,
  });
  return docs
    .map(toStored)
    .sort((a, b) =>
      a.lastMessageAt < b.lastMessageAt ? 1 : a.lastMessageAt > b.lastMessageAt ? -1 : 0,
    );
}
