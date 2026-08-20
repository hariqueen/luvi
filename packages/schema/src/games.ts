/**
 * 미니게임 카탈로그 · 기본 문구 · 정규화 — 게임 설정의 단일 소스.
 *
 * 타입은 `content.ts`(`GameContent`), 여기는 그 **값**을 담당합니다:
 * 고를 수 있는 게임 목록, 기본 문구, 옛 문서 승격, 문구 치환.
 *
 * 🔴 왜 기본값을 여기 한 곳에 모으는가 — 에디터(폼 초기값)·워커(문서 보정)·뷰어(옛 스냅샷)
 *    세 곳이 각자 기본값을 들고 있으면, 한쪽만 고쳐질 때 **에디터에 보이는 문구와 하객
 *    화면의 문구가 달라집니다.** 실제로 그게 이 기능의 가장 흔한 사고 지점입니다.
 */
import type {
  GameContent,
  GameId,
  GameLeaderboard,
  GameSpeed,
  GameTexts,
  PetalItem,
  TextBlock,
  TextBlockStyle,
} from './content';

/** 게임 하나의 소개 — 에디터의 '게임 선택' 카드에 쓰입니다 */
export interface GameDef {
  id: GameId;
  /** 사용자에게 보이는 이름 */
  name: string;
  /** 카드에 함께 적는 짧은 한 줄 */
  tagline: string;
  /** 카드 아이콘 (이모지 — 썸네일을 따로 만들지 않아도 알아볼 수 있게) */
  icon: string;
  /** 무엇을 설정할 수 있는지 */
  description: string;
}

/**
 * 🔴 `Record<GameId, GameDef>` 로 선언한 이유: `GameId` 에 게임을 추가하면 여기에 항목을
 *    넣지 않는 한 **컴파일이 실패**합니다. 고를 수 없는 게임이 저장되는 사고를 막습니다.
 */
export const GAMES_BY_ID: Record<GameId, GameDef> = {
  catch: {
    id: 'catch',
    name: '떨어지는 것 받기',
    tagline: '바구니로 받아 오래 버티기',
    icon: '🧺',
    description:
      '하늘에서 떨어지는 것을 바구니로 받습니다. 놓치거나 벌에 맞으면 체력이 줄고, ' +
      '버틴 시간이 점수가 됩니다. 떨어질 아이콘·사진과 난이도, 문구를 바꿀 수 있어요.',
  },
};

/** 선택 화면에 노출할 순서. 지금은 게임이 하나뿐이라 카드도 하나만 뜹니다 */
export const GAME_LIST: readonly GameDef[] = [GAMES_BY_ID.catch];

/** 게임 id 를 못 알아들었을 때 여기로 떨어집니다 */
export const DEFAULT_GAME_ID: GameId = 'catch';

export function parseGameId(value: unknown): GameId {
  return typeof value === 'string' && value in GAMES_BY_ID ? (value as GameId) : DEFAULT_GAME_ID;
}

/** 떨어질 것으로 고를 수 있는 아이콘 프리셋. 늘리면 에디터 칩이 자동으로 늘어납니다 */
export const GAME_EMOJIS = [
  '🐶', '🐱', '🐰', '🐻', '🐥', '🌸', '🎁', '💍', '💌', '🍰', '⭐', '❤️',
] as const;

/** 떨어질 것으로 고를 수 있는 최대 개수 (아이콘·사진 합쳐서) */
export const GAME_ITEM_MAX = 6;

export const GAME_SPEED_OPTIONS: { value: GameSpeed; label: string }[] = [
  { value: 'easy', label: '쉬움' },
  { value: 'normal', label: '보통' },
  { value: 'hard', label: '어려움' },
];

/** 랭킹에 보여줄 순위 개수의 허용 범위 */
export const LEADERBOARD_SIZE_RANGE = { min: 3, max: 20 } as const;

/**
 * 기본 순위 개수.
 *
 * 예전 화면에 'TOP 7' 로 **하드코딩**돼 있던 값입니다 — 이 필드가 없는 문서를 읽을 때
 * 이 값을 쓰면 지금까지의 랭킹판이 그대로 유지됩니다.
 */
export const DEFAULT_LEADERBOARD_SIZE = 7;

