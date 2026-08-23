/**
 * 청첩장 콘텐츠 스키마 — 에디터와 뷰어가 공유하는 단일 소스.
 *
 * 설계 근거는 `docs/03-data-model.md`. 핵심 원칙 두 가지:
 *  1. 코어 / 테마 확장을 분리한다 — 테마가 늘어도 에디터의 코어 폼을 재사용할 수 있어야 한다.
 *  2. 파생 가능한 값은 저장하지 않는다 — 캘린더 월/일은 `weddingAt` 에서 계산한다.
 *     (따로 입력받으면 불일치가 반드시 생긴다)
 */

import type { SectionBgMap } from './design';
import type { SectionTextMap } from './sectionText';

/** 이미지·오디오 참조. 절대 URL을 저장하지 않는다 — 도메인이 바뀌면 전부 고쳐야 한다. */
export interface AssetRef {
  /** R2 키 (예: 'inv/abc123/gallery/003.webp') */
  key: string;
  /** 원본 폭·높이 — <img width height> 로 레이아웃 시프트를 막는다 */
  w: number;
  h: number;
  alt?: string;
}

/**
 * 낙하 연출로 떨어지는 것 하나 — **이모지 아이콘이거나 올린 사진**입니다.
 *
 * 둘을 한 배열에 섞어 담습니다. "아이콘만 / 사진만 / 둘 다" 를 각각 다른 필드로 두면
 * 조합마다 규칙이 갈려 화면과 설정이 어긋납니다 — 실제로 예전에는 사진이 없을 때 뷰어가
 * 몰래 🐾 를 섞어서, 에디터에는 1개인데 화면에는 2종류가 떨어졌습니다.
 */
export type PetalItem =
  | { kind: 'emoji'; value: string }
  | { kind: 'image'; asset: AssetRef };

/** 낙하 요소로 고를 수 있는 최대 개수 (아이콘·사진 합쳐서) */
export const PETAL_ITEM_MAX = 3;

/**
 * 낙하 아이콘 프리셋. 업로드 없이 바로 쓸 수 있어야 해서 이모지로 둡니다
 * (어느 기기에서나 뜨고, 용량이 0 이고, 배경 투명 걱정이 없습니다).
 * 늘리려면 여기에 추가하면 에디터의 아이콘 칩이 자동으로 늘어납니다.
 */
export const PETAL_EMOJIS = ['🌸', '🌺', '🍃', '🍀', '❤️', '✨', '⭐', '🎈', '🕊️', '🐾'] as const;

/**
 * 커버 텍스트의 글꼴 선택지. 실제 정의(라벨·CSS·웹폰트 주소)는 `fonts.ts` 의 `FONTS` 입니다.
 *
 * 🔴 `sans` · `serif` · `script` 는 **이름을 바꾸거나 다른 글꼴에 재사용하면 안 됩니다.**
 *    이미 발행된 청첩장 문서가 이 값을 저장하고 있어서, 뜻이 바뀌면 하객 화면의 글씨가 바뀝니다.
 *    (각각 프리텐다드 · 나눔명조 · 나눔손글씨 펜)
 */
export type LayerFont =
  // 고딕
  | 'sans'
  | 'gowun-dodum'
  | 'freesentation'
  | 'noto-sans'
  // 명조 · 바탕
  | 'serif'
  | 'maru'
  | 'gowun-batang'
  | 'ridi'
  | 'gyeonggi'
  | 'hallym'
  | 'bookend'
  | 'kopub'
  | 'songmyung'
  | 'jeju'
  | 'hahmlet'
  | 'noto-serif'
  // 손글씨 · 캘리그래피
  | 'script'
  | 'nanum-brush'
  | 'butpen'
  | 'kimjungchul'
  | 'chusa'
  | 'sinhon'
  | 'baeeunhye'
  | 'dasi'
  | 'sonpyeonji'
  | 'mingyeong'
  | 'jangmi'
  | 'onglyph-dagyeong'
  | 'onglyph-siwoo'
  | 'gabia-solmee'
  | 'gabia-bombaram'
  | 'cafe24-night'
  | 'diary'
  | 'nanum-barunpen'
  // 영문 전용 (한글 글리프 없음)
  | 'parisienne'
  | 'great-vibes'
  | 'pinyon'
  | 'italianno'
  | 'tangerine'
  | 'sacramento'
  | 'allura'
  | 'labelle'
  | 'cormorant'
  | 'marcellus'
  | 'playfair'
  // 캐주얼
  | 'gaegu'
  | 'himelody'
  | 'gamja'
  | 'singleday'
  | 'kirang'
  | 'stylish';
