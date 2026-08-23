/**
 * 카드에 적히는 문구 — **문구 하나하나를 넣고 지우고 옮길 수 있는** 블록 목록.
 *
 * ─── 왜 블록 목록인가 (2026-08-23) ──────────────────────────────────────────
 *
 * 처음에는 카드마다 `{eyebrow, title, note}` 세 칸이었습니다. 세 칸이면 "고치기" 는 되는데
 * 나머지가 전부 막힙니다:
 *
 *  · **지울 수 없었다** — 빈 값 = "디자인 기본 문구" 라는 규칙이라, 캘린더의
 *    '{신랑} ♥ {신부}의 결혼식까지' 를 **없애는 방법이 아예 없었습니다.** 비우면 되돌아옵니다.
 *  · **더할 수 없었다** — 칸이 세 개로 못박혀 있어 넷째 줄을 넣을 자리가 없었습니다.
 *  · **옮길 수 없었다** — 순서가 테마 컴포넌트의 마크업 순서였습니다.
 *
 * 그래서 커버(`TextLayer`, 사진 위 자유 좌표)와 미니게임 소개 문구(`TextBlock`, 흐름 배치)가
 * 이미 쓰던 **목록 모델**로 카드 문구도 옮깁니다. 세 곳이 같은 사고방식을 갖게 됩니다.
 *
 * 🔴 **`[]`(빈 배열)과 `undefined`(없음)는 다른 뜻입니다.**
 *      · 키가 없다 = 아직 손대지 않았다 → 그 디자인의 기본 문구를 쓴다
 *      · 빈 배열   = 사용자가 전부 지웠다 → **아무것도 그리지 않는다**
 *    이 구분이 없으면 지운 문구가 되살아나고, 지울 방법이 없는 필드가 됩니다
 *    (미니게임이 `normalizeGame` 에서 같은 규칙을 씁니다).
 *    저장 경로에서도 이 구분이 살아남습니다 — 워커의 `mergeContent` 는 **배열을 통째로
 *    대체**하므로 빈 배열이 기본 골격에 덮이지 않습니다.
 *
 * ─── 자리(zone)를 둘로 나눈 이유 ────────────────────────────────────────────
 *
 * 카드 안에서 문구는 **콘텐츠 위·아래** 두 군데에 있습니다. 캘린더의 안내는 달력 아래,
 * 오시는 길의 안내는 지도 아래, 갤러리의 안내는 사진 아래입니다. 한 목록으로는 이걸
 * 표현할 수 없어서 `head`(카드 맨 위) 와 `foot`(콘텐츠 아래) 두 목록을 둡니다.
 *
 * **카드 안 자유 좌표(x·y)는 두지 않습니다.** 커버가 좌표를 갖는 건 배경 사진이 고정
 * 비율이라서입니다. 카드는 높이가 콘텐츠(달력·지도·방명록 목록)에 따라 변해서, 좌표로
 * 두면 폰 크기마다 글자가 달력 위에 겹칩니다. 대신 흐름 안에서 순서·정렬·크기·색을 엽니다.
 */
import type { SectionKey, ThemeId } from './content';
import { SECTION_KEYS } from './content';

/** 문구의 역할. 크기·색·글꼴은 **디자인이** 정합니다 (같은 역할이 테마마다 다르게 그려집니다) */
export type SectionTextRole = 'eyebrow' | 'title' | 'note';

/** 블록 하나의 가로 정렬. 없으면 그 카드의 기본 정렬 */
export type SectionTextAlign = 'left' | 'center' | 'right';

/** 문구가 놓이는 자리 */
export type SectionZone = 'head' | 'foot';

/**
 * 카드 문구 한 줄.
 *
 * `align`·`scale`·`color` 는 **없으면 디자인 기본**입니다 — 값을 안 넣은 것과 디자인을
 * 따르는 것이 같은 뜻이어야, 나중에 디자인을 바꿨을 때 손대지 않은 문구가 같이 따라옵니다.
 */
