/**
 * 화면 라벨 — **기능에 붙어 있어서 블록으로 뺄 수 없는 글자들.**
 *
 * ─── 왜 별도의 표인가 (2026-09-13) ──────────────────────────────────────────
 *
 * 카드 문구는 이미 넣고 지우고 옮길 수 있습니다(`sectionText.ts`). 그런데 화면에는 그
 * 목록에 담을 수 없는 글자가 남아 있었습니다:
 *
 *  · 버튼 위의 글자 — '카카오맵', '메시지 남기기', '다시 도전'
 *  · 입력칸의 자리표시자 — '이름', '축하 메시지를 남겨주세요'
 *  · 위젯에 붙은 단위·머리글 — 'DAYS', 요일 머리글, 랭킹의 '초'
 *  · 목록이 비었을 때만 나오는 안내 — '아직 메시지가 없어요...'
 *
 * 이것들은 **자리를 옮기거나 순서를 바꿀 수 없습니다.** 버튼에서 떼어낸 '카카오맵' 은
 * 아무 뜻이 없고, 자리표시자는 입력칸 안에서만 존재합니다. 그래서 블록 목록이 아니라
 * **키 → 글자** 한 장짜리 표로 둡니다.
 *
 * ─── 지울 수 있는 것과 없는 것 ──────────────────────────────────────────────
 *
 * 🔴 **버튼에서 글자를 빼면 누를 수 없는 버튼이 됩니다.** 그래서 두 부류로 나눕니다:
 *
 *  · `OPTIONAL_LABELS` — **비우면 사라집니다.** 안내·장식이라 없어도 화면이 동작합니다
 *    (스크롤 안내, 갤러리 힌트, 방명록 빈 목록 안내, 방명록 입력 머리글)
 *  · 나머지 — **비우면 기본 문구로 돌아갑니다.** 버튼·자리표시자·단위가 여기 속합니다.
 *    에디터는 기본 문구를 입력칸의 자리표시자로 보여주어, 비우면 무엇이 나오는지 알립니다.
 *
 * 이 구분은 `sectionText.ts` 의 "`[]` 와 `undefined` 는 다르다" 와 같은 문제를 다르게 푼
 * 것입니다. 저기서는 전부 지울 수 있어야 했고, 여기서는 **지우면 안 되는 것이 섞여** 있습니다.
 *
 * ─── 기본값이 테마마다 다른 이유 ────────────────────────────────────────────
 *
 * 🔴 **이미 발행된 청첩장의 화면을 바꾸지 않기 위해서입니다.** 발행 스냅샷은 그때의 JSON
 *    이라 이 표의 키가 아예 없고, 없으면 기본값이 그려집니다. 두 테마의 기본값을 하나로
 *    합치면(예: 세이지 가든의 '방명록 남기기' 를 '메시지 남기기' 로) **하객에게 이미 나가
 *    있는 청첩장의 버튼 글자가 말없이 바뀝니다.** 지금 화면 그대로를 기본값으로 적습니다.
 */
import type { ThemeId } from './content';

export type LabelKey =
  // 커버
  | 'coverScroll'
  // 캘린더
  | 'calendarWeekdays'
  | 'countdownDays'
  | 'countdownHours'
  | 'countdownMinutes'
  | 'countdownSeconds'
  // 갤러리
  | 'gallerySwipeHint'
  // 오시는 길
  | 'mapKakao'
  | 'mapNaver'
  | 'mapTel'
  // 방명록
  | 'guestbookEmpty'
  | 'guestbookFormTitle'
  | 'guestbookNamePlaceholder'
  | 'guestbookMessagePlaceholder'
  | 'guestbookSubmit'
  // 마무리
  | 'shareKakao'
  | 'shareKakaoBusy'
  | 'shareCopy'
  | 'shareCopied'
  // 미니게임
  | 'gameOver'
  | 'gameScoreUnit'
  | 'gameRetry'
  | 'gameRanked'
  | 'gameRankSubmit'
  | 'gameRankSkip'
  | 'gameNicknamePlaceholder';

/** 사용자가 고친 라벨만 담깁니다. 키가 없으면 그 테마의 기본값입니다 */
export type LabelMap = Partial<Record<LabelKey, string>>;

/** 전부 채워진 라벨 — 뷰어가 받는 모양 */
export type ResolvedLabels = Record<LabelKey, string>;

