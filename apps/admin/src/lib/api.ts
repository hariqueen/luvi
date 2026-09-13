/**
 * 앱 전역에서 쓰는 API 클라이언트 인스턴스.
 *
 * **워커를 새로 만들지 않습니다.** 소비자 앱과 같은 `luvi-api` 를 부릅니다 —
 * `/api/admin/*` 는 그 워커에 얹힌 라우트이고, 권한은 `usersRepo.isAdmin()` 이
 * 매 요청 판단합니다. 여기서 토큰을 붙이는 방식도 소비자 앱과 동일해야 합니다.
 *
 * 토큰은 호출 시점에 가져옵니다 — Firebase ID 토큰은 1시간마다 갱신되므로
 * 클라이언트를 만들 때 한 번 넣어두면 만료된 토큰을 계속 보내게 됩니다.
 */
import { createClient } from '@luvi/api-client';
import { env } from './env';
import { currentUser } from './firebase';

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
