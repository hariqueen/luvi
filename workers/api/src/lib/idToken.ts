/**
 * Firebase ID 토큰 검증 — 이게 API 전체의 자물쇠입니다.
 *
 * **왜 직접 검증하는가:** Admin SDK 의 `verifyIdToken()` 은 Node 전용입니다.
 * ID 토큰은 구글이 RS256 으로 서명한 JWT 이므로 공개키로 검증할 수 있습니다.
 *
 * ⚠️ **공개키는 x509 인증서가 아니라 JWKS 엔드포인트에서 받습니다.**
 *    널리 알려진 `.../x509/securetoken@system.gserviceaccount.com` 은 PEM 인증서를 주는데,
 *    Web Crypto 의 `importKey` 는 SPKI 만 받아서 인증서에서 공개키를 꺼내려면 DER 파서를
 *    직접 써야 합니다. JWK 엔드포인트를 쓰면 `importKey('jwk', …)` 로 바로 끝납니다.
 *
 * ⚠️ **서명만 확인하면 안 됩니다.** aud·iss 를 검사하지 않으면 **다른 Firebase 프로젝트에서
 *    발급된 토큰**으로 우리 API 에 로그인할 수 있습니다. 아래 검사를 하나라도 빼면 구멍입니다.
 */
import { base64UrlDecode } from './jwt';

const JWKS_URL =
  'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

/** 시계 오차 허용치. 클라이언트·서버 시각이 몇 초 어긋나는 건 정상입니다. */
const CLOCK_SKEW_SECONDS = 60;

export class IdTokenError extends Error {}

interface Jwk {
  kid?: string;
  kty?: string;
  n?: string;
  e?: string;
}

interface KeySet {
  keys: Map<string, CryptoKey>;
  /** epoch ms */
  expiresAt: number;
}

let keySet: KeySet | null = null;
let inflight: Promise<KeySet> | null = null;

function parseMaxAge(cacheControl: string | null): number {
  const m = /max-age=(\d+)/.exec(cacheControl ?? '');
  const seconds = m?.[1] ? Number(m[1]) : 3600;
  // 구글이 비정상적으로 짧은/긴 값을 주더라도 합리적인 범위로 묶습니다
  return Math.min(Math.max(seconds, 300), 86_400) * 1000;
}

async function fetchKeySet(bypassCache: boolean): Promise<KeySet> {
  const res = await fetch(JWKS_URL, {
    // 엣지 캐시에 얹어 isolate 가 새로 뜰 때마다 구글을 때리지 않게 합니다
    cf: bypassCache ? { cacheTtl: 0 } : { cacheTtl: 3600, cacheEverything: true },
  } as RequestInit);

  if (!res.ok) throw new IdTokenError(`구글 공개키를 받지 못했습니다 (${res.status})`);

  const body = (await res.json()) as { keys?: Jwk[] };
  const keys = new Map<string, CryptoKey>();

  for (const jwk of body.keys ?? []) {
    if (!jwk.kid || jwk.kty !== 'RSA' || !jwk.n || !jwk.e) continue;
    // 최소 형태로 다시 만듭니다 — 응답에 붙어오는 use·alg 가 usages 와 어긋나면 import 가 실패합니다
    const key = await crypto.subtle.importKey(
      'jwk',
      { kty: 'RSA', n: jwk.n, e: jwk.e, alg: 'RS256', ext: true },
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify'],
    );
    keys.set(jwk.kid, key);
  }

  if (keys.size === 0) throw new IdTokenError('구글 공개키 목록이 비어 있습니다');
  return { keys, expiresAt: Date.now() + parseMaxAge(res.headers.get('cache-control')) };
}

