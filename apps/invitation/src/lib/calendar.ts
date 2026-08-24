/**
 * "일정 등록" 링크 생성 (구글 캘린더 일정 추가 URL).
 *
 * invitation.config의 `weddingAt`은 타임존 표기가 없는 문자열이라
 * 브라우저 로케일에 따라 다르게 해석될 수 있습니다.
 * 예식 시각은 항상 한국 시간이므로 여기서는 +09:00으로 고정 해석합니다.
 *
 * 카카오 공유 버튼은 구글 캘린더 URL을 직접 가리킬 수 없습니다.
 * 카카오가 "제품 링크 관리 > 웹 도메인"에 등록된 도메인만 허용하기 때문입니다.
 * 그래서 버튼은 자기 도메인(`?calendar=1`)을 가리키고,
 * 그 페이지에서 구글 캘린더로 넘기는 방식을 씁니다.
 */
import { richToPlain } from '@luvi/schema';
import type { InvitationConfig } from '@/config/invitation.config';

const KST_OFFSET_MIN = 9 * 60;

/** 자기 도메인 경유를 표시하는 쿼리 파라미터 */
const CALENDAR_PARAM = 'calendar';

/** 'YYYY-MM-DDTHH:mm:ss'(KST)를 구글 캘린더용 UTC 표기('20261024T040000Z')로 변환 */
function toUtcBasic(localKst: string, addMinutes = 0): string {
  const m = localKst.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) throw new Error(`weddingAt 형식이 올바르지 않습니다: ${localKst}`);

  const [, y, mo, d, h, mi, s] = m;
  const ms =
    Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s ?? 0)) -
    KST_OFFSET_MIN * 60_000 +
    addMinutes * 60_000;

  return new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

export interface CalendarEvent {
  title: string;
  /** 'YYYY-MM-DDTHH:mm:ss' (한국 시간) */
  startKst: string;
  /** 일정 길이(분) */
  durationMinutes: number;
  location: string;
  details: string;
}

/**
 * 구글 캘린더 "일정 추가" 화면으로 바로 이동하는 URL.
 * 로그인만 되어 있으면 iOS·안드로이드 모두 브라우저에서 동작합니다.
 */
export function googleCalendarUrl(ev: CalendarEvent): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: ev.title,
    dates: `${toUtcBasic(ev.startKst)}/${toUtcBasic(ev.startKst, ev.durationMinutes)}`,
    location: ev.location,
    details: ev.details,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** 청첩장 설정으로 캘린더 일정을 구성합니다 (단일 소스) */
export function weddingCalendarEvent(cfg: InvitationConfig): CalendarEvent {
  const { share, location, weddingAt } = cfg;
  const baseUrl = share.url || window.location.origin + '/';

  return {
    title: share.title,
    startKst: weddingAt,
    durationMinutes: share.durationMinutes,
    // 예식장 이름은 미리보기에서 굵게 할 수 있습니다 — 캘린더에는 글자만 넣습니다
    location: `${richToPlain(location.venue)} ${richToPlain(location.hall)} (${location.addressForCopy})`,
    details: `${share.date}\n${baseUrl}`,
  };
}

/** 카카오 공유 버튼이 가리킬 자기 도메인 URL (여기서 구글 캘린더로 넘어갑니다) */
export function calendarRedirectUrl(baseUrl: string): string {
  const url = new URL(baseUrl);
  url.searchParams.set(CALENDAR_PARAM, '1');
  return url.href;
}
