/**
 * C1 로그인 · 회원가입.
 *
 * 순서가 전환율을 좌우합니다 — 카카오를 가장 크게 최상단에, 그다음 네이버·구글,
 * 이메일은 접어서 맨 아래. 국내 사용자 대부분이 첫 버튼에서 끝냅니다.
 *
 * ⚠️ **카카오·네이버 모두 이메일이 선택 동의**입니다. 이메일 없는 계정이 정상적으로 존재하므로
 *    "이메일 필수" 를 전제한 화면(비밀번호 찾기 안내 등)이 깨지지 않아야 합니다.
 */
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { env } from '@/lib/env';
import { startSocialLogin, type SocialProvider } from '@/lib/social';

interface SocialButton {
  provider: SocialProvider;
  label: string;
  className: string;
  /** 키가 없으면 버튼을 감춥니다 — 눌러서 실패하게 만들 이유가 없습니다 */
  configured: boolean;
}

export default function Login() {
  const [search] = useSearchParams();
  const returnTo = search.get('returnTo') ?? '/app';

  const [emailOpen, setEmailOpen] = useState(false);
  const [busy, setBusy] = useState<SocialProvider | null>(null);
  const [error, setError] = useState<string | null>(null);

  const socials: SocialButton[] = [
    {
      provider: 'kakao',
      label: '카카오로 계속하기',
      className: 'bg-[#FEE500] text-[#3A2929]',
      configured: Boolean(env.kakaoRestKey),
    },
    {
      provider: 'naver',
      label: '네이버로 계속하기',
      className: 'bg-[#03C75A] text-white',
      configured: Boolean(env.naverClientId),
    },
  ];

  const onSocial = (provider: SocialProvider) => {
    setError(null);
    setBusy(provider);
    try {
      startSocialLogin(provider, returnTo);
    } catch (e) {
      setBusy(null);
      setError(e instanceof Error ? e.message : '로그인을 시작할 수 없습니다');
    }
  };

  const available = socials.filter((s) => s.configured);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 py-12">
      <Link to="/" className="font-script text-[34px] leading-none text-ink">
        Luvi
      </Link>
      <p className="mt-3 text-[13px] text-muted">가입하면 청첩장이 내 것이 됩니다</p>

      <div className="mt-9 flex w-full max-w-[340px] flex-col gap-2.5">
        {available.map((s) => (
          <button
            key={s.provider}
            type="button"
            disabled={busy !== null}
            onClick={() => onSocial(s.provider)}
            className={`flex h-[52px] items-center justify-center rounded-xl text-[14px] font-semibold disabled:opacity-60 ${s.className}`}
          >
            {busy === s.provider ? '이동 중…' : s.label}
          </button>
        ))}

        {available.length === 0 && (
          <p className="rounded-xl border border-line-strong bg-surface px-4 py-3 text-[12px] leading-relaxed text-muted">
            소셜 로그인 키가 설정되지 않았습니다. <code>.env</code> 의{' '}
            <code>VITE_KAKAO_REST_KEY</code> · <code>VITE_NAVER_CLIENT_ID</code> 를 확인하세요.
          </p>
        )}

        {/* TODO(실구현): Firebase Auth 의 signInWithPopup(GoogleAuthProvider) — 브릿지가 필요 없습니다 */}
        <button
          type="button"
          className="flex h-[52px] items-center justify-center rounded-xl border border-line-strong bg-white text-[14px] font-medium"
        >
          구글로 계속하기
        </button>

        <button
          type="button"
          onClick={() => setEmailOpen((v) => !v)}
          className="mt-2 py-2 text-[12.5px] text-muted"
        >
          이메일로 계속하기 {emailOpen ? '▲' : '▼'}
        </button>

        {emailOpen && (
          <form className="flex flex-col gap-2.5" onSubmit={(e) => e.preventDefault()}>
            <input
              type="email"
              autoComplete="email"
              placeholder="이메일"
              className="h-[50px] rounded-xl border border-line-strong bg-white px-4 outline-none focus:border-gold"
            />
            <input
              type="password"
              autoComplete="current-password"
              placeholder="비밀번호"
              className="h-[50px] rounded-xl border border-line-strong bg-white px-4 outline-none focus:border-gold"
            />
            <button type="submit" className="h-[50px] rounded-xl bg-ink text-[14px] text-paper-soft">
              계속하기
            </button>
          </form>
        )}

        {error && (
          <p className="rounded-lg bg-cream px-3.5 py-2.5 text-[12px] text-gold-deep">{error}</p>
        )}
      </div>

      <p className="mt-8 max-w-[320px] text-center text-[11px] leading-relaxed text-muted-faint">
        계속하면 서비스 이용약관과 개인정보 처리방침에 동의하는 것으로 봅니다.
      </p>
    </main>
  );
}
