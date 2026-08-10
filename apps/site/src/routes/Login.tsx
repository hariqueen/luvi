/**
 * C1 로그인 · 회원가입.
 *
 * 순서가 전환율을 좌우합니다 — 카카오를 가장 크게 최상단에, 그다음 네이버·구글,
 * 이메일은 접어서 맨 아래. 국내 사용자 대부분이 첫 버튼에서 끝냅니다.
 *
 * ⚠️ **카카오·네이버 모두 이메일이 선택 동의**입니다. 이메일 없는 계정이 정상적으로 존재하므로
 *    "이메일 필수" 를 전제한 화면(비밀번호 찾기 안내 등)이 깨지지 않아야 합니다.
 */
import { useEffect, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { env } from '@/lib/env';
import { useAuth } from '@/lib/auth';
import { startSocialLogin, type SocialProvider } from '@/lib/social';

type EmailMode = 'signIn' | 'signUp';

/** 열린 리다이렉트 방지 — `returnTo` 는 우리 사이트 내부 경로만 허용합니다 */
function safeReturnTo(value: string | null): string {
  if (!value) return '/app';
  // '//evil.com' 은 브라우저가 프로토콜 상대 URL 로 해석해 외부로 나갑니다
  if (!value.startsWith('/') || value.startsWith('//')) return '/app';
  return value;
}

export default function Login() {
  const [search] = useSearchParams();
  const returnTo = safeReturnTo(search.get('returnTo'));

  const { status, signInWithGoogle, signInWithEmail, signUpWithEmail, sendPasswordReset } =
    useAuth();

  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [emailOpen, setEmailOpen] = useState(false);
  const [mode, setMode] = useState<EmailMode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // 로그인 화면에 이미 로그인한 상태로 들어온 경우 (뒤로가기 등)
  useEffect(() => {
    if (status === 'signed-in') setBusy(null);
  }, [status]);

  if (status === 'signed-in') return <Navigate to={returnTo} replace />;

  const run = async (key: string, task: () => Promise<void>) => {
    setError(null);
    setNotice(null);
    setBusy(key);
    try {
      await task();
      // 성공하면 status 가 'signed-in' 이 되어 위 Navigate 가 처리합니다
    } catch (e) {
      setError(e instanceof Error ? e.message : '로그인에 실패했습니다');
      setBusy(null);
    }
  };

  const socials: { provider: SocialProvider; label: string; className: string; configured: boolean }[] =
    [
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
  const available = socials.filter((s) => s.configured);

  const onSocial = (provider: SocialProvider) => {
    setError(null);
    setBusy(provider);
    try {
      // 인가 화면으로 페이지를 벗어나므로 busy 를 되돌릴 필요가 없습니다
      startSocialLogin(provider, returnTo);
    } catch (e) {
      setBusy(null);
      setError(e instanceof Error ? e.message : '로그인을 시작할 수 없습니다');
    }
  };

  const onEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('이메일과 비밀번호를 입력해주세요');
      return;
    }
    void run('email', () =>
      mode === 'signIn' ? signInWithEmail(email, password) : signUpWithEmail(email, password),
    );
  };

  const onReset = () => {
    if (!email.trim()) {
      setError('비밀번호를 재설정할 이메일을 입력해주세요');
      return;
    }
    void run('reset', async () => {
      await sendPasswordReset(email);
      setNotice('비밀번호 재설정 메일을 보냈습니다. 메일함을 확인해주세요');
      setBusy(null);
    });
  };

  const disabled = busy !== null || status === 'loading';

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
            disabled={disabled}
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

        {/* 구글은 Firebase Auth 기본 제공자라 Worker 브릿지가 필요 없습니다 */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => void run('google', signInWithGoogle)}
          className="flex h-[52px] items-center justify-center rounded-xl border border-line-strong bg-white text-[14px] font-medium disabled:opacity-60"
        >
          {busy === 'google' ? '로그인 중…' : '구글로 계속하기'}
        </button>

        <button
          type="button"
          onClick={() => setEmailOpen((v) => !v)}
          className="mt-2 py-2 text-[12.5px] text-muted"
        >
          이메일로 계속하기 {emailOpen ? '▲' : '▼'}
        </button>

        {emailOpen && (
          <form className="flex flex-col gap-2.5" onSubmit={onEmailSubmit}>
            <div className="flex gap-1 rounded-xl bg-surface-sunken p-1">
              {(
                [
                  ['signIn', '로그인'],
                  ['signUp', '회원가입'],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMode(value)}
                  className={`h-9 flex-1 rounded-lg text-[12.5px] ${
                    mode === value ? 'bg-white text-ink shadow-sm' : 'text-muted'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <input
              type="email"
              autoComplete="email"
              placeholder="이메일"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              /* 16px 미만이면 iOS 사파리가 포커스 때 화면을 확대합니다 */
              className="h-[50px] rounded-xl border border-line-strong bg-white px-4 text-[16px] outline-none focus:border-gold"
            />
            <input
              type="password"
              autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
              placeholder={mode === 'signIn' ? '비밀번호' : '비밀번호 (6자 이상)'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-[50px] rounded-xl border border-line-strong bg-white px-4 text-[16px] outline-none focus:border-gold"
            />
            <button
              type="submit"
              disabled={disabled}
              className="h-[50px] rounded-xl bg-ink text-[14px] text-paper-soft disabled:opacity-60"
            >
              {busy === 'email' ? '처리 중…' : mode === 'signIn' ? '로그인' : '가입하고 시작하기'}
            </button>

            {mode === 'signIn' && (
              <button
                type="button"
                onClick={onReset}
                disabled={disabled}
                className="py-1 text-[11.5px] text-muted-faint underline disabled:opacity-60"
              >
                비밀번호를 잊으셨나요?
              </button>
            )}
          </form>
        )}

        {notice && (
          <p className="rounded-lg bg-surface-sunken px-3.5 py-2.5 text-[12px] text-ink-soft">
            {notice}
          </p>
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
