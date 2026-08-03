import { useEffect, useState } from 'react';

export interface Countdown {
  d: number;
  h: number;
  m: number;
  s: number;
}

const compute = (target: number): Countdown => {
  let diff = Math.max(0, target - Date.now());
  const d = Math.floor(diff / 86400000);
  diff -= d * 86400000;
  const h = Math.floor(diff / 3600000);
  diff -= h * 3600000;
  const m = Math.floor(diff / 60000);
  diff -= m * 60000;
  const s = Math.floor(diff / 1000);
  return { d, h, m, s };
};

/** 예식까지 남은 D-day/시/분/초를 1초마다 갱신 */
export function useCountdown(weddingAt: string): Countdown {
  const target = new Date(weddingAt).getTime();
  const [cd, setCd] = useState<Countdown>(() => compute(target));

  useEffect(() => {
    const tick = () => setCd(compute(target));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [target]);

  return cd;
}
