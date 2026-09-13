/**
 * Firebase Auth. 소비자 앱(`apps/site/src/lib/firebase.ts`)의 축소판입니다.
 *
 * **뺀 것:** 세션 힌트(`luvi:session`).
 * 거기서는 마케팅 화면만 보고 떠나는 방문자에게 40KB 짜리 `firebase/auth` 를 받게 하지
 * 않으려고 "이전에 로그인한 흔적" 을 따로 남깁니다. 이 콘솔에는 로그인 없이 볼 화면이
 * 하나도 없으므로 그 장치가 필요 없습니다 — 언제나 불러옵니다.
 *
 * **남긴 것:** 동적 import. 첫 페인트(워드마크)가 인증 번들을 기다리지 않게 합니다.
 */
import type { Auth, User } from 'firebase/auth';
import { env } from './env';

/** 설정값이 하나라도 비면 로그인이 동작하지 않습니다. 화면에서 안내하려고 따로 노출합니다 */
export function firebaseConfigured(): boolean {
  return Boolean(env.firebase.apiKey && env.firebase.authDomain && env.firebase.projectId);
}

let authPromise: Promise<Auth> | null = null;

export function loadAuth(): Promise<Auth> {
  if (!firebaseConfigured()) {
    return Promise.reject(new Error('Firebase 설정이 없습니다 (.env 의 VITE_FIREBASE_* 확인)'));
  }

  authPromise ??= (async () => {
    const [{ getApps, initializeApp }, { getAuth }] = await Promise.all([
      import('firebase/app'),
      import('firebase/auth'),
    ]);

    // HMR 로 이 모듈이 다시 평가되면 initializeApp 이 중복 호출됩니다
    const app = getApps()[0] ?? initializeApp(env.firebase);
    const auth = getAuth(app);
    auth.languageCode = 'ko';
    return auth;
  })();

  return authPromise;
}

/**
 * 복원이 끝난 뒤의 현재 사용자.
 *
 * ⚠️ 앱이 막 뜬 시점에는 `auth.currentUser` 가 **아직 null** 입니다 (저장된 세션을 읽는 중).
 *    이걸 기다리지 않고 API 를 부르면 로그인 상태인데도 토큰 없이 요청해 401 이 납니다.
 */
export async function currentUser(): Promise<User | null> {
  if (!firebaseConfigured()) return null;
  const auth = await loadAuth();
  await waitForAuthReady(auth);
  return auth.currentUser;
}

/** `authStateReady()` 는 firebase 10.6 부터 있습니다. 없을 때를 대비해 감쌉니다 */
export async function waitForAuthReady(auth: Auth): Promise<void> {
  const ready = (auth as Auth & { authStateReady?: () => Promise<void> }).authStateReady;
  if (typeof ready === 'function') {
    await ready.call(auth);
    return;
  }

  const { onAuthStateChanged } = await import('firebase/auth');
  await new Promise<void>((resolve) => {
    const stop = onAuthStateChanged(auth, () => {
      stop();
      resolve();
    });
  });
}

/**
 * Firebase 오류 코드 → 운영자에게 보여줄 한국어 문구.
 *
 * 소비자 화면과 한 가지가 다릅니다: **"이메일이 가입되어 있는지" 를 숨기지 않아도 됩니다.**
 * 여기까지 온 사람은 이미 Cloudflare Access 를 통과한 내부 인원입니다. 대신
 * `unauthorized-domain` 처럼 **설정 실수**를 가리키는 코드를 그대로 드러냅니다 — 이 화면의
 * 오류는 대부분 사용자 잘못이 아니라 콘솔 설정이 빠진 것입니다.
 */
export function authErrorMessage(error: unknown): string {
  const code = (error as { code?: string } | null)?.code ?? '';

  switch (code) {
    case 'auth/invalid-email':
      return '이메일 형식이 올바르지 않습니다';
    case 'auth/missing-password':
      return '비밀번호를 입력해주세요';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return '이메일 또는 비밀번호가 맞지 않습니다';
    case 'auth/too-many-requests':
      return '시도가 너무 많습니다. 잠시 뒤에 다시 해주세요';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return '로그인 창이 닫혔습니다';
    case 'auth/popup-blocked':
      return '팝업이 차단되었습니다. 브라우저 설정을 확인해주세요';
    case 'auth/network-request-failed':
      return '네트워크에 연결할 수 없습니다';
    case 'auth/operation-not-allowed':
      return '이 로그인 방식이 Firebase 콘솔에서 켜져 있지 않습니다';
    case 'auth/unauthorized-domain':
      return 'admin.luv-ai.co.kr 이 Firebase 승인 도메인에 등록되지 않았습니다 (콘솔 → Authentication → Settings)';
    default:
      return error instanceof Error && !code ? error.message : '로그인에 실패했습니다';
  }
}
