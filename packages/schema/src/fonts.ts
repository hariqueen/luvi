/**
 * 커버 텍스트에 쓸 수 있는 글꼴 목록과 **지연 로딩**.
 *
 * 🔴 이 파일이 글꼴의 단일 소스입니다. 글꼴을 추가할 때는
 *    (1) `content.ts` 의 `LayerFont` 유니온에 id 를 넣고
 *    (2) 아래 `FONTS` 에 항목을 추가하면 끝입니다.
 *    에디터 툴바·뷰어 렌더·웹폰트 로딩이 모두 여기서 파생됩니다.
 *
 * ## 왜 지연 로딩인가
 *
 * 한글 웹폰트는 `@font-face` **선언 자체가** 큽니다. unicode-range 로 잘게 쪼개서
 * 쓰인 글자만 내려받게 하는 대신, 선언이 폰트당 120~600개까지 늘어납니다.
 * 실측: 마루부리 CSS 427KB, 김정철손글씨 262KB, 나눔손글씨류 85KB.
 * 글꼴 12개를 `index.html` 에 나란히 `<link>` 하면 **글자 한 자 안 써도 CSS 만 2~3MB** 입니다.
 *
 * 그래서 실제로 쓰이는 글꼴만 런타임에 붙입니다. 청첩장 하나가 쓰는 글꼴은 보통 1~3개라,
 * 목록이 50개로 늘어도 하객이 받는 양은 그대로입니다.
 */
import type { LayerFont } from './content';

/** 글꼴 묶음 — 드롭다운의 `<optgroup>` 기준 */
export type FontCategory = 'sans' | 'serif' | 'script' | 'latin' | 'casual';

export interface FontDef {
  /** 사용자에게 보이는 이름 */
  label: string;
  /** CSS font-family 스택. 마지막에 반드시 제네릭 패밀리를 둔다 — 로딩 실패 시 폴백 */
  stack: string;
  category: FontCategory;
  /**
   * 웹폰트 CSS 주소. **비어 있으면** 앱이 이미 상시 로드하고 있다는 뜻입니다
   * (예: Pretendard 는 UI 기본 글꼴이라 항상 떠 있습니다).
   */
  href?: string;
  /**
   * 한글 글리프가 없는 글꼴. 영문 문구에만 쓸 수 있고, 한글을 넣으면 폴백으로 깨져 보입니다.
   * 피커에서 경고를 띄우는 근거입니다.
   */
  latinOnly?: boolean;
  /** 굵기가 한 종류뿐인 글꼴 — 손글씨 대부분이 여기 해당합니다 */
  fixedWeight?: boolean;
}

/** 드롭다운 그룹 제목 */
export const FONT_CATEGORY_LABEL: Record<FontCategory, string> = {
  serif: '명조 · 바탕',
  script: '손글씨 · 캘리그래피',
  sans: '고딕',
  latin: '영문 전용',
  casual: '캐주얼',
};

/** Google Fonts CSS 주소 */
const google = (family: string): string =>
  `https://fonts.googleapis.com/css2?family=${family}&display=swap`;

/**
 * fonts-archive(jsDelivr) 의 dynamic-subset CSS 주소.
 *
 * 이 CSS 는 굵기를 골라 받을 수 없어 전 굵기 선언이 함께 옵니다(마루부리 427KB 등).
 * 실제 woff2 는 쓰인 글자 것만 내려오므로 체감은 작지만, 무거운 글꼴이 인기를 끌면
 * 해당 글꼴만 굵기 1종으로 잘라 self-host 하는 게 다음 단계입니다.
 */
const archive = (repo: string): string =>
  `https://cdn.jsdelivr.net/gh/fonts-archive/${repo}/subsets/${repo}-dynamic-subset.css`;

