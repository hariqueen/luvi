/**
 * 로그인 가드 + 약관 동의 가드.
 *
 * `status` 를 먼저 봐야 합니다 — 앱이 막 뜬 시점에는 저장된 세션을 복원하는 중이라
 * 로그인 상태여도 `user` 가 잠시 null 입니다. 그때 로그인 화면으로 보내면
 * **새로고침마다 로그아웃되는 것처럼 보입니다.**
 *
 * ─── 동의 가드를 왜 여기 두는가 ──────────────────────────────────
 *
 * 로그인이 필요한 화면은 전부 이 컴포넌트를 지납니다. 라우트마다 체크를 흩뿌리면
 * 새 화면을 추가할 때 빠뜨리고, 그 화면만 동의 없이 열립니다.
 *
 * 🔴 **하객 경로(`/i/{slug}`)는 여기를 지나지 않습니다.** 그건 별도 SPA 라 구조적으로
 *    막힐 수 없습니다 — 소유자가 재동의를 안 했다고 하객이 청첩장을 못 보면
 *    예식을 앞둔 사람에게는 그대로 서비스 장애입니다. 서버의 `requireConsent` 도
 *    같은 이유로 공개 조회에는 걸려 있지 않습니다.
 */
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { ConsentGate } from './ConsentGate';
import { ScreenFallback } from './ScreenFallback';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { status, consent, markConsentSatisfied } = useAuth();
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

  /**
   * 동의가 아직 안 된 경우.
   *
   * `consent === null` 은 **"동의 안 함" 이 아니라 "세션 응답을 아직 못 받음"** 입니다.
   * 여기서 화면을 띄우면 이미 동의한 사람에게도 로그인할 때마다 깜빡입니다 — 통과시킵니다.
   * 실제 차단은 서버가 합니다(`requireConsent`), 그래서 이 화면이 잠깐 늦어도 안전합니다.
   */
  if (consent && !consent.satisfied) {
    // 동의 이력이 하나도 없으면 신규 가입, 일부만 낡았으면 개정에 따른 재동의입니다.
    const method = Object.keys(consent.versions).length === 0 ? 'signup' : 'reconsent';
    return (
      <ConsentGate method={method} missing={consent.missing} onDone={markConsentSatisfied} />
    );
  }

  return <>{children}</>;
}
