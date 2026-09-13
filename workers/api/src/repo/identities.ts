/**
 * 로그인 수단 → 계정 매핑.
 *
 * 한 사람이 카카오·네이버·구글로 각각 로그인해도 **같은 계정으로 들어오게** 하는 표입니다.
 * 문서 ID 는 `kakao:12345` 처럼 제공자와 제공자 내 ID 를 붙인 값이고, 그 안에 이 수단이
 * 가리키는 `uid` 가 들어 있습니다.
 *
 * ─── 왜 이메일로 합치지 않는가 ────────────────────────────────────
 *
 * 🔴 "카카오로 들어왔는데 이메일이 같으니 기존 계정에 넣어주자" 는 **계정 탈취 경로**입니다.
 *    남의 이메일로 카카오 계정을 만들면 그대로 그 사람 계정에 들어갑니다. 게다가 우리는
 *    카카오가 주는 이메일이 본인 인증된 값인지 확인하지 않습니다(`is_email_verified` 미조회).
 *
 *    그래서 연결은 **이미 본인 계정으로 로그인한 상태에서만** 이루어집니다
 *    (`POST /api/account/link/:provider`). 그때 이 표에 한 줄이 생깁니다.
 *    구글·파이어베이스도 같은 방식입니다.
 *
 * ─── 로그인할 때 이 표를 보는 순서 ──────────────────────────────────
 *
 *   1. `identities/{kakao:123}` 가 있으면 → 거기 적힌 uid 로 로그인 (연결된 계정)
 *   2. 없고 `users/{kakao:123}` 가 있으면 → 그 자체가 계정 (연결 기능 이전에 가입한 사람)
 *   3. 둘 다 없으면 → 신규 가입
 */
import { decodeFields, encode, fsTimestamp, where, type Firestore } from '../lib/firestore';

const COLLECTION = 'identities';

/** `kakao:12345`. 소셜 uid 와 같은 모양이라 예전 계정을 그대로 가리킬 수 있습니다 */
export const identityKey = (provider: string, providerId: string) => `${provider}:${providerId}`;
const identityPath = (key: string) => `${COLLECTION}/${key}`;

export interface Identity {
  /** 문서 ID (`kakao:12345`) */
  key: string;
  provider: string;
  /** 이 수단으로 로그인하면 들어갈 계정 */
  uid: string;
  linkedAt: string | null;
}

function toIdentity(id: string, fields: Record<string, unknown>): Identity {
  return {
    key: id,
    provider: typeof fields.provider === 'string' ? fields.provider : id.split(':')[0] ?? '',
    uid: typeof fields.uid === 'string' ? fields.uid : '',
    linkedAt: typeof fields.linkedAt === 'string' ? fields.linkedAt : null,
  };
}

/** 이 로그인 수단이 어느 계정을 가리키는가. 연결된 적 없으면 null */
export async function findByKey(db: Firestore, key: string): Promise<Identity | null> {
  const doc = await db.get(identityPath(key));
  if (!doc) return null;
  const identity = toIdentity(doc.id, decodeFields(doc.fields));
  // uid 가 비어 있으면 쓸 수 없는 줄입니다. 있는 셈 치면 로그인이 통째로 막히므로 없는 것으로 봅니다
  return identity.uid ? identity : null;
}

/** 이 계정에 연결된 로그인 수단 목록 (계정 설정 화면 · 탈퇴 정리용) */
export async function listByUid(db: Firestore, uid: string): Promise<Identity[]> {
  const docs = await db.query('', {
    from: [{ collectionId: COLLECTION }],
    where: where('uid', 'EQUAL', uid),
    limit: 20,
  });
  return docs.map((d) => toIdentity(d.id, decodeFields(d.fields)));
}

/**
 * 연결합니다.
 *
 * `currentDocument.exists=false` 로 **없을 때만** 쓰므로, 같은 순간에 두 사람이 같은
 * 카카오 계정을 연결하려 하면 뒤쪽이 실패합니다. 먼저 읽고 나중에 쓰는 사이의 틈을 막습니다.
 */
export async function link(
  db: Firestore,
  input: { key: string; provider: string; uid: string },
): Promise<void> {
  await db.patch(
    identityPath(input.key),
    {
      provider: encode(input.provider),
      uid: encode(input.uid),
      linkedAt: fsTimestamp(new Date().toISOString()),
    },
    ['provider', 'uid', 'linkedAt'],
    { exists: false },
  );
}

/** 해제합니다. 이미 없으면 조용히 넘어갑니다 */
export async function unlink(db: Firestore, key: string): Promise<void> {
  await db.commit([{ delete: db.docName(identityPath(key)) }]);
}

/** 탈퇴 정리 — 이 계정에 달린 연결을 전부 지웁니다. 지운 개수를 돌려줍니다 */
export async function deleteAllForUser(db: Firestore, uid: string): Promise<number> {
  const rows = await listByUid(db, uid);
  if (rows.length === 0) return 0;
  await db.commit(rows.map((r) => ({ delete: db.docName(identityPath(r.key)) })));
  return rows.length;
}
