/**
 * 미니게임 랭킹 (classic1 테마).
 *
 * ⚠️ `score` 는 생존 시간(초)이라 **소수**입니다 (`+elapsed.toFixed(1)`).
 *    정수 검사를 넣으면 정상 기록이 전부 거부됩니다 — Firestore 규칙에도 같은 이유로
 *    `is int` 를 넣지 않았습니다 (`docs/03-data-model.md` F4).
 */
import type { RankEntry } from '@luvi/schema';
import {
  decodeFields,
  encode,
  fsTimestamp,
  where,
  type Firestore,
  type FsDocument,
} from '../lib/firestore';
import { invitationPath } from './invitations';

const COLLECTION = 'rankings';

/**
 * 한 IP 가 한 청첩장에 올릴 수 있는 기록 수.
 *
 * 방명록(15)보다 넉넉히 둡니다 — 게임은 여러 판 하는 것이 정상이고, 예식장 와이파이는
 * 하객 전체가 한 IP 로 묶여 나옵니다. 좁게 잡으면 조작이 아니라 진짜 하객이 막힙니다.
 */
const MAX_PER_IP = 50;

function toEntry(doc: FsDocument): RankEntry {
  const f = decodeFields(doc.fields);
  return {
    id: doc.id,
    nick: typeof f.nick === 'string' ? f.nick : '익명 하객',
    score: typeof f.score === 'number' ? f.score : 0,
    caught: typeof f.caught === 'number' ? f.caught : 0,
    createdAt: typeof f.createdAt === 'string' ? f.createdAt : doc.createTime,
  };
}

export async function listRankings(
  db: Firestore,
  invitationId: string,
  limit = 20,
): Promise<RankEntry[]> {
  const docs = await db.query(invitationPath(invitationId), {
    from: [{ collectionId: COLLECTION }],
    orderBy: [{ field: { fieldPath: 'score' }, direction: 'DESCENDING' }],
    limit: Math.min(Math.max(limit, 1), 100),
  });
  return docs.map(toEntry);
}

export async function createRank(
  db: Firestore,
  invitationId: string,
  input: { nick: string; score: number; caught: number; ipHash: string },
): Promise<RankEntry> {
  const now = new Date().toISOString();

  const doc = await db.create(invitationPath(invitationId), COLLECTION, {
    nick: encode(input.nick),
    score: encode(input.score),
    caught: encode(input.caught),
    ipHash: encode(input.ipHash),
    createdAt: fsTimestamp(now),
  });

  return toEntry(doc);
}

/**
 * 기록 전체 삭제 (초기화). 지운 건수를 돌려줍니다.
 *
 * 🔴 되돌릴 수 없습니다. 방명록 초기화와 같은 이유로 화면에서 건수를 보여주고 확인받습니다.
 * 예식이 끝난 뒤 정리하거나, 조작된 기록이 여러 건 섞였을 때 한 번에 치우는 용도입니다.
 */
export async function clearRankings(db: Firestore, invitationId: string): Promise<number> {
  return db.deleteCollection(invitationPath(invitationId), COLLECTION);
}

export async function removeRank(
  db: Firestore,
  invitationId: string,
  entryId: string,
): Promise<void> {
  await db.delete(`${invitationPath(invitationId)}/${COLLECTION}/${entryId}`);
}

/** 같은 IP 가 이 청첩장에 이미 올린 기록 수 — 문서는 받지 않고 건수만 셉니다 */
export async function countByIp(
  db: Firestore,
  invitationId: string,
  ipHash: string,
): Promise<number> {
  return db.count(invitationPath(invitationId), {
    from: [{ collectionId: COLLECTION }],
    where: where('ipHash', 'EQUAL', ipHash),
    limit: MAX_PER_IP + 1,
  });
}

export function isFlooding(count: number): boolean {
  return count >= MAX_PER_IP;
}
