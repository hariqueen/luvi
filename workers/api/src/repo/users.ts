/**
 * 사용자 문서 — 로그인할 때 갱신하고, 관리자 여부를 판별합니다.
 *
 * `role` 은 **여기서만** 읽습니다. 클라이언트가 보낸 값이나 토큰 클레임으로 판단하면
 * 커스텀 토큰을 발급하는 우리 코드가 곧 권한 부여 지점이 되어버립니다.
 */
import { decodeFields, encode, fsTimestamp, type Firestore } from '../lib/firestore';

const COLLECTION = 'users';
const userPath = (uid: string) => `${COLLECTION}/${uid}`;

export interface UpsertUserInput {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  /** 'password' | 'google.com' | 'kakao' | 'naver' */
  provider: string;
}

/**
 * 로그인 시 프로필을 갱신합니다.
 *
 * `createdAt` · `plan` · `role` 은 **처음 만들 때만** 씁니다 — 매 로그인마다 덮으면
 * 관리자로 승격시킨 계정이 다음 로그인에 일반 사용자로 되돌아갑니다.
 */
export async function upsertUser(db: Firestore, input: UpsertUserInput): Promise<void> {
  const now = new Date().toISOString();
  const existing = await db.get(userPath(input.uid));

  const fields = {
    email: encode(input.email),
    displayName: encode(input.displayName),
    photoURL: encode(input.photoURL),
    lastLoginAt: fsTimestamp(now),
    ...(existing
      ? {}
      : {
          createdAt: fsTimestamp(now),
          plan: encode('free'),
          role: encode('user'),
        }),
  };

  await db.commit([
    {
      update: { name: db.docName(userPath(input.uid)), fields },
      updateMask: { fieldPaths: Object.keys(fields) },
      // providers 는 배열이라 덮어쓰지 않고 없는 값만 덧붙입니다
      // (구글로 만든 계정에 카카오를 연결해도 구글이 사라지지 않아야 합니다)
      updateTransforms: [
        {
          fieldPath: 'providers',
          appendMissingElements: { values: [encode(input.provider)] },
        },
      ],
    },
  ]);
}

/** 운영자 권한. 소유권 검사가 실패한 뒤에만 호출해 읽기를 아낍니다 */
export async function isAdmin(db: Firestore, uid: string): Promise<boolean> {
  const doc = await db.get(userPath(uid));
  if (!doc) return false;
  return decodeFields(doc.fields).role === 'admin';
}
