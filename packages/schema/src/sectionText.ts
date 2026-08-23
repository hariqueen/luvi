/**
 * 카드에 적히는 문구 — "이 카드의 윗줄·제목·안내는 무엇인가" 를 정하는 규칙 한 곳.
 *
 * 지금까지 이 문구들은 **테마 컴포넌트 안의 문자열 리터럴**이었습니다
 * (`<SectionHeading eyebrow="🐾 OUR MOMENTS" title="Gallery" />`). 그래서 하객 화면에는
 * 글자가 있는데 에디터에는 그 글자를 고칠 자리가 없었습니다 — 미니게임만 예외였습니다.
 *
 * 🔴 기본 문구를 여기 모으는 이유: **에디터와 뷰어가 같은 값을 봐야** 합니다.
 *    기본값이 테마 안에만 있으면 에디터는 빈 칸을 보여주는데 화면에는 'Gallery' 가 떠서
 *    "빈 칸인데 왜 글자가 있지" 가 됩니다. 여기 있으면 에디터가 그 문구를 placeholder 로
 *    보여주고, 사용자가 채운 값만 저장합니다.
 *
 * 저장 형태는 `core.sectionText[섹션][칸]` 이고 **빈 문자열 = 디자인 기본 문구**입니다
 * (`design.ts` 의 배경색과 같은 규칙 — 중첩 키를 지우는 것보다 안전합니다).
 */
import type { SectionKey, ThemeId } from './content';
import { SECTION_KEYS } from './content';

/** 한 카드의 문구. 없거나 비어 있으면 그 디자인의 기본 문구를 씁니다 */
export interface SectionText {
  /** 제목 위 작은 줄 (classic1 의 '🐾 OUR MOMENTS', classic2 의 필기체 'Moments') */
  eyebrow?: string;
  /** 카드 제목 ('오시는 길', 'Gallery' …) */
  title?: string;
  /** 카드 안내 한 줄 ('사진을 누르면 크게 볼 수 있어요' …) */
  note?: string;
}

/** 섹션 키 → 그 카드의 문구. 키가 없으면 전부 기본 문구입니다 */
export type SectionTextMap = Partial<Record<SectionKey, SectionText>>;

/** 문구 칸의 종류 */
export type SectionTextSlot = 'eyebrow' | 'title' | 'note';

/** 칸 이름 — 에디터 라벨. 업계 용어 대신 "어디에 있는 글자인지" 로 씁니다 */
export const SECTION_TEXT_SLOT_LABEL: Record<SectionTextSlot, string> = {
  eyebrow: '작은 윗줄',
  title: '제목',
  note: '안내 문구',
};

/**
 * 디자인별 기본 문구.
 *
 * **칸이 없다는 것은 그 디자인의 그 카드에 그 자리가 없다는 뜻**입니다 (예: 로즈 클래식의
 * 인사말에는 제목 자리가 없고 윗줄만 있습니다). 에디터는 여기 있는 칸만 보여줍니다 —
 * 없는 자리를 채우게 하면 저장은 되는데 화면에는 안 나옵니다.
 *
 * `{신랑}`·`{신부}` 는 이름으로 치환됩니다 (`fillSectionText`).
 *
 * 커버는 사진 위 자유 배치 문구(`core.cover.layers`)라 여기 없고,
 * 미니게임은 자기 문단 편집(`theme.classic1.game`)이 있어 여기 없습니다.
 */
