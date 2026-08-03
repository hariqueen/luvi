/**
 * Firebase 커스텀 토큰 발급 — Workers 에서 직접 서명합니다.
 *
 * **왜 직접 만드는가:** Firebase Admin SDK 는 Node 전용 API 를 쓰므로 Workers 에서 동작하지 않습니다.
 * 커스텀 토큰은 결국 "서비스 계정 개인키로 서명한 JWT" 이므로 Web Crypto 로 만들 수 있습니다.
 *
 * 카카오·네이버처럼 Firebase Auth 가 기본 지원하지 않는 제공자는 전부 이 경로를 씁니다.
 */

const AUDIENCE =
  'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit';

/** 커스텀 토큰 최대 수명은 1시간입니다. 곧바로 교환되므로 짧게 둡니다. */
const TTL_SECONDS = 300;

function base64UrlEncode(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlEncodeJson(value: unknown): string {
  return base64UrlEncode(new TextEncoder().encode(JSON.stringify(value)));
}

/**
 * PEM(PKCS#8) → DER 바이트.
 *
 * 환경변수에 넣을 때 줄바꿈이 literal `\n` 으로 들어가는 일이 흔하므로 함께 정규화합니다.
 * (이 처리를 빼먹으면 importKey 가 조용히 실패합니다)
 */
function pemToDer(pem: string): Uint8Array {
  const body = pem
    .replace(/\\n/g, '\n')
    .replace(/-----BEGIN [^-]+-----/, '')
    .replace(/-----END [^-]+-----/, '')
    .replace(/\s+/g, '');

  const bin = atob(body);
  const der = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) der[i] = bin.charCodeAt(i);
  return der;
}

let cachedKey: CryptoKey | null = null;
let cachedKeySource = '';

/** 개인키 import 는 비용이 있으므로 isolate 안에서 재사용합니다. */
async function importPrivateKey(pem: string): Promise<CryptoKey> {
  if (cachedKey && cachedKeySource === pem) return cachedKey;

  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToDer(pem),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  cachedKey = key;
  cachedKeySource = pem;
  return key;
}

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

  const header = base64UrlEncodeJson({ alg: 'RS256', typ: 'JWT' });
  const payload = base64UrlEncodeJson({
    iss: input.clientEmail,
    sub: input.clientEmail,
    aud: AUDIENCE,
    iat,
    exp: iat + TTL_SECONDS,
    uid: input.uid,
    ...(input.claims ? { claims: input.claims } : {}),
  });

  const signingInput = `${header}.${payload}`;
  const key = await importPrivateKey(input.privateKeyPem);
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(signingInput),
  );

  return `${signingInput}.${base64UrlEncode(new Uint8Array(signature))}`;
}
