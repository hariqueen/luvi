import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  /**
   * `.env` 는 모노레포 루트(`luvi/`)에 하나만 둡니다.
   *
   * 🔴 **이 설정이 없으면 Vite 는 이 앱 폴더에서만 `.env` 를 찾습니다.**
   *    루트에 값을 채워도 조용히 무시되어, 빌드는 성공하는데 로그인만 안 되는 상태가 됩니다.
   *    앱마다 `.env` 를 따로 두면 Firebase 키를 두 곳에 복사해야 해서 한쪽이 뒤처집니다.
   */
  envDir: fileURLToPath(new URL('../..', import.meta.url)),
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: 5173,
    // 개발 중에는 API Worker(wrangler dev)로 프록시해 CORS·환경변수 신경을 덜 쓴다
    proxy: {
      '/api': { target: 'http://localhost:8787', changeOrigin: true },
    },
  },
  build: {
    outDir: 'dist',
    /**
     * 🔴 해시를 **hex 로 고정**합니다 (기본값은 base64url).
     *
     * base64url 해시는 `-` 로 시작할 수 있어 `index--a6IeEms.js` 같은 이름이 나옵니다.
     * Cloudflare Pages 가 이 이름을 서빙하지 못하고 index.html 로 폴백해서(200 text/html)
     * 모듈 스크립트 로딩이 깨졌습니다 — 2026-08-18 실제로 사이트가 빈 화면이 되었습니다.
     * hex 는 [0-9a-f] 뿐이라 이 상황이 구조적으로 불가능합니다.
     */
    rollupOptions: { output: { hashCharacters: 'hex' } },
    // firebase 는 `lib/firebase.ts` 가 동적 import 하므로 Rollup 이 자동으로 별도 청크로 뺍니다
    // (gzip 약 37KB). manualChunks 를 지정하면 오히려 정적 청크가 되어 마케팅 화면에서도 받게 됩니다.
  },
});