export const SECTION_TEXT_DEFAULTS: Record<ThemeId, SectionTextMap> = {
  // 로즈 클래식 — 🐾 윗줄 + Cormorant 제목
  classic1: {
    greeting: { eyebrow: '🐾 INVITATION' },
    calendar: { eyebrow: '🐾 THE DAY', note: '{신랑} ♥ {신부}의 결혼식까지' },
    gallery: {
      eyebrow: '🐾 OUR MOMENTS',
      title: 'Gallery',
      note: '사진을 누르면 크게 볼 수 있어요',
    },
    location: {
      eyebrow: '🐾 LOCATION',
      title: '오시는 길',
      note: '버튼을 누르면 지도 앱에서 길찾기가 열려요',
    },
    account: { eyebrow: '🐾 WITH HEART', title: '마음 전하기' },
    guestbook: {
      eyebrow: '🐾 GUESTBOOK',
      title: '축하 방명록',
      note: '저희 둘에게 따뜻한 방명록을 남겨주세요',
    },
    footer: { title: 'Thank You' },
  },
  // 세이지 가든 — 필기체 윗줄(script) + 명조 제목(label)
  classic2: {
    greeting: { eyebrow: 'Invitation', title: '초대합니다' },
    calendar: { eyebrow: 'The Day', title: '예식일', note: '{신랑} · {신부}의 결혼식까지' },
    gallery: {
      eyebrow: 'Moments',
      title: '우리의 순간',
      note: '사진을 누르면 크게 볼 수 있어요',
    },
    location: { eyebrow: 'Location', title: '오시는 길' },
    account: { eyebrow: 'With Heart', title: '마음 전하기' },
    guestbook: {
      eyebrow: 'Guestbook',
      title: '축하 방명록',
      note: '저희 둘에게 따뜻한 방명록을 남겨주세요',
    },
    footer: { title: 'Thank You' },
  },
};

/** 이 디자인의 이 카드에서 고칠 수 있는 문구 칸 (순서는 화면에 보이는 순서) */
export function sectionTextSlots(themeId: ThemeId, key: SectionKey): SectionTextSlot[] {
  const defaults = SECTION_TEXT_DEFAULTS[themeId][key];
  if (!defaults) return [];
  const order: SectionTextSlot[] = ['eyebrow', 'title', 'note'];
  return order.filter((slot) => defaults[slot] !== undefined);
}

/** 이 디자인의 기본 문구 (없는 칸이면 빈 문자열) */
export function sectionTextDefault(
  themeId: ThemeId,
  key: SectionKey,
  slot: SectionTextSlot,
): string {
  return SECTION_TEXT_DEFAULTS[themeId][key]?.[slot] ?? '';
}

/**
 * 문구의 `{…}` 자리를 실제 값으로 바꿉니다.
 *
 * 아는 이름만 바꾸고 **모르는 `{…}` 는 그대로 둡니다** — 사용자가 중괄호를 문장에 쓸 수도
 * 있는데 조용히 지우면 글자가 사라진 것처럼 보입니다. (`fillGameText` 와 같은 규칙)
 */
export function fillSectionText(
  template: string,
  vars: { 신랑?: string; 신부?: string },
): string {
  return template.replace(/\{(신랑|신부)\}/g, (whole, key: string) => {
    const value = (vars as Record<string, unknown>)[key];
    return value === undefined || value === null || value === '' ? whole : String(value);
  });
}

/** 저장된 값을 정리합니다 — 공백만 있는 값은 '고르지 않음' 으로 봅니다 */
export function normalizeSectionText(value: unknown): SectionTextMap {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const out: SectionTextMap = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue;
    const entry: SectionText = {};
    for (const slot of ['eyebrow', 'title', 'note'] as SectionTextSlot[]) {
      const text = (raw as Record<string, unknown>)[slot];
      if (typeof text === 'string' && text.trim()) entry[slot] = text;
    }
    if (Object.keys(entry).length > 0) out[key as SectionKey] = entry;
  }
  return out;
}

/** 화면에 그릴 문구 — 칸마다 값이 채워진 형태 */
export type ResolvedSectionText = Record<SectionKey, Required<SectionText>>;

/**
 * 고른 문구 + 디자인 기본값 + 이름 치환을 한 번에 끝냅니다.
 *
 * 뷰어의 섹션 컴포넌트는 이 결과만 읽습니다 — 테마마다 기본 문구를 다시 적지 않고,
 * "비었으면 기본값" 판단도 한 곳에서만 합니다.
 */
export function resolveSectionText(
  themeId: ThemeId,
  overrides: unknown,
  vars: { 신랑?: string; 신부?: string },
): ResolvedSectionText {
  const chosen = normalizeSectionText(overrides);
  const out = {} as ResolvedSectionText;

  for (const key of SECTION_KEYS) {
    const picked = chosen[key] ?? {};
    out[key] = {
      eyebrow: fillSectionText(picked.eyebrow ?? sectionTextDefault(themeId, key, 'eyebrow'), vars),
      title: fillSectionText(picked.title ?? sectionTextDefault(themeId, key, 'title'), vars),
      note: fillSectionText(picked.note ?? sectionTextDefault(themeId, key, 'note'), vars),
    };
  }
  return out;
}
