import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

/**
 * 기본 <title>·og 태그와 검색 차단을 <head>에 심습니다.
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
      /**
       * 🔴 청첩장은 검색에 올라가면 안 됩니다.
       *
       * 한 장 안에 신랑신부·**양가 부모 실명**, 계좌번호, 하객이 남긴 이름과 메시지가 함께 있고,
       * 그중 대부분은 우리에게 공개 동의를 준 적이 없는 제3자의 정보입니다.
       * 한 번 색인되면 페이지를 지워도 검색 결과에는 한동안 남습니다.
       *
       * - noindex   : 검색 결과에 넣지 않는다
       * - nofollow  : 이 페이지의 링크를 따라가지 않는다
       * - noarchive : 캐시(저장된 페이지) 사본을 보여주지 않는다
       *
       * robots.txt 로 막지 않는 이유: 크롤링을 차단하면 크롤러가 이 태그 자체를 못 읽어
       * 외부 링크만으로 URL 이 색인될 수 있습니다. **읽게 두고 넣지 말라고 해야** 확실합니다.
       *
       * 메인 사이트(apps/site)에는 넣으면 안 됩니다 — 검색 유입이 필요합니다.
       * 이 앱은 `base: '/i/'` 로 뷰어에만 얹히므로 여기 넣으면 청첩장에만 적용됩니다.
       *
       * 카카오톡 공유 미리보기는 영향받지 않습니다 (검색엔진이 아니라 og 태그만 읽습니다).
       */
      {
        tag: 'meta',
        attrs: { name: 'robots', content: 'noindex, nofollow, noarchive' },
        injectTo: 'head' as const,
      },
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
