/**
 * 앱 전역에서 쓰는 API 클라이언트 인스턴스.
 *
 * 토큰은 호출 시점에 가져옵니다 — Firebase ID 토큰은 1시간마다 갱신되므로
 * 클라이언트를 만들 때 한 번 넣어두면 만료된 토큰을 계속 보내게 됩니다.
 */
import { createClient } from '@luvi/api-client';
import { env } from './env';

/**
 * TODO(실구현): Firebase Auth 의 `currentUser.getIdToken()` 을 반환하도록 바꾸세요.
 * 지금은 비로그인으로 동작합니다.
 */
async function getToken(): Promise<string | null> {
  return null;
}

export const api = createClient({ baseUrl: env.apiBase, getToken });
