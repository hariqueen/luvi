import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  /**
   * `.env` 는 모노레포 루트에 하나만 둡니다 (`.env.example` 이 있는 곳).
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
    // firebase 는 `lib/firebase.ts` 가 동적 import 하므로 Rollup 이 자동으로 별도 청크로 뺍니다
    // (gzip 약 37KB). manualChunks 를 지정하면 오히려 정적 청크가 되어 마케팅 화면에서도 받게 됩니다.
  },
});