/**
 * 게임 안 기본 문구. **예전 화면에 박혀 있던 문장 그대로**입니다 —
 * 이 필드가 없는 문서를 열어도 하객 화면이 바뀌지 않아야 합니다.
 */
export const DEFAULT_GAME_TEXTS: GameTexts = {
  startTitle: '{이름}를 받아주세요!',
  startDesc: '바구니 🧺 를 움직여 떨어지는 {이름}를 받으세요.\n놓치거나 벌 🐝 을 받으면 체력이 줄어요!',
  startButton: '🎮 게임 시작',
  resultCaught: '{이름}를 {횟수}번 받았어요',
  resultHint: '생존 시간이 곧 점수예요',
};

export const DEFAULT_GAME_LEADERBOARD: GameLeaderboard = {
  show: true,
  size: DEFAULT_LEADERBOARD_SIZE,
  title: '🏆 {이름} 컬렉터 랭킹',
  empty: '아직 기록이 없어요.\n첫 번째 {이름} 컬렉터가 되어보세요! 🐶',
  reward: '🎁 결혼식 당일까지 1등 컬렉터님께 신랑·신부가 준비한 선물을 드려요!',
};

let blockSeq = 0;
/** 문단 ID. `crypto.randomUUID` 가 없는 환경(옛 사파리·워커)도 있어 폴백을 둡니다 */
function nextBlockId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  blockSeq += 1;
  return `block-${blockSeq}`;
}

export function createTextBlock(text = '', style: TextBlockStyle = 'body'): TextBlock {
  return { id: nextBlockId(), text, style };
}

/**
 * 기본 소개 문구 — 예전 미니게임 섹션의 배지·제목·설명 세 줄입니다.
 *
 * 사용자가 **전부 지운 경우**(빈 배열)와 **아직 없는 경우**(옛 문서)를 구분해야 합니다.
 * 그래서 `normalizeGame` 은 배열이 아닐 때만 이걸 채웁니다 — 지운 문구가 되살아나면
 * 지울 방법이 없는 필드가 됩니다.
 */
export function defaultGameIntro(): TextBlock[] {
  return [
    createTextBlock('🎮 MINI GAME', 'badge'),
    createTextBlock('떨어지는 {이름} 받기', 'title'),
    createTextBlock(
      '신랑·신부의 반려동물 {이름}가 하늘에서 떨어져요!\n바구니로 오래 받을수록 고득점, 1등은 선물이 있어요 🎁',
      'body',
    ),
  ];
}

/** 새 청첩장의 미니게임 설정 */
export function defaultGame(petName = ''): GameContent {
  return {
    gameId: DEFAULT_GAME_ID,
    petName,
    fallingItems: [],
    idleItems: [],
    speed: 'normal',
    intro: defaultGameIntro(),
    texts: { ...DEFAULT_GAME_TEXTS },
    leaderboard: { ...DEFAULT_GAME_LEADERBOARD },
  };
}

function validItems(value: unknown): PetalItem[] {
  if (!Array.isArray(value)) return [];
  return value.filter((it): it is PetalItem => {
    if (!it || typeof it !== 'object') return false;
    const item = it as PetalItem;
    if (item.kind === 'emoji') return typeof item.value === 'string' && item.value.length > 0;
    if (item.kind === 'image') return Boolean(item.asset?.key);
    return false;
  });
}

/** 문구는 '빈 문자열로 지운 것' 을 존중합니다. 값이 문자열이 아닐 때만(= 없을 때) 기본값 */
const text = (value: unknown, fallback: string): string =>
  typeof value === 'string' ? value : fallback;

/** 비면 화면이 깨지는 문구(버튼 라벨)는 공백까지 기본값으로 되돌립니다 */
const required = (value: unknown, fallback: string): string =>
  typeof value === 'string' && value.trim().length > 0 ? value : fallback;

function speedOf(value: unknown): GameSpeed {
  return value === 'easy' || value === 'hard' || value === 'normal' ? value : 'normal';
}

function clampSize(value: unknown): number {
  const n = typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : DEFAULT_LEADERBOARD_SIZE;
  return Math.min(LEADERBOARD_SIZE_RANGE.max, Math.max(LEADERBOARD_SIZE_RANGE.min, n));
}

