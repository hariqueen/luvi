/**
 * 에디터·대시보드 이벤트 로그.
 *
 * 사용자가 "저장이 안 돼요" 라고 했을 때 서버 로그만으로는 부족합니다 — 요청이 아예
 * 안 갔는지(네트워크·브라우저), 갔는데 거절됐는지(권한·검증)를 화면 쪽에서 알려줘야 구분됩니다.
 *
 * 개인정보·청첩장 내용은 보내지 않습니다. 실패 사유 문자열만 보냅니다.
 */
import { createEventLogger } from '@luvi/api-client/events';
import { env } from './env';

const logger = createEventLogger({ baseUrl: env.apiBase });

export const logEvent = logger.log;
