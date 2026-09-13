/**
 * 표시용 포맷. 세 화면이 같은 규칙을 써야 목록과 상세가 어긋나 보이지 않습니다.
 *
 * 날짜를 두 가지로 나눠 둔 이유: 운영 중에 알고 싶은 것이 서로 다릅니다.
 * 예식일은 "며칠인가"(요일까지), 수정·로그인은 "얼마나 최근인가"(오늘이면 시각만)입니다.
 */

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const pad = (n: number) => String(n).padStart(2, '0');

const parse = (iso: string | null | undefined): Date | null => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** "2026-10-24T13:00:00" → "2026. 10. 24 (토)" */
export function formatDate(iso: string | null | undefined): string {
  const d = parse(iso);
  if (!d) return '-';
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()} (${WEEKDAYS[d.getDay()]})`;
}

/** 최근성이 중요한 값 — "오늘 21:04" · "9. 12 21:04" · 해가 다르면 연도까지 */
export function formatTouched(iso: string | null | undefined): string {
  const d = parse(iso);
  if (!d) return '-';
  const now = new Date();
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;

  if (d.getFullYear() !== now.getFullYear()) {
    return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}`;
  }
  const sameDay = d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  return sameDay ? `오늘 ${time}` : `${d.getMonth() + 1}. ${d.getDate()} ${time}`;
}

/** 날짜만 — 가입일처럼 시각이 의미 없는 값 */
export function formatDay(iso: string | null | undefined): string {
  const d = parse(iso);
  if (!d) return '-';
  return `${d.getFullYear()}. ${pad(d.getMonth() + 1)}. ${pad(d.getDate())}`;
}

/** 초 단위까지 — 로그처럼 순서가 중요한 값 */
export function formatLogTime(iso: string | null | undefined): string {
  const d = parse(iso);
  if (!d) return '-';
  return `${d.getMonth() + 1}. ${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

const PROVIDER_LABEL: Record<string, string> = {
  'google.com': '구글',
  password: '이메일',
  kakao: '카카오',
  naver: '네이버',
};

/** 모르는 제공자는 원문 그대로 — 새 제공자를 붙였을 때 빈칸이 되면 안 됩니다 */
export function providerLabel(provider: string): string {
  return PROVIDER_LABEL[provider] ?? provider;
}

export function providerLabels(providers: string[]): string {
  return providers.map(providerLabel).join(' · ');
}
