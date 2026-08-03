import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
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
    // firebase 를 실제로 import 하기 시작하면 아래를 켜세요 — 무거워서 분리해야 첫 로드가 가볍습니다.
    // 지금 켜두면 빈 청크 경고가 계속 납니다.
    //   rollupOptions: { output: { manualChunks: { firebase: ['firebase/app', 'firebase/auth'] } } }
  },
});
