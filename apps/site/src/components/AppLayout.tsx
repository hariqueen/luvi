/**
 * 로그인 후 껍데기 — 대시보드·방명록 관리 등.
 * 에디터와 발행 화면은 전체화면을 쓰므로 이 레이아웃을 쓰지 않는다.
 */
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';

// 청첩장 수정은 **로그인한 소유자 계정으로만** 가능합니다. 코드로 소유권을 넘겨받는
// '청첩장 받기(클레임)' 기능은 이 원칙에 어긋나 제거했습니다.
const TABS = [{ to: '/app', label: '내 청첩장', end: true }] as const;

/**
 * 카카오 프로필 이미지는 `http://k.kakaocdn.net/...` 로 오는 경우가 있습니다.
 * https 페이지에서 http 이미지는 브라우저가 차단하므로(mixed content) 올려줍니다.
 */
function secureImageUrl(url: string): string {
  return url.replace(/^http:\/\//, 'https://');
}

export function AppLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const onSignOut = () => {
    void (async () => {
      await signOut();
      navigate('/', { replace: true });
    })();
  };

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
          {/*
            로그인한 계정 표시.

            프로필 사진·닉네임은 **선택 동의**라 없을 수 있습니다 (카카오·네이버 모두).
            사진이 없으면 이름 첫 글자로, 이름도 없으면 이메일 앞부분으로 떨어집니다 —
            어느 계정으로 들어와 있는지 항상 알 수 있어야 합니다.
          */}
          <div className="flex flex-none items-center gap-2">
            {user?.photoURL ? (
              <img
                src={secureImageUrl(user.photoURL)}
                alt=""
                width={28}
                height={28}
                referrerPolicy="no-referrer"
                className="size-7 rounded-full border border-line object-cover"
              />
            ) : (
              <span className="flex size-7 items-center justify-center rounded-full bg-surface-sunken text-[11px] text-muted">
                {(user?.displayName ?? user?.email ?? '?').trim().charAt(0).toUpperCase()}
              </span>
            )}
            <span className="hidden max-w-[120px] truncate text-[12px] text-ink-soft md:block">
              {user?.displayName ?? user?.email?.split('@')[0] ?? '내 계정'}
            </span>
            <button
              type="button"
              onClick={onSignOut}
              className="rounded-full border border-line-strong px-3 py-[7px] text-[12px] text-muted"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-page px-[clamp(14px,3vw,28px)] py-8">
        <Outlet />
      </main>
    </div>
  );
}