export const FONTS: Record<LayerFont, FontDef> = {
  /* ---------- 고딕 ---------- */
  sans: {
    label: '고딕 (프리텐다드)',
    stack: '"Pretendard Variable", Pretendard, system-ui, sans-serif',
    category: 'sans',
    // href 없음 — 양쪽 앱의 UI 기본 글꼴이라 항상 로드되어 있습니다
  },
  'gowun-dodum': {
    label: '고운돋움',
    stack: '"Gowun Dodum", sans-serif',
    category: 'sans',
    href: google('Gowun+Dodum'),
    fixedWeight: true,
  },
  freesentation: {
    label: '프리젠테이션',
    stack: '"Freesentation", sans-serif',
    category: 'sans',
    href: archive('Freesentation'),
  },
  'noto-sans': {
    label: '노토 산스 KR',
    stack: '"Noto Sans KR", sans-serif',
    category: 'sans',
    href: google('Noto+Sans+KR:wght@300;400;500;700'),
  },

  /* ---------- 명조 · 바탕 ---------- */
  serif: {
    label: '명조 (나눔명조)',
    stack: '"Nanum Myeongjo", "Noto Serif KR", serif',
    category: 'serif',
    // 청첩장 앱은 fonts.css 로 self-host 하지만 에디터는 그렇지 않습니다.
    // setProvidedFonts() 로 앱마다 중복 로드를 걸러냅니다.
    href: google('Nanum+Myeongjo:wght@400;700'),
  },
  maru: {
    label: '마루부리',
    stack: '"Maru Buri", serif',
    category: 'serif',
    href: archive('MaruBuri'),
  },
  'gowun-batang': {
    label: '고운바탕',
    stack: '"Gowun Batang", serif',
    category: 'serif',
    href: google('Gowun+Batang:wght@400;700'),
  },
  ridi: {
    label: '리디바탕',
    stack: '"RIDI Batang", serif',
    category: 'serif',
    href: archive('RIDIBatang'),
    fixedWeight: true,
  },
  gyeonggi: {
    label: '경기천년바탕',
    stack: '"Gyeonggi Batang", serif',
    category: 'serif',
    href: archive('GyeonggiBatang'),
  },
  hallym: {
    label: '한림명조',
    stack: '"Hallym Myeongjo", serif',
    category: 'serif',
    href: archive('HallymMyeongjo'),
    fixedWeight: true,
  },
  bookend: {
    label: '북엔드바탕',
    stack: '"Bookend Batang", serif',
    category: 'serif',
    href: archive('BookendBatang'),
  },
  kopub: {
    label: 'KoPub바탕',
    stack: '"KoPub Batang", serif',
    category: 'serif',
    href: archive('KoPubBatang'),
  },
  songmyung: {
    label: '송명',
    stack: '"Song Myung", serif',
    category: 'serif',
    href: google('Song+Myung'),
    fixedWeight: true,
  },
  jeju: {
    label: '제주명조',
    stack: '"Jeju Myeongjo", serif',
    category: 'serif',
    // Google Fonts 에는 없습니다 (Jeju Gothic·Jeju Hallasan 만 있음)
    href: archive('JejuMyeongjo'),
    fixedWeight: true,
  },
  hahmlet: {
    label: 'Hahmlet',
    stack: '"Hahmlet", serif',
    category: 'serif',
    href: google('Hahmlet:wght@300;400;600'),
  },
  'noto-serif': {
    label: '노토 세리프 KR',
    stack: '"Noto Serif KR", serif',
    category: 'serif',
    href: google('Noto+Serif+KR:wght@300;400;600'),
  },

  /* ---------- 손글씨 · 캘리그래피 ---------- */
  script: {
    label: '필기체 (나눔펜)',
    stack: '"Nanum Pen Script", cursive',
    category: 'script',
    href: google('Nanum+Pen+Script'),
    fixedWeight: true,
  },
  'nanum-brush': {
    label: '나눔손글씨 붓',
    stack: '"Nanum Brush Script", cursive',
    category: 'script',
    href: google('Nanum+Brush+Script'),
    fixedWeight: true,
  },
  butpen: {
    label: '학교안심 붓펜',
    stack: '"Hakgyoansim Butpen", cursive',
    category: 'script',
    href: archive('HakgyoansimButpen'),
  },
  kimjungchul: {
    label: '김정철손글씨',
    stack: '"Kimjungchul Script", cursive',
    category: 'script',
    href: archive('KimjungchulScript'),
  },
  chusa: {
    label: '추사사랑체',
    stack: '"Chusa Love", cursive',
    category: 'script',
    href: archive('ChusaLove'),
    fixedWeight: true,
  },
  sinhon: {
    label: '나눔손글씨 신혼부부',
    stack: '"NanumSinHonBuBu", cursive',
    category: 'script',
    href: archive('NanumSinHonBuBu'),
    fixedWeight: true,
  },
  baeeunhye: {
    label: '나눔손글씨 배은혜체',
    stack: '"NanumBaeEunHyeCe", cursive',
    category: 'script',
    href: archive('NanumBaeEunHyeCe'),
    fixedWeight: true,
  },
  dasi: {
    label: '나눔손글씨 다시 시작해',
    stack: '"NanumDaSiSiJagHae", cursive',
    category: 'script',
    href: archive('NanumDaSiSiJagHae'),
    fixedWeight: true,
  },
  sonpyeonji: {
    label: '나눔손글씨 손편지체',
    stack: '"NanumSonPyeonJiCe", cursive',
    category: 'script',
    href: archive('NanumSonPyeonJiCe'),
    fixedWeight: true,
  },
  mingyeong: {
    label: '나눔손글씨 예쁜민경체',
    stack: '"NanumYeBbeunMinGyeongCe", cursive',
    category: 'script',
    href: archive('NanumYeBbeunMinGyeongCe'),
    fixedWeight: true,
  },
  jangmi: {
    label: '나눔손글씨 장미체',
    stack: '"NanumJangMiCe", cursive',
    category: 'script',
    href: archive('NanumJangMiCe'),
    fixedWeight: true,
  },
  'onglyph-dagyeong': {
    label: '온글잎 다경체',
    stack: '"Ownglyph_2022_UWY_Da_Gyeong", cursive',
    category: 'script',
    href: archive('Ownglyph_2022_UWY_Da_Gyeong'),
    fixedWeight: true,
  },
  'onglyph-siwoo': {
    label: '온글잎 시우체',
    stack: '"Ownglyph_2022_UWY_Si_Woo", cursive',
    category: 'script',
    href: archive('Ownglyph_2022_UWY_Si_Woo'),
    fixedWeight: true,
  },
  'gabia-solmee': {
    label: '가비아 솔미체',
    stack: '"Gabia Solmee", cursive',
    category: 'script',
    href: archive('GabiaSolmee'),
    fixedWeight: true,
  },
  'gabia-bombaram': {
    label: '가비아 봄바람체',
    stack: '"Gabia Bombaram", cursive',
    category: 'script',
    href: archive('GabiaBombaram'),
    fixedWeight: true,
  },
  'cafe24-night': {
    label: '카페24 어느 예쁜 밤',
    stack: '"Cafe24 Oneprettynight", cursive',
    category: 'script',
    href: archive('Cafe24Oneprettynight'),
    fixedWeight: true,
  },
  diary: {
    label: '다이어리체',
    stack: '"Diary", cursive',
    category: 'script',
    href: archive('Diary'),
    fixedWeight: true,
  },
  'nanum-barunpen': {
    label: '나눔바른펜',
    stack: '"Nanum Barunpen", cursive',
    category: 'script',
    href: archive('NanumBarunpen'),
  },

  /* ---------- 영문 전용 (한글 글리프 없음) ---------- *
   * 한글을 넣으면 폴백 글꼴로 그려집니다. 드롭다운에 그 사실을 표기합니다. */
  parisienne: {
    label: 'Parisienne',
    stack: '"Parisienne", cursive',
    category: 'latin',
    href: google('Parisienne'),
    latinOnly: true,
    fixedWeight: true,
  },
  'great-vibes': {
    label: 'Great Vibes',
    stack: '"Great Vibes", cursive',
    category: 'latin',
    href: google('Great+Vibes'),
    latinOnly: true,
    fixedWeight: true,
  },
  pinyon: {
    label: 'Pinyon Script',
    stack: '"Pinyon Script", cursive',
    category: 'latin',
    href: google('Pinyon+Script'),
    latinOnly: true,
    fixedWeight: true,
  },
  italianno: {
    label: 'Italianno',
    stack: '"Italianno", cursive',
    category: 'latin',
    href: google('Italianno'),
    latinOnly: true,
    fixedWeight: true,
  },
  tangerine: {
    label: 'Tangerine',
    stack: '"Tangerine", cursive',
    category: 'latin',
    href: google('Tangerine:wght@400;700'),
    latinOnly: true,
  },
  sacramento: {
    label: 'Sacramento',
    stack: '"Sacramento", cursive',
    category: 'latin',
    href: google('Sacramento'),
    latinOnly: true,
    fixedWeight: true,
  },
  allura: {
    label: 'Allura',
    stack: '"Allura", cursive',
    category: 'latin',
    href: google('Allura'),
    latinOnly: true,
    fixedWeight: true,
  },
  labelle: {
    label: 'La Belle Aurore',
    stack: '"La Belle Aurore", cursive',
    category: 'latin',
    href: google('La+Belle+Aurore'),
    latinOnly: true,
    fixedWeight: true,
  },
  cormorant: {
    label: 'Cormorant Garamond',
    stack: '"Cormorant Garamond", serif',
    category: 'latin',
    href: google('Cormorant+Garamond:wght@300;400;600'),
    latinOnly: true,
  },
  marcellus: {
    label: 'Marcellus',
    stack: '"Marcellus", serif',
    category: 'latin',
    href: google('Marcellus'),
    latinOnly: true,
    fixedWeight: true,
  },
  playfair: {
    label: 'Playfair Display',
    stack: '"Playfair Display", serif',
    category: 'latin',
    href: google('Playfair+Display:wght@400;600'),
    latinOnly: true,
  },

  /* ---------- 캐주얼 ---------- */
  gaegu: {
    label: '개구',
    stack: '"Gaegu", cursive',
    category: 'casual',
    href: google('Gaegu:wght@300;400;700'),
  },
  himelody: {
    label: '하이멜로디',
    stack: '"Hi Melody", cursive',
    category: 'casual',
    href: google('Hi+Melody'),
    fixedWeight: true,
  },
  gamja: {
    label: '감자꽃',
    stack: '"Gamja Flower", cursive',
    category: 'casual',
    href: google('Gamja+Flower'),
    fixedWeight: true,
  },
  singleday: {
    label: '싱글데이',
    stack: '"Single Day", cursive',
    category: 'casual',
    href: google('Single+Day'),
    fixedWeight: true,
  },
  kirang: {
    label: '기랑해랑',
    stack: '"Kirang Haerang", cursive',
    category: 'casual',
    href: google('Kirang+Haerang'),
    fixedWeight: true,
  },
  stylish: {
    label: '스타일리시',
    stack: '"Stylish", sans-serif',
    category: 'casual',
    href: google('Stylish'),
    fixedWeight: true,
  },
};

