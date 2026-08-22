/**
 * 섹션 배경색 — "이 카드는 이 색으로" 를 정하는 규칙 한 곳.
 *
 * 에디터(고르는 쪽)와 뷰어(칠하는 쪽)가 **같은 판정**을 써야 합니다. 한쪽만 알면
 * 에디터에는 색이 들어갔는데 하객 화면은 그대로인(또는 그 반대) 상태가 됩니다.
 *
 * 🔴 저장 형태는 `#RRGGBB` 하나뿐입니다. 색 문자열은 사용자가 넣은 값이 그대로
 *    `style` 로 들어가므로, 읽는 쪽은 **반드시 `normalizeSectionBg`(→ `normalizeHexColor`)를
 *    통과시켜야** 합니다. 'red; background-image:url(...)' 같은 값이 그대로 흘러가면
 *    청첩장 화면에 남의 CSS 가 실립니다.
 */
import type { SectionKey, ThemeId } from './content';
import { normalizeHexColor } from './layers';

/** 섹션 키 → 배경색(`#RRGGBB`). 키가 없으면 그 디자인의 기본 배경입니다 */
export type SectionBgMap = Partial<Record<SectionKey, string>>;

/**
 * 배경으로 실패가 적은 **추천 색**. 전부는 아닙니다 — 스포이드(색상표)와 HEX 입력으로
 * 자유롭게 고를 수 있고, 이 목록은 "무슨 색을 골라야 하나" 를 없애는 바로가기입니다.
 *
 * 어두운 색을 넣지 않은 이유: 본문 글자색은 디자인이 정해 둔 잉크색(진한 회갈색)이라
 * 배경이 어두워지면 글이 읽히지 않습니다. 그래도 고르고 싶은 사람은 색상표로 고를 수
 * 있게 열어 둡니다 — 막지는 않고, 권하지도 않습니다.
 */
export const SECTION_BG_COLORS = [
  { value: '#FFFFFF', label: '흰색' },
  { value: '#FBF6F1', label: '크림' },
  { value: '#F5EFE6', label: '베이지' },
  { value: '#FBEEF0', label: '블러시' },
  { value: '#EDF1EA', label: '세이지' },
  { value: '#ECEFF4', label: '블루그레이' },
] as const;

/**
 * 디자인마다 **배경색이 보이지 않는** 섹션.
 *
 * 사진이 화면을 꽉 채우는 섹션은 뒤에 무슨 색을 깔아도 하객 화면이 그대로입니다.
 * 에디터가 이걸 보고 색 고르기를 아예 감춥니다 — 눌러도 아무 일이 없는 컨트롤은
 * "저장이 안 됐나?" 로 읽힙니다.
 *
 * `Record<ThemeId, …>` 라서 디자인을 추가하면 여기에 적지 않는 한 컴파일이 실패합니다.
 */
export const SECTION_BG_HIDDEN: Record<ThemeId, readonly SectionKey[]> = {
  // 로즈 클래식 — 커버·마무리가 사진 전면(위에 어두운 그라데이션)입니다
  classic1: ['cover', 'footer'],
  // 세이지 가든 — 사진을 액자로 감싸므로 모든 섹션에서 배경이 보입니다
  classic2: [],
};

/** 이 디자인에서 그 섹션의 배경색을 고를 수 있는지 */
export function canPaintSection(themeId: ThemeId, key: SectionKey): boolean {
  return !SECTION_BG_HIDDEN[themeId].includes(key);
}

/**
 * 저장된 값을 화면에 쓸 수 있는 형태로 정리합니다.
 *
 * 읽을 수 없는 색·빈 문자열은 **키를 빼서** 돌려줍니다 — 그래야 뷰어가
 * "값이 있으면 칠하고, 없으면 디자인 기본" 한 가지 규칙으로만 판단합니다.
 */
export function normalizeSectionBg(value: unknown): SectionBgMap {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const out: SectionBgMap = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof raw !== 'string') continue;
    const color = normalizeHexColor(raw);
    if (color) out[key as SectionKey] = color;
  }
  return out;
}
