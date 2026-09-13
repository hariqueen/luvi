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
  /**
   * 입력칸이 비었을 때 회색으로 보여줄 글자 (`text`·`textarea`).
   *
   * 🔴 **"비우면 무엇이 나오는지" 를 보여주는 자리입니다.** 화면 라벨(`core.labels.*`)은
   *    비우면 기본 문구로 돌아가는데, 빈 칸만 보이면 사용자는 버튼 글자가 사라진 줄 압니다.
   *    기본 문구를 여기 넣어 두면 비운 상태가 곧 미리보기와 일치합니다 (`labels.ts`).
   */
  placeholder?: string;
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
  /**
   * **미리보기에서 고치는 글자** — 폼에는 입력칸을 두지 않습니다.
   *
   * 뷰어가 그리는 글자는 미리보기에서 눌러 바로 고칩니다(`Editable` 의 `Field`).
   * 폼에 같은 입력칸을 또 두면 **같은 일을 하는 자리가 두 곳**이 되어, 어느 쪽이 원본인지
   * 헷갈리고 왼쪽을 고치면서 눈은 오른쪽을 봐야 합니다.
   *
   * ⚠️ 화면에 그려지지 않는 값에는 붙이지 마세요 — 미리보기에 없으면 고칠 길이 사라집니다
   *    (예: 복사용 주소·복사용 계좌번호·전화·지도 링크는 폼에 남깁니다).
   */
  previewEdit?: boolean;
}

