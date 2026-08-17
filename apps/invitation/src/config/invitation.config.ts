/**
 * ─────────────────────────────────────────────────────────────
 *  청첩장 데이터 (classic1 테마)
 *  이 파일 하나만 바꾸면 다른 청첩장으로 재사용할 수 있습니다.
 *  이미지/오디오 경로는 /public/assets/ 기준의 절대경로입니다.
 *
 *  ⚠️ 여기 값이 빌드에 박히므로 청첩장 1건만 만들 수 있습니다.
 *     여러 건을 서비스하려면 발행 스냅샷을 런타임에 받아와야 합니다.
 * ─────────────────────────────────────────────────────────────
 */
import { defaultCoverLayers, type TextLayer, type ThemeId } from '@luvi/schema';

export interface Person {
  /** 표시 이름 (예: 이호석) */
  name: string;
  /** 커버용 영문 이름 (예: Hoseok) */
  nameEn: string;
  /** 이름만 (예: 호석) */
  firstName: string;
  /** 아버지 성함 */
  father: string;
  /** 어머니 성함 */
  mother: string;
  /** 관계 (예: 장남 / 장녀) */
  relation: string;
}

export interface GalleryItem {
  /** 화면에 보이는(최적화된) 썸네일 */
  thumb: string;
  /** 라이트박스에서 크게 볼 원본 */
  full: string;
}

export interface AccountItem {
  /** 예: 신랑 이호석 */
  label: string;
  /** 예: 국민 710402-00-217723 */
  bank: string;
  /** 복사에 사용할 계좌번호(숫자/하이픈) */
  number: string;
  /** 카카오페이 송금 QR 링크 (선택) */
  kakaoPay?: string;
}

export interface AccountGroup {
  /** 아코디언 제목 (예: 신랑에게) */
  title: string;
  items: AccountItem[];
}

export interface TransportItem {
  icon: string;
  title: string;
  desc: string;
}

export type GameSpeed = 'easy' | 'normal' | 'hard';

export type { ThemeId };

export interface InvitationConfig {
  /**
   * 어떤 디자인으로 그릴지. src/themes/registry.ts 에 등록된 값이어야 합니다.
   * 지금은 이 파일에 고정돼 있지만, API 로 청첩장을 받아오는 단계에서는
   * 발행 스냅샷의 themeId 가 이 값을 대체합니다.
   */
  themeId: ThemeId;

  /**
   * 방명록·랭킹 API 호출에 쓰는 청첩장 ID.
   *
   * **빈 문자열이면 원격 저장을 하지 않고 localStorage 로만 동작합니다.** 두 경우에 비어 있습니다:
   * 에디터 라이브 미리보기(테스트 글이 하객 방명록에 섞이면 안 됨), 그리고 이 필드가
   * 생기기 전에 발행된 옛 KV 스냅샷(어느 청첩장인지 알 수 없으므로 남의 방명록에 쓰지 않음).
   */
  invitationId: string;

  groom: Person;
  bride: Person;

  /** 예식 일시 (ISO, 로컬 기준). 카운트다운·캘린더의 기준값 */
  weddingAt: string;

  cover: {
    /** 배경 이미지 (절대 URL 또는 루트 경로) */
    image: string;
    /**
     * 사진 위에 자유 배치되는 텍스트 레이어. 에디터가 편집한 좌표(비율)를 그대로 렌더합니다.
     * 에디터(CoverCanvas)와 같은 계산(@luvi/schema 의 layers.ts)을 씁니다.
     */
    layers: TextLayer[];
  };

  greeting: {
    /** 반려견 말풍선 문구 (\n 줄바꿈) */
    dogBubble: string;
    /** 반려견 아이콘 이미지 */
    dogImage: string;
    /** 반려견 말풍선(아이콘+문구) 노출 여부 */
    dogBubbleVisible: boolean;
    /** 인사말 본문 (\n 줄바꿈) */
    message: string;
  };

  calendar: {
    /** 캘린더 상단 영문 월 (예: October 2026) */
    monthLabel: string;
    /** 강조할 날짜(일) */
    highlightDay: number;
  };

  gallery: GalleryItem[];

  game: {
    /** 반려견 이름 (예: 일홍이) */
    petName: string;
    /** 낙하 이미지들 (dog1~6) */
    fallingImages: string[];
    /** idle 화면 큰 이미지 */
    idleImage: string;
    /** 난이도 */
    speed: GameSpeed;
    /** 랭킹판 노출 여부 */
    showLeaderboard: boolean;
  };

