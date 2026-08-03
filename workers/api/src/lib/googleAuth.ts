/**
 * Firestore REST 호출용 OAuth2 액세스 토큰.
 *
 * **왜 필요한가:** Admin SDK 가 Workers 에서 동작하지 않으므로 Firestore 를 REST 로 직접 호출합니다.
 * REST 는 `Authorization: Bearer {access_token}` 을 요구하고, 그 토큰은 서비스 계정 JWT 를
 * 구글 토큰 엔드포인트에서 교환해 받습니다 (JWT bearer grant).
 *
 * 토큰 수명은 1시간입니다. **요청마다 새로 받으면 안 됩니다** — 지연이 배로 늘고
 * 구글 쪽 속도 제한에 걸립니다. isolate 메모리에 캐시하고 만료 1분 전에 갱신합니다.
 */
import { signJwt, type ServiceAccount } from './jwt';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/datastore';

/** 만료 직전 토큰으로 요청을 보내면 401 이 납니다. 여유를 둡니다. */
const REFRESH_MARGIN_MS = 60_000;

interface CachedToken {
  token: string;
  /** epoch ms */
  expiresAt: number;
}

/**
 * 계정별 캐시. 값이 아니라 **Promise** 를 담습니다 —
 * 동시 요청 여러 개가 각자 토큰을 발급받는 것(thundering herd)을 막습니다.
 */
const cache = new Map<string, Promise<CachedToken>>();

export class GoogleAuthError extends Error {}

async function requestToken(sa: ServiceAccount): Promise<CachedToken> {
  const iat = Math.floor(Date.now() / 1000);
  const assertion = await signJwt(
    {
      iss: sa.clientEmail,
      scope: SCOPE,
      aud: TOKEN_URL,
      iat,
      exp: iat + 3600,
    },
    sa.privateKeyPem,
  );

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }).toString(),
  });

  const json = (await res.json().catch(() => null)) as
    | { access_token?: string; expires_in?: number; error?: string; error_description?: string }
    | null;

  if (!res.ok || !json?.access_token) {
    // 여기서 가장 흔한 원인은 (1) 개인키 줄바꿈 깨짐 (2) 서비스 계정 권한 부족입니다.
    throw new GoogleAuthError(
      `구글 액세스 토큰 발급 실패 (${res.status} ${json?.error ?? ''} ${json?.error_description ?? ''})`.trim(),
    );
  }

  const ttlMs = (json.expires_in ?? 3600) * 1000;
  return { token: json.access_token, expiresAt: Date.now() + ttlMs };
}

/** 캐시된 액세스 토큰을 돌려주고, 만료가 가까우면 새로 받습니다. */
export async function getAccessToken(sa: ServiceAccount): Promise<string> {
  const key = sa.clientEmail;
  const pending = cache.get(key);

  if (pending) {
    try {
      const cached = await pending;
      if (cached.expiresAt - REFRESH_MARGIN_MS > Date.now()) return cached.token;
    } catch {
      // 실패한 Promise 는 아래에서 새로 발급하며 덮어씁니다
    }
  }

  // 실패를 캐시에 남기면 isolate 가 사는 동안 계속 같은 오류를 반환하므로 지웁니다.
  // (타입 순환 추론을 피하려고 타입을 명시합니다)
  const task: Promise<CachedToken> = requestToken(sa).catch((e: unknown) => {
    if (cache.get(key) === task) cache.delete(key);
    throw e;
  });
  cache.set(key, task);
  return (await task).token;
}