export type LayerAlign = 'left' | 'center' | 'right';

/**
 * 커버 사진 위에 자유 배치되는 텍스트 한 덩이.
 *
 * 🔴 **좌표와 크기를 px 가 아니라 비율(0~1)로 저장합니다.** 이게 이 타입의 핵심 제약입니다.
 *    에디터는 데스크톱의 기기 프레임(≈390px 상당) 안에서 편집하지만 하객은 실제 폰 폭
 *    (320~430px)에서 봅니다. px 로 저장하면 **하객 화면에서 위치가 어긋납니다.**
 *    폰트 크기도 캔버스 폭 대비 비율이라 화면이 커지면 함께 커집니다.
 */
export interface TextLayer {
  id: string;
  /** 줄바꿈 허용 */
  text: string;
  /** 캔버스 좌상단 기준 가로 위치 비율 (0~1). align 의 기준점이다 */
  x: number;
  /** 세로 위치 비율 (0~1) */
  y: number;
  /** 캔버스 **폭** 대비 폰트 크기 비율. 예: 0.08 → 폭 390px 에서 31.2px */
  size: number;
  align: LayerAlign;
  /** CSS 색상 문자열 */
  color: string;
  font: LayerFont;
  /** 100~900 */
  weight: number;
  lineHeight: number;
  /**
   * 사진 위 가독성 보조 — 밝은 사진에 흰 글씨를 얹으면 안 보입니다.
   * 자유 배치를 허용하는 대신 이걸로 최악의 결과를 막습니다.
   */
  shadow: boolean;
  /** 글자 간격 (em) */
  letterSpacing: number;
}

export interface Person {
  name: string;
  /** 커버용 영문 이름 */
  nameEn: string;
  /** 이름만 (성 제외) */
  firstName: string;
  father: string;
  mother: string;
  /** 장남 / 장녀 등 */
  relation: string;
}

export interface TransportItem {
  icon: string;
  title: string;
  desc: string;
}

export interface AccountItem {
  label: string;
  bank: string;
  /** 복사용 계좌번호 */
  number: string;
  kakaoPay?: string;
}

export interface AccountGroup {
  title: string;
  items: AccountItem[];
}

export type GameSpeed = 'easy' | 'normal' | 'hard';

/**
 * 어떤 미니게임을 쓰는지. **값이 문서에 저장되므로 이름을 바꾸면 안 됩니다.**
 * 카탈로그(이름·설명·기본 문구)는 `games.ts` 에 있습니다.
 */
export type GameId = 'catch';

/** 문단 하나의 역할. 크기·색은 테마가 정합니다 (같은 값이 디자인마다 다르게 그려집니다) */
export type TextBlockStyle = 'badge' | 'title' | 'body';

/**
 * 순서를 바꿀 수 있는 문단 하나 — 커버 텍스트(`TextLayer`)의 '흐름 배치' 버전입니다.
 *
 * 커버는 사진 위 **자유 배치**라 좌표를 갖지만, 섹션 소개 문구는 위에서 아래로 흐르므로
 * 좌표 대신 **배열 순서**가 위치입니다. 그래서 별도 타입입니다 — 좌표를 갖는 타입을
 * 여기서 재사용하면 쓰이지 않는 x·y 가 저장돼 나중에 무슨 값인지 알 수 없게 됩니다.
 */
export interface TextBlock {
  id: string;
  /** 줄바꿈이 화면에 그대로 반영됩니다 */
  text: string;
  style: TextBlockStyle;
}

/**
 * 게임 화면 **안**의 문구. 기본값은 `games.ts` 의 `DEFAULT_GAME_TEXTS`.
 *
 * `{이름}`·`{횟수}`·`{점수}` 를 쓰면 실제 값으로 바뀝니다 (`fillGameText`).
 */
