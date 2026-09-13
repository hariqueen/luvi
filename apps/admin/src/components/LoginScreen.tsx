/**
 * 운영자 로그인.
 *
 * 소비자 로그인 화면(`apps/site/src/routes/Login.tsx`)과 달리 **가입이 없습니다.**
 * 운영자 계정은 Firebase 콘솔에서 만들고 `users/{uid}.role` 을 손으로 올립니다.
 * 여기에 가입을 두면 누구나 계정을 만들어 "운영자 아님" 화면까지 도달하게 되는데,
 * 그 계정이 `users` 컬렉션에 남습니다 — 지울 사람도 우리입니다.
 *
 * 앞에 Cloudflare Access 가 있으므로 이 화면을 보는 사람은 이미 허용된 인원입니다.
 * 그래도 로그인을 또 받는 이유: Access 는 **누가 문 앞까지 오는가**만 정하고,
 * API 가 요구하는 uid 는 Firebase 로그인으로만 얻을 수 있습니다.
 */
import { useState, type FormEvent } from 'react';
import { useAuth } from '@/lib/auth';

export function LoginScreen() {
  const { signInWithGoogle, signInWithEmail, sendPasswordReset } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : '로그인에 실패했습니다');
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void run(() => signInWithEmail(email, password));
  }

  function onReset() {
    if (!email.trim()) {
      setError('재설정 메일을 보낼 이메일을 입력해주세요');
      return;
    }
    void run(async () => {
      await sendPasswordReset(email);
      setNotice('재설정 메일을 보냈습니다');
    });
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-6">
      <div className="w-full max-w-[360px]">
        <div className="text-center">
          <span className="font-script text-[36px] text-gold">Luvi</span>
          <p className="mt-1 text-[12px] tracking-[.18em] text-muted-faint">운영자 콘솔</p>
        </div>

        <div className="mt-7 rounded-2xl border border-line bg-surface px-6 py-7">
          <button
            type="button"
            disabled={busy}
            onClick={() => void run(signInWithGoogle)}
            className="w-full rounded-xl border border-line-strong bg-white py-2.5 text-[13px] font-medium text-ink disabled:opacity-50"
          >
            구글 계정으로 로그인
          </button>

          <div className="my-5 flex items-center gap-3 text-[11px] text-muted-faint">
            <span className="h-px flex-1 bg-line" />
            또는
            <span className="h-px flex-1 bg-line" />
          </div>

          <form onSubmit={onSubmit} className="flex flex-col gap-2.5">
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="이메일"
              className="rounded-xl border border-line-strong bg-white px-3.5 py-2.5 text-[13px] outline-none focus:border-gold"
            />
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호"
              className="rounded-xl border border-line-strong bg-white px-3.5 py-2.5 text-[13px] outline-none focus:border-gold"
            />
            <button
              type="submit"
              disabled={busy}
              className="mt-1 rounded-xl bg-ink py-2.5 text-[13px] font-medium text-paper-soft disabled:opacity-50"
            >
              {busy ? '확인하는 중…' : '로그인'}
            </button>
          </form>

          {error && <p className="mt-3 text-[12px] leading-relaxed text-gold-deep">{error}</p>}
          {notice && <p className="mt-3 text-[12px] text-success">{notice}</p>}

          <button
            type="button"
            onClick={onReset}
            disabled={busy}
            className="mt-4 w-full text-center text-[11.5px] text-muted underline-offset-2 hover:underline disabled:opacity-50"
          >
            비밀번호를 잊으셨나요
          </button>
        </div>

        <p className="mt-5 text-center text-[11px] leading-relaxed text-muted-faint">
          이 화면은 운영자 전용입니다. 고객 화면은{' '}
          <a href="https://luv-ai.co.kr" className="underline underline-offset-2">
            luv-ai.co.kr
          </a>{' '}
          에 있습니다.
        </p>
      </div>
    </main>
  );
}
