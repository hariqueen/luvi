/**
 * 청첩장 저장소 — Firestore 문서 ↔ `Invitation` 변환을 여기 한 곳에 모읍니다.
 *
 * 라우트에서 직접 Firestore 를 만지지 않는 이유: 문서 모양이 바뀔 때 고칠 곳이
 * 라우트마다 흩어지면 한 군데를 빠뜨립니다.
 */
import type {
  ContentDoc,
  Features,
  Invitation,
  InvitationStatus,
  InvitationSummary,
  SectionKey,
  ThemeId,
} from '@luvi/schema';
import { DEFAULT_SECTIONS, SCHEMA_VERSION, parseThemeId } from '@luvi/schema';
import {
  encode,
  encodeFields,
  fsTimestamp,
  decodeFields,
  where,
  type Firestore,
  type FsDocument,
  type FsFields,
  type FsWrite,
} from '../lib/firestore';
import { countChanges } from '../lib/diff';
import { emptyContent } from '../sample';

export const INVITATIONS = 'invitations';
export const SLUGS = 'slugs';

export const invitationPath = (id: string) => `${INVITATIONS}/${id}`;
export const slugPath = (slug: string) => `${SLUGS}/${slug}`;

export interface ClaimInfo {
  code: string;
  issuedAt: string;
  expiresAt: string;
  usedAt: string | null;
}

export interface StoredInvitation extends Invitation {
  claim: ClaimInfo | null;
  /** 낙관적 동시성 제어용 — 인계처럼 경합이 있는 갱신에 씁니다 */
  updateTime: string;
}

// ─────────────────────────── 읽기 ───────────────────────────

/**
 * 저장된 값을 빈 골격 위에 덮습니다.
 *
 * 발행된 청첩장은 예식까지 몇 달을 살아 있어서, 그동안 추가된 필드가 옛 문서에는 없습니다.
 * 그대로 뷰어에 넘기면 `content.core.share.durationMinutes` 같은 접근에서 터집니다.
 */
function mergeContent(stored: unknown): ContentDoc {
  const base = emptyContent();
  if (!stored || typeof stored !== 'object') return base;

  const deepMerge = (target: unknown, source: unknown): unknown => {
    if (source === null || source === undefined) return target;
    // 배열은 병합하지 않고 통째로 씁니다 — 인덱스 단위로 섞으면 순서가 뒤틀립니다
    if (Array.isArray(source)) return source;
    if (typeof source !== 'object') return source;
    if (target === null || typeof target !== 'object' || Array.isArray(target)) return source;

    const out: Record<string, unknown> = { ...(target as Record<string, unknown>) };
    for (const [key, value] of Object.entries(source as Record<string, unknown>)) {
      out[key] = deepMerge(out[key], value);
    }
    return out;
  };

  return deepMerge(base, stored) as ContentDoc;
}

function asSections(value: unknown): SectionKey[] {
  if (!Array.isArray(value) || value.length === 0) return [...DEFAULT_SECTIONS];
  const valid = new Set<string>(DEFAULT_SECTIONS);
  const sections = value.filter((v): v is SectionKey => typeof v === 'string' && valid.has(v));
  return sections.length > 0 ? sections : [...DEFAULT_SECTIONS];
}

function asFeatures(value: unknown): Features {
  const raw = (value ?? {}) as Record<string, unknown>;
  return {
    bgm: raw.bgm !== false,
    petals: raw.petals !== false,
  };
}

function asClaim(value: unknown): ClaimInfo | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.code !== 'string') return null;
  return {
    code: raw.code,
    issuedAt: typeof raw.issuedAt === 'string' ? raw.issuedAt : '',
    expiresAt: typeof raw.expiresAt === 'string' ? raw.expiresAt : '',
    usedAt: typeof raw.usedAt === 'string' ? raw.usedAt : null,
  };
}

export function toInvitation(doc: FsDocument): StoredInvitation {
  const f = decodeFields(doc.fields);

  const published = f.published ? mergeContent(f.published) : null;

  return {
    id: doc.id,
    ownerUid: typeof f.ownerUid === 'string' ? f.ownerUid : null,
    themeId: parseThemeId(f.themeId),
    schemaVersion: typeof f.schemaVersion === 'number' ? f.schemaVersion : SCHEMA_VERSION,
    status: (['draft', 'published', 'archived'] as const).includes(f.status as InvitationStatus)
      ? (f.status as InvitationStatus)
      : 'draft',
    slug: typeof f.slug === 'string' ? f.slug : '',
    pinnedHost: typeof f.pinnedHost === 'string' ? f.pinnedHost : null,
    draft: mergeContent(f.draft),
    published,
    sections: asSections(f.sections),
    features: asFeatures(f.features),
    claim: asClaim(f.claim),
    createdAt: typeof f.createdAt === 'string' ? f.createdAt : doc.createTime,
    updatedAt: typeof f.updatedAt === 'string' ? f.updatedAt : doc.updateTime,
    publishedAt: typeof f.publishedAt === 'string' ? f.publishedAt : null,
    updateTime: doc.updateTime,
  };
}

