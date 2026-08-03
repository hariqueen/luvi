/**
 * JWT 서명 공통 유틸 — 서비스 계정 개인키로 RS256 JWT를 만듭니다.
 *
 * 두 곳에서 씁니다:
 *  - `customToken.ts` — Firebase 커스텀 토큰 (카카오·네이버 로그인)
 *  - `googleAuth.ts`  — Firestore REST 호출용 OAuth2 액세스 토큰
 *
 * 같은 개인키·같은 알고리즘이라 한 곳에 모아둡니다. PEM 정규화를 두 번 구현하면
 * 한쪽만 고쳐지는 일이 생깁니다.
 */

export function base64UrlEncode(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function base64UrlEncodeJson(value: unknown): string {
  return base64UrlEncode(new TextEncoder().encode(JSON.stringify(value)));
}

export function base64UrlDecode(input: string): Uint8Array {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/**
 * PEM(PKCS#8) → DER 바이트.
 *
 * 환경변수에 넣을 때 줄바꿈이 literal `\n` 으로 들어가는 일이 흔하므로 함께 정규화합니다.
 * (이 처리를 빼먹으면 importKey 가 조용히 실패합니다)
 */
export function pemToDer(pem: string): Uint8Array {
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

/**
 * 개인키 import 는 비용이 있어 isolate 안에서 재사용합니다.
 * 진행 중인 Promise 를 그대로 캐시해 동시 요청이 중복 import 하지 않게 합니다.
 */
const keyCache = new Map<string, Promise<CryptoKey>>();

export function importSigningKey(pem: string): Promise<CryptoKey> {
  const hit = keyCache.get(pem);
  if (hit) return hit;

  const task = crypto.subtle
    .importKey(
      'pkcs8',
      pemToDer(pem),
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['sign'],
    )
    .catch((e: unknown) => {
      // 실패한 Promise 를 캐시에 남기면 이후 요청이 모두 같은 오류를 반복합니다
      keyCache.delete(pem);
      throw e;
    });

  keyCache.set(pem, task);
  return task;
}

export interface ServiceAccount {
  /** `FIREBASE_CLIENT_EMAIL` */
  clientEmail: string;
  /** `FIREBASE_PRIVATE_KEY` (PEM) */
  privateKeyPem: string;
}

/** 서비스 계정 개인키로 RS256 JWT 를 서명합니다. */
export async function signJwt(
  payload: Record<string, unknown>,
  privateKeyPem: string,
): Promise<string> {
  const signingInput = `${base64UrlEncodeJson({ alg: 'RS256', typ: 'JWT' })}.${base64UrlEncodeJson(payload)}`;
  const key = await importSigningKey(privateKeyPem);
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(signingInput),
  );
  return `${signingInput}.${base64UrlEncode(new Uint8Array(signature))}`;
}
