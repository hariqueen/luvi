/**
 * 하객 화면 이벤트 로그.
 *
 * 하객이 겪은 문제는 **우리 눈에 안 보입니다.** 카카오 공유처럼 서버를 거치지 않는 동작은
 * 실패해도 서버 로그에 아무 흔적이 없어서, "공유가 안 돼요" 라는 말만 남고 원인을 못 찾습니다.
 * 그래서 눌린 지점과 실패 사유를 서버로 보냅니다 (보관 14일).
 *
 * 개인정보는 보내지 않습니다 — 이름·연락처·방명록 내용 금지.
 */
import { createEventLogger } from '@luvi/api-client/events';
import { env } from './env';

let invitationId: string | null = null;
let slug: string | null = null;

/** 스냅샷을 받은 뒤 한 번 불러 두면 이후 모든 이벤트에 함께 실립니다 */
export function setLogContext(next: { invitationId: string | null; slug: string | null }): void {
  invitationId = next.invitationId;
  slug = next.slug;
}

const logger = createEventLogger({
  baseUrl: env.apiBase,
  context: () => ({ invitationId, slug }),
});

export const logEvent = logger.log;
