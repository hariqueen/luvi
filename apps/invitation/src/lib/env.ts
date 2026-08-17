/** 빌드 시 주입되는 환경값. 뷰어는 발행 스냅샷(API)만 있으면 되므로 최소한만 둔다. */
export const env = {
  /** REST API 베이스 (예: 'https://luvi-api.…workers.dev/api'). 끝에 /api 포함 */
  apiBase: import.meta.env.VITE_API_BASE ?? 'http://localhost:8787/api',
} as const;

/** 앱이 서빙되는 하위 경로 접두어 ('/i/'). public 에셋 참조에 쓴다 */
export const BASE = import.meta.env.BASE_URL;
