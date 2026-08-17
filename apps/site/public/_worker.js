/**
 * Cloudflare Pages Advanced 모드 — 라우팅을 직접 제어한다.
 *
 * 이 프로젝트는 한 배포 안에 **두 개의 SPA**가 산다:
 *   · 메인 사이트(루트)                 → /index.html
 *   · 하객 청첩장 뷰어(base '/i/')       → /i/index.html
 *
 * `_redirects` 의 `/i/* → /i/index.html 200` 서브패스 리라이트가 이 프로젝트에서 적용되지
 * 않아(사이트 폴백 `/*` 이 먼저 이김) 여기서 경로를 직접 갈래낸다:
 *   · /i/{slug}       (확장자 없음) → 뷰어 SPA
 *   · /i/assets/*, 파일             → 그대로 (장기 캐시)
 *   · 그 외 파일 없는 경로          → 사이트 SPA
 */
const IMMUTABLE = 'public, max-age=31536000, immutable';
const hasExt = (p) => /\.[a-zA-Z0-9]+$/.test(p);

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const p = url.pathname;
    const asset = (path) => env.ASSETS.fetch(new Request(new URL(path, url.origin), request));

    // ⚠️ '/i/index.html' 을 직접 요청하면 Pages 가 308(정규화)로 응답해 빈 바디가 된다.
    //    디렉터리 경로('/i/', '/')로 요청해야 인덱스 HTML 본문이 200 으로 온다.
    const spa = async (dirPath) => {
      const r = await asset(dirPath);
      const h = new Headers(r.headers);
      h.set('Cache-Control', 'no-cache');
      return new Response(r.body, { status: 200, headers: h });
    };
    const immutable = (r) => {
      const h = new Headers(r.headers);
      h.set('Cache-Control', IMMUTABLE);
      return new Response(r.body, { status: r.status, headers: h });
    };

    // ── 뷰어(/i/) ──
    if (p === '/i' || p === '/i/') return spa('/i/');
    if (p.startsWith('/i/')) {
      if (!hasExt(p)) return spa('/i/'); // /i/{slug}
      const r = await asset(p);
      return p.startsWith('/i/assets/') ? immutable(r) : r;
    }

    // ── 사이트(루트) ──
    if (!hasExt(p)) {
      const r = await asset(p);
      return r.status === 404 ? spa('/') : r;
    }
    const r = await asset(p);
    return p.startsWith('/assets/') ? immutable(r) : r;
  },
};