  location: {
    venue: string;
    hall: string;
    tel: string;
    /** 화면 표기용 주소 */
    address: string;
    /** 복사에 쓸 주소 */
    addressForCopy: string;
    /** 구글맵 임베드 iframe src */
    mapEmbedSrc: string;
    kakaoMapUrl: string;
    naverMapUrl: string;
    transport: TransportItem[];
  };

  account: {
    description: string;
    groups: AccountGroup[];
  };

  footer: {
    /** 배경 이미지 */
    image: string;
  };

  /** 배경음악 파일 (없으면 빈 문자열) */
  bgm: string;

  /** 꽃잎/발자국 낙하 연출 노출 여부 */
  showPetals: boolean;

  /** 낙하 연출의 모양·양 (on/off 는 showPetals) */
  petals: {
    /** 떨어질 이미지 URL */
    image: string;
    /** 동시에 떨어지는 개수 */
    count: number;
    /** 사용자가 직접 올린 이미지인지 — 기본 이미지일 때만 🐾 를 섞는다 */
    custom: boolean;
  };

  /**
   * 공유(og 태그·카카오톡 공유) 설정.
   * og 태그는 vite.config.ts의 ogTags 플러그인이 이 값으로 빌드 시 생성합니다.
   * index.html에 직접 쓰지 마세요 — 두 곳이 어긋납니다.
   */
  share: {
    title: string;
    date: string;
    /** 청첩장 절대 URL — og:url과 카카오 공유 링크에 쓰입니다 (끝에 / 포함) */
    url: string;
    /**
     * 공유 미리보기 설명.
     * `\n`은 카카오 피드에선 줄바꿈으로, og 태그에선 ` · `로 렌더됩니다.
     */
    description: string;
    /** og:site_name — 카카오가 제목 위 작은 글씨로 표시합니다 (title과 다르게) */
    siteName: string;
    /** 미리보기 이미지 (루트 절대경로 — url과 합쳐 절대 URL로 만듭니다) */
    image: string;
    /** 미리보기 이미지 실제 크기 — og:image:width/height로 나갑니다 */
    imageWidth: number;
    imageHeight: number;
    /** 캘린더에 등록될 일정 길이(분) */
    durationMinutes: number;
  };
}