export async function findInvitation(
  db: Firestore,
  id: string,
): Promise<StoredInvitation | null> {
  const doc = await db.get(invitationPath(id));
  return doc ? toInvitation(doc) : null;
}

/**
 * 소유자별 목록.
 *
 * `orderBy updatedAt` 을 함께 걸면 복합 색인이 필요해집니다. 한 사람이 가진 청첩장은
 * 많아도 몇 개라 등호로만 가져와 Worker 에서 정렬합니다.
 */
export async function listByOwner(db: Firestore, uid: string): Promise<StoredInvitation[]> {
  const docs = await db.query('', {
    from: [{ collectionId: INVITATIONS }],
    where: where('ownerUid', 'EQUAL', uid),
    limit: 50,
  });
  return docs
    .map(toInvitation)
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0));
}

/**
 * 전체 목록 (운영자 전용).
 *
 * `where` 없이 컬렉션을 훑습니다 — 운영자 화면에서만 부르는 경로라 청첩장 수만큼 읽기가
 * 발생합니다. 대시보드처럼 자주 열리는 화면에서 쓰면 무료 읽기 한도를 태웁니다.
 */
export async function listAll(db: Firestore, limit = 200): Promise<StoredInvitation[]> {
  const docs = await db.query('', {
    from: [{ collectionId: INVITATIONS }],
    limit,
  });
  return docs
    .map(toInvitation)
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0));
}

/** 슬러그 → 청첩장. `slugs/{slug}` 문서 ID 가 슬러그라 조회가 한 번입니다 */
export async function findBySlug(db: Firestore, slug: string): Promise<StoredInvitation | null> {
  const reservation = await db.get(slugPath(slug));
  if (!reservation) return null;

  const invitationId = decodeFields(reservation.fields).invitationId;
  if (typeof invitationId !== 'string') return null;
  return findInvitation(db, invitationId);
}

/** 인계 코드로 찾습니다. `claim.code` 는 단일 필드라 자동 색인으로 충분합니다 */
export async function findByClaimCode(
  db: Firestore,
  code: string,
): Promise<StoredInvitation | null> {
  const docs = await db.query('', {
    from: [{ collectionId: INVITATIONS }],
    where: where('claim.code', 'EQUAL', code),
    limit: 1,
  });
  const doc = docs[0];
  return doc ? toInvitation(doc) : null;
}

export async function readSlugReservation(
  db: Firestore,
  slug: string,
): Promise<{ invitationId: string } | null> {
  const doc = await db.get(slugPath(slug));
  if (!doc) return null;
  const invitationId = decodeFields(doc.fields).invitationId;
  return typeof invitationId === 'string' ? { invitationId } : null;
}

// ─────────────────────────── 쓰기 ───────────────────────────

export interface CreateInput {
  ownerUid: string;
  themeId: ThemeId;
  content: ContentDoc;
  sections?: SectionKey[];
  features?: Features;
}

export async function createInvitation(
  db: Firestore,
  input: CreateInput,
): Promise<StoredInvitation> {
  const now = new Date().toISOString();

  const fields: FsFields = {
    ownerUid: encode(input.ownerUid),
    themeId: encode(input.themeId),
    schemaVersion: encode(SCHEMA_VERSION),
    status: encode('draft'),
    slug: encode(''),
    pinnedHost: encode(null),
    draft: encode(input.content),
    published: encode(null),
    sections: encode(input.sections ?? [...DEFAULT_SECTIONS]),
    features: encode(input.features ?? { bgm: true, petals: true }),
    claim: encode(null),
    createdAt: fsTimestamp(now),
    updatedAt: fsTimestamp(now),
    publishedAt: encode(null),
  };

  // 문서 ID 는 Firestore 가 만들게 둡니다 — 순차 ID 는 쓰기가 한 샤드로 몰립니다
  const doc = await db.create('', INVITATIONS, fields);
  return toInvitation(doc);
}

export interface PublishInput {
  invitation: StoredInvitation;
  slug: string;
  /** 슬러그를 새로 선점해야 하는지 (이미 이 청첩장이 쓰던 슬러그면 false) */
  reserveSlug: boolean;
}

/**
 * 발행 — 슬러그 선점과 청첩장 갱신을 **한 commit 으로** 처리합니다.
 *
 * 나눠 쓰면 슬러그만 잡히고 발행이 실패하는 중간 상태가 생깁니다.
 * `exists: false` 조건이 동시 발행 경합까지 막아줍니다.
 */
