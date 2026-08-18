import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

/**
 * 기본 <title>·og 태그를 <head>에 심습니다.
 *
 * 이 뷰어는 이제 **런타임 멀티테넌트**입니다 (슬러그마다 다른 청첩장을 API 로 받습니다).
 * 그래서 청첩장별 문구를 빌드 시점에 정적으로 넣을 수 없습니다 — 여기서는 브랜드 기본값만 넣고,
 * 로드 후 실제 제목은 App 이 `document.title` 로 맞춥니다. (URL 붙여넣기 미리보기는 이 기본값을 씁니다.)
 *
 * ⚠️ config 를 import 하지 않습니다 — vite.config 로드 시점에 @luvi/schema(.ts)를 끌어와
 *    Node 가 .ts 를 못 읽는 문제가 생기기 때문입니다.
 */
function ogTags(): Plugin {
  const og: Record<string, string> = {
    'og:type': 'website',
    'og:site_name': 'Luvi',
    'og:title': '모바일 청첩장',
    'og:description': '우리의 결혼식에 초대합니다',
  };

  return {
    name: 'invitation-og-tags',
    transformIndexHtml: () => [
      { tag: 'title', children: '모바일 청첩장', injectTo: 'head' },
      ...Object.entries(og).map(([property, content]) => ({
        tag: 'meta',
        attrs: { property, content },
        injectTo: 'head' as const,
      })),
    ],
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  // luvi-site(luv-ai.co.kr) 배포의 /i/ 하위에 얹혀 서빙됩니다.
  // 이 base 가 있어야 번들·에셋 URL 이 /i/assets/… 로 나가 메인 사이트의 /assets 와 충돌하지 않습니다.
  base: '/i/',
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
    // 🔴 사이트와 같은 이유로 해시를 hex 로 고정합니다 — base64url 해시가 `-` 로 시작하면
    //    `index--xxxx.js` 가 되고 Cloudflare Pages 가 그 파일을 서빙하지 못합니다
    //    (200 으로 index.html 이 와서 화면이 빈다). 자세한 배경은 apps/site/vite.config.ts.
    rollupOptions: { output: { hashCharacters: 'hex' } },
    // 폰트/이미지 등 public/ 자산은 그대로 복사됩니다.
    //
    // 예전에는 Firebase 를 별도 청크로 뺐습니다. 이제 방명록·랭킹을 워커 REST API 로
    // 받아오므로 뷰어에 Firebase SDK 가 아예 없습니다 (gzip 80KB 감소).
  },
});