export interface SectionBlock {
  id: string;
  /** 줄바꿈이 화면에 그대로 반영됩니다 */
  text: string;
  role: SectionTextRole;
  align?: SectionTextAlign;
  /** 역할 기본 크기의 배율 (`SECTION_TEXT_SCALE_RANGE`). 없으면 1 */
  scale?: number;
  /** CSS 색 문자열. 없으면 디자인 색 */
  color?: string;
}

/** 한 카드의 문구. 자리가 없으면(`undefined`) 그 디자인의 기본 문구입니다 */
export interface SectionBlocks {
  head?: SectionBlock[];
  foot?: SectionBlock[];
}

/**
 * 저장된 값의 실제 모양.
 *
 * 새 모양(`head`/`foot`)과 **옛 모양**(`eyebrow`/`title`/`note` 문자열)이 함께 옵니다 —
 * 이미 발행된 청첩장의 스냅샷은 그때의 JSON 이고 다시 쓰지 않습니다. 옛 모양을 블록으로
 * 올리는 일은 `resolveSectionText` 가 합니다(디자인을 알아야 어느 자리인지 정해집니다).
 */
export interface StoredSectionText extends SectionBlocks {
  /** @deprecated 옛 모양 — 읽을 때만 씁니다 */
  eyebrow?: string;
  /** @deprecated 옛 모양 */
  title?: string;
  /** @deprecated 옛 모양 */
  note?: string;
}

/** 섹션 키 → 그 카드의 문구. 키가 없으면 전부 기본 문구입니다 */
export type SectionTextMap = Partial<Record<SectionKey, StoredSectionText>>;

/** 역할 이름 — 에디터 라벨. 업계 용어 대신 "어디에 있는 글자인지" 로 씁니다 */
export const SECTION_TEXT_ROLE_LABEL: Record<SectionTextRole, string> = {
  eyebrow: '작은 윗줄',
  title: '제목',
  note: '안내 문구',
};

/** 자리 이름 — 에디터 라벨 */
export const SECTION_ZONE_LABEL: Record<SectionZone, string> = {
  head: '카드 위',
  foot: '콘텐츠 아래',
};

export const SECTION_ZONES: SectionZone[] = ['head', 'foot'];
export const SECTION_TEXT_ROLES: SectionTextRole[] = ['eyebrow', 'title', 'note'];

/**
 * 크기 배율 범위.
 *
 * 상한을 두는 이유: 배율을 무제한으로 열면 한 줄이 카드를 넘겨 잘립니다 — 되돌리는 방법을
 * 모르면 그 카드를 못 쓰게 됩니다. 역할마다 기본 크기가 이미 다르므로 배율은 좁아도 됩니다.
 */
export const SECTION_TEXT_SCALE_RANGE = { min: 0.7, max: 1.8, step: 0.05 } as const;

/** 역할마다 길이 제한 — 윗줄은 짧아야 디자인이 유지되고, 안내는 한 문장이 들어갑니다 */
export const SECTION_TEXT_MAX_LENGTH: Record<SectionTextRole, number> = {
  eyebrow: 40,
  title: 60,
  note: 200,
};

let blockSeq = 0;

/** 새 블록. id 는 배열 안에서만 유일하면 됩니다 (React key · 미리보기 탭 대상) */
export function createSectionBlock(
  role: SectionTextRole = 'note',
  text = '',
  extra: Partial<Omit<SectionBlock, 'id' | 'role' | 'text'>> = {},
): SectionBlock {
  blockSeq += 1;
  return { id: `sb${blockSeq}-${Math.random().toString(36).slice(2, 7)}`, text, role, ...extra };
}

/** 디자인 기본 문구 한 줄 (id 는 읽을 때 붙습니다) */
interface DefaultBlock {
  role: SectionTextRole;
  text: string;
}

interface DefaultZones {
  head?: DefaultBlock[];
  foot?: DefaultBlock[];
}

