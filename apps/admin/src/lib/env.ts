/**
 * 빌드 시 주입되는 환경값. 없으면 개발용 기본값으로 떨어집니다.
 *
 * `.env` 는 모노레포 루트 하나뿐이고 `vite.config.ts` 의 `envDir` 이 그걸 가리킵니다.
 * 소비자 앱이 쓰는 값 중 운영자 콘솔에 필요 없는 것(카카오·네이버·Turnstile)은
 * **일부러 빼 두었습니다** — 여기서 읽지 않는 키는 이 앱의 번들에도 들어가지 않습니다.
 */
export const env = {
  apiBase: import.meta.env.VITE_API_BASE ?? 'http://localhost:8787/api',
  cdnBase: import.meta.env.VITE_CDN_BASE ?? '',
  /** 청첩장 편집·하객 화면으로 새 탭을 열 때의 기준 주소 */
  siteOrigin: import.meta.env.VITE_SITE_ORIGIN ?? 'https://luv-ai.co.kr',

  /**
   * Firebase 웹 앱 설정.
   *
   * 전부 브라우저에 노출되는 **공개 값**입니다 — `apiKey` 는 비밀키가 아니라 프로젝트 식별자입니다.
   * 실제 보호는 (1) Firebase 승인 도메인 (2) Firestore 보안 규칙 (3) Worker 의 역할 판단이 합니다.
   *
   * 🔴 `admin.luv-ai.co.kr` 을 Firebase 승인 도메인에 넣지 않으면 로그인만 조용히 실패합니다.
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

/** R2 키 → 표시용 URL. ContentDoc 에는 절대 URL 을 저장하지 않으므로 여기서 조립합니다. */
export const assetUrl = (key: string | null | undefined): string =>
  key ? `${env.cdnBase}/${key}` : '';

/** 메인 사이트의 화면을 새 탭으로 엽니다 — 에디터를 복제하지 않기 위한 유일한 통로입니다 */
export const siteUrl = (path: string): string => `${env.siteOrigin}${path}`;