export interface GameTexts {
  /** 시작 화면 큰 글씨 */
  startTitle: string;
  /** 시작 화면 설명 (여러 줄) */
  startDesc: string;
  /** 시작 버튼 */
  startButton: string;
  /** 결과 화면 한 줄 (예: '{이름}를 {횟수}번 받았어요') */
  resultCaught: string;
  /** 점수 아래 작은 안내 */
  resultHint: string;
}

export interface GameLeaderboard {
  /** 랭킹판을 보여줄지 */
  show: boolean;
  /** 몇 등까지 보여줄지 */
  size: number;
  title: string;
  /** 기록이 하나도 없을 때 (여러 줄) */
  empty: string;
  /** 랭킹판 맨 아래 안내. 비우면 그 줄이 사라집니다 */
  reward: string;
}

/**
 * 미니게임 설정.
 *
 * 🔴 `fallingImages`·`idleImage`·`showLeaderboard` 는 **옛 문서 전용**입니다. 새 값은
 *    `fallingItems`·`idleItems`(아이콘/사진 섞기) 와 `leaderboard.show` 로 갑니다.
 *    읽는 쪽은 반드시 `normalizeGame()` 을 통과시키세요 — 승격이 거기 한 곳에만 있습니다.
 */
export interface GameContent {
  gameId: GameId;
  petName: string;
  /** 떨어지는 것 — 아이콘·사진을 섞어서 */
  fallingItems: PetalItem[];
  /** 시작 화면 그림 — 아이콘이나 사진 하나 */
  idleItems: PetalItem[];
  /** 난이도 */
  speed: GameSpeed;
  /** 섹션 소개 문구 (게임 캔버스 위쪽) */
  intro: TextBlock[];
  texts: GameTexts;
  leaderboard: GameLeaderboard;

  /** @deprecated 옛 문서 — `normalizeGame` 이 `fallingItems` 로 승격합니다 */
  fallingImages?: AssetRef[];
  /** @deprecated 옛 문서 — `idleItems` 로 승격 */
  idleImage?: AssetRef | null;
  /** @deprecated 옛 문서 — `leaderboard.show` 로 승격 */
  showLeaderboard?: boolean;
}

/** 모든 테마가 공유하는 필드 */
export interface CoreContent {
  couple: { groom: Person; bride: Person };
  /** 'YYYY-MM-DDTHH:mm:ss' (한국 시간). 캘린더·D-day·일정등록이 전부 여기서 파생 */
  weddingAt: string;
  cover: {
    /**
     * 대표 사진. 이게 없으면 커버를 편집할 수 없습니다 —
     * 에디터가 "대표 사진을 먼저 골라주세요" 로 막습니다.
     */
    image: AssetRef | null;
    /**
     * 사진 위 텍스트. 사용자가 자유 배치합니다.
     * 새 청첩장은 기본 레이어 3개(문구·이름·날짜)가 놓인 상태로 시작합니다 —
     * 빈 사진에서 시작하면 무엇을 해야 할지 알 수 없습니다.
     */
    layers: TextLayer[];
  };
  greeting: {
    message: string;
    bubbleText: string;
    bubbleImage: AssetRef | null;
    /** 반려견 말풍선(아이콘+문구) 노출 여부. 끄면 인사말 본문만 남는다 */
    showBubble: boolean;
  };
  /** 첫 항목이 대표 이미지 */
  gallery: AssetRef[];
  location: {
    venue: string;
    hall: string;
    tel: string;
    address: string;
    addressForCopy: string;
    mapEmbedSrc: string;
    kakaoMapUrl: string;
    naverMapUrl: string;
    transport: TransportItem[];
  };
  account: {
    description: string;
    groups: AccountGroup[];
  };
  footer: { image: AssetRef | null };
  bgm: AssetRef | null;
  /**
   * 카드마다 적히는 문구 — 윗줄·제목·안내를 섹션별로 덮어씁니다.
   *
   * **비어 있으면 그 디자인의 기본 문구**입니다 (기본값은 `sectionText.ts` 한 곳).
   *
   * ⚠️ 이 필드가 생기기 전 문서·스냅샷에는 없습니다. 읽는 쪽은
   *    `resolveSectionText(themeId, core.sectionText, …)` 를 통과시키세요.
   */
  sectionText: SectionTextMap;
  /**
   * 화면 꾸미기 — 섹션마다 다르게 정할 수 있는 것.
   *
   * ⚠️ 이 필드가 생기기 전 문서·스냅샷에는 없습니다. 읽는 쪽은
   *    `normalizeSectionBg(core.design?.sectionBg)` 로 통과시키세요 (`design.ts`).
   */
  design: {
    /**
     * 섹션 키 → 배경색(`#RRGGBB`). **키가 없으면 그 디자인의 기본 배경**입니다.
     *
     * 색을 '기본으로 되돌리기' 는 빈 문자열을 저장합니다 — Firestore 부분 업데이트로
     * 중첩 키를 지우는 것보다 안전하고, 읽는 쪽이 빈 값을 '없음' 으로 봅니다.
     */
    sectionBg: SectionBgMap;
  };
  /**
   * 화면 위로 떨어지는 연출. on/off 는 `features.petals` 이고, 여기는 모양·양입니다.
   *
   * ⚠️ 이 필드가 생기기 전 스냅샷에는 없습니다. 읽는 쪽이 기본값을 채워야 합니다
   *    (`image` 없으면 인사말 말풍선 아이콘 = 지금까지의 동작, `count` 없으면 9).
   */
  effects: {
    petals: {
      /**
       * 떨어질 것들 — 이모지 아이콘과 올린 사진을 **섞어서** 최대 `PETAL_ITEM_MAX` 개.
       *
       * 비워두면 인사말 말풍선 아이콘이 떨어집니다 (지금까지의 동작).
       */
      items: PetalItem[];
      /**
       * @deprecated `items` 이전의 단일 이미지 필드.
       *
       * ⚠️ **지우지 마세요.** 이미 발행된 스냅샷이 이 필드만 들고 있습니다.
       *    읽는 쪽(`normalizePetalItems`)이 `items` 가 비었을 때 이 값을 items 로 올립니다.
       */
      image: AssetRef | null;
      /** 동시에 떨어지는 개수 (0~30). 0 이면 아무것도 안 떨어집니다 */
      count: number;
    };
  };
  share: {
    title: string;
    description: string;
    image: AssetRef | null;
    /** 캘린더 일정 길이(분) */
    durationMinutes: number;
  };
}