/**
 * 드롭다운에 노출할 순서. 카테고리별로 묶어 `<optgroup>` 으로 렌더합니다.
 *
 * 🔴 `FONTS` 에 추가하고 여기 빠뜨리면 화면에 안 나옵니다.
 */
export const FONT_GROUPS: { category: FontCategory; fonts: LayerFont[] }[] = [
  {
    category: 'serif',
    fonts: [
      'serif',
      'maru',
      'gowun-batang',
      'ridi',
      'gyeonggi',
      'hallym',
      'bookend',
      'kopub',
      'songmyung',
      'jeju',
      'hahmlet',
      'noto-serif',
    ],
  },
  {
    category: 'script',
    fonts: [
      'nanum-brush',
      'butpen',
      'kimjungchul',
      'chusa',
      'sinhon',
      'baeeunhye',
      'dasi',
      'sonpyeonji',
      'mingyeong',
      'jangmi',
      'onglyph-dagyeong',
      'onglyph-siwoo',
      'gabia-solmee',
      'gabia-bombaram',
      'cafe24-night',
      'diary',
      'nanum-barunpen',
      'script',
    ],
  },
  { category: 'sans', fonts: ['sans', 'gowun-dodum', 'freesentation', 'noto-sans'] },
  {
    category: 'latin',
    fonts: [
      'parisienne',
      'great-vibes',
      'pinyon',
      'italianno',
      'tangerine',
      'sacramento',
      'allura',
      'labelle',
      'cormorant',
      'marcellus',
      'playfair',
    ],
  },
  { category: 'casual', fonts: ['gaegu', 'himelody', 'gamja', 'singleday', 'kirang', 'stylish'] },
];

