import type { SectionKey } from '@luvi/schema';
import type { SectionMeta } from '@/components/SectionManager';

/**
 * 섹션 라벨·설명. 사용자에게 보이는 문구이므로 업계 용어를 쓰지 않습니다.
 * `desc` 는 "추가할 수 있는 것" 목록에서 무엇이 붙는지 알려주는 역할입니다.
 */
export const SECTION_META: Record<SectionKey, SectionMeta> = {
  cover: { key: 'cover', label: '커버', desc: '사진 한 장과 그 위 문구' },
  greeting: { key: 'greeting', label: '인사말', desc: '하객에게 전하는 글과 혼주 정보' },
  calendar: { key: 'calendar', label: '캘린더', desc: '달력과 남은 날짜 세기' },
  gallery: { key: 'gallery', label: '갤러리', desc: '사진 모아 보기' },
  minigame: {
    key: 'minigame',
    label: '미니게임',
    desc: '하객이 즐기는 게임과 랭킹 — 그림·문구·난이도를 바꿀 수 있어요',
  },
  location: { key: 'location', label: '오시는 길', desc: '지도·주소·교통편 안내' },
  account: { key: 'account', label: '마음 전하기', desc: '축의금 계좌 안내' },
  guestbook: { key: 'guestbook', label: '방명록', desc: '하객이 남기는 축하 메시지' },
  footer: { key: 'footer', label: '마무리', desc: '마지막 사진과 공유 버튼' },
};

/**
 * 섹션 키 → 폼 그룹 키. 매니페스트의 섹션과 이름이 다른 경우를 잇는다.
 *
 * 갤러리는 **'사진' 폼**으로 보냅니다 — 커버·갤러리·마지막 사진을 한 화면에서 훑어보게
 * 하려는 것입니다 (실제로 마지막 사진은 편집할 곳을 못 찾아 손대지 않은 채 발행되었습니다).
 *
 * 🔴 마무리(footer)는 '사진' 폼이 아니라 **자기 폼**으로 보냅니다. 예전에는 여기도
 *    'photos' 였는데, 마무리 카드를 눌렀는데 맨 위에 '커버 사진 · 첫 화면' 이 떠서
 *    마무리 사진을 고르려다 커버를 바꾸게 됩니다. 카드를 눌렀으면 그 카드의 것만 보여줍니다.
 *    (커버·갤러리·마지막 사진을 함께 보는 화면은 '사진' 칩으로 그대로 남아 있습니다)
 */
export const SECTION_TO_FORM: Partial<Record<SectionKey, string>> = {
  cover: 'cover',
  greeting: 'greeting',
  calendar: 'ceremony',
  gallery: 'photos',
  minigame: 'minigame',
  location: 'location',
  account: 'account',
  guestbook: 'guestbook',
  footer: 'footer',
};

/**
 * 폼 그룹 키 → 섹션 키. `SECTION_TO_FORM` 을 뒤집은 것입니다.
 *
 * 배경색은 **섹션마다** 정하는 값인데 편집 화면은 **폼** 단위라, 지금 보고 있는 폼이
 * 어느 섹션의 것인지 알아야 합니다. 손으로 또 적지 않고 위 표를 뒤집어 만듭니다 —
 * 두 표를 따로 두면 한쪽만 고쳐서 "인사말 폼에서 캘린더 배경색을 바꾸는" 일이 생깁니다.
 *
 * ⚠️ 여러 섹션이 한 폼을 쓰면 **먼저 선언된 섹션**이 이깁니다. 지금은 겹치는 폼이
 *    없습니다 ('사진' 폼은 갤러리 하나뿐). 기본 정보·연출·공유 설정처럼 섹션이 아닌
 *    폼은 여기에 없습니다 (배경색도 없습니다).
 */
export const FORM_TO_SECTION: Record<string, SectionKey> = Object.fromEntries(
  Object.entries(SECTION_TO_FORM)
    .reverse()
    .map(([section, form]): [string, SectionKey] => [form as string, section as SectionKey]),
);