/**
 * 디자인별 기본 문구.
 *
 * **자리가 비어 있다는 것은 그 디자인의 그 카드에 기본 문구가 없다는 뜻**입니다 (예: 로즈
 * 클래식 인사말에는 제목이 없습니다). 기본이 없어도 **사용자는 넣을 수 있습니다** — 모든
 * 카드가 두 자리를 다 그리므로, 빈 자리에 추가한 문구도 화면에 나옵니다.
 *
 * `{신랑}`·`{신부}` 는 이름으로 치환됩니다 (`fillSectionText`).
 *
 * 커버는 사진 위 자유 배치 문구(`core.cover.layers`)라 여기 없고,
 * 미니게임은 자기 문단 편집(`theme.classic1.game.intro`)이 있어 여기 없습니다.
 */
export const SECTION_TEXT_DEFAULTS: Record<ThemeId, Partial<Record<SectionKey, DefaultZones>>> = {
  // 로즈 클래식 — 🐾 윗줄 + Cormorant 제목
  classic1: {
    greeting: { head: [{ role: 'eyebrow', text: '🐾 INVITATION' }] },
    calendar: {
      head: [{ role: 'eyebrow', text: '🐾 THE DAY' }],
      foot: [{ role: 'note', text: '{신랑} ♥ {신부}의 결혼식까지' }],
    },
    gallery: {
      head: [
        { role: 'eyebrow', text: '🐾 OUR MOMENTS' },
        { role: 'title', text: 'Gallery' },
      ],
      foot: [{ role: 'note', text: '사진을 누르면 크게 볼 수 있어요' }],
    },
    location: {
      head: [
        { role: 'eyebrow', text: '🐾 LOCATION' },
        { role: 'title', text: '오시는 길' },
      ],
      foot: [{ role: 'note', text: '버튼을 누르면 지도 앱에서 길찾기가 열려요' }],
    },
    account: {
      head: [
        { role: 'eyebrow', text: '🐾 WITH HEART' },
        { role: 'title', text: '마음 전하기' },
      ],
    },
    guestbook: {
      head: [
        { role: 'eyebrow', text: '🐾 GUESTBOOK' },
        { role: 'title', text: '축하 방명록' },
        { role: 'note', text: '저희 둘에게 따뜻한 방명록을 남겨주세요' },
      ],
    },
    footer: { head: [{ role: 'title', text: 'Thank You' }] },
  },
  // 세이지 가든 — 필기체 윗줄(script) + 자간 넓은 국문 라벨
  classic2: {
    greeting: {
      head: [
        { role: 'eyebrow', text: 'Invitation' },
        { role: 'title', text: '초대합니다' },
      ],
    },
    calendar: {
      head: [
        { role: 'eyebrow', text: 'The Day' },
        { role: 'title', text: '예식일' },
      ],
      foot: [{ role: 'note', text: '{신랑} · {신부}의 결혼식까지' }],
    },
    gallery: {
      head: [
        { role: 'eyebrow', text: 'Moments' },
        { role: 'title', text: '우리의 순간' },
      ],
      foot: [{ role: 'note', text: '사진을 누르면 크게 볼 수 있어요' }],
    },
    location: {
      head: [
        { role: 'eyebrow', text: 'Location' },
        { role: 'title', text: '오시는 길' },
      ],
    },
    account: {
      head: [
        { role: 'eyebrow', text: 'With Heart' },
        { role: 'title', text: '마음 전하기' },
      ],
    },
    guestbook: {
      head: [
        { role: 'eyebrow', text: 'Guestbook' },
        { role: 'title', text: '축하 방명록' },
        { role: 'note', text: '저희 둘에게 따뜻한 방명록을 남겨주세요' },
      ],
    },
    footer: { head: [{ role: 'title', text: 'Thank You' }] },
  },
};

/** 이 디자인·이 카드·이 자리의 기본 문구 (없으면 빈 배열) */
export function defaultSectionBlocks(
  themeId: ThemeId,
  key: SectionKey,
  zone: SectionZone,
): SectionBlock[] {
  const defaults = SECTION_TEXT_DEFAULTS[themeId][key]?.[zone] ?? [];
  return defaults.map((b) => createSectionBlock(b.role, b.text));
}

