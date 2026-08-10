/**
 * 앱 전역에서 쓰는 API 클라이언트 인스턴스.
 *
 * 토큰은 호출 시점에 가져옵니다 — Firebase ID 토큰은 1시간마다 갱신되므로
 * 클라이언트를 만들 때 한 번 넣어두면 만료된 토큰을 계속 보내게 됩니다.
 */
import { createClient } from '@luvi/api-client';
import { env } from './env';
import { currentUser } from './firebase';

/**
 * 매 요청마다 유효한 ID 토큰을 가져옵니다.
 *
 * `getIdToken()` 은 만료가 가까우면 알아서 갱신하므로 우리가 유효기간을 관리하지 않습니다.
 * 비로그인 상태에서는 null 을 돌려주고, 공개 엔드포인트(방명록 조회 등)는 그대로 동작합니다.
 */
async function getToken(): Promise<string | null> {
  try {
    const user = await currentUser();
    return user ? await user.getIdToken() : null;
  } catch (e) {
    // 토큰을 못 가져오는 것 자체로 화면을 깨뜨리지 않습니다 — 서버가 401 로 답하고
    // 화면은 로그인 안내를 띄우면 됩니다
    console.warn('[api] ID 토큰을 가져오지 못했습니다', e);
    return null;
  }
}

export const api = createClient({ baseUrl: env.apiBase, getToken });
