/**
 * 디자인(테마) 카탈로그 — 사용자에게 "어떤 디자인인지" 보여줄 정보의 단일 소스.
 *
 * `ThemeId` 는 `content.ts` 에 있습니다. 이 파일은 그 id 마다 **이름·설명·색**을 붙입니다.
 * 화면(C3 디자인 선택 · B5 갤러리)과 서버(생성 요청 검증)가 같은 목록을 봐야 하므로
 * 스키마 패키지에 둡니다 — 화면에만 두면 서버가 모르는 디자인을 받아들이게 됩니다.
 *
 * 🔴 `Record<ThemeId, ThemeDef>` 로 선언한 이유: `ThemeId` 에 새 디자인을 추가하면
 *    여기에 항목을 넣지 않는 한 **컴파일이 실패**합니다. 선택 화면에 빠뜨린 채
 *    배포하는 사고를 막습니다. (뷰어 등록소 `themes/registry.ts` 도 같은 방식입니다)
 */
import type { ThemeId } from './content';

export interface ThemeDef {
  id: ThemeId;
  /** 사용자에게 보이는 이름 */
  name: string;
  /** 목록에 함께 적는 짧은 성격 한 줄 */
  tagline: string;
  /** 카드 본문 — 이 디자인이 무엇을 다르게 하는지 */
  description: string;
  /** 분위기 태그 (칩으로 표시) */
  tags: readonly string[];
  /**
   * 축소 미리보기에 쓰는 대표 색.
   * 실제 렌더는 뷰어의 테마 CSS 가 하며, 여기 값은 **선택 화면의 미니 목업 전용**입니다.
   */
  palette: {
    /** 배경 */
    base: string;
    /** 한 단계 눌린 배경 */
    sunken: string;
    /** 강조색 */
    accent: string;
    /** 제목·본문 잉크 */
    ink: string;
  };
}

export const THEMES_BY_ID: Record<ThemeId, ThemeDef> = {
  classic1: {
    id: 'classic1',
    name: '로즈 클래식',
    tagline: '사진을 화면 가득, 따뜻한 로즈 톤',
    description:
      '커버 사진을 화면 가득 쓰고 문구를 사진 위에 자유롭게 놓습니다. ' +
      '로즈·크림 색과 발자국 장식이 섞여 밝고 친근한 분위기예요.',
    tags: ['사진 중심', '로즈 · 크림', '반려동물 포인트'],
    palette: { base: '#FBF6F1', sunken: '#F3E9DF', accent: '#C77B8B', ink: '#3A332E' },
  },
  classic2: {
    id: 'classic2',
    name: '세이지 가든',
    tagline: '아이보리 여백과 명조 타이포',
    description:
      '아이보리 여백 위에 명조 타이포로 단정하게 정돈된 디자인. ' +
      '사진은 금박 액자처럼 감싸 보여주고, 세이지·골드로 차분하게 마무리합니다.',
    tags: ['단정한 여백', '세이지 · 골드', '명조 타이포'],
    palette: { base: '#FCFAF6', sunken: '#F2EDE3', accent: '#5E6B54', ink: '#3E3A33' },
  },
};

/** 선택 화면에 노출할 순서 */
export const THEME_LIST: readonly ThemeDef[] = [THEMES_BY_ID.classic1, THEMES_BY_ID.classic2];

/** 기본 디자인 — themeId 를 못 알아들었을 때 여기로 떨어집니다 */
export const DEFAULT_THEME_ID: ThemeId = 'classic1';

/**
 * 모르는 값을 기본 디자인으로 정규화합니다.
 *
 * 서버(생성 요청·Firestore 문서 복원)와 화면이 **같은 판정**을 써야 합니다 —
 * 한쪽만 새 디자인을 알면 저장된 값과 그려지는 화면이 어긋납니다.
 */
export function parseThemeId(value: unknown): ThemeId {
  return typeof value === 'string' && value in THEMES_BY_ID
    ? (value as ThemeId)
    : DEFAULT_THEME_ID;
}
