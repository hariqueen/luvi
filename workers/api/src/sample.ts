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
import { DEFAULT_PETAL_COUNT, defaultCoverLayers, defaultGame } from '@luvi/schema';

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
      // 카드 문구는 비워 둡니다 — 비면 그 디자인의 기본 문구를 씁니다 (sectionText.ts)
      sectionText: {},
      bgm: null,
      effects: {
        // 새 청첩장은 낙하 효과가 켜져 있으니(features.petals) 떨어질 것을 하나 담아둡니다.
        // 비워두면 '효과는 켜졌는데 아무것도 안 떨어지는' 상태로 시작합니다.
        petals: { items: [{ kind: 'emoji', value: '🌸' }], image: null, count: DEFAULT_PETAL_COUNT },
      },
      share: { title: '', description: '', image: null, durationMinutes: 120 },
      // 비어 있음 = 섹션마다 그 디자인의 기본 배경. 사용자가 고른 색만 들어옵니다
      design: { sectionBg: {} },
    },
    /**
     * 🔴 미니게임 설정도 골격에 넣습니다 (예전에는 `theme: {}` 였습니다).
     *
     * 비워두면 게임 문구가 전부 `undefined` 인 채 에디터로 갑니다 — 폼은 빈칸으로 보이는데
     * 하객 화면에는 기본 문구가 떠서, 사용자가 "설정에 없는 글이 화면에 있다" 를 겪습니다.
     * 여기서 채워 두면 폼에 보이는 값이 곧 화면의 값입니다.
     */
    theme: { classic1: { game: defaultGame() } },
  };
}

export function sampleContent(): ContentDoc {
  return {
    core: {
      couple: {
        groom: {
          name: '신랑',
          nameEn: 'Groom',
          firstName: '신랑',
          father: '아버지',
          mother: '어머니',
          relation: '장남',
        },
        bride: {
          name: '신부',
          nameEn: 'Bride',
          firstName: '신부',
          father: '아버지',
          mother: '어머니',
          relation: '장녀',
        },
      },
      weddingAt: '2026-10-24T13:00:00',
      cover: {
        image: null,
        layers: defaultCoverLayers({
          eyebrow: 'The Wedding of',
          names: '신랑 · 신부',
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
              { label: '신랑', bank: '국민 000000-00-000000', number: '000000-00-000000' },
            ],
          },
          {
            title: '신부에게',
            items: [
              { label: '신부', bank: '국민 000000-00-000000', number: '000000-00-000000' },
            ],
          },
        ],
      },
      footer: { image: null },
      // 카드 문구는 비워 둡니다 — 비면 그 디자인의 기본 문구를 씁니다 (sectionText.ts)
      sectionText: {},
      bgm: null,
      effects: {
        // 새 청첩장은 낙하 효과가 켜져 있으니(features.petals) 떨어질 것을 하나 담아둡니다.
        // 비워두면 '효과는 켜졌는데 아무것도 안 떨어지는' 상태로 시작합니다.
        petals: { items: [{ kind: 'emoji', value: '🌸' }], image: null, count: DEFAULT_PETAL_COUNT },
      },
      share: {
        title: '신랑 ♥ 신부 결혼합니다',
        description: '2026. 10. 24 SAT · PM 1:00\n포항 더퀸컨벤션 6F 갤럭시홀',
        image: null,
        durationMinutes: 120,
      },
      // 새 청첩장은 디자인이 정한 배경 그대로 시작합니다 (색을 고르면 여기에 쌓입니다)
      design: { sectionBg: {} },
    },
    theme: {
      classic1: {
        // 문구·난이도·랭킹 기본값은 스키마 한 곳에서 옵니다 (`defaultGame`)
        game: defaultGame('멍멍이'),
      },
    },
  };
}
