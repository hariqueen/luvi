/**
 * Firebase 커스텀 토큰 발급 — Workers 에서 직접 서명합니다.
 *
 * **왜 직접 만드는가:** Firebase Admin SDK 는 Node 전용 API 를 쓰므로 Workers 에서 동작하지 않습니다.
 * 커스텀 토큰은 결국 "서비스 계정 개인키로 서명한 JWT" 이므로 Web Crypto 로 만들 수 있습니다.
 *
 * 카카오·네이버처럼 Firebase Auth 가 기본 지원하지 않는 제공자는 전부 이 경로를 씁니다.
 * 서명 자체는 `jwt.ts` 에 있습니다 (Firestore 액세스 토큰과 같은 키를 씁니다).
 */
import { signJwt } from './jwt';

const AUDIENCE =
  'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit';

/** 커스텀 토큰 최대 수명은 1시간입니다. 곧바로 교환되므로 짧게 둡니다. */
const TTL_SECONDS = 300;

export interface CustomTokenInput {
  /** 서비스 계정 이메일 (`FIREBASE_CLIENT_EMAIL`) */
  clientEmail: string;
  /** 서비스 계정 개인키 PEM (`FIREBASE_PRIVATE_KEY`) */
  privateKeyPem: string;
  /** Firebase 사용자 uid. 제공자 접두어를 붙입니다 (예: `kakao:12345`) */
  uid: string;
  /** 토큰에 담을 추가 클레임 (`request.auth.token` 으로 규칙에서 읽을 수 있습니다) */
  claims?: Record<string, string | number | boolean>;
  /** 테스트에서 시간을 고정하기 위한 주입점 */
  now?: number;
}

/** `signInWithCustomToken()` 에 넣을 JWT 를 만듭니다. */
export async function createCustomToken(input: CustomTokenInput): Promise<string> {
  const iat = Math.floor((input.now ?? Date.now()) / 1000);

  return signJwt(
    {
      iss: input.clientEmail,
      sub: input.clientEmail,
      aud: AUDIENCE,
      iat,
      exp: iat + TTL_SECONDS,
      uid: input.uid,
      ...(input.claims ? { claims: input.claims } : {}),
    },
    input.privateKeyPem,
  );
}