/**
 * classic1 테마 전용 필드.
 *
 * 미니게임 설정은 두 디자인(classic1·classic2)이 **같은 값을 공유**합니다 —
 * 저장 위치가 여기인 것은 초기 구현의 흔적이고, 어댑터가 테마와 무관하게 읽습니다.
 * 옮기면 이미 발행된 문서의 게임 설정이 전부 사라지므로 그대로 둡니다.
 */
export interface Classic1Content {
  game: GameContent;
}

export interface ContentDoc {
  core: CoreContent;
  theme: {
    classic1?: Classic1Content;
    classic2?: Record<string, unknown>;
  };
}

/**
 * 청첩장에 담긴 섹션 — **배열 순서가 곧 화면 순서**입니다.
 * 여기 없는 섹션은 에디터의 "추가할 수 있는 것" 목록에 나타납니다.
 *
 * on/off 를 boolean 맵으로 두지 않은 이유: 순서를 함께 표현할 수 없기 때문입니다.
 * 배열 하나로 포함 여부와 순서를 동시에 관리합니다.
 */
export type SectionKey =
  | 'cover'
  | 'greeting'
  | 'calendar'
  | 'gallery'
  | 'minigame'
  | 'location'
  | 'account'
  | 'guestbook'
  | 'footer';

/**
 * 모든 섹션 키 — 청첩장에 넣을 수 있는 것 전부.
 *
 * 타입(`SectionKey`)만으로는 "전부 훑기" 를 할 수 없어 값으로도 둡니다
 * (예: 카드별 문구 기본값 채우기 `resolveSectionText`).
 *
 * 🔴 목록은 여기 하나뿐이어야 합니다. 예전에는 에디터의 섹션 목록이 자기 배열을 따로 들고
 *    있어서, 섹션을 추가하면 한쪽에만 나타났습니다.
 */
export const SECTION_KEYS: readonly SectionKey[] = [
  'cover',
  'greeting',
  'calendar',
  'gallery',
  'minigame',
  'location',
  'account',
  'guestbook',
  'footer',
];