/** 평탄화한 노출 순서 */
export const FONT_ORDER: LayerFont[] = FONT_GROUPS.flatMap((g) => g.fonts);

/** @deprecated `FONTS[id].stack` 을 쓰세요. 기존 호출부 호환용입니다 */
export const FONT_STACK: Record<LayerFont, string> = Object.fromEntries(
  Object.entries(FONTS).map(([id, def]) => [id, def.stack]),
) as Record<LayerFont, string>;

/** @deprecated `FONTS[id].label` 을 쓰세요. 기존 호출부 호환용입니다 */
export const FONT_LABEL: Record<LayerFont, string> = Object.fromEntries(
  Object.entries(FONTS).map(([id, def]) => [id, def.label]),
) as Record<LayerFont, string>;

/* ------------------------------------------------------------------ *
 * 로더
 *
 * 이 패키지는 Cloudflare Worker(`workers/api`)도 함께 컴파일하므로 tsconfig 에
 * `dom` lib 이 없습니다. `dom` 을 켜면 Worker 코드에서 브라우저 API 를 실수로 쓰고도
 * 타입 검사를 통과하게 되므로, 로더가 쓰는 것만 아래처럼 좁게 선언합니다.
 * 런타임에서는 `typeof document === 'undefined'` 가드가 Worker 를 보호합니다.
 * ------------------------------------------------------------------ */

