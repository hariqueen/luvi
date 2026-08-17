/**
 * 화면 위로 떨어지는 연출 (petalFall 키프레임은 index.css).
 *
 * 개수를 에디터에서 조절할 수 있어야 하므로, 예전처럼 9개를 손으로 적어두지 않고
 * 개수만큼 **계산해서** 만듭니다.
 *
 * 🔴 배치는 반드시 **결정적**이어야 합니다. `Math.random()` 을 쓰면 부모가 리렌더될 때마다
 * 위치·속도가 새로 뽑혀 떨어지던 것이 순간이동합니다 (에디터 미리보기는 입력할 때마다
 * 리렌더됩니다). 그래서 황금비 소수부로 겹치지 않게 퍼뜨립니다.
 */
import { useMemo, type CSSProperties } from 'react';

const GOLDEN = 0.618033988749895;
/** 황금비 소수부 — i 가 커져도 값이 고르게 퍼지고, 같은 i 면 항상 같은 값 */
const spread = (i: number, mul: number): number => {
  const v = (i + 1) * GOLDEN * mul;
  return v - Math.floor(v);
};

const DROP_SHADOW = 'drop-shadow(0 2px 3px rgba(0,0,0,.18))';

interface PetalsProps {
  /** 떨어질 이미지 URL */
  image: string;
  /** 동시에 떨어지는 개수. 0 이면 아무것도 그리지 않습니다 */
  count: number;
  /**
   * 사용자가 직접 고른 이미지인지.
   *
   * 기본(=인사말 말풍선 아이콘)일 때는 예전처럼 🐾 발자국을 섞어 강아지 느낌을 살리고,
   * 사용자가 꽃잎 같은 걸 직접 올렸다면 그 이미지만 떨어뜨립니다 — 꽃잎 사이에
   * 발자국이 섞이면 이상합니다.
   */
  custom: boolean;
}

export function Petals({ image, count, custom }: PetalsProps) {
  const items = useMemo(() => {
    const n = Math.max(0, Math.min(Math.round(count), 40));
    return Array.from({ length: n }, (_, i) => {
      // 기본 연출은 이미지와 발자국을 번갈아 (예전 배열도 대략 이 비율이었습니다)
      const isPaw = !custom && i % 2 === 1;
      const duration = 8 + spread(i, 7) * 8; // 8~16초
      return {
        isPaw,
        left: `${(spread(i, 1) * 92 + 2).toFixed(2)}%`,
        size: isPaw ? 16 + spread(i, 5) * 12 : 24 + spread(i, 3) * 24,
        duration,
        // 음수 delay 로 시작부터 화면 곳곳에 흩어져 있게 합니다
        delay: -spread(i, 11) * duration,
      };
    });
  }, [count, custom]);

  if (items.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 left-1/2 z-[60] max-w-page -translate-x-1/2 overflow-hidden">
      {items.map((p, i) => {
        const style: CSSProperties = {
          position: 'absolute',
          left: p.left,
          top: p.isPaw ? '-6%' : '-8%',
          animation: `petalFall ${p.duration}s linear ${p.delay}s infinite`,
        };
        return p.isPaw ? (
          <span key={i} style={{ ...style, fontSize: p.size }}>
            🐾
          </span>
        ) : (
          <img key={i} src={image} alt="" style={{ ...style, width: p.size, filter: DROP_SHADOW }} />
        );
      })}
    </div>
  );
}
