/**
 * 카카오 · 네이버 로그인 (클라이언트 측).
 *
 * 흐름:
 *   1. `startSocialLogin()` → 제공자 인가 화면으로 이동
 *   2. 제공자가 `/login/callback/:provider?code=…&state=…` 로 되돌려보냄
 *   3. `consumeCallback()` 이 state 를 검증하고 code 를 반환
 *   4. 호출부가 `/api/auth/:provider` 로 보내 커스텀 토큰을 받고 signInWithCustomToken
 *
 * **state 검증이 왜 필요한가:** 공격자가 자기 인가 코드로 만든 콜백 URL 을 피해자에게 열게 하면
 * 피해자 브라우저가 공격자 계정으로 로그인됩니다(로그인 CSRF). 요청을 시작한 브라우저가
 * 맞는지 확인하는 유일한 수단이라 생략할 수 없습니다.
 */
import { env } from './env';

export type SocialProvider = 'kakao' | 'naver';

const STATE_KEY = 'luvi:oauth-state';
const RETURN_KEY = 'luvi:oauth-return';

const AUTHORIZE_URL: Record<SocialProvider, string> = {
  kakao: 'https://kauth.kakao.com/oauth/authorize',
  naver: 'https://nid.naver.com/oauth2.0/authorize',
};

export const PROVIDER_LABEL: Record<SocialProvider, string> = {
  kakao: '카카오',
  naver: '네이버',
};

export function callbackUrl(provider: SocialProvider): string {
  return `${window.location.origin}/login/callback/${provider}`;
}

function randomState(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** 인가 화면으로 이동합니다. 돌아온 뒤 갈 곳(`returnTo`)을 함께 기억합니다. */
export function startSocialLogin(provider: SocialProvider, returnTo = '/app'): void {
  const clientId = provider === 'kakao' ? env.kakaoRestKey : env.naverClientId;
  if (!clientId) {
    throw new Error(`${PROVIDER_LABEL[provider]} 로그인이 설정되지 않았습니다`);
  }

  const state = randomState();
  sessionStorage.setItem(STATE_KEY, `${provider}:${state}`);
  sessionStorage.setItem(RETURN_KEY, returnTo);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: callbackUrl(provider),
    state,
  });

  window.location.assign(`${AUTHORIZE_URL[provider]}?${params.toString()}`);
}

export interface CallbackResult {
  code: string;
  state: string;
  returnTo: string;
}

/**
 * 콜백 URL 에서 code 를 꺼냅니다. state 가 맞지 않으면 예외를 던집니다.
 * 한 번 쓰면 저장된 state 를 지웁니다 — 재사용을 막기 위해서입니다.
 */
export function consumeCallback(provider: SocialProvider, search: string): CallbackResult {
  const params = new URLSearchParams(search);

  const error = params.get('error');
  if (error) {
    // 사용자가 인가 화면에서 취소한 경우도 여기로 옵니다
    throw new Error(
      error === 'access_denied'
        ? '로그인을 취소했습니다'
        : `${PROVIDER_LABEL[provider]} 로그인에 실패했습니다`,
    );
  }

  const code = params.get('code');
  const state = params.get('state');
  const saved = sessionStorage.getItem(STATE_KEY);
  const returnTo = sessionStorage.getItem(RETURN_KEY) ?? '/app';

  sessionStorage.removeItem(STATE_KEY);
  sessionStorage.removeItem(RETURN_KEY);

  if (!code || !state) throw new Error('인가 정보가 없습니다');
  if (saved !== `${provider}:${state}`) {
    throw new Error('로그인 요청이 확인되지 않았습니다. 다시 시도해주세요');
  }

  return { code, state, returnTo };
}
