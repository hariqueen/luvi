/**
 * 테마가 지켜야 하는 계약.
 *
 * 테마는 "청첩장 하나를 처음부터 끝까지 그리는 컴포넌트"입니다.
 * 데이터는 props 로 받지 않고 `useInvitation()` 으로 읽습니다 —
 * 섹션이 9개나 되어서 props 로 내려주면 전부 통과 배선이 됩니다.
 */
import type { ComponentType } from 'react';

export type ThemeComponent = ComponentType;