export async function publishInvitation(db: Firestore, input: PublishInput): Promise<string> {
  const { invitation, slug, reserveSlug } = input;
  const now = new Date().toISOString();

  const writes: FsWrite[] = [];

  if (reserveSlug) {
    writes.push({
      update: {
        name: db.docName(slugPath(slug)),
        fields: encodeFields({ invitationId: invitation.id, ownerUid: invitation.ownerUid }),
      },
      updateTransforms: [{ fieldPath: 'reservedAt', setToServerValue: 'REQUEST_TIME' }],
      // 없을 때만 생성 — 두 사람이 같은 슬러그를 동시에 발행해도 한쪽만 성공합니다
      currentDocument: { exists: false },
    });
  }

  writes.push({
    update: {
      name: db.docName(invitationPath(invitation.id)),
      fields: {
        published: encode(invitation.draft),
        slug: encode(slug),
        status: encode('published'),
        publishedAt: fsTimestamp(now),
        updatedAt: fsTimestamp(now),
      },
    },
    // 마스크를 빼면 draft·sections 등 나머지 필드가 삭제됩니다
    updateMask: { fieldPaths: ['published', 'slug', 'status', 'publishedAt', 'updatedAt'] },
  });

  await db.commit(writes);
  return now;
}

/** 자동저장 — 초안만 갱신합니다. 하객 화면(published)은 손대지 않습니다 */
export async function updateDraft(
  db: Firestore,
  id: string,
  fields: FsFields,
  updateMask: string[],
): Promise<void> {
  await db.patch(invitationPath(id), fields, updateMask);
}

/** 인계 — 읽은 시점 이후 문서가 바뀌었으면 실패합니다 (코드 재사용·동시 인계 차단) */
export async function transferOwnership(
  db: Firestore,
  invitation: StoredInvitation,
  newOwnerUid: string,
): Promise<void> {
  const now = new Date().toISOString();
  const writes: FsWrite[] = [
    {
      update: {
        name: db.docName(invitationPath(invitation.id)),
        fields: {
          ownerUid: encode(newOwnerUid),
          claim: encode({ ...invitation.claim, usedAt: now }),
          updatedAt: fsTimestamp(now),
        },
      },
      updateMask: { fieldPaths: ['ownerUid', 'claim', 'updatedAt'] },
      currentDocument: { updateTime: invitation.updateTime },
    },
  ];

  if (invitation.slug) {
    writes.push({
      update: {
        name: db.docName(slugPath(invitation.slug)),
        fields: { ownerUid: encode(newOwnerUid) },
      },
      updateMask: { fieldPaths: ['ownerUid'] },
    });
  }

  await db.commit(writes);
}

export async function deleteInvitation(db: Firestore, invitation: StoredInvitation): Promise<void> {
  // 하위 컬렉션을 먼저 지웁니다 — 부모 문서를 지워도 서브컬렉션은 남습니다 (Firestore 동작)
  await db.deleteCollection(invitationPath(invitation.id), 'guestbook');
  await db.deleteCollection(invitationPath(invitation.id), 'rankings');

  const writes: FsWrite[] = [{ delete: db.docName(invitationPath(invitation.id)) }];
  if (invitation.slug) writes.push({ delete: db.docName(slugPath(invitation.slug)) });
  await db.commit(writes);
}

// ─────────────────────────── 표현 변환 ───────────────────────────

function coupleLabel(inv: Invitation): string {
  const { groom, bride } = inv.draft.core.couple;
  const left = groom.firstName || groom.name;
  const right = bride.firstName || bride.name;
  return left && right ? `${left} ♥ ${right}` : '새 청첩장';
}

export function toSummary(inv: StoredInvitation): InvitationSummary {
  return {
    id: inv.id,
    slug: inv.slug,
    themeId: inv.themeId,
    status: inv.status,
    coupleLabel: coupleLabel(inv),
    weddingAt: inv.draft.core.weddingAt,
    thumbKey: inv.draft.core.cover.image?.key ?? inv.draft.core.gallery[0]?.key ?? null,
    // 발행본이 없으면 '변경 N건' 배지가 의미 없으므로 0 입니다
    unpublishedChanges: inv.published
      ? countChanges({
          draft: inv.draft,
          published: inv.published,
          sections: inv.sections,
          slug: inv.slug,
        })
      : 0,
    updatedAt: inv.updatedAt,
  };
}

/** 소유자에게 돌려줄 형태 — 내부 필드(claim·updateTime)를 뺍니다 */
export function toPublicShape(inv: StoredInvitation): Invitation {
  const { claim: _claim, updateTime: _updateTime, ...rest } = inv;
  return rest;
}
