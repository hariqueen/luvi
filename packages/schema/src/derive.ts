/**
 * `weddingAt` 에서 파생되는 값들.
 *
 * 예식 시각은 항상 한국 시간이지만 `weddingAt` 에는 타임존 표기가 없다.
 * 브라우저 로케일에 따라 다르게 해석되면 예식 시각이 틀어지므로 **+09:00 으로 고정 해석**한다.
 * (classic1 의 `src/lib/calendar.ts` 와 같은 규칙)
 */

const KST_OFFSET_MIN = 9 * 60;
const PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

export interface ParsedWeddingAt {
  year: number;
  /** 1~12 */
  month: number;
  day: number;
  hour: number;
  minute: number;
  /** 0=일 … 6=토 */
  weekday: number;
}

export function parseWeddingAt(value: string): ParsedWeddingAt {
  const m = PATTERN.exec(value);
  if (!m) throw new Error(`예식 일시 형식이 올바르지 않습니다: ${value}`);

  const [, y, mo, d, h, mi] = m;
  const year = Number(y);
  const month = Number(mo);
  const day = Number(d);

  // 요일은 UTC 기준으로 계산해도 날짜가 같으므로 로컬 타임존에 영향받지 않는다
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();

  return { year, month, day, hour: Number(h), minute: Number(mi), weekday };
}

/** KST 문자열 → UTC 밀리초 */
export function toUtcMillis(value: string, addMinutes = 0): number {
  const { year, month, day, hour, minute } = parseWeddingAt(value);
  return (
    Date.UTC(year, month - 1, day, hour, minute, 0) -
    KST_OFFSET_MIN * 60_000 +
    addMinutes * 60_000
  );
}

const WEEKDAY_KO = ['일', '월', '화', '수', '목', '금', '토'] as const;
const MONTH_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

/** 캘린더 섹션 상단 표기 (예: 'October 2026') — 사용자에게 따로 입력받지 않는다 */
export function monthLabel(value: string): string {
  const { year, month } = parseWeddingAt(value);
  return `${MONTH_EN[month - 1]} ${year}`;
}

/** 강조할 날짜(일) */
export function highlightDay(value: string): number {
  return parseWeddingAt(value).day;
}

/** 한국어 요일 (예: '토') */
export function weekdayKo(value: string): string {
  return WEEKDAY_KO[parseWeddingAt(value).weekday] ?? '';
}

/** 커버·공유용 기본 날짜 문구 (예: '2026. 10. 24 SAT · PM 1:00') */
export function defaultDateLabel(value: string): string {
  const { year, month, day, hour, minute, weekday } = parseWeddingAt(value);
  const en = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][weekday] ?? '';
  const ampm = hour < 12 ? 'AM' : 'PM';
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  const mm = minute === 0 ? '' : `:${String(minute).padStart(2, '0')}`;
  return `${year}. ${month}. ${day} ${en} · ${ampm} ${h12}${mm || ':00'}`;
}

/** 남은 시간 (음수면 예식이 지났다) */
export function msUntil(value: string, now: number): number {
  return toUtcMillis(value) - now;
}

/** 구글 캘린더 '일정 추가' URL */
export function googleCalendarUrl(opts: {
  weddingAt: string;
  durationMinutes: number;
  title: string;
  location: string;
  details: string;
}): string {
  const basic = (ms: number) =>
    new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: opts.title,
    dates: `${basic(toUtcMillis(opts.weddingAt))}/${basic(
      toUtcMillis(opts.weddingAt, opts.durationMinutes),
    )}`,
    location: opts.location,
    details: opts.details,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
