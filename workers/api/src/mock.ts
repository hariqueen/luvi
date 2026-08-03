/**
 * 스텁 응답용 목 데이터.
 *
 * 백엔드가 완성되기 전에 프론트를 끝까지 만들 수 있게 하는 것이 목적입니다.
 * 실제 구현이 들어오면 이 파일은 삭제하세요 (참조하는 곳은 `index.ts` 뿐입니다).
 */
import type {
  ContentDoc,
  DraftDiff,
  GuestbookEntry,
  Invitation,
  InvitationSummary,
  RankEntry,
} from '@luvi/schema';
import { DEFAULT_SECTIONS, SCHEMA_VERSION, defaultCoverLayers } from '@luvi/schema';

export function sampleContent(): ContentDoc {
  return {
    core: {
      couple: {
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
      },
      weddingAt: '2026-10-24T13:00:00',
      cover: {
        image: null,
        layers: defaultCoverLayers({
          eyebrow: 'The Wedding of',
          names: '호석 · 송희',
          dateLabel: '2026. 10. 24 SAT · PM 1:00',
        }),
      },
      greeting: {
        message:
          '서로의 이름을 처음 부르던 날처럼\n설레는 마음으로 인사드립니다.\n\n' +
          '한 곳을 바라보며 걸어온 두 사람이\n이제 평생을 함께하기로 약속합니다.\n\n' +
          '귀한 걸음으로 축복해 주시면\n더없는 기쁨으로 간직하겠습니다.',
        bubbleText: '멍! 두 분의 결혼식에\n놀러 와주실 거죠? 🐾',
        bubbleImage: null,
      },
      gallery: [],
      location: {
        venue: '포항 더퀸컨벤션',
        hall: '6층 갤럭시홀',
        tel: '0522777400',
        address: '경상북도 포항시 남구 대이로 18 (대잠동 971-1) · 포항시청 옆',
        addressForCopy: '경상북도 포항시 남구 대이로 18',
        mapEmbedSrc: '',
        kakaoMapUrl: 'https://place.map.kakao.com/246592883',
        naverMapUrl: 'https://map.naver.com/p/search/포항 더퀸',
        transport: [
          { icon: '🚗', title: '자가용', desc: '내비 "포항 더퀸컨벤션" 검색 · 포항시청 주차장 이용 가능' },
          { icon: '🚍', title: '시내버스', desc: '110·111·216번 → "시청" 정류장 하차, 도보 2~3분' },
          { icon: '🚄', title: 'KTX', desc: '포항역에서 택시 약 20분' },
        ],
      },
      account: {
        description: '참석이 어려우신 분들을 위해 계좌번호를 안내드립니다.',
        groups: [
          { title: '신랑에게', items: [{ label: '신랑 이호석', bank: '국민 000000-00-000000', number: '000000-00-000000' }] },
          { title: '신부에게', items: [{ label: '신부 백송희', bank: '국민 000000-00-000000', number: '000000-00-000000' }] },
        ],
      },
      footer: { image: null },
      bgm: null,
      share: {
        title: '호석 ♥ 송희 결혼합니다',
        description: '2026. 10. 24 SAT · PM 1:00\n포항 더퀸컨벤션 6F 갤럭시홀',
        image: null,
        durationMinutes: 120,
      },
    },
    theme: {
      classic1: {
        game: {
          petName: '일홍이',
          fallingImages: [],
          idleImage: null,
          speed: 'normal',
          showLeaderboard: true,
        },
      },
    },
  };
}

export function mockInvitation(id: string): Invitation {
  const now = new Date().toISOString();
  return {
    id,
    ownerUid: 'dev-uid',
    themeId: 'classic1',
    schemaVersion: SCHEMA_VERSION,
    status: 'published',
    slug: 'hoseok-songhee',
    pinnedHost: 'luvi-wedding.pages.dev',
    draft: sampleContent(),
    published: sampleContent(),
    sections: [...DEFAULT_SECTIONS],
    features: { bgm: true, petals: true },
    createdAt: now,
    updatedAt: now,
    publishedAt: now,
  };
}

export function mockSummaries(): InvitationSummary[] {
  return [
    {
      id: 'inv_hoseok_songhee',
      slug: 'hoseok-songhee',
      themeId: 'classic1',
      status: 'published',
      coupleLabel: '호석 ♥ 송희',
      weddingAt: '2026-10-24T13:00:00',
      thumbKey: null,
      // 대시보드에서 '발행됨 · 변경 3건' 배지를 확인하려고 일부러 0이 아닌 값을 둔다
      unpublishedChanges: 3,
      updatedAt: new Date().toISOString(),
    },
  ];
}

export function mockDiff(): DraftDiff {
  return {
    changes: [
      { path: 'core.cover.image', label: '커버 사진' },
      { path: 'core.greeting.message', label: '인사말' },
      { path: 'core.account.groups', label: '계좌 2건' },
    ],
    missing: [],
  };
}

export function mockGuestbook(): GuestbookEntry[] {
  const at = new Date().toISOString();
  return [
    { id: 'g1', name: '김은재', msg: '두 분 결혼 축하해요! 오래오래 행복하세요 🎉', hidden: false, createdAt: at },
    { id: 'g2', name: '박서준', msg: '축하합니다! 꼭 참석할게요', hidden: false, createdAt: at },
  ];
}

export function mockRankings(): RankEntry[] {
  return [
    { id: 'r1', nick: '일홍이팬', score: 42.7, caught: 31, createdAt: new Date().toISOString() },
    { id: 'r2', nick: '하객1호', score: 38.2, caught: 27, createdAt: new Date().toISOString() },
  ];
}
