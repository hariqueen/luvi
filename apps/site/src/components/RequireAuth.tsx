/**
 * 로그인 가드.
 *
 * `status` 를 먼저 봐야 합니다 — 앱이 막 뜬 시점에는 저장된 세션을 복원하는 중이라
 * 로그인 상태여도 `user` 가 잠시 null 입니다. 그때 로그인 화면으로 보내면
 * **새로고침마다 로그아웃되는 것처럼 보입니다.**
 */
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { ScreenFallback } from './ScreenFallback';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <ScreenFallback />;

  if (status === 'unconfigured') {
    return (
      <main className="mx-auto flex min-h-dvh max-w-[420px] flex-col items-center justify-center gap-3 px-6 text-center">
        <span className="font-script text-[32px] text-gold">Luvi</span>
        <p className="text-[13px] font-medium text-ink">로그인 설정이 아직 없습니다</p>
        <p className="text-[12px] leading-relaxed text-muted">
          <code>.env</code> 의 <code>VITE_FIREBASE_API_KEY</code> ·{' '}
          <code>VITE_FIREBASE_AUTH_DOMAIN</code> · <code>VITE_FIREBASE_APP_ID</code> 를 채운 뒤 개발
          서버를 다시 시작하세요.
        </p>
      </main>
    );
  }

  if (status === 'signed-out') {
    // 로그인 후 원래 가려던 곳으로 돌려보냅니다 (쿼리·해시까지 보존)
    const returnTo = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={`/login?returnTo=${encodeURIComponent(returnTo)}`} replace />;
  }

  return <>{children}</>;
}
