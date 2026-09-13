/**
 * 배포 직후의 지연 로딩 실패를 스스로 복구하는 `lazy()`.
 *
 * Cloudflare Pages 는 **현재 배포의 파일만** 서빙합니다. 배포가 교체되는 순간에 열려 있던
 * 탭은 이전 배포의 index.html 을 들고 있어서, 뒤늦게 부르는 청크 이름이 새 배포에는
 * 없습니다. Pages 는 없는 경로에 SPA 폴백(index.html)을 200 으로 돌려주므로 브라우저는
 * "module script 인데 MIME 이 text/html" 이라며 실패하고 화면이 빈 채로 멈춥니다.
 *
 * 대책: 실패하면 **한 번만** 새로고침해 새 index.html 을 받습니다.
 *
 * ⚠️ 같은 파일이 셋 있습니다: `apps/site` · `apps/invitation` · 여기.
 *    공용 패키지로 빼지 않은 이유는 소비자 앱 두 곳의 주석에 적힌 그대로입니다 —
 *    이 파일은 앱의 진입 실패를 다루므로, 그 자체가 공용 청크에 의존하면 안 됩니다.
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyPage<T extends ComponentType<any>>(
  load: () => Promise<{ default: T }>,
): LazyExoticComponent<T> {
  return lazy(() =>
    load().then(
      (mod) => {
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