/**
 * 저장된 게임 설정을 **저장 가능한 완전한 형태**로 정리합니다 —
 * 읽는 쪽(뷰어)과 채우는 쪽(워커의 문서 보정)이 같은 함수를 씁니다.
 *
 * 하는 일:
 *  1. 없는 필드 채우기 (발행된 청첩장은 예식까지 몇 달 살아 있어 그동안 필드가 늘어납니다)
 *  2. 옛 필드 승격 — `fallingImages`→`fallingItems`, `idleImage`→`idleItems`,
 *     `showLeaderboard`→`leaderboard.show`. 승격이 여기 한 곳에만 있어야
 *     에디터·뷰어·워커의 판정이 갈리지 않습니다.
 */
export function normalizeGame(raw: unknown): GameContent {
  const g = (raw && typeof raw === 'object' ? raw : {}) as Partial<GameContent> &
    Record<string, unknown>;

  // 떨어질 것 — 새 필드가 비어 있으면 옛 이미지 목록을 그대로 승격합니다
  let fallingItems = validItems(g.fallingItems);
  if (fallingItems.length === 0 && Array.isArray(g.fallingImages)) {
    fallingItems = g.fallingImages
      .filter((a) => Boolean(a?.key))
      .map((asset) => ({ kind: 'image' as const, asset }));
  }

  // 시작 화면 그림 — 하나만 씁니다 (여러 개 골라도 첫 번째)
  const idleFromNew = validItems(g.idleItems)[0] ?? null;
  const idleItem: PetalItem | null =
    idleFromNew ?? (g.idleImage?.key ? { kind: 'image', asset: g.idleImage } : null);
  const idleItems: PetalItem[] = idleItem ? [idleItem] : [];

  const lb = (g.leaderboard ?? {}) as Partial<GameLeaderboard>;

  return {
    gameId: parseGameId(g.gameId),
    petName: typeof g.petName === 'string' ? g.petName : '',
    fallingItems: fallingItems.slice(0, GAME_ITEM_MAX),
    idleItems,
    speed: speedOf(g.speed),
    // 배열일 때만 그대로 씁니다 — 빈 배열은 '사용자가 다 지웠다' 는 뜻입니다
    intro: Array.isArray(g.intro) ? (g.intro as TextBlock[]).filter((b) => b && typeof b.text === 'string') : defaultGameIntro(),
    texts: {
      startTitle: text(g.texts?.startTitle, DEFAULT_GAME_TEXTS.startTitle),
      startDesc: text(g.texts?.startDesc, DEFAULT_GAME_TEXTS.startDesc),
      startButton: required(g.texts?.startButton, DEFAULT_GAME_TEXTS.startButton),
      resultCaught: text(g.texts?.resultCaught, DEFAULT_GAME_TEXTS.resultCaught),
      resultHint: text(g.texts?.resultHint, DEFAULT_GAME_TEXTS.resultHint),
    },
    leaderboard: {
      // 옛 문서는 `showLeaderboard` 만 들고 있습니다. 그 값이 곧 지금까지의 화면입니다
      show:
        typeof lb.show === 'boolean'
          ? lb.show
          : typeof g.showLeaderboard === 'boolean'
            ? g.showLeaderboard
            : DEFAULT_GAME_LEADERBOARD.show,
      size: clampSize(lb.size),
      title: text(lb.title, DEFAULT_GAME_LEADERBOARD.title),
      empty: text(lb.empty, DEFAULT_GAME_LEADERBOARD.empty),
      reward: text(lb.reward, DEFAULT_GAME_LEADERBOARD.reward),
    },
  };
}

/**
 * 문구의 `{…}` 자리를 실제 값으로 바꿉니다.
 *
 * 아는 이름만 바꾸고 **모르는 `{…}` 는 그대로 둡니다** — 사용자가 중괄호를 문장에 쓸 수도
 * 있는데 조용히 지우면 글자가 사라진 것처럼 보입니다.
 */
export function fillGameText(
  template: string,
  vars: { 이름?: string; 횟수?: number | string; 점수?: number | string },
): string {
  return template.replace(/\{(이름|횟수|점수)\}/g, (whole, key: string) => {
    const value = (vars as Record<string, unknown>)[key];
    return value === undefined || value === null ? whole : String(value);
  });
}
