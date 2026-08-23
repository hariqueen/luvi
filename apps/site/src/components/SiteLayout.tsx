/**
 * 브랜드 사이트 껍데기 — 상단 내비 + 푸터.
 *
 * 내비는 디자인 산출물의 sticky 반투명 바를 따릅니다.
 * 모바일에서는 [청첩장 만들기] CTA 를 드로어 안에 숨기지 않고 상단 바에 그대로 노출합니다 —
 * 유입의 목적이 그 버튼이므로 한 번 더 탭하게 만들 이유가 없습니다.
 */
import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/auth';

const NAV = [
  { to: '/invitation', label: '모바일 청첩장' },
  { to: '/film', label: '식전영상' },
  { to: '/card', label: '초대장' },
  { to: '/samples', label: '샘플' },
] as const;

function Wordmark() {
  return (
    <Link to="/" className="flex flex-none items-center gap-2.5">
      <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full border border-gold-soft bg-cream font-script text-base text-gold-deep">
        L
      </span>
      <span className="font-script text-[28px] leading-none text-ink">Luvi</span>
    </Link>
  );
}

/**
 * 상단 오른쪽 계정 영역.
 *
 * 🔴 예전에는 로그인 여부와 무관하게 **항상 [로그인]** 이었습니다. 그래서 에디터·대시보드에서
 *    로고를 눌러 홈으로 나오면 세션은 그대로인데 화면만 로그아웃처럼 보였습니다.
 *
 * 복원 중(`loading`)에는 자리만 잡고 아무것도 그리지 않습니다 — [로그인] 이 한 번 번쩍인 뒤
 * [내 청첩장] 으로 바뀌면 그게 더 헷갈립니다.
 */
function AccountArea() {
  const { status } = useAuth();

  if (status === 'loading') return <span className="h-[30px] w-[64px] flex-none" aria-hidden />;

  if (status === 'signed-in') {
    return (
      <Link
        to="/app"
        className="flex-none rounded-full border border-line-strong bg-white px-3 py-[7px] text-[12.5px] text-ink"
      >
        내 청첩장
      </Link>
    );
  }

  return (
    <Link to="/login" className="px-2.5 py-[7px] text-[12.5px] text-muted">
      로그인
    </Link>
  );
}

export function SiteLayout() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-50 border-b border-line bg-bg/[.86] backdrop-blur-[14px]">
        <div className="mx-auto flex h-[60px] max-w-page items-center gap-7 px-[clamp(14px,3vw,28px)]">
          <Wordmark />

          <nav className="hidden flex-1 items-center gap-1 md:flex">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-[12.5px] transition-colors ${
                    isActive ? 'bg-surface-sunken text-ink' : 'text-muted hover:text-ink'
                  }`
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex flex-none items-center gap-2">
            <AccountArea />
            <Link
              to="/app/new"
              className="rounded-full bg-ink px-4 py-[9px] text-[12.5px] text-paper-soft"
            >
              청첩장 만들기
            </Link>
            <button
              type="button"
              aria-label="메뉴"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
              className="ml-1 px-2 py-2 text-[15px] text-muted md:hidden"
            >
              {menuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav className="border-t border-line bg-bg px-[clamp(14px,3vw,28px)] py-2 md:hidden">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                onClick={() => setMenuOpen(false)}
                className="block border-b border-line-soft py-3.5 text-sm last:border-0"
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
        )}
      </header>

      <main>
        <Outlet />
      </main>

      <footer className="mt-20 border-t border-line px-[clamp(14px,3vw,28px)] py-12">
        <div className="mx-auto max-w-page">
          <Wordmark />
          <p className="mt-4 max-w-md text-[13px] leading-relaxed text-muted">
            내 손으로 만들고, 보낸 뒤에도 고칠 수 있는 청첩장.
          </p>
          <p className="mt-8 text-[11.5px] text-muted-faint">
            © {new Date().getFullYear()} Luvi · luv-ai.co.kr
          </p>
        </div>
      </footer>
    </div>
  );
}
