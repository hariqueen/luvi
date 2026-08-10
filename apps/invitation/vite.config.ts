import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { invitation } from './src/config/invitation.config';

/**
 * <title>·description·og 태그를 invitation.config.ts에서 생성해 <head>에 주입합니다.
 *
 * index.html에 직접 적으면 카카오 공유(config를 읽음)와 URL 붙여넣기 미리보기(og 태그)가
 * 서로 다른 문구를 보여주게 되므로, 두 경로 모두 config 한 곳만 바라보게 합니다.
 */
function ogTags(): Plugin {
  const { share } = invitation;
  const abs = (path: string): string => new URL(path, share.url).href;
  // 카카오 피드는 줄바꿈을 살리지만 og 미리보기는 한 줄이라 · 로 잇습니다.
  const description = share.description.split('\n').join(' · ');

  const og: Record<string, string> = {
    'og:type': 'website',
    'og:site_name': share.siteName,
    'og:url': share.url,
    'og:title': share.title,
    'og:description': description,
    'og:image': abs(share.image),
    'og:image:width': String(share.imageWidth),
    'og:image:height': String(share.imageHeight),
  };

  return {
    name: 'invitation-og-tags',
    transformIndexHtml: () => [
      { tag: 'title', children: share.title, injectTo: 'head' },
      { tag: 'meta', attrs: { name: 'description', content: description }, injectTo: 'head' },
      ...Object.entries(og).map(([property, content]) => ({
        tag: 'meta',
        attrs: { property, content },
        injectTo: 'head' as const,
      })),
      {
        tag: 'meta',
        attrs: { name: 'twitter:card', content: 'summary_large_image' },
        injectTo: 'head' as const,
      },
    ],
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), ogTags()],
  // `.env` 는 모노레포 루트에 하나만 둡니다. 없으면 Vite 가 이 앱 폴더만 찾아 값이 조용히 비워집니다
  envDir: fileURLToPath(new URL('../..', import.meta.url)),
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: true, // 컨테이너 밖(호스트)에서 접속 가능하도록 0.0.0.0 바인딩
    // Docker 볼륨 마운트 환경에서는 파일 변경 감지가 안 될 수 있어 폴링 사용
    watch: process.env.CHOKIDAR_USEPOLLING ? { usePolling: true } : undefined,
  },
  build: {
    outDir: 'dist',
    // 폰트/이미지 등 public/ 자산은 그대로 복사됩니다.
    rollupOptions: {
      output: {
        // Firebase는 무거우므로 별도 청크로 분리해 초기 로드를 가볍게 유지
        manualChunks: {
          firebase: ['firebase/app', 'firebase/firestore'],
        },
      },
    },
  },
});