const isRole = (v: unknown): v is SectionTextRole =>
  v === 'eyebrow' || v === 'title' || v === 'note';
const isAlign = (v: unknown): v is SectionTextAlign =>
  v === 'left' || v === 'center' || v === 'right';

/** 저장된 블록 하나를 검사합니다. 글자가 아닌 것·역할이 없는 것은 버립니다 */
function asBlock(value: unknown, index: number): SectionBlock | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.text !== 'string') return null;
  const role = isRole(raw.role) ? raw.role : 'note';
  const block: SectionBlock = {
    id: typeof raw.id === 'string' && raw.id ? raw.id : `sb-stored-${index}`,
    text: raw.text,
    role,
  };
  if (isAlign(raw.align)) block.align = raw.align;
  if (typeof raw.scale === 'number' && Number.isFinite(raw.scale)) {
    const { min, max } = SECTION_TEXT_SCALE_RANGE;
    block.scale = Math.min(max, Math.max(min, raw.scale));
  }
  if (typeof raw.color === 'string' && raw.color.trim()) block.color = raw.color;
  return block;
}

function asZone(value: unknown): SectionBlock[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.map(asBlock).filter((b): b is SectionBlock => b !== null);
}

/**
 * 저장된 값을 정리합니다.
 *
 * 🔴 **빈 배열을 살려서 돌려줍니다** — "전부 지웠다" 를 잃어버리면 지운 문구가 되살아납니다.
 *    옛 모양(문자열 세 칸)은 그대로 통과시키고, 블록으로 올리는 일은 `resolveSectionText`
 *    가 합니다 (어느 자리에 놓을지는 디자인이 알고 있습니다).
 */
export function normalizeSectionText(value: unknown): SectionTextMap {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const out: SectionTextMap = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue;
    const entry = raw as Record<string, unknown>;
    const stored: StoredSectionText = {};

    const head = asZone(entry.head);
    const foot = asZone(entry.foot);
    if (head) stored.head = head;
    if (foot) stored.foot = foot;

    // 옛 모양 — 값이 있는 칸만 (빈 문자열은 그때도 '기본 문구' 를 뜻했습니다)
    for (const slot of SECTION_TEXT_ROLES) {
      const text = entry[slot];
      if (typeof text === 'string' && text.trim()) stored[slot] = text;
    }

    if (Object.keys(stored).length > 0) out[key as SectionKey] = stored;
  }
  return out;
}

/**
 * 옛 모양(문자열 세 칸)을 블록으로 올립니다.
 *
 * 기본 문구를 깔고, 같은 역할의 **첫 블록의 글자만** 갈아끼웁니다 — 그러면 그 문구가
 * 원래 있던 자리(위/아래)와 순서가 유지됩니다. 기본에 없는 역할은 `head` 끝에 붙입니다
 * (그 자리가 없다고 버리면 사용자가 적어둔 글자가 조용히 사라집니다).
 */
function promoteLegacy(
  themeId: ThemeId,
  key: SectionKey,
  stored: StoredSectionText,
): SectionBlocks {
  const zones: Required<SectionBlocks> = {
    head: defaultSectionBlocks(themeId, key, 'head'),
    foot: defaultSectionBlocks(themeId, key, 'foot'),
  };

  for (const role of SECTION_TEXT_ROLES) {
    const text = stored[role];
    if (typeof text !== 'string' || !text.trim()) continue;

    const zone = SECTION_ZONES.find((z) => zones[z].some((b) => b.role === role));
    if (zone) {
      const i = zones[zone].findIndex((b) => b.role === role);
      const current = zones[zone][i];
      if (current) zones[zone][i] = { ...current, text };
    } else {
      zones.head.push(createSectionBlock(role, text));
    }
  }
  return zones;
}

