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

/** 섹션 키 → 폼 그룹 키. 매니페스트의 섹션과 이름이 다른 경우를 잇는다 */
export const SECTION_TO_FORM: Partial<Record<SectionKey, string>> = {
  cover: 'cover',
  greeting: 'greeting',
  calendar: 'ceremony',
  gallery: 'gallery',
  minigame: 'minigame',
  location: 'location',
  account: 'account',
  guestbook: 'guestbook',
};