/** 섹션이 아닌 전역 연출 토글 */
export interface Features {
  /** 배경음악 */
  bgm: boolean;
  /**
   * 떨어지는 효과 on/off. 모양·양은 `core.effects.petals` 에 있습니다.
   *
   * 필드명이 `petals`(꽃잎)인 것은 초기 구현의 흔적입니다 — 이미 저장된 문서·발행
   * 스냅샷이 이 이름을 쓰고 있어 바꾸지 않습니다. **화면 문구는 '떨어지는 효과'** 로
   * 씁니다 (이미지를 바꿀 수 있으니 '꽃잎'이라 하면 꽃잎만 되는 것처럼 읽힙니다).
   */
  petals: boolean;
}

/** 사용자가 뺄 수 없는 섹션 — 이게 없으면 청첩장이 아니다 */
export const REQUIRED_SECTIONS: readonly SectionKey[] = [
  'cover',
  'greeting',
  'calendar',
  'location',
  'footer',
];

/** 새 청첩장의 기본 섹션 구성 */
export const DEFAULT_SECTIONS: readonly SectionKey[] = [
  'cover',
  'greeting',
  'calendar',
  'gallery',
  'minigame',
  'location',
  'account',
  'guestbook',
  'footer',
];

export function canRemoveSection(key: SectionKey): boolean {
  return !REQUIRED_SECTIONS.includes(key);
}

export type ThemeId = 'classic1' | 'classic2';
export type InvitationStatus = 'draft' | 'published' | 'archived';

export interface Invitation {
  id: string;
  /** null = 아직 인계되지 않음 (우리가 만든 것) */
  ownerUid: string | null;
  themeId: ThemeId;
  schemaVersion: number;
  status: InvitationStatus;
  /** 공개 경로 /i/{slug} */
  slug: string;
  /** 기존 URL 유지용 핀 */
  pinnedHost: string | null;
  /** 편집 중 — 소유자만 접근 */
  draft: ContentDoc;
  /** 하객에게 보이는 것. 발행 전에는 null */
  published: ContentDoc | null;
  /** 담긴 섹션 — 순서가 곧 화면 순서 */
  sections: SectionKey[];
  features: Features;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

export const SCHEMA_VERSION = 1;

/**
 * 낙하 연출 기본 개수.
 *
 * 옛 뷰어가 손으로 배치한 9개(이미지 5 + 발자국 4)와 같은 값입니다 — 이 필드가 없는
 * 스냅샷을 읽을 때 이 값을 쓰면 지금까지의 화면이 그대로 유지됩니다.
 * **워커와 뷰어가 같은 값을 써야 하므로 여기서만 정의합니다.**
 */
export const DEFAULT_PETAL_COUNT = 9;

/**
 * 낙하 요소 정규화 — **읽는 쪽은 반드시 이걸 통과시켜 쓰세요.**
 *
 * 🔴 **고른 것만 떨어집니다.** 빈 배열이면 아무것도 떨어지지 않습니다.
 *    예전에는 비어 있으면 뷰어가 인사말 말풍선 아이콘을 자동으로 떨어뜨렸는데,
 *    그것이 에디터에는 "선택 안 함" 으로 보여서 (2026-08-19) 아이콘을 하나 고르면
 *    보이던 사진이 사라지는 것처럼 읽혔습니다. 자동 대체를 없애 화면과 설정을 일치시킵니다.
 *
 * 남은 승격은 하나뿐입니다: 옛 문서의 단일 이미지(`petals.image`) → 사진 1개.
 * 그 문서를 열어도 하객 화면이 그대로 유지돼야 합니다.
 */
export function normalizePetalItems(
  petals: Partial<CoreContent['effects']['petals']> | null | undefined,
): PetalItem[] {
  const raw = Array.isArray(petals?.items) ? petals.items : [];
  const items = raw.filter((it): it is PetalItem => {
    if (!it || typeof it !== 'object') return false;
    if (it.kind === 'emoji') return typeof it.value === 'string' && it.value.length > 0;
    if (it.kind === 'image') return Boolean(it.asset?.key);
    return false;
  });
  if (items.length > 0) return items.slice(0, PETAL_ITEM_MAX);

  // 옛 문서 — 단일 이미지를 사진 1개로 승격합니다
  const legacy = petals?.image ?? null;
  return legacy ? [{ kind: 'image', asset: legacy }] : [];
}