async function getKey(kid: string): Promise<CryptoKey> {
  if (keySet && keySet.expiresAt > Date.now()) {
    const hit = keySet.keys.get(kid);
    if (hit) return hit;
  }

  // 동시 요청이 각자 JWKS 를 받아오지 않도록 진행 중인 요청을 공유합니다
  inflight ??= fetchKeySet(false).finally(() => {
    inflight = null;
  });
  keySet = await inflight;

  const key = keySet.keys.get(kid);
  if (key) return key;

  // 키 회전 직후일 수 있으니 캐시를 우회해 한 번 더 받아봅니다
  keySet = await fetchKeySet(true);
  const rotated = keySet.keys.get(kid);
  if (!rotated) throw new IdTokenError('토큰 서명 키를 찾을 수 없습니다');
  return rotated;
}

export interface VerifiedToken {
  uid: string;
  email: string | null;
  /** 'password' | 'google.com' | 'custom' 등 */
  signInProvider: string | null;
}

interface IdTokenClaims {
  aud?: string;
  iss?: string;
  sub?: string;
  iat?: number;
  exp?: number;
  auth_time?: number;
  email?: string;
  firebase?: { sign_in_provider?: string };
}

/**
 * ID 토큰을 검증하고 uid 를 돌려줍니다. 실패하면 예외를 던집니다.
 * 이유를 호출부에서 구분하지 않는 이유: 사용자에게는 어느 쪽이든 "다시 로그인" 뿐입니다.
 */
export async function verifyIdToken(
  token: string,
  projectId: string,
  now: number = Date.now(),
): Promise<VerifiedToken> {
  const parts = token.split('.');
  if (parts.length !== 3) throw new IdTokenError('토큰 형식이 올바르지 않습니다');
  const [rawHeader, rawPayload, rawSignature] = parts as [string, string, string];

  let header: { alg?: string; kid?: string };
  let claims: IdTokenClaims;
  try {
    header = JSON.parse(new TextDecoder().decode(base64UrlDecode(rawHeader))) as typeof header;
    claims = JSON.parse(new TextDecoder().decode(base64UrlDecode(rawPayload))) as IdTokenClaims;
  } catch {
    throw new IdTokenError('토큰을 해석할 수 없습니다');
  }

  // alg 를 검사하지 않으면 alg:none 이나 HMAC 으로 바꿔치기한 토큰이 통과합니다
  if (header.alg !== 'RS256') throw new IdTokenError('지원하지 않는 서명 알고리즘입니다');
  if (!header.kid) throw new IdTokenError('서명 키 ID 가 없습니다');

  const key = await getKey(header.kid);
  const valid = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    key,
    base64UrlDecode(rawSignature),
    new TextEncoder().encode(`${rawHeader}.${rawPayload}`),
  );
  if (!valid) throw new IdTokenError('토큰 서명이 올바르지 않습니다');

  const nowSec = Math.floor(now / 1000);

  // aud·iss 검사가 "우리 프로젝트의 토큰인가" 를 보장합니다. 빼면 안 됩니다
  if (claims.aud !== projectId) throw new IdTokenError('토큰 대상이 이 프로젝트가 아닙니다');
  if (claims.iss !== `https://securetoken.google.com/${projectId}`) {
    throw new IdTokenError('토큰 발급자가 올바르지 않습니다');
  }
  if (!claims.sub) throw new IdTokenError('토큰에 사용자 ID 가 없습니다');
  if (typeof claims.exp !== 'number' || claims.exp + CLOCK_SKEW_SECONDS < nowSec) {
    throw new IdTokenError('토큰이 만료되었습니다');
  }
  if (typeof claims.iat !== 'number' || claims.iat - CLOCK_SKEW_SECONDS > nowSec) {
    throw new IdTokenError('토큰 발급 시각이 올바르지 않습니다');
  }
  if (typeof claims.auth_time === 'number' && claims.auth_time - CLOCK_SKEW_SECONDS > nowSec) {
    throw new IdTokenError('토큰 인증 시각이 올바르지 않습니다');
  }

  return {
    uid: claims.sub,
    email: claims.email ?? null,
    signInProvider: claims.firebase?.sign_in_provider ?? null,
  };
}
