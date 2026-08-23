/**
 * 로그인 상태 — 앱 전체가 여기 하나만 봅니다.
 *
 * 네 가지 로그인 방식이 모두 이 파일을 통과합니다:
 *
 * | 방식 | 처리 |
 * |------|------|
 * | 이메일·비밀번호 | Firebase Auth 가 직접 |
 * | 구글 | Firebase Auth 가 직접 (팝업) |
 * | 카카오 · 네이버 | Worker 가 서명한 **커스텀 토큰** → `signInWithCustomToken` |
 *
 * 카카오·네이버는 Firebase 가 기본 지원하지 않는 제공자라 우리 Worker 가 중간에 섭니다
 * (`workers/api/src/lib/customToken.ts`). 로그인된 뒤에는 넷 다 똑같은 Firebase 사용자입니다.
 *
 * ⚠️ `status` 를 보기 전에 `user` 로 분기하면 안 됩니다. 앱이 뜬 직후에는 저장된 세션을
 *    복원하는 중이라 로그인 상태여도 `user` 가 잠시 null 입니다 → `'loading'` 을 먼저 처리하세요.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useLocation } from 'react-router-dom';
import { api } from './api';
import {
  authErrorMessage,
  firebaseConfigured,
  hasSessionHint,
  loadAuth,
  setSessionHint,
  waitForAuthReady,
} from './firebase';

export type AuthStatus =
  /** 저장된 세션을 확인하는 중 — 화면을 그리기 전에 기다려야 합니다 */
  | 'loading'
  | 'signed-in'
  | 'signed-out'
  /** `.env` 의 VITE_FIREBASE_* 가 비어 있음 */
  | 'unconfigured';

export interface AuthUser {
  uid: string;
  /** 카카오·네이버는 이메일이 **선택 동의**라 null 일 수 있습니다 */
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  /** 'password' | 'google.com' | 'custom'(카카오·네이버) */
  provider: string;
}

export interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  /**
   * 운영자 여부. `POST /api/auth/session` 응답(= Firestore `users/{uid}.role`)이 유일한 근거입니다.
   * 로그인 직후 한 박자 늦게 채워지므로, 이 값으로 **화면을 숨기는 용도로만** 씁니다 —
   * 실제 접근 제어는 서버가 매 요청마다 다시 판단합니다.
   */
  isAdmin: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  /** 카카오·네이버 콜백에서 Worker 가 준 토큰으로 로그인 */
  signInWithToken: (customToken: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** 로그인 없이는 못 쓰는 경로 — 여기에 들어오면 firebase 를 즉시 불러옵니다 */
function pathNeedsAuth(pathname: string): boolean {
  return pathname.startsWith('/app') || pathname.startsWith('/login');
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();

  const [status, setStatus] = useState<AuthStatus>(() =>
    firebaseConfigured() ? 'loading' : 'unconfigured',
  );
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  /** 구독을 두 번 걸지 않기 위한 표시 (StrictMode 는 effect 를 두 번 실행합니다) */
  const subscribed = useRef(false);
  /** 로그인 직후 users/{uid} 를 한 번만 갱신하기 위해 */
  const syncedUid = useRef<string | null>(null);

  /**
   * firebase 를 불러와 로그인 상태를 구독할지. **한 번 켜지면 다시 꺼지지 않습니다(래치).**
   *
   * 🔴 예전에는 이 조건을 현재 경로에서 매번 계산해 아래 effect 의 의존성으로 썼습니다.
   *    그래서 로고를 눌러 `/app` → `/` 로 나오는 순간 인증 구독이 **해제**되고, 재구독 여부를
   *    `luvi:session` 힌트만 보고 결정했습니다. 힌트는 localStorage 에 있으므로 저장이 막힌
   *    브라우저(프라이빗 모드 등)에서는 firebase 세션이 IndexedDB 에 살아 있는데도 힌트가
   *    없어서 상태가 'signed-out' 으로 덮였습니다 → **로고를 누르면 로그아웃된 것처럼 보임.**
   *    래치로 두면 홈으로 나가도 구독이 유지되어 로그인이 그대로 남습니다.
   */
  const [engaged, setEngaged] = useState(
    () => firebaseConfigured() && (pathNeedsAuth(pathname) || hasSessionHint()),
  );

  // 마케팅 화면에서 로그인 경로로 들어가는 순간 한 번만 켜집니다
  useEffect(() => {
    if (engaged || !firebaseConfigured()) return;
    if (pathNeedsAuth(pathname) || hasSessionHint()) setEngaged(true);
  }, [engaged, pathname]);

  useEffect(() => {
    if (!firebaseConfigured()) {
      setStatus('unconfigured');
      return;
    }

    // 마케팅 화면만 보는 방문자에게 firebase 번들을 받게 하지 않습니다.
    // 로그인 흔적이 없고 로그인이 필요한 경로도 아니면 그냥 '비로그인' 으로 확정합니다.
    if (!engaged) {
      setStatus('signed-out');
      return;
    }
    // 이제부터 확인에 들어갑니다 — 확정 전까지 가드가 기다려야 합니다.
    // ('signed-out' 그대로 두면 RequireAuth 가 로그인 화면으로 한 번 튕깁니다)
    setStatus((prev) => (prev === 'signed-out' ? 'loading' : prev));

    if (subscribed.current) return;
    subscribed.current = true;

    let stop: (() => void) | undefined;
    let cancelled = false;

    void (async () => {
      try {
        const auth = await loadAuth();
        const { onIdTokenChanged } = await import('firebase/auth');
        if (cancelled) return;

        // onAuthStateChanged 대신 onIdTokenChanged 를 씁니다 —
        // 토큰이 갱신될 때도 알려주므로 만료 직전의 낡은 상태로 남지 않습니다
        stop = onIdTokenChanged(auth, (fbUser) => {
          if (!fbUser) {
            setSessionHint(false);
            syncedUid.current = null;
            setUser(null);
            setIsAdmin(false);
            setStatus('signed-out');
            return;
          }

          const next: AuthUser = {
            uid: fbUser.uid,
            email: fbUser.email,
            displayName: fbUser.displayName,
            photoURL: fbUser.photoURL,
            provider: fbUser.providerData[0]?.providerId ?? 'custom',
          };
          setSessionHint(true);
          setUser(next);
          setStatus('signed-in');

          // 사용자 문서 생성·갱신. 실패해도 로그인을 막지 않습니다 (다음 로그인에 다시 시도됩니다)
          // 응답에 담긴 role 로 운영자 메뉴 노출을 결정합니다.
          if (syncedUid.current !== next.uid) {
            syncedUid.current = next.uid;
            void api.auth
              .session({
                email: next.email,
                displayName: next.displayName,
                photoURL: next.photoURL,
                provider: next.provider,
              })
              .then((res) => {
                if (res.ok) setIsAdmin(res.data.role === 'admin');
              });
          }
        });

        await waitForAuthReady(auth);
        // 저장된 세션이 없으면 콜백이 한 번도 불리지 않을 수 있어 여기서 확정합니다
        if (!cancelled && !auth.currentUser) setStatus('signed-out');
      } catch (e) {
        console.error('[auth] 초기화 실패', e);
        if (!cancelled) setStatus('signed-out');
      }
    })();

    return () => {
      cancelled = true;
      stop?.();
      subscribed.current = false;
    };
  }, [engaged]);

  const signInWithGoogle = useCallback(async () => {
    const auth = await loadAuth();
    const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
    const provider = new GoogleAuthProvider();
    // 계정을 매번 고르게 합니다 — 가족 공용 PC 에서 남의 계정으로 자동 로그인되는 걸 막습니다
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      await signInWithPopup(auth, provider);
    } catch (e) {
      throw new Error(authErrorMessage(e));
    }
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const auth = await loadAuth();
    const { signInWithEmailAndPassword } = await import('firebase/auth');
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (e) {
      throw new Error(authErrorMessage(e));
    }
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string) => {
    const auth = await loadAuth();
    const { createUserWithEmailAndPassword } = await import('firebase/auth');
    try {
      await createUserWithEmailAndPassword(auth, email.trim(), password);
    } catch (e) {
      throw new Error(authErrorMessage(e));
    }
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    const auth = await loadAuth();
    const { sendPasswordResetEmail } = await import('firebase/auth');
    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch (e) {
      throw new Error(authErrorMessage(e));
    }
  }, []);

  const signInWithToken = useCallback(async (customToken: string) => {
    const auth = await loadAuth();
    const { signInWithCustomToken } = await import('firebase/auth');
    try {
      await signInWithCustomToken(auth, customToken);
    } catch (e) {
      throw new Error(authErrorMessage(e));
    }
  }, []);

  const signOut = useCallback(async () => {
    setSessionHint(false);
    const auth = await loadAuth();
    const { signOut: fbSignOut } = await import('firebase/auth');
    await fbSignOut(auth);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      isAdmin,
      signInWithGoogle,
      signInWithEmail,
      signUpWithEmail,
      sendPasswordReset,
      signInWithToken,
      signOut,
    }),
    [
      status,
      user,
      isAdmin,
      signInWithGoogle,
      signInWithEmail,
      signUpWithEmail,
      sendPasswordReset,
      signInWithToken,
      signOut,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth 는 AuthProvider 안에서만 쓸 수 있습니다');
  return value;
}
