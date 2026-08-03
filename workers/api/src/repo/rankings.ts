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
  type Firestore,
  type FsDocument,
} from '../lib/firestore';
import { invitationPath } from './invitations';

const COLLECTION = 'rankings';

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

export async function removeRank(
  db: Firestore,
  invitationId: string,
  entryId: string,
): Promise<void> {
  await db.delete(`${invitationPath(invitationId)}/${COLLECTION}/${entryId}`);
}
