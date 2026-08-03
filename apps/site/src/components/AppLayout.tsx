/**
 * 로그인 후 껍데기 — 대시보드·방명록 관리 등.
 * 에디터와 발행 화면은 전체화면을 쓰므로 이 레이아웃을 쓰지 않는다.
 */
import { Link, NavLink, Outlet } from 'react-router-dom';

const TABS = [
  { to: '/app', label: '내 청첩장', end: true },
  { to: '/app/claim', label: '청첩장 받기' },
] as const;

export function AppLayout() {
  return (
    <div className="min-h-dvh bg-bg">
      <header className="sticky top-0 z-40 border-b border-line bg-bg/[.9] backdrop-blur-[14px]">
        <div className="mx-auto flex h-[56px] max-w-page items-center gap-4 px-[clamp(14px,3vw,28px)]">
          <Link to="/" className="font-script text-2xl leading-none">
            Luvi
          </Link>
          <nav className="no-scrollbar flex flex-1 items-center gap-1 overflow-x-auto">
            {TABS.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                end={'end' in t ? t.end : false}
                className={({ isActive }) =>
                  `whitespace-nowrap rounded-lg px-3 py-2 text-[12.5px] ${
                    isActive ? 'bg-surface-sunken text-ink' : 'text-muted'
                  }`
                }
              >
                {t.label}
              </NavLink>
            ))}
          </nav>
          <Link
            to="/app/new"
            className="flex-none rounded-full bg-ink px-4 py-[9px] text-[12.5px] text-paper-soft"
          >
            + 새로 만들기
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-page px-[clamp(14px,3vw,28px)] py-8">
        <Outlet />
      </main>
    </div>
  );
}
