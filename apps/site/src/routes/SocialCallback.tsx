/**
 * `/login/callback/:provider` — 카카오·네이버가 되돌려보내는 지점.
 *
 * 여기서 하는 일: state 검증 → 인가 코드를 Worker 로 보내 커스텀 토큰 받기 → Firebase 로그인.
 * 사용자에게는 대기 화면만 보이고 곧 대시보드로 넘어갑니다.
 */
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { PROVIDER_LABEL, callbackUrl, consumeCallback, type SocialProvider } from '@/lib/social';

export default function SocialCallback() {
  const { provider } = useParams<{ provider: string }>();
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
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
        const { code, state, returnTo } = consumeCallback(p, search.toString());

        const res = await api.auth.social(p, {
          code,
          state,
          redirectUri: callbackUrl(p),
        });

        if (!res.ok) {
          setError(res.error.message);
          return;
        }

        // TODO(실구현): signInWithCustomToken(auth, res.data.customToken)
        // 그 뒤 res.data.profile 로 users/{uid} 를 upsert 합니다.
        navigate(returnTo, { replace: true });
      } catch (e) {
        setError(e instanceof Error ? e.message : '로그인에 실패했습니다');
      }
    })();
  }, [provider, search, navigate]);

  if (error) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
        <span className="font-script text-[34px] text-gold">Luvi</span>
        <p className="text-sm text-ink">{error}</p>
        <Link to="/login" className="rounded-full bg-ink px-5 py-2.5 text-[12.5px] text-paper-soft">
          다시 로그인
        </Link>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3">
      <span className="animate-pulseSoft font-script text-[34px] text-gold">Luvi</span>
      <p className="text-[12.5px] text-muted">
        {provider === 'kakao' || provider === 'naver'
          ? `${PROVIDER_LABEL[provider]} 계정으로 로그인 중…`
          : '로그인 중…'}
      </p>
    </main>
  );
}
