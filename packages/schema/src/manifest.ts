/**
 * 테마 매니페스트 — 에디터 폼을 코드가 아니라 데이터로 정의한다.
 *
 * 왜 이렇게 하는가: 테마가 늘어날 때마다 에디터를 새로 만들면 유지가 안 된다.
 * 테마가 자기 필드를 선언하고, 에디터는 이 선언을 읽어 폼을 생성한다.
 * → 새 테마 추가 = 섹션 컴포넌트 + 매니페스트 작성. **에디터 코드는 수정하지 않는다.**
 *
 * 필드 타입은 디자인 산출물의 분기(f.isText / f.isArea / f.isRepeat …)와 1:1로 맞췄습니다.
 */

export type FieldType =
  /** 한 줄 텍스트 */
  | 'text'
  /** 여러 줄 텍스트 — 줄바꿈이 결과에 그대로 반영됨. 모바일은 전체화면 편집 모드 */
  | 'textarea'
  /** 날짜 + 시간 (요일 표시 필요) */
  | 'datetime'
  /** 숫자 */
  | 'number'
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
  /** images 최대 개수 (유료 게이트가 붙는 지점) */
  max?: number;
  /** repeat·repeatGroup 하위 필드 */
  fields?: FieldDef[];
  /** 권장 업로드 크기 안내용 */
  aspect?: string;
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
