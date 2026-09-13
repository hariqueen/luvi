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
   *    Firebase 키를 앱마다 복사해 두면 한쪽이 반드시 뒤처집니다.
   */
  envDir: fileURLToPath(new URL('../..', import.meta.url)),
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    // 5173 은 apps/site 가 씁니다 — 둘을 동시에 띄우는 일이 잦아 포트를 겹치지 않게 둡니다
    port: 5175,
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
     * 모듈 스크립트 로딩이 깨집니다 — 2026-08-18 에 사이트가 실제로 빈 화면이 되었습니다.
     * hex 는 [0-9a-f] 뿐이라 이 상황이 구조적으로 불가능합니다.
     */
    rollupOptions: { output: { hashCharacters: 'hex' } },
  },
});
