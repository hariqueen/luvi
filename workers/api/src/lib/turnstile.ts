/**
 * Cloudflare Turnstile 검증 — 비로그인 문의 폼의 봇 차단.
 *
 * **왜 Turnstile 인가:** 무료이고 무제한이며, 우리가 이미 Cloudflare 위에 있습니다.
 * 대부분의 사용자에게 아무것도 묻지 않고 통과시킵니다 (체크박스조차 없는 경우가 많습니다).
 *
 * 🔴 **시크릿이 없으면 검증을 건너뜁니다.** 로컬 개발에서 키 없이 폼을 돌려보기 위해서입니다.
 *    운영에서 키가 빠지면 **봇 차단이 통째로 사라지므로**, 건너뛸 때마다 오류 로그를 남기고
 *    `/health` 에 `turnstile: false` 로 드러냅니다. 배포 전에 반드시 등록하세요:
 *      npx wrangler secret put TURNSTILE_SECRET
 */

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export interface TurnstileEnv {
  TURNSTILE_SECRET?: string;
}

export async function verifyTurnstile(
  env: TurnstileEnv,
  token: string | undefined,
  ip: string,
): Promise<boolean> {
  if (!env.TURNSTILE_SECRET) {
    console.error('[turnstile] TURNSTILE_SECRET 이 없어 봇 검증을 건너뜁니다');
    return true;
  }
  if (!token) return false;

  try {
    const body = new FormData();
    body.append('secret', env.TURNSTILE_SECRET);
    body.append('response', token);
    body.append('remoteip', ip);

    const res = await fetch(VERIFY_URL, { method: 'POST', body });
    const json = (await res.json()) as { success?: boolean; 'error-codes'?: string[] };

    if (!json.success) {
      console.warn('[turnstile] 검증 실패', json['error-codes']);
      return false;
    }
    return true;
  } catch (e) {
    // 🔴 Cloudflare 쪽 장애로 검증을 못 했을 때 **문의를 막지 않습니다.**
    //    봇 몇 건이 들어오는 것보다 진짜 고객의 문의가 막히는 쪽이 나쁩니다.
    console.error('[turnstile] 검증 중 오류 — 통과시킵니다', e);
    return true;
  }
}
