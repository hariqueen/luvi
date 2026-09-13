/**
 * 콘솔 공통 뼈대 — 왼쪽 고정 내비 + 본문.
 *
 * 🔴 **소비자 앱과 레이아웃 방향이 정반대입니다.** `apps/site` 는 모바일 1급입니다
 *    (예식 준비는 이동 중에 합니다). 여기는 데스크톱 밀집형입니다 — 표를 넓게 펴고
 *    한 화면에 여러 패널을 둡니다. 그래서 두 앱을 분리했습니다. 이 파일에 모바일
 *    우선 규칙을 다시 들여오면 분리한 이유가 사라집니다.
 *    (좁은 화면에서 깨지지는 않게 두되, 최적화 대상은 아닙니다)
 *
 * 어두운 내비는 취향이 아니라 **세션 혼동 방지**입니다. 운영자는 같은 브라우저에서
 * 고객 화면(밝은 아이보리)과 이 콘솔을 오갑니다. 탭만 보고도 "지금 남의 데이터를
 * 보는 중" 이라는 것이 구분돼야 합니다 — 운영노트 6-6 의 사고가 그래서 났습니다.
 */
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { env } from '@/lib/env';

const NAV = [
  { to: '/inquiries', label: '문의' },
  { to: '/users', label: '회원' },
  { to: '/invitations', label: '청첩장' },
] as const;

function navClass({ isActive }: { isActive: boolean }): string {
  const base =
    'block rounded-lg px-3 py-2 text-[13px] transition-colors whitespace-nowrap';
  return isActive
    ? `${base} bg-ink-mid font-medium text-paper`
    : `${base} text-muted-soft hover:bg-ink-mid/60 hover:text-paper`;
}

export function AdminLayout() {
  const { user, signOut } = useAuth();

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <nav className="flex flex-none flex-col gap-1 bg-ink-deep px-3 py-3 lg:w-[216px] lg:px-4 lg:py-6">
        <div className="mb-1 flex items-center justify-between gap-3 lg:mb-6 lg:block">
          <div className="px-1">
            <span className="font-script text-[26px] text-gold">Luvi</span>
            <span className="ml-2 align-middle text-[10.5px] tracking-[.16em] text-muted-soft lg:ml-0 lg:block lg:mt-0.5">
              운영자 콘솔
            </span>
          </div>
          {/* 좁은 화면에서는 계정 줄이 아래로 밀리므로 여기에도 로그아웃을 둡니다 */}
          <button
            type="button"
            onClick={() => void signOut()}
            className="rounded-lg px-2 py-1 text-[11.5px] text-muted-soft hover:text-paper lg:hidden"
          >
            로그아웃
          </button>
        </div>

        <div className="no-scrollbar flex gap-1 overflow-x-auto lg:flex-col">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} className={navClass}>
              {item.label}
            </NavLink>
          ))}
        </div>

        <div className="mt-auto hidden pt-6 lg:block">
          <a
            href={env.siteOrigin}
            target="_blank"
            rel="noreferrer"
            className="block rounded-lg px-3 py-2 text-[12px] text-muted-soft hover:text-paper"
          >
            고객 화면 ↗
          </a>
          <div className="mt-3 border-t border-ink-mid px-3 pt-3">
            <p className="truncate text-[11.5px] text-muted-soft" title={user?.email ?? ''}>
              {user?.email ?? user?.uid ?? '-'}
            </p>
            <button
              type="button"
              onClick={() => void signOut()}
              className="mt-1.5 text-[11.5px] text-muted-soft underline-offset-2 hover:text-paper hover:underline"
            >
              로그아웃
            </button>
          </div>
        </div>
      </nav>

      <main className="min-w-0 flex-1 px-5 py-6 lg:px-9 lg:py-8">
        <Outlet />
      </main>
    </div>
  );
}
