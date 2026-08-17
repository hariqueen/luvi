/**
 * 새 청첩장의 초기 콘텐츠와, 저장된 문서를 보정할 때 쓰는 빈 골격.
 *
 * **목 데이터가 아닙니다.** 두 가지 실제 용도가 있습니다:
 *
 * 1. `sampleContent()` — 새 청첩장은 **빈 폼이 아니라 완성된 예시**로 시작합니다.
 *    빈칸만 가득한 화면을 처음 보면 무엇을 해야 하는지 알 수 없어 그대로 이탈합니다.
 *
 * 2. `emptyContent()` — Firestore 에서 읽은 문서를 이 골격 위에 덮습니다.
 *    발행된 청첩장은 예식까지 몇 달을 살아 있어서 그동안 스키마에 필드가 추가됩니다.
 *    그때 옛 문서에 없는 필드를 `undefined` 로 두면 **뷰어가 하객 앞에서 터집니다.**
 */
import type { ContentDoc } from '@luvi/schema';
import { defaultCoverLayers } from '@luvi/schema';

/** 저장된 문서에 빠진 필드를 채우기 위한 골격. 값은 모두 "비어 있음" 입니다. */
export function emptyContent(): ContentDoc {
  const person = () => ({
    name: '',
    nameEn: '',
    firstName: '',
    father: '',
    mother: '',
    relation: '',
  });

  return {
    core: {
      couple: { groom: person(), bride: person() },
      weddingAt: '',
      cover: { image: null, layers: [] },
      greeting: { message: '', bubbleText: '', bubbleImage: null, showBubble: true },
      gallery: [],
      location: {
        venue: '',
        hall: '',
        tel: '',
        address: '',
        addressForCopy: '',
        mapEmbedSrc: '',
        kakaoMapUrl: '',
        naverMapUrl: '',
        transport: [],
      },
      account: { description: '', groups: [] },
      footer: { image: null },
      bgm: null,
      share: { title: '', description: '', image: null, durationMinutes: 120 },
    },
    theme: {},
  };
}

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
        showBubble: true,
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
          {
            icon: '🚗',
            title: '자가용',
            desc: '내비 "포항 더퀸컨벤션" 검색 · 포항시청 주차장 이용 가능',
          },
          { icon: '🚍', title: '시내버스', desc: '110·111·216번 → "시청" 정류장 하차, 도보 2~3분' },
          { icon: '🚄', title: 'KTX', desc: '포항역에서 택시 약 20분' },
        ],
      },
      account: {
        description: '참석이 어려우신 분들을 위해 계좌번호를 안내드립니다.',
        groups: [
          {
            title: '신랑에게',
            items: [
              { label: '신랑 이호석', bank: '국민 000000-00-000000', number: '000000-00-000000' },
            ],
          },
          {
            title: '신부에게',
            items: [
              { label: '신부 백송희', bank: '국민 000000-00-000000', number: '000000-00-000000' },
            ],
          },
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