/**
 * **비우면 사라지는** 라벨. 나머지는 비우면 기본값으로 돌아갑니다.
 *
 * 기준은 하나입니다: **그 글자가 없어도 하객이 할 일을 할 수 있는가.** 스크롤 안내가
 * 없어도 스크롤은 되고, 빈 방명록 안내가 없어도 입력칸은 그대로 있습니다. 반면 버튼에서
 * 글자를 빼면 무엇을 누르는 버튼인지 알 수 없습니다.
 */
export const OPTIONAL_LABELS: ReadonlySet<LabelKey> = new Set<LabelKey>([
  'coverScroll',
  'gallerySwipeHint',
  'guestbookEmpty',
  'guestbookFormTitle',
]);

/** 요일 머리글은 한 칸에 일곱 개라 쉼표로 나눕니다 */
export const WEEKDAY_SEPARATOR = ',';

/** 랭킹 등록 안내에서 등수로 바뀌는 자리 (`fillSectionText` 와 같은 중괄호 방식) */
export const RANK_TOKEN = '{순위}';

/**
 * 테마별 기본 라벨.
 *
 * ⚠️ **여기 적힌 값이 곧 지금 화면의 값입니다.** 고치면 이 표를 저장하지 않은 청첩장
 *    (= 거의 전부)의 화면이 함께 바뀝니다. 디자인을 바꾸려는 것이 아니라면 건드리지 마세요.
 */
export const LABEL_DEFAULTS: Record<ThemeId, ResolvedLabels> = {
  // 로즈 클래식 — 이모지를 섞어 쓰는 테마
  classic1: {
    coverScroll: 'SCROLL ↓',
    calendarWeekdays: '일,월,화,수,목,금,토',
    countdownDays: 'DAYS',
    countdownHours: 'HOURS',
    countdownMinutes: 'MIN',
    countdownSeconds: 'SEC',
    gallerySwipeHint: '· 옆으로 넘겨 다음 사진',
    mapKakao: '카카오맵',
    mapNaver: '네이버지도',
    mapTel: '전화',
    guestbookEmpty: '아직 메시지가 없어요. 첫 한마디를 남겨주세요 💌',
    guestbookFormTitle: '신랑 · 신부에게 한마디 남기기',
    guestbookNamePlaceholder: '이름',
    guestbookMessagePlaceholder: '축하 메시지를 남겨주세요',
    guestbookSubmit: '💌 메시지 남기기',
    shareKakao: '💬 카카오톡으로 공유',
    shareKakaoBusy: '💬 여는 중…',
    shareCopy: '🔗 청첩장 링크 복사',
    shareCopied: '🔗 링크 복사됨!',
    gameOver: 'Game Over',
    gameScoreUnit: '초',
    gameRetry: '다시 도전',
    gameRanked: `🎉 랭킹 ${RANK_TOKEN}위로 등록됐어요!`,
    gameRankSubmit: '🏆 랭킹에 등록하기',
    gameRankSkip: '등록 없이 다시하기',
    gameNicknamePlaceholder: '닉네임을 입력하세요',
  },
  // 세이지 가든 — 이모지 없이 활자로만
  classic2: {
    coverScroll: 'SCROLL',
    calendarWeekdays: 'SUN,MON,TUE,WED,THU,FRI,SAT',
    countdownDays: 'DAYS',
    countdownHours: 'HOURS',
    countdownMinutes: 'MIN',
    countdownSeconds: 'SEC',
    gallerySwipeHint: '· 옆으로 넘겨 다음 사진',
    mapKakao: '카카오맵',
    mapNaver: '네이버지도',
    mapTel: '전화',
    guestbookEmpty: '아직 방명록이 없어요. 첫 한마디를 남겨주세요.',
    // 세이지 가든에는 입력 머리글이 없습니다. 비어 있어도 **사용자는 넣을 수 있습니다**
    guestbookFormTitle: '',
    guestbookNamePlaceholder: '이름',
    guestbookMessagePlaceholder: '축하 메시지를 남겨주세요',
    guestbookSubmit: '방명록 남기기',
    shareKakao: '카카오톡으로 공유',
    shareKakaoBusy: '여는 중…',
    shareCopy: '청첩장 링크 복사',
    shareCopied: '링크 복사됨',
    gameOver: 'Game Over',
    gameScoreUnit: '초',
    gameRetry: '다시 도전',
    gameRanked: `랭킹 ${RANK_TOKEN}위로 등록됐어요`,
    gameRankSubmit: '랭킹에 등록하기',
    gameRankSkip: '등록 없이 다시하기',
    gameNicknamePlaceholder: '닉네임을 입력하세요',
  },
};

