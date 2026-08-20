/**
 * 테마 매니페스트 — 에디터 폼을 코드가 아니라 데이터로 정의한다.
 *
 * 왜 이렇게 하는가: 테마가 늘어날 때마다 에디터를 새로 만들면 유지가 안 된다.
 * 테마가 자기 필드를 선언하고, 에디터는 이 선언을 읽어 폼을 생성한다.
 * → 새 테마 추가 = 섹션 컴포넌트 + 매니페스트 작성. **에디터 코드는 수정하지 않는다.**
 *
 * 필드 타입은 디자인 산출물의 분기(f.isText / f.isArea / f.isRepeat …)와 1:1로 맞췄습니다.
 */

import { PETAL_ITEM_MAX } from './content';
import { GAME_EMOJIS, GAME_ITEM_MAX, GAME_SPEED_OPTIONS, LEADERBOARD_SIZE_RANGE } from './games';

export type FieldType =
  /** 한 줄 텍스트 */
  | 'text'
  /** 여러 줄 텍스트 — 줄바꿈이 결과에 그대로 반영됨. 모바일은 전체화면 편집 모드 */
  | 'textarea'
  /** 날짜 + 시간 (요일 표시 필요) */
  | 'datetime'
  /** 숫자 */
  | 'number'
  /** 슬라이더 (min·max·step). 정확한 값보다 '느낌'을 맞추는 값에 쓴다 */
  | 'range'
  /** 2~3지 선택 */
  | 'segment'
  /** on/off */
  | 'toggle'
  /** 단일 이미지 */
  | 'image'
  /** 다중 이미지 — 순서 변경·대표 지정 */
  | 'images'
  /** 오디오 (미리듣기) */
  | 'audio'
  /** 아이콘 선택 */
  | 'icon'
  /** 낙하 요소 — 이모지 아이콘 칩 + 사진 업로드를 한 컨트롤에서 (최대 `PETAL_ITEM_MAX` 개) */
  | 'petals'
  /**
   * 아이콘·사진 섞어 고르기 — `petals` 와 같은 컨트롤이지만 **옛 단일 이미지 승격이 없는**
   * 범용 버전입니다. 아이콘 후보는 `options`, 개수 상한은 `max` 로 받습니다.
   */
  | 'items'
  /**
   * 순서를 바꿀 수 있는 문단 목록 (`TextBlock[]`) — 수정·추가·삭제·위아래 이동.
   * 커버 텍스트가 사진 위 자유 배치라면, 이쪽은 위에서 아래로 흐르는 문단입니다.
   */
  | 'textBlocks'
  /** 미니게임 선택 (`GAME_LIST` 카드) */
  | 'game'
  /** 반복 항목 (교통편 등) */
  | 'repeat'
  /** 중첩 반복 (계좌 그룹 → 계좌 N개) */
  | 'repeatGroup'
  /** 청첩장 주소 — 접두어 고정 + 중복 확인 */
  | 'slug'
  /** URL (형식 검증) */
  | 'url'
  /** 전화번호 */
  | 'tel';

export interface FieldDef {
  /** ContentDoc 내 경로 (예: 'core.cover.eyebrow') */
  path: string;
  type: FieldType;
  /** 사용자에게 보이는 라벨. 업계 용어 금지 — '슬러그' 대신 '청첩장 주소' */
  label: string;
  /** 라벨 아래 도움말 */
  hint?: string;
  required?: boolean;
  maxLength?: number;
  /** textarea 줄 수 */
  rows?: number;
  /** segment·icon 선택지 */
  options?: { value: string; label: string }[];
  /** images 최대 개수 (유료 게이트가 붙는 지점) · range 최댓값 */
  max?: number;
  /** range 최솟값 (기본 0) */
  min?: number;
  /** range 증가 단위 (기본 1) */
  step?: number;
  /** range 값 옆에 붙는 단위 (예: '개') */
  unit?: string;
  /** repeat·repeatGroup 하위 필드 */
  fields?: FieldDef[];
  /** 권장 업로드 크기 안내용 */
  aspect?: string;
  /**
   * 이 필드가 비었을 때 **실제로 쓰이는** 값의 경로 (image 필드 전용).
   *
   * 비어 있는데 화면에는 뭔가 보이는 상황을 없애기 위한 것입니다 — 예를 들어
   * '떨어지는 이미지' 를 비워두면 인사말 말풍선 아이콘이 떨어지는데, 필드가 빈 칸으로
   * 보이면 사용자는 아무것도 안 떨어진다고 읽습니다. 그 이미지를 그대로 보여줍니다.
   */
  inheritFrom?: string;
  /** `inheritFrom` 값이 뭔지 사람 말로 (예: '인사말 말풍선 아이콘') */
  inheritLabel?: string;
  /** `petals`·`items` 안쪽 '고른 것' 머리말 (예: '떨어질 것') */
  pickedLabel?: string;
  /** `petals`·`items` 가 비었을 때 보여줄 안내. 없으면 낙하 연출용 기본 문구 */
  emptyHint?: string;
}

