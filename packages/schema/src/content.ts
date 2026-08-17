/**
 * 청첩장 콘텐츠 스키마 — 에디터와 뷰어가 공유하는 단일 소스.
 *
 * 설계 근거는 `docs/03-data-model.md`. 핵심 원칙 두 가지:
 *  1. 코어 / 테마 확장을 분리한다 — 테마가 늘어도 에디터의 코어 폼을 재사용할 수 있어야 한다.
 *  2. 파생 가능한 값은 저장하지 않는다 — 캘린더 월/일은 `weddingAt` 에서 계산한다.
 *     (따로 입력받으면 불일치가 반드시 생긴다)
 */

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
   * 화면 위로 떨어지는 연출. on/off 는 `features.petals` 이고, 여기는 모양·양입니다.
   *
   * ⚠️ 이 필드가 생기기 전 스냅샷에는 없습니다. 읽는 쪽이 기본값을 채워야 합니다
   *    (`image` 없으면 인사말 말풍선 아이콘 = 지금까지의 동작, `count` 없으면 9).
   */
  effects: {
    petals: {
      /** 떨어질 이미지. 비우면 인사말 말풍선 아이콘을 씁니다 */
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

/** classic1 테마 전용 필드 */
export interface Classic1Content {
  game: {
    petName: string;
    fallingImages: AssetRef[];
    idleImage: AssetRef | null;
    speed: GameSpeed;
    showLeaderboard: boolean;
  };
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