const LABEL_KEYS = Object.keys(LABEL_DEFAULTS.classic1) as LabelKey[];

/** 한 라벨의 길이 상한. 버튼 한 줄을 넘기면 디자인이 깨집니다 */
export const LABEL_MAX_LENGTH = 80;

/**
 * 저장된 값을 정리합니다. 글자가 아닌 것과 모르는 키는 버립니다.
 *
 * 🔴 **빈 문자열을 살려서 돌려줍니다** — `OPTIONAL_LABELS` 에서 빈 문자열은 "지웠다" 는
 *    뜻입니다. 여기서 빈 값을 떨어뜨리면 지운 문구가 기본값으로 되살아납니다.
 */
export function normalizeLabels(value: unknown): LabelMap {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const raw = value as Record<string, unknown>;
  const out: LabelMap = {};
  for (const key of LABEL_KEYS) {
    const v = raw[key];
    if (typeof v === 'string') out[key] = v.slice(0, LABEL_MAX_LENGTH);
  }
  return out;
}

/**
 * 뷰어가 쓸 최종 라벨.
 *
 * 비어 있을 때의 처리가 부류마다 다릅니다 — 위 `OPTIONAL_LABELS` 주석 참고.
 */
export function resolveLabels(themeId: ThemeId, stored: unknown): ResolvedLabels {
  const defaults = LABEL_DEFAULTS[themeId] ?? LABEL_DEFAULTS.classic1;
  const saved = normalizeLabels(stored);
  const out = {} as ResolvedLabels;
  for (const key of LABEL_KEYS) {
    const value = saved[key];
    if (value === undefined) {
      out[key] = defaults[key];
    } else if (value.trim() === '' && !OPTIONAL_LABELS.has(key)) {
      // 지울 수 없는 라벨을 비웠다 = 기본값으로 되돌리고 싶다는 뜻입니다
      out[key] = defaults[key];
    } else {
      out[key] = value;
    }
  }
  return out;
}

/** 라벨 경로의 접두어. 에디터가 이 경로를 보고 기본값을 자리표시자로 보여줍니다 */
export const LABEL_PATH_PREFIX = 'core.labels.';

/**
 * 이 경로가 화면 라벨이라면 그 테마의 기본값을 돌려줍니다 (아니면 `undefined`).
 *
 * 에디터 폼은 테마와 무관한 매니페스트 한 장에서 만들어지는데, 기본 라벨은 테마마다
 * 다릅니다. 매니페스트에 기본값을 적어 두면 한쪽 테마에서는 거짓말이 되므로,
 * **경로를 보고 그때그때 찾습니다.**
 */
export function defaultLabelForPath(themeId: ThemeId, path: string): string | undefined {
  if (!path.startsWith(LABEL_PATH_PREFIX)) return undefined;
  const key = path.slice(LABEL_PATH_PREFIX.length) as LabelKey;
  const defaults = LABEL_DEFAULTS[themeId] ?? LABEL_DEFAULTS.classic1;
  return Object.prototype.hasOwnProperty.call(defaults, key) ? defaults[key] : undefined;
}

/**
 * 요일 머리글 일곱 칸.
 *
 * 일곱 개가 아니면 기본값을 씁니다 — 달력은 7열 격자라 개수가 어긋나면 요일과 날짜가
 * 어긋난 채 그려집니다. 사용자가 쉼표를 하나 빠뜨렸다고 달력이 깨지면 안 됩니다.
 */
export function resolveWeekdays(themeId: ThemeId, label: string): string[] {
  const parts = label.split(WEEKDAY_SEPARATOR).map((s) => s.trim());
  if (parts.length === 7) return parts;
  const fallback = (LABEL_DEFAULTS[themeId] ?? LABEL_DEFAULTS.classic1).calendarWeekdays;
  return fallback.split(WEEKDAY_SEPARATOR);
}

/**
 * 랭킹 등록 안내를 `{순위}` 앞뒤로 자릅니다.
 *
 * 등수만 굵게 그리려면 문자열을 통째로 넣을 수 없어서, 앞·뒤 조각을 따로 돌려줍니다.
 * 토큰이 없으면 뒤 조각이 비고 문구는 그대로 나옵니다 (사용자가 지웠을 수 있습니다).
 */
export function splitRankLabel(label: string): { before: string; after: string } {
  const at = label.indexOf(RANK_TOKEN);
  if (at < 0) return { before: label, after: '' };
  return { before: label.slice(0, at), after: label.slice(at + RANK_TOKEN.length) };
}
