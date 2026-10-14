/**
 * 하객 화면 이벤트 로그.
 *
 * 하객이 겪은 문제는 **우리 눈에 안 보입니다.** 카카오 공유처럼 서버를 거치지 않는 동작은
 * 실패해도 서버 로그에 아무 흔적이 없어서, "공유가 안 돼요" 라는 말만 남고 원인을 못 찾습니다.
 * 그래서 눌린 지점과 실패 사유를 서버로 보냅니다 (보관 14일).
 *
 * 개인정보는 보내지 않습니다 — 이름·연락처·방명록 내용 금지.
 *
 * **예외: 미니게임 닉네임 (2026-10-14 결정).** 랭킹 기록이 거부되거나 유실됐을 때
 * 되살리려면 "누구의 어떤 기록인가" 가 있어야 하는데, 점수·시각만으로는 본인을 찾아가
 * 확인받는 일이 매번 생깁니다. 닉네임은 하객이 랭킹판에 **공개로 올리려고 직접 적은 값**이고
 * 실명이 아닌 경우도 많아, 남기는 쪽이 맞다고 판단했습니다.
 * 이 예외는 게임 닉네임에만 적용됩니다 — 방명록의 이름·본문은 그대로 금지입니다.
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
