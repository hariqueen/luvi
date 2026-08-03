/**
 * 방명록 — 하객이 남긴 실제 축하 메시지입니다.
 *
 * 🔴 **삭제보다 숨김을 기본으로 둡니다.** 욕설·광고는 지워야 하지만, 잘못 눌러 지운
 * 축하 메시지는 되돌릴 수 없습니다. 하객 화면에서는 `hidden` 을 걸러 보여줍니다.
 *
 * 컬렉션 경로는 `invitations/{id}/guestbook` 입니다 — 루트 컬렉션에 두면
 * 청첩장이 2개가 되는 순간 서로의 방명록이 섞입니다.
 */
import type { GuestbookEntry } from '@luvi/schema';
import {
  decodeFields,
  encode,
  fsTimestamp,
  where,
  type Firestore,
  type FsDocument,
} from '../lib/firestore';
import { invitationPath } from './invitations';

const COLLECTION = 'guestbook';

/** 한 IP 가 남길 수 있는 최대 개수. 도배를 막으면서 가족 여러 명이 같은 와이파이를 쓰는 건 허용합니다 */
const MAX_PER_IP = 15;

function toEntry(doc: FsDocument): GuestbookEntry {
  const f = decodeFields(doc.fields);
  return {
    id: doc.id,
    name: typeof f.name === 'string' ? f.name : '',
    msg: typeof f.msg === 'string' ? f.msg : '',
    hidden: f.hidden === true,
    createdAt: typeof f.createdAt === 'string' ? f.createdAt : doc.createTime,
  };
}

export interface ListOptions {
  limit?: number;
  /** 소유자만 true — 하객에게 숨긴 글을 보여주면 숨김의 의미가 없습니다 */
  includeHidden: boolean;
}

export async function listGuestbook(
  db: Firestore,
  invitationId: string,
  options: ListOptions,
): Promise<GuestbookEntry[]> {
  const limit = Math.min(Math.max(options.limit ?? 20, 1), 100);

  const docs = await db.query(invitationPath(invitationId), {
    from: [{ collectionId: COLLECTION }],
    orderBy: [{ field: { fieldPath: 'createdAt' }, direction: 'DESCENDING' }],
    // 숨긴 글을 걸러내면 개수가 줄어드므로 조금 더 가져옵니다.
    // (where hidden==false 로 걸면 createdAt 정렬과 겹쳐 복합 색인이 필요해집니다)
    limit: options.includeHidden ? limit : Math.min(limit * 2, 100),
  });

  const entries = docs.map(toEntry);
  return (options.includeHidden ? entries : entries.filter((e) => !e.hidden)).slice(0, limit);
}

export async function countByIp(
  db: Firestore,
  invitationId: string,
  ipHash: string,
): Promise<number> {
  // 문서를 받아오지 않고 건수만 셉니다 — 읽기 과금이 훨씬 적습니다
  return db.count(invitationPath(invitationId), {
    from: [{ collectionId: COLLECTION }],
    where: where('ipHash', 'EQUAL', ipHash),
    limit: MAX_PER_IP + 1,
  });
}

export function isFlooding(count: number): boolean {
  return count >= MAX_PER_IP;
}

export interface CreateEntryInput {
  name: string;
  msg: string;
  /** 원문 IP 는 저장하지 않습니다 — 도배 판별에 필요한 건 동일인 여부뿐입니다 */
  ipHash: string;
}

export async function createEntry(
  db: Firestore,
  invitationId: string,
  input: CreateEntryInput,
): Promise<GuestbookEntry> {
  const now = new Date().toISOString();

  const doc = await db.create(invitationPath(invitationId), COLLECTION, {
    name: encode(input.name),
    msg: encode(input.msg),
    hidden: encode(false),
    ipHash: encode(input.ipHash),
    createdAt: fsTimestamp(now),
  });

  return toEntry(doc);
}

export async function setHidden(
  db: Firestore,
  invitationId: string,
  entryId: string,
  hidden: boolean,
): Promise<GuestbookEntry | null> {
  const path = `${invitationPath(invitationId)}/${COLLECTION}/${entryId}`;

  // 없는 글에 PATCH 하면 Firestore 가 문서를 새로 만들어 버립니다 — 먼저 존재를 확인합니다
  const existing = await db.get(path);
  if (!existing) return null;

  const doc = await db.patch(path, { hidden: encode(hidden) }, ['hidden']);
  return toEntry(doc);
}

export async function removeEntry(
  db: Firestore,
  invitationId: string,
  entryId: string,
): Promise<void> {
  await db.delete(`${invitationPath(invitationId)}/${COLLECTION}/${entryId}`);
}
