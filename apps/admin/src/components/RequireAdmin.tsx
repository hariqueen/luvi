/**
 * 운영자 가드.
 *
 * 🔴 **이 컴포넌트는 권한의 근거가 아닙니다.** 화면을 숨길 뿐입니다.
 *    진짜 경계는 둘입니다 — 호스트 앞의 Cloudflare Access, 그리고 매 요청마다
 *    `usersRepo.isAdmin()` 을 보는 Worker. 여기를 우회해도 API 가 403 을 돌려줍니다.
 *    그러니 이 파일을 고쳐서 권한 문제를 해결하려 들지 마세요.
 *
 * 네 가지 상태를 **서로 다르게** 다룹니다. 하나로 뭉치면 운영자가 무엇을 해야 하는지
 * 알 수 없는 화면이 됩니다:
 *
 * | 상태 | 화면 | 운영자가 할 일 |
 * |------|------|----------------|
 * | 세션 복원 중 · 역할 확인 중 | 워드마크 | 기다립니다 |
 * | 비로그인 | 로그인 | 로그인합니다 |
 * | 역할 확인 실패 | 다시 시도 | 네트워크·API 를 봅니다 |
 * | 운영자 아님 | 거부 + 로그아웃 | 다른 계정으로 다시 로그인합니다 |
 */
import type { ReactNode } from 'react';
import { useAuth } from '@/lib/auth';
import { ScreenFallback } from './ScreenFallback';
import { LoginScreen } from './LoginScreen';

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-6">
      <div className="w-full max-w-[380px] rounded-2xl border border-line bg-surface px-7 py-9 text-center">
        <span className="font-script text-[30px] text-gold">Luvi</span>
        <p className="mt-3 text-[14px] font-semibold text-ink">{title}</p>
        <div className="mt-2 text-[12.5px] leading-relaxed text-muted">{children}</div>
      </div>
    </main>
  );
}

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { status, user, role, roleError, refreshRole, signOut } = useAuth();

  if (status === 'loading') return <ScreenFallback />;

  if (status === 'unconfigured') {
    return (
      <Panel title="로그인 설정이 아직 없습니다">
        모노레포 루트 <code>.env</code> 의 <code>VITE_FIREBASE_API_KEY</code> ·{' '}
        <code>VITE_FIREBASE_AUTH_DOMAIN</code> · <code>VITE_FIREBASE_APP_ID</code> 를 채운 뒤 개발
        서버를 다시 시작하세요.
        <p className="mt-2">
          배포본이라면 Pages 프로젝트의 환경변수에 같은 값이 들어갔는지 확인하세요.
        </p>
      </Panel>
    );
  }

  // 로그인 화면은 별도 라우트가 아니라 여기서 직접 띄웁니다 —
  // 콘솔에는 로그인 없이 볼 화면이 없어서 되돌아올 경로를 기억할 필요가 없습니다.
  if (status === 'signed-out') return <LoginScreen />;

  if (roleError) {
    return (
      <Panel title="권한을 확인하지 못했습니다">
        {roleError}
        <div className="mt-4 flex justify-center gap-2">
          <button
            type="button"
            onClick={refreshRole}
            className="rounded-full bg-ink px-4 py-2 text-[12.5px] text-paper-soft"
          >
            다시 시도
          </button>
          <button
            type="button"
            onClick={() => void signOut()}
            className="rounded-full border border-line-strong px-4 py-2 text-[12.5px] text-muted"
          >
            로그아웃
          </button>
        </div>
      </Panel>
    );
  }

  // 🔴 null 은 '운영자 아님' 이 아니라 '아직 모름' 입니다 — 기다립니다
  if (role === null) return <ScreenFallback />;

  if (role !== 'admin') {
    return (
      <Panel title="운영자 계정이 아닙니다">
        {user?.email ?? user?.uid ?? '알 수 없는 계정'} 으로 로그인되어 있습니다.
        <p className="mt-2">운영자 계정으로 다시 로그인하세요.</p>
        <button
          type="button"
          onClick={() => void signOut()}
          className="mt-4 rounded-full bg-ink px-4 py-2 text-[12.5px] text-paper-soft"
        >
          로그아웃
        </button>
      </Panel>
    );
  }

  return <>{children}</>;
}
