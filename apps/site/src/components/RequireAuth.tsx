/**
 * 로그인 가드.
 *
 * TODO(실구현): Firebase Auth 의 onAuthStateChanged 로 세션을 확인한다.
 * 지금은 개발 편의를 위해 통과시키며, 로그인 상태 UI를 만들 때 교체한다.
 */
import type { ReactNode } from 'react';

export function RequireAuth({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