export interface SectionDef {
  key: string;
  label: string;
  /** false 면 사용자가 청첩장에서 뺄 수 있다 */
  required: boolean;
  /**
   * 섹션 전체에 걸리는 주의 문구 — 필드들 **위에** 눈에 띄게 그립니다.
   *
   * 개별 필드의 `hint` 와 다릅니다. `hint` 는 "이 칸에 뭘 넣나" 를 설명하고,
   * 이건 **"이 정보를 넣으면 어떤 일이 벌어지나"** 를 알립니다 — 남의 개인정보를
   * 입력하는 자리(혼주)와 발행 즉시 공개되는 자리(계좌)에 필요합니다.
   * 개인정보처리방침 제10조(이용자가 입력하는 제3자 정보에 대한 책임)의 실질적 근거입니다.
   */
  notice?: string;
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
    // 혼주 줄에는 **본인이 아닌 사람(양가 부모)의 실명**이 들어갑니다.
    notice:
      '혼주 줄에는 양가 부모님 성함이 들어갑니다. 입력 전에 그분들께 동의를 받으셨는지 확인해 주세요.',
    fields: [
      { path: 'core.couple.groom.name', type: 'text', label: '신랑 이름', required: true, maxLength: 20 },
      { path: 'core.couple.groom.nameEn', type: 'text', label: '신랑 영문 이름', maxLength: 30 },
      /**
       * 🔴 **여기가 이 값의 유일한 자리입니다** — 미리보기에 이 값만 그리는 글자가 없습니다.
       *
       * 예전에는 마무리의 `신랑 ♥ 신부` 가 이 값 두 개를 그려서 거기서 고쳤습니다. 그 줄이
       * 한 덩어리(`core.couple.line`)가 되면서 이 값은 화면에 직접 나오지 않게 됐습니다.
       * 그래도 지울 수 없습니다: 달력 기본 문구의 `{신랑}` 치환과 대시보드 목록의 카드
       * 제목이 이 값을 읽습니다. 발행된 청첩장은 기본 문구를 **볼 때 계산**하므로 기본
       * 문구 자체를 바꾸면 이미 하객에게 나간 달력 글자가 바뀝니다.
       *
       * previewEdit 를 붙이면 폼에서도 사라져 **고칠 길이 아예 없어집니다.**
       */
      { path: 'core.couple.groom.firstName', type: 'text', label: '신랑 이름만', hint: '성을 뺀 이름. 달력 문구와 목록 제목에 쓰입니다', maxLength: 10 },
      // 혼주 줄은 아버지·어머니·관계로 쪼개지 않습니다 — 사이의 '·' 와 '의' 까지
      // 미리보기에서 통째로 고칩니다 (`resolveParentsLine`)
      { path: 'core.couple.groom.parentsLine', type: 'text', label: '신랑 혼주 줄', hint: '아버지 · 어머니 의 장남 이름', maxLength: 120, previewEdit: true },
      { path: 'core.couple.bride.name', type: 'text', label: '신부 이름', required: true, maxLength: 20 },
      { path: 'core.couple.bride.nameEn', type: 'text', label: '신부 영문 이름', maxLength: 30 },
      // 신랑 쪽과 같은 이유로 폼에 남깁니다 (미리보기에 이 값만 그리는 글자가 없습니다)
      { path: 'core.couple.bride.firstName', type: 'text', label: '신부 이름만', hint: '성을 뺀 이름. 달력 문구와 목록 제목에 쓰입니다', maxLength: 10 },
      // 혼주 줄은 아버지·어머니·관계로 쪼개지 않습니다 — 사이의 '·' 와 '의' 까지
      // 미리보기에서 통째로 고칩니다 (`resolveParentsLine`)
      { path: 'core.couple.bride.parentsLine', type: 'text', label: '신부 혼주 줄', hint: '아버지 · 어머니 의 장녀 이름', maxLength: 120, previewEdit: true },
      // 마무리의 두 사람 줄도 신랑/신부로 쪼개지 않습니다 — 가운데 글자(♥ · ·)까지
      // 미리보기에서 통째로 고칩니다 (`resolveCoupleLine`)
      { path: 'core.couple.line', type: 'text', label: '두 사람 줄', hint: '비우면 두 이름으로 만들어집니다', maxLength: 60, previewEdit: true },
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
      /**
       * 달력·남은 날짜 세기의 **글자**. 날짜 자체는 위 `weddingAt` 에서 계산되지만
       * 요일 머리글과 단위는 디자인에 박혀 있어 고칠 수 없었습니다 (`labels.ts`).
       */
      {
        path: 'core.labels.calendarWeekdays',
        type: 'text',
        label: '요일 머리글',
        hint: '쉼표로 일곱 칸. 일곱 개가 아니면 기본값이 쓰입니다',
        maxLength: 80,
        previewEdit: true,
      },
      { path: 'core.labels.countdownDays', type: 'text', label: '남은 날짜 단위 · 일', maxLength: 20, previewEdit: true },
      { path: 'core.labels.countdownHours', type: 'text', label: '남은 날짜 단위 · 시', maxLength: 20, previewEdit: true },
      { path: 'core.labels.countdownMinutes', type: 'text', label: '남은 날짜 단위 · 분', maxLength: 20, previewEdit: true },
      { path: 'core.labels.countdownSeconds', type: 'text', label: '남은 날짜 단위 · 초', maxLength: 20, previewEdit: true },
    ],
  },
  /**
   * 커버의 **문구**는 폼이 아니라 캔버스에서 편집합니다 (사진 위 자유 배치) —
   * 에디터가 이 섹션을 캔버스로 라우팅합니다. 사진은 경로가 하나뿐이라 필드로 둡니다.
   *
   * ⚠️ 이 필드를 다른 섹션에도 복사하지 마세요. 발행 요약(`workers/api/src/lib/diff.ts`)이
   *    CORE_SECTIONS 를 훑으며 경로마다 한 줄을 만들기 때문에, 같은 경로가 두 섹션에 있으면
   *    "변경사항"에 같은 항목이 두 번 뜹니다. 여러 사진을 한 화면에 모아 보여주는 것은
   *    에디터의 '사진' 폼이 이 정의들을 **참조**해서 합니다 (routes/Editor.tsx).
   */
  {
    key: 'cover',
    label: '커버',
    required: true,
    editor: 'canvas',
    fields: [
      {
        path: 'core.cover.image',
        type: 'image',
        label: '커버 사진',
        hint: '첫 화면에 깔리는 사진. 이 사진 위에 문구가 얹힙니다',
      },
      /** 맨 아래 스크롤 안내. **비우면 사라집니다** (`OPTIONAL_LABELS`) */
      {
        path: 'core.labels.coverScroll',
        type: 'text',
        label: '스크롤 안내',
        hint: '첫 화면 맨 아래 글자. 비우면 사라집니다',
        maxLength: 40,
        previewEdit: true,
      },
    ],
  },
  {
    key: 'greeting',
    label: '인사말',
    required: true,
    fields: [
      { path: 'core.greeting.message', type: 'textarea', label: '인사말', hint: '줄바꿈이 그대로 보입니다', rows: 8, required: true, maxLength: 1000, previewEdit: true },
      { path: 'core.greeting.showBubble', type: 'toggle', label: '말풍선 표시', hint: '끄면 강아지 말풍선(아이콘+문구)이 청첩장에서 사라집니다' },
      { path: 'core.greeting.bubbleText', type: 'textarea', label: '말풍선 문구', rows: 2, maxLength: 100, previewEdit: true },
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
      /**
       * 안내 문구 뒤에 붙는 한 마디. 사진이 2장 이상일 때만 나옵니다.
       *
       * ⚠️ 이 그룹은 폼으로 열리지 않습니다 (갤러리 카드는 '사진' 폼으로 갑니다).
       *    그래서 이 경로를 `Editor.tsx` 의 `PHOTO_FIELDS` 가 함께 끌어갑니다.
       */
      {
        path: 'core.labels.gallerySwipeHint',
        type: 'text',
        label: '넘기기 안내',
        hint: '사진이 2장 이상일 때 안내 문구 뒤에 붙습니다. 비우면 사라집니다',
        maxLength: 40,
        previewEdit: true,
      },
    ],
  },
  {
    key: 'location',
    label: '오시는 길',
    required: true,
    fields: [
      { path: 'core.location.venue', type: 'text', label: '예식장 이름', required: true, maxLength: 40, previewEdit: true },
      { path: 'core.location.hall', type: 'text', label: '홀', hint: '예: 6층 갤럭시홀', maxLength: 40, previewEdit: true },
      { path: 'core.location.tel', type: 'tel', label: '예식장 전화' },
      { path: 'core.location.address', type: 'text', label: '주소', required: true, maxLength: 120, previewEdit: true },
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
          { path: 'title', type: 'text', label: '수단', maxLength: 20, previewEdit: true },
          { path: 'desc', type: 'textarea', label: '안내', rows: 2, maxLength: 200, previewEdit: true },
        ],
      },
      /**
       * 지도 버튼의 **글자**. 위 링크 칸과 짝입니다 (링크는 어디로 가는지, 여기는 뭐라고 적히는지).
       * 버튼이라 비우면 기본값으로 돌아갑니다 (`labels.ts`).
       */
      { path: 'core.labels.mapKakao', type: 'text', label: '카카오맵 버튼 글자', maxLength: 20 },
      { path: 'core.labels.mapNaver', type: 'text', label: '네이버지도 버튼 글자', maxLength: 20 },
      {
        path: 'core.labels.mapTel',
        type: 'text',
        label: '전화 버튼 글자',
        hint: '세이지 가든에서만 보입니다 (로즈 클래식은 전화 아이콘)',
        maxLength: 20,
      },
    ],
  },
  {
    key: 'account',
    label: '마음 전하기',
    required: false,
    // 발행된 청첩장은 주소만 알면 누구나 열 수 있습니다 — 계좌번호도 함께 보입니다.
    notice:
      '발행하면 청첩장 주소를 아는 누구나 이 계좌번호를 볼 수 있습니다. 넣을지는 직접 판단해 주세요.',
    fields: [
      { path: 'core.account.description', type: 'textarea', label: '안내 문구', rows: 3, maxLength: 300, previewEdit: true },
      {
        path: 'core.account.groups',
        type: 'repeatGroup',
        label: '계좌',
        hint: '신랑측 · 신부측으로 묶어 보여줍니다',
        fields: [
          { path: 'title', type: 'text', label: '묶음 이름', hint: '예: 신랑에게', maxLength: 20, previewEdit: true },
          { path: 'items', type: 'repeat', label: '계좌 목록', fields: [
            { path: 'label', type: 'text', label: '예금주 표기', maxLength: 30, previewEdit: true },
            { path: 'bank', type: 'text', label: '은행 · 계좌번호', maxLength: 40, previewEdit: true },
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
        hint: '문구의 {이름} 자리에 들어갑니다 (예: 멍멍이)',
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
      /**
       * 게임이 끝난 뒤의 화면. 시작 화면·결과 문구는 위에 있었는데 **끝난 뒤의 글자만**
       * 테마에 박혀 있었습니다 (`labels.ts` 로 옮겼습니다).
       */
      { path: 'core.labels.gameOver', type: 'text', label: '게임 끝 제목', maxLength: 30 },
      {
        path: 'core.labels.gameScoreUnit',
        type: 'text',
        label: '점수 단위',
        hint: '결과와 랭킹판의 숫자 뒤에 붙습니다',
        maxLength: 10,
      },
      { path: 'core.labels.gameRetry', type: 'text', label: '다시 하기 버튼', maxLength: 20 },
      {
        path: 'core.labels.gameRankSubmit',
        type: 'text',
        label: '랭킹 등록 버튼',
        maxLength: 30,
      },
      {
        path: 'core.labels.gameNicknamePlaceholder',
        type: 'text',
        label: '닉네임칸 안내',
        maxLength: 30,
      },
      {
        path: 'core.labels.gameRanked',
        type: 'text',
        label: '등록됐을 때',
        hint: '{순위} 자리에 등수가 들어갑니다',
        maxLength: 40,
      },
      { path: 'core.labels.gameRankSkip', type: 'text', label: '등록 없이 다시하기 버튼', maxLength: 30 },
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
  /**
   * 방명록 — 하객이 **글을 남기는** 섹션이라, 커플이 쓰는 글은 머리말뿐이고 나머지는
   * 전부 입력 UI 의 글자입니다. 그 글자들이 테마에 박혀 있어 예전에는 이 폼이 통째로
   * 비어 있었습니다 (담기·빼기 말고는 할 수 있는 것이 없었습니다).
   *
   * 머리말·안내 문구는 카드 문구 블록이라 미리보기에서 고칩니다 (`sectionText.ts`).
   */
  {
    key: 'guestbook',
    label: '방명록',
    required: false,
    fields: [
      {
        path: 'core.labels.guestbookFormTitle',
        type: 'text',
        label: '입력칸 머리글',
        hint: '입력칸 위에 적히는 한 줄. 비우면 사라집니다',
        maxLength: 40,
        previewEdit: true,
      },
      {
        path: 'core.labels.guestbookNamePlaceholder',
        type: 'text',
        label: '이름칸 안내',
        hint: '입력칸이 비었을 때 회색으로 보이는 글자',
        maxLength: 20,
      },
      {
        path: 'core.labels.guestbookMessagePlaceholder',
        type: 'text',
        label: '메시지칸 안내',
        maxLength: 40,
      },
      { path: 'core.labels.guestbookSubmit', type: 'text', label: '남기기 버튼 글자', maxLength: 20 },
      {
        path: 'core.labels.guestbookEmpty',
        type: 'textarea',
        label: '아직 아무도 안 남겼을 때',
        hint: '방명록이 비어 있을 때만 보입니다. 비우면 사라집니다',
        rows: 2,
        maxLength: 80,
        previewEdit: true,
      },
    ],
  },
  /**
   * 마무리 — 청첩장 맨 아래 사진.
   *
   * 비워두면 커버 사진을 그대로 씁니다 (`apps/invitation` 의 adapter 가 그렇게 읽습니다).
   * 그래서 `inheritFrom` 으로 물려받은 사진을 보여줍니다 — 빈 칸을 보여주면 "사진이 없다"로
   * 읽히는데 화면에는 커버 사진이 깔려 있습니다.
   */
  {
    key: 'footer',
    label: '마무리',
    required: true,
    fields: [
      {
        path: 'core.footer.image',
        type: 'image',
        label: '마지막 사진',
        hint: '맨 아래 감사 인사 뒤에 깔리는 사진. 비워두면 커버 사진을 씁니다',
        inheritFrom: 'core.cover.image',
        inheritLabel: '커버 사진',
      },
      /**
       * 공유 버튼의 글자. 누르는 동안 바뀌는 글자(`…Busy`·`…Copied`)까지 함께 엽니다 -
       * 한쪽만 열어두면 버튼을 고친 사람이 누른 뒤에 낯선 문구를 보게 됩니다.
       */
      { path: 'core.labels.shareKakao', type: 'text', label: '카카오톡 공유 버튼', maxLength: 30 },
      {
        path: 'core.labels.shareKakaoBusy',
        type: 'text',
        label: '카카오톡 공유 · 누르는 중',
        hint: '카카오톡이 열리는 동안 잠깐 보입니다',
        maxLength: 30,
      },
      { path: 'core.labels.shareCopy', type: 'text', label: '링크 복사 버튼', maxLength: 30 },
      {
        path: 'core.labels.shareCopied',
        type: 'text',
        label: '링크 복사 · 복사된 뒤',
        maxLength: 30,
      },
    ],
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
        hint: '아이콘·사진을 자유롭게 섞어 최대 3개까지 (사진만 3개도 됩니다). 사진은 배경이 없는 스티커형 PNG를 올려주세요. 배경이 있는 결혼식 사진은 떨어질 때 어울리지 않습니다',
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
