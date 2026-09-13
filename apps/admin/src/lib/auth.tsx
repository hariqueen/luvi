/**
 * 로그인 상태 + 운영자 판정 — 콘솔 전체가 여기 하나만 봅니다.
 *
 * ─── 소비자 앱의 auth 와 무엇이 다른가 ─────────────────────────────
 *
 * | 항목 | apps/site | 여기 |
 * |------|-----------|------|
 * | 로그인 수단 | 이메일 · 구글 · 카카오 · 네이버 | **이메일 · 구글만** |
 * | firebase 로딩 | 경로·힌트를 보고 늦게 (래치) | 언제나 즉시 |
 * | role | 메뉴를 숨기는 용도 | **화면 진입 조건** |
 * | 동의 게이트 | 있음 (ConsentGate) | 없음 |
 *
 * 카카오·네이버를 뺀 이유: 운영자 계정은 우리가 만들고 우리가 관리합니다. 제공자를
 * 늘리면 같은 사람이 서로 다른 uid 로 두 번 가입해 한쪽만 운영자가 되는 사고가 납니다.
 *
 * 동의 게이트를 뺀 이유: 재동의는 **자기 정보의 처리**에 대한 것이라 소비자 화면에서
 * 받습니다. 여기서 같은 모달을 띄우면 운영자가 문의 응대 중에 갇힙니다.
 *
 * ─── role 의 세 번째 상태 ──────────────────────────────────────────
 *
 * 🔴 `role === null` 은 **"운영자가 아님" 이 아니라 "아직 모름"** 입니다.
 *    `POST /api/auth/session` 응답이 오기 전에 null 을 "권한 없음" 으로 읽으면,
 *    진짜 운영자에게도 로그인할 때마다 거부 화면이 한 번 깜빡입니다.
 *    구분하려고 실패는 `roleError` 로 따로 둡니다 — 그래야 "모름" 이 영원히 끝나지
 *    않는 로딩으로 굳지 않습니다.
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
import type { UserRole } from '@luvi/schema';
import { api } from './api';
import { authErrorMessage, firebaseConfigured, loadAuth, waitForAuthReady } from './firebase';

export type AuthStatus =
  /** 저장된 세션을 확인하는 중 — 화면을 그리기 전에 기다려야 합니다 */
  | 'loading'
  | 'signed-in'
  | 'signed-out'
  /** `.env` 의 VITE_FIREBASE_* 가 비어 있음 */
  | 'unconfigured';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  /** 'password' | 'google.com' */
  provider: string;
}

export interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  /** `null` = 아직 모름. 서버 응답(`users/{uid}.role`)이 유일한 근거입니다 */
  role: UserRole | null;
  /** 역할을 확인하지 못한 이유. 있으면 화면이 "다시 시도" 를 보여줍니다 */
  roleError: string | null;
  refreshRole: () => void;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>(() =>
    firebaseConfigured() ? 'loading' : 'unconfigured',
  );
  const [user, setUser] = useState<AuthUser | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);

  /** 구독을 두 번 걸지 않기 위한 표시 (StrictMode 는 effect 를 두 번 실행합니다) */
  const subscribed = useRef(false);
  /** 지금 역할을 물어본 uid — 같은 사람에게 두 번 묻지 않기 위해 */
  const syncedUid = useRef<string | null>(null);

  const syncRole = useCallback(async (next: AuthUser) => {
    setRoleError(null);
    const res = await api.auth.session({
      email: next.email,
      displayName: next.displayName,
      photoURL: next.photoURL,
      provider: next.provider,
    });
    if (res.ok) {
      setRole(res.data.role);
      return;
    }
    // 🔴 실패를 '운영자 아님' 으로 떨어뜨리지 않습니다. 네트워크가 끊긴 것과
    //    권한이 없는 것은 운영자가 해야 할 일이 서로 다릅니다.
    syncedUid.current = null;
    setRoleError(res.error.message);
  }, []);

  const refreshRole = useCallback(() => {
    if (!user) return;
    syncedUid.current = user.uid;
    void syncRole(user);
  }, [user, syncRole]);

  useEffect(() => {
    if (!firebaseConfigured()) {
      setStatus('unconfigured');
      return;
    }
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
            syncedUid.current = null;
            setUser(null);
            setRole(null);
            setRoleError(null);
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
          setUser(next);
          setStatus('signed-in');

          if (syncedUid.current !== next.uid) {
            syncedUid.current = next.uid;
            void syncRole(next);
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
  }, [syncRole]);

  const signInWithGoogle = useCallback(async () => {
    const auth = await loadAuth();
    const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
    const provider = new GoogleAuthProvider();
    // 계정을 매번 고르게 합니다 — 개인 구글 계정으로 자동 로그인되어
    // "운영자 아님" 화면을 보는 일이 잦습니다
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

  const sendPasswordReset = useCallback(async (email: string) => {
    const auth = await loadAuth();
    const { sendPasswordResetEmail } = await import('firebase/auth');
    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch (e) {
      throw new Error(authErrorMessage(e));
    }
  }, []);

  const signOut = useCallback(async () => {
    const auth = await loadAuth();
    const { signOut: fbSignOut } = await import('firebase/auth');
    await fbSignOut(auth);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      role,
      roleError,
      refreshRole,
      signInWithGoogle,
      signInWithEmail,
      sendPasswordReset,
      signOut,
    }),
    [
      status,
      user,
      role,
      roleError,
      refreshRole,
      signInWithGoogle,
      signInWithEmail,
      sendPasswordReset,
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