export const invitation: InvitationConfig = {
  themeId: 'classic1',
  // 이 파일은 스냅샷이 없을 때 쓰는 예시 데이터입니다 — 원격 저장 없이 로컬로만 동작합니다
  invitationId: '',

  groom: {
    name: '이호석',
    nameEn: 'Hoseok',
    firstName: '호석',
    father: '이승봉',
    mother: '진순희',
    relation: '장남',
  },
  bride: {
    name: '백송희',
    nameEn: 'Songhee',
    firstName: '송희',
    father: '백승환',
    mother: '엄정숙',
    relation: '장녀',
  },

  weddingAt: '2026-10-24T13:00:00',

  cover: {
    image: '/assets/embedded/img_002.jpg',
    layers: defaultCoverLayers({
      eyebrow: 'The Wedding of',
      names: '호석 · 송희',
      dateLabel: '2026. 10. 24 SAT · PM 1:00',
    }),
  },

  greeting: {
    dogBubble: '멍! 두 분의 결혼식에\n놀러 와주실 거죠? 🐾',
    dogImage: '/assets/embedded/img_001.png',
    dogBubbleVisible: true,
    message:
      '서로의 이름을 처음 부르던 날처럼\n설레는 마음으로 인사드립니다.\n\n' +
      '한 곳을 바라보며 걸어온 두 사람이\n이제 평생을 함께하기로 약속합니다.\n\n' +
      '귀한 걸음으로 축복해 주시면\n더없는 기쁨으로 간직하겠습니다.',
  },

  calendar: {
    monthLabel: 'October 2026',
    highlightDay: 24,
  },

  gallery: [
    // 첫 항목은 상단 대표 이미지로 사용됩니다.
    { thumb: '/assets/embedded/img_003.jpg', full: '/assets/couple_c.jpg' },
    {
      thumb: '/assets/embedded/img_004.jpg',
      full: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=900&q=75',
    },
    {
      thumb: '/assets/embedded/img_005.jpg',
      full: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=900&q=75',
    },
    {
      thumb: '/assets/embedded/img_006.jpg',
      full: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=900&q=75',
    },
    {
      thumb: '/assets/embedded/img_007.jpg',
      full: 'https://images.unsplash.com/photo-1457089328109-e5d9bd499191?auto=format&fit=crop&w=900&q=75',
    },
    {
      thumb: '/assets/embedded/img_008.jpg',
      full: 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=900&q=75',
    },
    {
      thumb: '/assets/embedded/img_009.jpg',
      full: 'https://images.unsplash.com/photo-1469371670807-013ccf25f16a?auto=format&fit=crop&w=900&q=75',
    },
  ],

  game: {
    petName: '일홍이',
    fallingImages: [
      '/assets/dog1_c.png',
      '/assets/dog2_c.png',
      '/assets/dog3_c.png',
      '/assets/dog4_c.png',
      '/assets/dog5_c.png',
      '/assets/dog6_c.png',
    ],
    idleImage: '/assets/embedded/img_010.png',
    speed: 'normal',
    showLeaderboard: true,
  },

  location: {
    venue: '포항 더퀸컨벤션',
    hall: '6F 갤럭시홀',
    tel: '0522777400',
    address: '경상북도 포항시 남구 대이로 18 (대잠동 971-1) · 포항시청 옆',
    addressForCopy: '경상북도 포항시 남구 대이로 18 (대잠동 971-1)',
    mapEmbedSrc:
      'https://maps.google.com/maps?q=%EA%B2%BD%EC%83%81%EB%B6%81%EB%8F%84%20%ED%8F%AC%ED%95%AD%EC%8B%9C%20%EB%82%A8%EA%B5%AC%20%EB%8C%80%EC%9D%B4%EB%A1%9C%2018&z=16&hl=ko&output=embed',
    kakaoMapUrl: 'https://place.map.kakao.com/246592883',
    naverMapUrl:
      'https://map.naver.com/p/search/%ED%8F%AC%ED%95%AD%20%EB%8D%94%ED%80%B8/place/13526230',
    transport: [
      {
        icon: '🚗',
        title: '자가용',
        desc: '내비 "포항 더퀸컨벤션" 또는 "대이로 18" 검색 · 포항시청 주차장 이용 가능',
      },
      {
        icon: '🚍',
        title: '시내버스',
        desc: '110·111·216번 → "시청" 정류장 하차, 도보 2~3분',
      },
      {
        icon: '🚄',
        title: 'KTX',
        desc: '포항역에서 택시 약 20분',
      },
      {
        icon: '🚌',
        title: '시외 · 고속버스',
        desc: "시외버스터미널 택시 약 5분(또는 110·111번) · 서울發 고속버스는 '포항시청 입구' 간이정류장 하차 가능",
      },
    ],
  },

  account: {
    description:
      '참석이 어려우신 분들을 위해 계좌번호를 안내드립니다.\n전해주시는 마음 감사히 간직하겠습니다.',
    groups: [
      {
        title: '신랑에게',
        items: [
          {
            label: '신랑 이호석',
            bank: '국민 710402-00-217723',
            number: '710402-00-217723',
            kakaoPay: 'https://qr.kakaopay.com/FaOjDEWvQ',
          },
          { label: '아버지 이승봉', bank: '신한 110-006-882000', number: '110-006-882000' },
          { label: '어머니 진순희', bank: '국민 838501-01-038275', number: '838501-01-038275' },
        ],
      },
      {
        title: '신부에게',
        items: [
          {
            label: '신부 백송희',
            bank: '국민 459002-04-204336',
            number: '459002-04-204336',
            kakaoPay: 'https://qr.kakaopay.com/FXqFz2dlg',
          },
          { label: '아버지 백승환', bank: '국민 606-21-0278-441', number: '606-21-0278-441' },
          {
            label: '어머니 엄정숙',
            bank: '카카오뱅크 3333-06-2090673',
            number: '3333-06-2090673',
          },
        ],
      },
    ],
  },

  footer: {
    image: '/assets/embedded/img_003.jpg',
  },

  bgm: '/assets/embedded/audio_001.mp3',

  showPetals: true,
  petals: {
    image: '/assets/embedded/img_001.png',
    count: 9,
    custom: false,
  },

  share: {
    title: '호석 ♥ 송희 결혼합니다',
    date: '2026. 10. 24 SAT · PM 1:00',
    url: 'https://luvi-wedding.pages.dev/',
    description: '2026. 10. 24 SAT · PM 1:00\n포항 더퀸컨벤션 6F 갤럭시홀',
    siteName: 'Luvi',
    // 미리보기 카드는 가로형이라 세로 사진(cover.jpg 1000×1500)은 위아래가 잘립니다.
    image: '/assets/couple_c.jpg',
    imageWidth: 1000,
    imageHeight: 667,
    durationMinutes: 120,
  },
};