/**
 * 저장값 + 디자인 기본값을 합쳐 "이 카드의 문구 목록" 을 만듭니다. **치환 전** 값입니다.
 *
 * 에디터가 이걸 그대로 편집합니다 — 화면에 보이는 것과 고치는 것이 같은 목록이어야
 * "왜 화면엔 글자가 있는데 여기엔 없나" 가 안 생깁니다.
 */
export function sectionBlocks(
  themeId: ThemeId,
  key: SectionKey,
  overrides: SectionTextMap | undefined,
): Required<SectionBlocks> {
  const stored = overrides?.[key];

  if (stored && (stored.head !== undefined || stored.foot !== undefined)) {
    return {
      head: stored.head ?? defaultSectionBlocks(themeId, key, 'head'),
      foot: stored.foot ?? defaultSectionBlocks(themeId, key, 'foot'),
    };
  }
  if (stored && SECTION_TEXT_ROLES.some((r) => typeof stored[r] === 'string')) {
    const promoted = promoteLegacy(themeId, key, stored);
    return { head: promoted.head ?? [], foot: promoted.foot ?? [] };
  }
  return {
    head: defaultSectionBlocks(themeId, key, 'head'),
    foot: defaultSectionBlocks(themeId, key, 'foot'),
  };
}

/** 이 카드를 사용자가 손댔는지 ('기본 문구로' 버튼을 보일지 판단) */
export function hasSectionTextOverride(
  overrides: SectionTextMap | undefined,
  key: SectionKey,
): boolean {
  const stored = overrides?.[key];
  if (!stored) return false;
  return (
    stored.head !== undefined ||
    stored.foot !== undefined ||
    SECTION_TEXT_ROLES.some((r) => typeof stored[r] === 'string')
  );
}

/**
 * 문구의 `{…}` 자리를 실제 값으로 바꿉니다.
 *
 * 아는 이름만 바꾸고 **모르는 `{…}` 는 그대로 둡니다** — 사용자가 중괄호를 문장에 쓸 수도
 * 있는데 조용히 지우면 글자가 사라진 것처럼 보입니다. (`fillGameText` 와 같은 규칙)
 */
export function fillSectionText(template: string, vars: { 신랑?: string; 신부?: string }): string {
  return template.replace(/\{(신랑|신부)\}/g, (whole, key: string) => {
    const value = (vars as Record<string, unknown>)[key];
    return value === undefined || value === null || value === '' ? whole : String(value);
  });
}

/** 화면에 그릴 문구 — 카드마다 두 자리의 블록 목록 */
export type ResolvedSectionText = Record<SectionKey, Required<SectionBlocks>>;

/**
 * 고른 문구 + 디자인 기본값 + 이름 치환 + 옛 모양 승격을 한 번에 끝냅니다.
 *
 * 뷰어의 섹션 컴포넌트는 이 결과만 읽습니다 — 테마마다 기본 문구를 다시 적지 않고,
 * "비었으면 기본" 판단도 한 곳에서만 합니다.
 *
 * **글자가 빈 블록은 버립니다** — 편집 중에 만든 빈 줄이 하객 화면에서 빈 여백이 되면
 * 안 됩니다. (에디터는 `sectionBlocks` 를 쓰므로 빈 줄이 그대로 보입니다)
 */
export function resolveSectionText(
  themeId: ThemeId,
  overrides: unknown,
  vars: { 신랑?: string; 신부?: string },
): ResolvedSectionText {
  const chosen = normalizeSectionText(overrides);
  const out = {} as ResolvedSectionText;

  for (const key of SECTION_KEYS) {
    const blocks = sectionBlocks(themeId, key, chosen);
    out[key] = {
      head: blocks.head
        .filter((b) => b.text.trim())
        .map((b) => ({ ...b, text: fillSectionText(b.text, vars) })),
      foot: blocks.foot
        .filter((b) => b.text.trim())
        .map((b) => ({ ...b, text: fillSectionText(b.text, vars) })),
    };
  }
  return out;
}
