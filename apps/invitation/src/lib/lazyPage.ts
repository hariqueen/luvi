/**
 * 배포 직후의 지연 로딩 실패를 스스로 복구하는 `lazy()`.
 *
 * Cloudflare Pages 는 **현재 배포의 파일만** 서빙합니다. 배포가 교체되는 순간에 열려 있던
 * 탭은 이전 배포의 index.html 을 들고 있어서, 뒤늦게 부르는 청크 이름(`Editor-5dfa3dae.js`
 * 같은)이 새 배포에는 없습니다. Pages 는 없는 경로에 SPA 폴백(index.html)을 200 으로
 * 돌려주므로 브라우저는 "module script 인데 MIME 이 text/html" 이라며 실패하고,
 * 화면은 빈 채로 멈춥니다. (2026-08-19 에디터에서 실제로 두 번 발생 — 하객 화면도 같은 구조입니다)
 *
 * 대책: 실패하면 **한 번만** 새로고침해 새 index.html 을 받습니다. 새로고침으로도 안 되면
 * (네트워크 단절 등) 원래 오류를 그대로 던져 Suspense 경계가 처리하게 둡니다 —
 * 무한 새로고침이 훨씬 나쁩니다.
 *
 * ⚠️ 사이트에도 같은 파일이 있습니다: `apps/site/src/lib/lazyPage.ts`.
 *    한쪽만 고치면 에디터가 빈 채로 남습니다.
 */
import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

const RELOADED = 'luvi:chunk-reloaded';

/** sessionStorage 는 시크릿 모드·차단 설정에서 던질 수 있어 전부 감쌉니다 */
const flag = {
  get: (): boolean => {
    try {
      return sessionStorage.getItem(RELOADED) === '1';
    } catch {
      return false;
    }
  },
  set: (on: boolean): void => {
    try {
      if (on) sessionStorage.setItem(RELOADED, '1');
      else sessionStorage.removeItem(RELOADED);
    } catch {
      /* 저장이 막혀 있으면 자동 복구를 한 번도 못 할 뿐, 동작은 그대로입니다 */
    }
  },
};

// React.lazy 의 시그니처 자체가 ComponentType<any> 라, 이 한 줄만 맞춰줍니다.
// (좁히면 `lazy()` 에 넘길 수 없고, 넓히면 페이지 컴포넌트의 타입이 사라집니다)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyPage<T extends ComponentType<any>>(
  load: () => Promise<{ default: T }>,
): LazyExoticComponent<T> {
  return lazy(() =>
    load().then(
      (mod) => {
        // 한 번 제대로 받았으면 다음 배포에서도 자동 복구가 되도록 표시를 지웁니다
        flag.set(false);
        return mod;
      },
      (err: unknown) => {
        if (flag.get()) throw err;
        flag.set(true);
        window.location.reload();
        // 새로고침이 진행되는 동안은 아무것도 렌더하지 않습니다 (해결되지 않는 Promise)
        return new Promise<{ default: T }>(() => {});
      },
    ),
  );
}
