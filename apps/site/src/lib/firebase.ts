/**
 * Firebase Auth 를 **필요할 때만** 불러옵니다.
 *
 * `firebase/auth` 는 압축 후에도 40KB 가 넘습니다. 홈·샘플 같은 마케팅 화면만 보고 떠나는
 * 방문자가 이걸 받을 이유가 없습니다. 그래서 정적 import 를 쓰지 않고 동적 import 로 쪼갭니다.
 *
 * **언제 불러오는가:**
 *  - 로그인/대시보드/에디터 경로에 들어갔을 때
 *  - 또는 이전에 로그인한 흔적(`luvi:session`)이 있을 때 — 헤더에 로그인 상태를 보여주려면 필요합니다
 *
 * 그 힌트를 우리가 직접 남기는 이유: Firebase 가 세션을 어디에 저장하는지는 내부 구현이라
 * 그걸 들여다보면 버전이 올라갈 때 조용히 깨집니다.
 */
import type { Auth, User } from 'firebase/auth';
import { env } from './env';

const HINT_KEY = 'luvi:session';

/** 프라이빗 모드·저장공간 차단 환경에서는 localStorage 접근 자체가 예외를 던집니다 */
function safeStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function hasSessionHint(): boolean {
  return safeStorage()?.getItem(HINT_KEY) === '1';
}

export function setSessionHint(signedIn: boolean): void {
  const storage = safeStorage();
  if (!storage) return;
  try {
    if (signedIn) storage.setItem(HINT_KEY, '1');
    else storage.removeItem(HINT_KEY);
  } catch {
    // 용량 초과 등 — 힌트가 없으면 조금 늦게 불러오는 것뿐이라 무시합니다
  }
}

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

    // 구글 로그인 창과 비밀번호 재설정 메일이 한국어로 나옵니다
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
  // 로그인 흔적이 없으면 firebase 를 불러올 이유가 없습니다
  if (!hasSessionHint()) return null;

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
 * Firebase 오류 코드 → 사용자에게 보여줄 한국어 문구.
 *
 * 원문 메시지는 영어이고 "Firebase: Error (auth/invalid-credential)." 같은 형태라
 * 그대로 노출하면 무엇을 고쳐야 하는지 알 수 없습니다.
 */
export function authErrorMessage(error: unknown): string {
  const code = (error as { code?: string } | null)?.code ?? '';

  switch (code) {
    case 'auth/invalid-email':
      return '이메일 형식이 올바르지 않습니다';
    case 'auth/missing-password':
      return '비밀번호를 입력해주세요';
    case 'auth/weak-password':
      return '비밀번호는 6자 이상이어야 합니다';
    case 'auth/email-already-in-use':
      return '이미 가입된 이메일입니다. 로그인해주세요';
    // 최근 버전은 "없는 계정" 과 "틀린 비밀번호" 를 하나로 합쳤습니다 —
    // 어느 이메일이 가입되어 있는지 알려주지 않는 편이 안전합니다
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
      return '이 도메인이 Firebase 승인 도메인에 등록되지 않았습니다';
    case 'auth/invalid-custom-token':
    case 'auth/custom-token-mismatch':
      return '로그인 정보가 유효하지 않습니다. 다시 시도해주세요';
    default:
      return error instanceof Error && !code ? error.message : '로그인에 실패했습니다';
  }
}
