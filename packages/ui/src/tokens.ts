/**
 * Luvi 디자인 토큰.
 *
 * `docs/design/Luvi.dc.html` (클로드 디자인 산출물)에서 추출했습니다.
 * 색상 이름은 목적 기준입니다 — 값이 바뀌어도 이름은 그대로 두세요.
 *
 * 이 파일이 단일 소스입니다. Tailwind 설정(`packages/ui/tailwind-preset.ts`)이
 * 여기서 값을 읽어가므로, 색을 바꿀 때 두 곳을 고칠 필요가 없습니다.
 */

export const colors = {
  /** 본문 텍스트 · 주요 버튼 배경 */
  ink: '#1A1917',
  /** 에디터·브랜드 필름의 어두운 배경 */
  'ink-deep': '#141312',
  /** 어두운 배경 위 보조 요소 */
  'ink-mid': '#33302B',
  /** 본문보다 약한 텍스트 */
  'ink-soft': '#57544E',

  /** 보조 텍스트 */
  muted: '#7C7870',
  /** 라벨·메타 정보 */
  'muted-soft': '#A9A196',
  /** 가장 약한 텍스트 (플레이스홀더) */
  'muted-faint': '#B4AEA3',

  /** 주 강조색 — 골드 */
  gold: '#C9A063',
  /** 링크 hover · 강조 텍스트 */
  'gold-deep': '#B8895A',
  /** 골드 테두리 */
  'gold-soft': '#D9BE94',

  /** 페이지 배경 (웜 아이보리) */
  bg: '#F7F5F1',
  /** 카드·패널 배경 */
  surface: '#FCFAF6',
  /** 한 단계 눌린 배경 */
  'surface-sunken': '#F4F1EA',
  /** 어두운 배경 위 텍스트 */
  paper: '#F7F3EC',
  /** 밝은 버튼 텍스트 */
  'paper-soft': '#FBF8F3',

  /** 기본 테두리 */
  line: '#E7E2D9',
  /** 강한 테두리 */
  'line-strong': '#E0DAD0',
  /** 약한 구분선 */
  'line-soft': '#EFE9DF',

  /** 골드 계열 연한 배경 */
  cream: '#FBF5EC',
  /** 선택 영역 · 강조 배경 */
  sand: '#EFE0CC',

  /** 저장 완료 등 성공 상태 */
  success: '#5BA87A',
} as const;

export const fonts = {
  /** 본문 — Pretendard Variable (한글 가변 폰트) */
  sans: [
    '"Pretendard Variable"',
    'Pretendard',
    '-apple-system',
    'system-ui',
    'sans-serif',
  ],
  /** 브랜드 워드마크 · 장식 문구 — Parisienne */
  script: ['Parisienne', 'cursive'],
} as const;

/** 화면 폭 기준점. 에디터는 1024px에서 바텀시트 → 2열로 바뀝니다. */
export const screens = {
  xs: '360px',
  sm: '390px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
} as const;

/** 콘텐츠 최대 폭 */
export const maxWidth = {
  page: '1440px',
  /** 청첩장 뷰어 폭 */
  invitation: '480px',
} as const;

/** 디자인 산출물의 키프레임 이름 (globals.css 에 정의) */
export const animations = [
  'luviScroll',
  'luviFloat',
  'luviPetal',
  'luviPulse',
  'luviMarquee',
  'luviCue',
] as const;
