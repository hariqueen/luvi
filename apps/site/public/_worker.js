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
 *
 * 🔴 **없는 자산에는 절대 장기 캐시를 걸지 않는다** (2026-08-22 발행 화면 사고).
 *    배포가 교체되는 몇 초 사이에 아직 올라가지 않은 청크를 누가 요청하면 Pages 가
 *    SPA 폴백(200 text/html)을 돌려주는데, 여기서 그 응답에 `immutable` 을 달아
 *    **엣지에 1년간 굳어버렸습니다.** 파일은 배포에 있는데도 그 화면만 흰 화면이 되고,
 *    파일 이름이 같으니 재배포로도 낫지 않습니다(캐시 퍼지 아니면 이름을 바꿔야 함).
 *    그래서 자산 경로에 HTML 이 오면 404 + no-store 로 돌려보냅니다 — 굳지 않고,
 *    `lazyPage()` 의 자동 새로고침이 다음 배포본을 받아옵니다.
 */
const IMMUTABLE = 'public, max-age=31536000, immutable';
const hasExt = (p) => /\.[a-zA-Z0-9]+$/.test(p);

/**
 * 🔴 하객 뷰어(/i/*)는 검색 색인에서 통째로 뺀다.
 *    발행된 청첩장에는 양가 부모 실명과 계좌번호가 평문으로 들어 있다.
 *
 *    HTML 에는 빌드 시점에 `<meta name="robots">` 가 박히지만
 *    (`apps/invitation/vite.config.ts`), **사진·오디오는 HTML 이 아니라 메타태그를
 *    넣을 자리가 없다.** 그래서 헤더로 말한다. 메타태그를 파싱하지 않는 크롤러에도
 *    이쪽은 닿으므로 HTML 응답에도 같이 건다(중복은 무해하다).
 *
 *    `noimageindex` 가 사진에 대한 핵심이다 — 이게 없으면 청첩장 사진이
 *    이미지 검색에 걸리는 통로가 열려 있다.
 *
 *    ⚠️ 대신 robots.txt 로 /i/ 를 Disallow 하면 **안 된다.** 크롤링을 막으면 크롤러가
 *       이 헤더 자체를 읽지 못해, 외부 링크만으로 색인되는 것을 오히려 못 막는다.
 */
const NOINDEX = 'noindex, nofollow, noarchive, noimageindex';
const noindex = (r) => {
  const h = new Headers(r.headers);
  h.set('X-Robots-Tag', NOINDEX);
  return new Response(r.body, { status: r.status, headers: h });
};

/**
 * 🔴 지운 고객 사진은 경로째로 거절한다 (2026-08-22).
 *
 * 첫 고객의 실제 사진·반려견 사진 20개를 저장소에서 지웠는데(커밋 5b99f1b), 배포에
 * 없는데도 **apex(luv-ai.co.kr)에서 5개가 계속 200** 으로 나왔습니다 — 같은 배포를
 * 보는 `www.luv-ai.co.kr`·`luvi-site.pages.dev` 는 404 인데 apex 만 그랬고,
 * 존 캐시 전체 퍼지(purge_everything)로도, 새 배포로도 사라지지 않았습니다
 * (Pages 자산 계층에 남은 것으로 보입니다). 남의 사진이 URL 로 열리는 상태를
 * 캐시가 비길 때까지 둘 수 없으니 워커에서 막습니다.
 *
 * 되살릴 이름이 아니므로 410(Gone) 입니다. 이 목록은 그 계층이 비워지면 지워도 됩니다.
 */
const GONE =
  /^\/i\/assets\/(?:couple_c\.jpg|cover\.jpg|dogface_c\.png|dog[1-6]_c\.png|embedded\/(?:img_0(?:0[1-9]|10)\.(?:jpg|png)|audio_001\.mp3))$/;

/**
 * 진입 경로를 브랜드 도메인 하나로 모은다.
 *
 * Pages 는 프로젝트마다 `{name}.pages.dev` 를 자동으로 붙이고 **끄는 옵션이 없다.**
 * 그대로 두면 같은 내용이 두 주소로 열려 검색 순위가 갈리고, 누가 pages.dev 주소를
 * 공유하면 브랜드 주소가 퍼지지 않는다. 지울 수 없으니 301 로 넘긴다.
 *
 * ⚠️ 정확히 이 한 호스트만 본다. `{hash}.luvi-site.pages.dev` 미리보기 배포까지 걸면
 *    배포 전 확인이 막힌다. 그래서 endsWith 가 아니라 === 다.
 *
 * 🔴 인쇄된 QR(`luvi-wedding.pages.dev`)과는 무관하다. 그쪽은 **다른 프로젝트**이고
 *    목적지가 이미 `luv-ai.co.kr/i/hoseok-songhee` 라 이 워커의 이 분기를 타지 않는다.
 */
const CANONICAL_HOST = 'luv-ai.co.kr';
const ALIAS_HOST = 'luvi-site.pages.dev';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const p = url.pathname;

    if (url.hostname === ALIAS_HOST) {
      url.hostname = CANONICAL_HOST; // 경로·쿼리는 그대로 따라간다
      return Response.redirect(url.toString(), 301);
    }

    if (GONE.test(p)) {
      return new Response('gone', { status: 410, headers: { 'Cache-Control': 'no-store' } });
    }
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
      // 자산을 달라고 했는데 HTML 이 왔다 = 그 파일이 없다 (Pages 의 SPA 폴백).
      // 이걸 캐시하면 그 화면이 영구히 흰 화면이 된다 — 캐시하지 말고 404 로 알린다.
      if ((r.headers.get('content-type') ?? '').includes('text/html')) {
        return new Response('asset not found', {
          status: 404,
          headers: { 'Cache-Control': 'no-store' },
        });
      }
      const h = new Headers(r.headers);
      h.set('Cache-Control', IMMUTABLE);
      return new Response(r.body, { status: r.status, headers: h });
    };

    // ── 뷰어(/i/) ── 이 갈래로 나가는 모든 응답에 X-Robots-Tag 를 건다.
    if (p === '/i' || p === '/i/') return noindex(await spa('/i/'));
    if (p.startsWith('/i/')) {
      if (!hasExt(p)) return noindex(await spa('/i/')); // /i/{slug}
      const r = await asset(p);
      return noindex(p.startsWith('/i/assets/') ? immutable(r) : r);
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
