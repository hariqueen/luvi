/**
 * 사용자 문서 — 로그인할 때 갱신하고, 관리자 여부를 판별합니다.
 *
 * `role` 은 **여기서만** 읽습니다. 클라이언트가 보낸 값이나 토큰 클레임으로 판단하면
 * 커스텀 토큰을 발급하는 우리 코드가 곧 권한 부여 지점이 되어버립니다.
 */
import {
  toConsentStatus,
  type AccountProfile,
  type ConsentDocType,
  type UserRole,
} from '@luvi/schema';
import { decodeFields, encode, fsTimestamp, where, type Firestore } from '../lib/firestore';

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
    // email·displayName·photoURL 은 "값이 있을 때만" 씁니다. 소셜 로그인 직후
    // 클라이언트가 이어서 호출하는 /api/auth/session 동기화는 커스텀토큰(카카오·네이버)
    // 계정의 idToken 에 email·이름이 없어 null 을 보내는데, 그대로 덮으면 방금 소셜에서
    // 저장한 email·이름이 지워집니다.
    ...(input.email ? { email: encode(input.email) } : {}),
    ...(input.displayName ? { displayName: encode(input.displayName) } : {}),
    ...(input.photoURL ? { photoURL: encode(input.photoURL) } : {}),
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
  return (await readRole(db, uid)) === 'admin';
}

/** 로그인 응답에 실어 보낼 권한. 문서가 없으면 일반 사용자로 봅니다 */
export async function readRole(db: Firestore, uid: string): Promise<UserRole> {
  const doc = await db.get(userPath(uid));
  if (!doc) return 'user';
  return decodeFields(doc.fields).role === 'admin' ? 'admin' : 'user';
}

/** 동의 게이트 판정에 쓸 사본. 원본은 `consents` 컬렉션입니다 (`repo/consents.ts`) */
export async function readConsentVersions(
  db: Firestore,
  uid: string,
): Promise<Partial<Record<ConsentDocType, string>>> {
  const doc = await db.get(userPath(uid));
  return extractConsentVersions(doc ? decodeFields(doc.fields) : {});
}

function extractConsentVersions(f: Record<string, unknown>): Partial<Record<ConsentDocType, string>> {
  const raw = f.consentVersions;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};

  const out: Partial<Record<ConsentDocType, string>> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === 'string') out[k as ConsentDocType] = v;
  }
  return out;
}

const str = (v: unknown): string | null => (typeof v === 'string' ? v : null);

/** 계정 설정 화면에 돌려줄 내 정보 */
export async function readAccount(db: Firestore, uid: string): Promise<AccountProfile | null> {
  const doc = await db.get(userPath(uid));
  if (!doc) return null;

  const f = decodeFields(doc.fields);
  return {
    uid,
    email: str(f.email),
    displayName: str(f.displayName),
    photoURL: str(f.photoURL),
    providers: Array.isArray(f.providers)
      ? f.providers.filter((p): p is string => typeof p === 'string')
      : [],
    plan: str(f.plan) ?? 'free',
    role: f.role === 'admin' ? 'admin' : 'user',
    createdAt: str(f.createdAt) ?? doc.createTime,
    lastLoginAt: str(f.lastLoginAt),
    consent: toConsentStatus(extractConsentVersions(f)),
  };
}

/**
 * 표시 이름 변경 · 프로필 사진 해제.
 *
 * 사진 해제는 `photoURL` 을 **빈 문자열로 덮지 않고 필드를 지웁니다** — 빈 문자열이 남으면
 * `upsertUser` 의 "값이 있을 때만 쓴다" 규칙에 걸리지 않아 다음 로그인에 제공자 사진이
 * 되살아납니다. 필드가 없어야 그 규칙이 의도대로 동작합니다.
 *
 * ⚠️ 다만 **다음 소셜 로그인 때 사진이 다시 저장됩니다** (제공자가 값을 주므로).
 *    영구적으로 원치 않는다면 각 제공자 콘솔의 동의항목에서 프로필 사진을 빼야 합니다.
 */
export async function updateAccount(
  db: Firestore,
  uid: string,
  patch: { displayName?: string; clearPhoto?: boolean },
): Promise<void> {
  const fields: Record<string, ReturnType<typeof encode>> = {};
  const mask: string[] = [];

  if (patch.displayName !== undefined) {
    fields.displayName = encode(patch.displayName);
    mask.push('displayName');
  }
  if (patch.clearPhoto) {
    mask.push('photoURL'); // 값을 넣지 않으면 삭제됩니다
  }
  if (mask.length === 0) return;

  await db.commit([
    { update: { name: db.docName(userPath(uid)), fields }, updateMask: { fieldPaths: mask } },
  ]);
}

/**
 * 같은 이메일을 쓰는 **다른** 계정을 찾습니다 (중복 가입 안내용).
 *
 * 🔴 **찾았다고 자동으로 병합하지 마세요.** 남의 이메일로 가입해 그 계정에 올라타는
 *    탈취 경로가 됩니다. 기존 로그인 수단을 안내만 하고, 실제 연결은 **기존 계정으로
 *    로그인한 상태에서** 계정 설정 화면을 통해야 합니다.
 */
export async function findByEmail(
  db: Firestore,
  email: string,
  excludeUid: string,
): Promise<{ uid: string; providers: string[] } | null> {
  const docs = await db.query('', {
    from: [{ collectionId: COLLECTION }],
    where: where('email', 'EQUAL', email),
    limit: 5,
  });

  for (const doc of docs) {
    if (doc.id === excludeUid) continue;
    const f = decodeFields(doc.fields);
    return {
      uid: doc.id,
      providers: Array.isArray(f.providers)
        ? f.providers.filter((p): p is string => typeof p === 'string')
        : [],
    };
  }
  return null;
}

/** 탈퇴 — 사용자 문서를 지웁니다. 이미 없으면 조용히 넘어갑니다(재시도 가능) */
export async function deleteUser(db: Firestore, uid: string): Promise<void> {
  await db.commit([{ delete: db.docName(userPath(uid)) }]);
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
