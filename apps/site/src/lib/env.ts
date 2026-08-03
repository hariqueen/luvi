/** 빌드 시 주입되는 환경값. 없으면 개발용 기본값으로 떨어진다. */
export const env = {
  apiBase: import.meta.env.VITE_API_BASE ?? 'http://localhost:8787/api',
  cdnBase: import.meta.env.VITE_CDN_BASE ?? '',
  siteOrigin: import.meta.env.VITE_SITE_ORIGIN ?? 'https://luv-ai.co.kr',

  /** 카카오톡 공유(SDK)용 JavaScript 키 */
  kakaoJsKey: import.meta.env.VITE_KAKAO_JS_KEY ?? '',
  /** 카카오 로그인(OAuth)용 REST API 키 — 공유용 JS 키와 **다른 값**이다 */
  kakaoRestKey: import.meta.env.VITE_KAKAO_REST_KEY ?? '',
  /** 네이버 로그인 Client ID (Client Secret 은 Worker 에만 둔다) */
  naverClientId: import.meta.env.VITE_NAVER_CLIENT_ID ?? '',

  /**
   * Firebase 웹 앱 설정.
   *
   * 전부 브라우저에 노출되는 **공개 값**이다 — `apiKey` 는 비밀키가 아니라 프로젝트 식별자다.
   * 실제 보호는 (1) Firebase 승인 도메인 (2) Firestore 보안 규칙 두 가지가 한다.
   */
  firebase: {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? '',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? '',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? '',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
    appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '',
  },
} as const;

/** R2 키 → 표시용 URL. ContentDoc 에는 절대 URL을 저장하지 않으므로 여기서 조립한다. */
export const assetUrl = (key: string | null | undefined): string =>
  key ? `${env.cdnBase}/${key}` : '';