export interface SectionDef {
  key: string;
  label: string;
  /** false 면 사용자가 청첩장에서 뺄 수 있다 */
  required: boolean;
  /**
   * 이 섹션을 어떤 UI 로 편집하는지.
   * `form`(기본) — 매니페스트 필드로 폼 생성 / `canvas` — 사진 위 자유 배치 (커버)
   */
  editor?: 'form' | 'canvas';
  fields: FieldDef[];
}

export interface ThemeManifest {
  id: string;
  name: string;
  /** 갤러리 썸네일 R2 키 */
  thumb: string;
  /** 분위기 태그 — 템플릿 갤러리 필터 */
  tags: string[];
  sections: SectionDef[];
}

/** 모든 테마가 공유하는 코어 섹션. 테마 매니페스트가 이 뒤에 자기 섹션을 붙인다. */
export const CORE_SECTIONS: SectionDef[] = [
  {
    key: 'couple',
    label: '기본 정보',
    required: true,
    fields: [
      { path: 'core.couple.groom.name', type: 'text', label: '신랑 이름', required: true, maxLength: 20 },
      { path: 'core.couple.groom.nameEn', type: 'text', label: '신랑 영문 이름', maxLength: 30 },
      { path: 'core.couple.groom.firstName', type: 'text', label: '신랑 이름만', hint: '성을 뺀 이름. 커버·푸터에 쓰입니다', maxLength: 10 },
      { path: 'core.couple.groom.father', type: 'text', label: '신랑 아버지', maxLength: 20 },
      { path: 'core.couple.groom.mother', type: 'text', label: '신랑 어머니', maxLength: 20 },
      { path: 'core.couple.groom.relation', type: 'text', label: '관계', hint: '장남 · 차남 등', maxLength: 10 },
      { path: 'core.couple.bride.name', type: 'text', label: '신부 이름', required: true, maxLength: 20 },
      { path: 'core.couple.bride.nameEn', type: 'text', label: '신부 영문 이름', maxLength: 30 },
      { path: 'core.couple.bride.firstName', type: 'text', label: '신부 이름만', maxLength: 10 },
      { path: 'core.couple.bride.father', type: 'text', label: '신부 아버지', maxLength: 20 },
      { path: 'core.couple.bride.mother', type: 'text', label: '신부 어머니', maxLength: 20 },
      { path: 'core.couple.bride.relation', type: 'text', label: '관계', hint: '장녀 · 차녀 등', maxLength: 10 },
    ],
  },
  {
    key: 'ceremony',
    label: '예식 정보',
    required: true,
    fields: [
      {
        path: 'core.weddingAt',
        type: 'datetime',
        label: '예식 일시',
        hint: '달력·D-day·일정등록이 모두 이 값에서 계산됩니다',
        required: true,
      },
    ],
  },
  /**
   * 커버는 **폼이 아니라 캔버스에서 직접 편집**합니다 (사진 위 텍스트 자유 배치).
   * 그래서 필드 목록이 비어 있습니다 — 에디터가 이 섹션을 캔버스로 라우팅합니다.
   */
  {
    key: 'cover',
    label: '커버',
    required: true,
    editor: 'canvas',
    fields: [],
  },
  {
    key: 'greeting',
    label: '인사말',
    required: true,
    fields: [
      { path: 'core.greeting.message', type: 'textarea', label: '인사말', hint: '줄바꿈이 그대로 보입니다', rows: 8, required: true, maxLength: 1000 },
      { path: 'core.greeting.showBubble', type: 'toggle', label: '말풍선 표시', hint: '끄면 강아지 말풍선(아이콘+문구)이 청첩장에서 사라집니다' },
      { path: 'core.greeting.bubbleText', type: 'textarea', label: '말풍선 문구', rows: 2, maxLength: 100 },
      { path: 'core.greeting.bubbleImage', type: 'image', label: '말풍선 아이콘', hint: '배경이 투명한 PNG를 권합니다' },
    ],
  },
  {
    key: 'gallery',
    label: '갤러리',
    required: true,
    fields: [
      {
        path: 'core.gallery',
        type: 'images',
        label: '사진',
        hint: '첫 번째 사진이 대표로 크게 보입니다. 끌어서 순서를 바꿀 수 있어요',
        max: 10,
      },
    ],
  },
  {
    key: 'location',
    label: '오시는 길',
    required: true,
    fields: [
      { path: 'core.location.venue', type: 'text', label: '예식장 이름', required: true, maxLength: 40 },
      { path: 'core.location.hall', type: 'text', label: '홀', hint: '예: 6층 갤럭시홀', maxLength: 40 },
      { path: 'core.location.tel', type: 'tel', label: '예식장 전화' },
      { path: 'core.location.address', type: 'text', label: '주소', required: true, maxLength: 120 },
      { path: 'core.location.addressForCopy', type: 'text', label: '복사용 주소', hint: '하객이 내비에 붙여넣을 짧은 주소', maxLength: 80 },
      { path: 'core.location.kakaoMapUrl', type: 'url', label: '카카오맵 링크' },
      { path: 'core.location.naverMapUrl', type: 'url', label: '네이버지도 링크' },
      {
        path: 'core.location.transport',
        type: 'repeat',
        label: '교통편',
        fields: [
          { path: 'icon', type: 'icon', label: '아이콘', options: [
            { value: '🚗', label: '자가용' },
            { value: '🚍', label: '버스' },
            { value: '🚄', label: 'KTX' },
            { value: '🚌', label: '시외버스' },
            { value: '🚇', label: '지하철' },
          ] },
          { path: 'title', type: 'text', label: '수단', maxLength: 20 },
          { path: 'desc', type: 'textarea', label: '안내', rows: 2, maxLength: 200 },
        ],
      },
    ],
  },
  {
    key: 'account',
    label: '마음 전하기',
    required: false,
    fields: [
      { path: 'core.account.description', type: 'textarea', label: '안내 문구', rows: 3, maxLength: 300 },
      {
        path: 'core.account.groups',
        type: 'repeatGroup',
        label: '계좌',
        hint: '신랑측 · 신부측으로 묶어 보여줍니다',
        fields: [
          { path: 'title', type: 'text', label: '묶음 이름', hint: '예: 신랑에게', maxLength: 20 },
          { path: 'items', type: 'repeat', label: '계좌 목록', fields: [
            { path: 'label', type: 'text', label: '예금주 표기', maxLength: 30 },
            { path: 'bank', type: 'text', label: '은행 · 계좌번호', maxLength: 40 },
            { path: 'number', type: 'text', label: '복사용 번호', maxLength: 30 },
            { path: 'kakaoPay', type: 'url', label: '카카오페이 송금 링크' },
          ] },
        ],
      },
    ],
  },
  /**
   * 미니게임 — 저장 위치가 `theme.classic1.game` 인데 코어 섹션에 있는 이유:
   * 두 디자인(classic1·classic2)이 **같은 설정을 공유**하기 때문입니다. 어댑터도 테마와
   * 무관하게 이 경로를 읽습니다. 경로를 옮기면 이미 발행된 문서의 게임 설정이 사라집니다.
   */
  {
    key: 'minigame',
    label: '미니게임',
    required: false,
    fields: [
      { path: 'theme.classic1.game.gameId', type: 'game', label: '게임' },
      {
        path: 'theme.classic1.game.petName',
        type: 'text',
        label: '주인공 이름',
        hint: '문구의 {이름} 자리에 들어갑니다 (예: 일홍이)',
        maxLength: 20,
      },
      {
        path: 'theme.classic1.game.fallingItems',
        type: 'items',
        label: '떨어지는 것',
        pickedLabel: '떨어질 것',
        hint: '아이콘·사진을 섞어 최대 6개까지. 사진은 배경이 없는 스티커형 PNG 를 권합니다',
        emptyHint: '아직 고른 것이 없어요. 그대로 두면 기본 강아지 그림이 떨어집니다.',
        max: GAME_ITEM_MAX,
        options: GAME_EMOJIS.map((value) => ({ value, label: value })),
      },
      {
        path: 'theme.classic1.game.idleItems',
        type: 'items',
        label: '시작 화면 그림',
        pickedLabel: '고른 그림',
        hint: '게임을 시작하기 전 크게 보이는 그림 하나 (아이콘이나 사진)',
        emptyHint: '고르지 않으면 기본 그림이 보입니다.',
        max: 1,
        options: GAME_EMOJIS.map((value) => ({ value, label: value })),
      },
      {
        path: 'theme.classic1.game.speed',
        type: 'segment',
        label: '난이도',
        hint: '떨어지는 속도와 양이 달라집니다',
        options: GAME_SPEED_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
      },
      {
        path: 'theme.classic1.game.intro',
        type: 'textBlocks',
        label: '소개 문구',
        hint: '게임 위에 보이는 문단입니다. 순서를 바꾸고 추가·삭제할 수 있어요',
      },
      {
        path: 'theme.classic1.game.texts.startTitle',
        type: 'text',
        label: '시작 화면 제목',
        hint: '{이름} 을 쓰면 주인공 이름으로 바뀝니다',
        maxLength: 40,
      },
      {
        path: 'theme.classic1.game.texts.startDesc',
        type: 'textarea',
        label: '시작 화면 설명',
        hint: '게임 방법 안내. 줄바꿈이 그대로 보입니다',
        rows: 3,
        maxLength: 200,
      },
      {
        path: 'theme.classic1.game.texts.startButton',
        type: 'text',
        label: '시작 버튼',
        hint: '비우면 기본 문구로 돌아갑니다 (버튼에 글자가 없으면 누를 수 없어 보입니다)',
        maxLength: 20,
      },
      {
        path: 'theme.classic1.game.texts.resultCaught',
        type: 'text',
        label: '결과 문구',
        hint: '{이름} · {횟수} 를 쓸 수 있습니다',
        maxLength: 60,
      },
      {
        path: 'theme.classic1.game.texts.resultHint',
        type: 'text',
        label: '결과 아래 한 줄',
        hint: '{점수} 를 쓸 수 있습니다. 비우면 그 줄이 사라집니다',
        maxLength: 60,
      },
      {
        path: 'theme.classic1.game.leaderboard.show',
        type: 'toggle',
        label: '랭킹 보여주기',
        hint: '끄면 게임만 남고 랭킹판·등록 버튼이 사라집니다',
      },
      {
        path: 'theme.classic1.game.leaderboard.size',
        type: 'range',
        label: '몇 등까지',
        hint: '랭킹판에 보여줄 순위 개수',
        min: LEADERBOARD_SIZE_RANGE.min,
        max: LEADERBOARD_SIZE_RANGE.max,
        step: 1,
        unit: '등',
      },
      {
        path: 'theme.classic1.game.leaderboard.title',
        type: 'text',
        label: '랭킹 제목',
        hint: '{이름} 을 쓸 수 있습니다',
        maxLength: 40,
      },
      {
        path: 'theme.classic1.game.leaderboard.empty',
        type: 'textarea',
        label: '기록이 없을 때',
        rows: 2,
        maxLength: 120,
      },
      {
        path: 'theme.classic1.game.leaderboard.reward',
        type: 'textarea',
        label: '랭킹 아래 안내',
        hint: '선물 안내 같은 한 줄. 비우면 그 줄이 사라집니다',
        rows: 2,
        maxLength: 120,
      },
    ],
  },
  /** 켜고 끄는 것만 있는 섹션. 담긴 섹션 목록에서 빼면 사라진다 */
  {
    key: 'guestbook',
    label: '방명록',
    required: false,
    fields: [],
  },
  {
    key: 'effects',
    label: '연출',
    required: false,
    fields: [
      { path: 'core.bgm', type: 'audio', label: '배경음악', hint: '하객이 처음 화면을 누를 때 재생됩니다' },
      {
        path: 'core.effects.petals.items',
        type: 'petals',
        label: '떨어지는 것',
        pickedLabel: '떨어질 것',
        hint: '아이콘·사진을 자유롭게 섞어 최대 3개까지 (사진만 3개도 됩니다). 사진은 배경이 없는 스티커형 PNG를 올려주세요 — 배경이 있는 결혼식 사진은 떨어질 때 어울리지 않습니다',
        max: PETAL_ITEM_MAX,
      },
      {
        path: 'core.effects.petals.count',
        type: 'range',
        label: '떨어지는 양',
        hint: '0으로 두면 아무것도 떨어지지 않습니다',
        min: 0,
        max: 30,
        step: 1,
        unit: '개',
      },
    ],
  },
  {
    key: 'share',
    label: '공유 설정',
    required: true,
    fields: [
      { path: 'core.share.title', type: 'text', label: '공유 제목', hint: '카톡에 뜨는 제목', required: true, maxLength: 60 },
      { path: 'core.share.description', type: 'textarea', label: '공유 설명', rows: 2, maxLength: 120 },
      {
        path: 'core.share.image',
        type: 'image',
        label: '공유 미리보기 사진',
        hint: '카톡 카드는 가로형이라 세로 사진은 위아래가 잘립니다',
        aspect: '1.91:1 가로',
      },
      { path: 'core.share.durationMinutes', type: 'number', label: '일정 길이(분)', hint: '하객이 캘린더에 등록할 때 쓰입니다' },
      { path: 'slug', type: 'slug', label: '청첩장 주소', required: true },
    ],
  },
];