interface FontLinkElement {
  rel: string;
  href: string;
  dataset: Record<string, string>;
}

interface MinimalDocument {
  head: { appendChild(node: FontLinkElement): void };
  createElement(tag: 'link'): FontLinkElement;
}

declare const document: MinimalDocument | undefined;

/** 앱이 자체적으로(self-host 등) 이미 제공하는 글꼴 — 중복 다운로드를 막습니다 */
let provided = new Set<LayerFont>();

/** 이미 `<link>` 를 붙인 글꼴 */
const injected = new Set<LayerFont>();

/**
 * 앱이 빌드에 포함해 상시 제공하는 글꼴을 선언합니다. 앱 진입점에서 **한 번** 호출하세요.
 *
 * 청첩장 앱은 `styles/fonts.css` 에 Pretendard·나눔명조를 self-host 하고 있으므로
 * 같은 글꼴을 CDN 에서 또 받아오면 낭비입니다. 에디터는 Pretendard 만 갖고 있습니다.
 */
export function setProvidedFonts(ids: LayerFont[]): void {
  provided = new Set(ids);
}

/**
 * 넘긴 글꼴들의 웹폰트 CSS 를 `<head>` 에 붙입니다. 중복 호출은 안전합니다.
 *
 * 레이어를 렌더하는 쪽(뷰어 커버, 에디터 캔버스)과 글꼴을 미리 보여주는 쪽(피커)에서
 * 부릅니다. `font-display: swap` 이라 로딩 중에는 폴백 글꼴로 먼저 보입니다.
 */
export function ensureFonts(ids: Iterable<LayerFont>): void {
  // SSR·테스트 환경 방어
  if (typeof document === 'undefined') return;

  for (const id of ids) {
    const def = FONTS[id];
    if (!def?.href) continue;
    if (provided.has(id) || injected.has(id)) continue;

    injected.add(id);
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = def.href;
    // 디버깅용 — 어떤 글꼴이 왜 붙었는지 DOM 에서 바로 보입니다
    link.dataset.luviFont = id;
    document.head.appendChild(link);
  }
}
