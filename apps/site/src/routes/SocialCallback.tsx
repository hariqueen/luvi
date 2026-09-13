/**
 * `/login/callback/:provider` — 카카오·네이버가 되돌려보내는 지점.
 *
 * 두 가지 흐름이 같은 주소로 돌아옵니다 (`mode`, lib/social.ts 참고).
 *
 * - **로그인** — state 검증 → 인가 코드를 Worker 로 보내 커스텀 토큰 받기 → Firebase 로그인
 * - **연결**  — 이미 로그인한 계정에 이 소셜을 붙이기. 세션은 그대로 두고 계정 설정으로 돌아갑니다
 *
 * 사용자에게는 대기 화면만 보이고 곧 원래 있던 곳으로 넘어갑니다.
 */
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
  PROVIDER_LABEL,
  callbackUrl,
  consumeCallback,
  type OAuthMode,
  type SocialProvider,
} from '@/lib/social';

export default function SocialCallback() {
  const { provider } = useParams<{ provider: string }>();
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const { signInWithToken } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<OAuthMode>('login');
  /** StrictMode 는 effect 를 두 번 실행합니다. 인가 코드는 1회용이라 두 번 교환하면 두 번째가 실패합니다. */
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    if (provider !== 'kakao' && provider !== 'naver') {
      setError('지원하지 않는 로그인 방식입니다');
      return;
    }
    const p: SocialProvider = provider;

    void (async () => {
      try {
        const { code, state, returnTo, mode } = consumeCallback(p, search.toString());
        const body = { code, state, redirectUri: callbackUrl(p) };
        setMode(mode);

        if (mode === 'link') {
          // 🔴 여기서는 로그인하지 않습니다. 이미 로그인한 계정에 수단을 붙이는 것이라
          //    세션을 건드리면 방금 연결한 소셜 계정으로 갈아타 버립니다.
          const res = await api.account.link(p, body);
          if (!res.ok) {
            setError(res.error.message);
            return;
          }
          navigate(returnTo, {
            replace: true,
            state: { linked: p, absorbed: res.data.absorbedUid },
          });
          return;
        }

        const res = await api.auth.social(p, body);
        if (!res.ok) {
          setError(res.error.message);
          return;
        }

        // Worker 가 서명한 커스텀 토큰으로 Firebase 세션을 만듭니다.
        // 이 시점부터 카카오·네이버 사용자도 구글·이메일 사용자와 완전히 동일하게 취급됩니다
        // (users/{uid} 문서는 Worker 가 이미 만들어 두었습니다).
        await signInWithToken(res.data.customToken);
        navigate(returnTo, { replace: true });
      } catch (e) {
        setError(e instanceof Error ? e.message : '로그인에 실패했습니다');
      }
    })();
  }, [provider, search, navigate, signInWithToken]);

  if (error) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
        <span className="font-script text-[34px] text-gold">Luvi</span>
        <p className="text-sm text-ink">{error}</p>
        <Link
          to={mode === 'link' ? '/app/account' : '/login'}
          className="rounded-full bg-ink px-5 py-2.5 text-[12.5px] text-paper-soft"
        >
          {mode === 'link' ? '계정 설정으로' : '다시 로그인'}
        </Link>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3">
      <span className="animate-pulseSoft font-script text-[34px] text-gold">Luvi</span>
      <p className="text-[12.5px] text-muted">
        {provider === 'kakao' || provider === 'naver'
          ? `${PROVIDER_LABEL[provider]} 계정을 ${mode === 'link' ? '연결' : '확인'}하는 중…`
          : '처리 중…'}
      </p>
    </main>
  );
}
