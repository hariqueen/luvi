/**
 * 테마 등록소 — themeId 하나로 어떤 디자인을 그릴지 결정합니다.
 *
 * `Record<ThemeId, ...>` 로 선언한 이유: schema 의 ThemeId 에 새 테마를 추가하면
 * 여기에 등록하지 않는 한 **컴파일이 실패**합니다. 등록을 잊고 배포하는 사고를 막습니다.
 *
 * lazy 로 불러오는 이유: 테마가 늘어나도 하객이 내려받는 양은 그대로여야 합니다.
 * 청첩장 한 장을 보려고 안 쓰는 테마 9개를 함께 받을 이유가 없습니다.
 */
import { lazyPage } from '@/lib/lazyPage';
import type { ThemeId } from '@luvi/schema';
import type { ThemeComponent } from './types';

export const THEMES: Record<ThemeId, ThemeComponent> = {
  classic1: lazyPage(() => import('./classic1')),
  classic2: lazyPage(() => import('./classic2')),
};

/** 등록된 테마인지 확인 (API 가 모르는 값을 보내올 수 있습니다) */
export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && value in THEMES;
}
