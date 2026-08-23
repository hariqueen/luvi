/**
 * 디자인 산출물의 스크롤 연출 두 가지를 코드로 옮긴 훅들.
 *
 * 산출물(`(저장소 루트)/docs/design/Luvi.dc.html`)은 섹션에 `data-reveal`,
 * 브랜드 필름 패널에 `data-art` / `data-art-bg` 를 달아두고 support.js 가 관찰합니다.
 * 같은 표시(marker)를 그대로 쓰되 관찰만 여기서 합니다 — 화면 컴포넌트는 속성만 달면 되고,
 * 섹션이 몇 개로 쪼개지든 훅을 한 번만 부르면 됩니다.
 */
import { useEffect } from 'react';

const REVEALED = 'is-revealed';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * `[data-reveal]` 요소가 뷰포트에 들어올 때 `.is-revealed` 를 붙입니다 (실제 전환은 CSS).
 *
 * 한 번 나타난 요소는 다시 숨기지 않습니다 — 되돌아 스크롤할 때마다 깜빡이면 산만합니다.
 * IntersectionObserver 를 못 쓰는 환경에서는 전부 즉시 노출합니다. 내용이 사라지는 편보다
 * 연출이 없는 편이 낫습니다.
 */
export function useReveal() {
  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>(`[data-reveal]`));
    if (!nodes.length) return;

    if (!('IntersectionObserver' in window)) {
      nodes.forEach((el) => el.classList.add(REVEALED));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add(REVEALED);
          io.unobserve(entry.target);
        }
      },
      // 아래쪽 여백을 깎아 "화면에 조금 들어온" 시점이 아니라 제대로 보일 때 시작합니다
      { rootMargin: '0px 0px -10% 0px', threshold: 0.06 },
    );

    nodes.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

/**
 * 브랜드 필름 배경의 얕은 패럴랙스.
 *
 * 필름 패널은 sticky 로 겹쳐 쌓입니다. 카피가 고정돼 있는 동안 배경만 천천히 밀어야
 * 화면이 멈춘 것처럼 보이지 않습니다. sticky 요소는 스크롤 중 자기 rect 가 고정되므로
 * 진행률은 패널이 아니라 **바깥 트랙**의 위치에서 계산합니다.
 */
export function useArtParallax() {
  useEffect(() => {
    if (prefersReducedMotion()) return;

    const panels = Array.from(document.querySelectorAll<HTMLElement>('[data-art]'));
    const track = panels[0]?.parentElement;
    if (!track) return;

    let raf = 0;
    const paint = () => {
      raf = 0;
      // 트랙은 sticky 가 아니므로 rect 가 정직합니다 → 문서 기준 시작점을 여기서 얻습니다
      const trackTop = track.getBoundingClientRect().top + window.scrollY;
      let panelTop = trackTop;

      for (const panel of panels) {
        const height = panel.offsetHeight;
        const bg = panel.querySelector<HTMLElement>('[data-art-bg]');
        if (bg) {
          // 이 패널이 화면에 고정돼 있는 구간에서의 진행률 (0 → 1)
          const progress = Math.min(1, Math.max(0, (window.scrollY - panelTop) / height));
          // inset:-8% 로 위아래 여유를 둔 배경이라 이 정도는 잘리지 않습니다
          bg.style.transform = `translate3d(0,${(progress - 0.5) * 54}px,0)`;
        }
        panelTop += height;
      }
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(paint);
    };

    paint();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);
}
