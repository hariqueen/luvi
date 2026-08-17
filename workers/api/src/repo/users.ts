/**
 * 사용자 문서 — 로그인할 때 갱신하고, 관리자 여부를 판별합니다.
 *
 * `role` 은 **여기서만** 읽습니다. 클라이언트가 보낸 값이나 토큰 클레임으로 판단하면
 * 커스텀 토큰을 발급하는 우리 코드가 곧 권한 부여 지점이 되어버립니다.
 */
import type { UserRole } from '@luvi/schema';
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
  /**
   * 휴대전화번호 — **주문(종이 청첩장) 연락용으로만** 보관합니다.
   *
   * 네이버 로그인에서만 값이 옵니다. 카카오·구글·이메일 가입자는 null 이라
   * **주문 화면에서 직접 입력받는 경로가 반드시 있어야 합니다.**
   * 이 값은 클라이언트로 내려보내지 않습니다.
   */
  phone?: string | null;
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
    // email·displayName·photoURL 도 "값이 있을 때만" 씁니다. 소셜 로그인 직후
    // 클라이언트가 이어서 호출하는 /api/auth/session 동기화는 커스텀토큰(카카오·네이버)
    // 계정의 idToken 에 email·이름이 없어 null 을 보내는데, 그대로 덮으면 방금 소셜에서
    // 저장한 email·이름이 지워집니다 (아래 phone 과 똑같은 이유).
    ...(input.email ? { email: encode(input.email) } : {}),
    ...(input.displayName ? { displayName: encode(input.displayName) } : {}),
    ...(input.photoURL ? { photoURL: encode(input.photoURL) } : {}),
    lastLoginAt: fsTimestamp(now),
    // 값이 있을 때만 씁니다. null 로 덮으면 네이버로 한 번 받아둔 번호가
    // 다음에 카카오로 로그인하는 순간 지워집니다
    ...(input.phone ? { phone: encode(input.phone) } : {}),
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
  return (await readRole(db, uid)) === 'admin';
}

/** 로그인 응답에 실어 보낼 권한. 문서가 없으면 일반 사용자로 봅니다 */
export async function readRole(db: Firestore, uid: string): Promise<UserRole> {
  const doc = await db.get(userPath(uid));
  if (!doc) return 'user';
  return decodeFields(doc.fields).role === 'admin' ? 'admin' : 'user';
}

export interface OwnerProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  providers: string[];
}

/**
 * 소유자 표시용 프로필 여러 건.
 *
 * 운영자 목록에서 "누구 청첩장인지"를 보여주려면 uid 만으로는 부족합니다.
 * 청첩장 수만큼이 아니라 **서로 다른 소유자 수만큼만** 읽습니다 (같은 사람이 여러 장 가질 수 있음).
 */
export async function readOwnerProfiles(
  db: Firestore,
  uids: string[],
): Promise<Map<string, OwnerProfile>> {
  const unique = [...new Set(uids)];
  const entries = await Promise.all(
    unique.map(async (uid) => {
      const doc = await db.get(userPath(uid));
      const f = doc ? decodeFields(doc.fields) : {};
      const providers = Array.isArray(f.providers)
        ? f.providers.filter((p): p is string => typeof p === 'string')
        : [];
      const profile: OwnerProfile = {
        uid,
        displayName: typeof f.displayName === 'string' ? f.displayName : null,
        email: typeof f.email === 'string' ? f.email : null,
        providers,
      };
      return [uid, profile] as const;
    }),
  );
  return new Map(entries);
}
