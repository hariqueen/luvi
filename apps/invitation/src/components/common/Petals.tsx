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
import type { PetalRenderItem } from '@/config/invitation.config';

const GOLDEN = 0.618033988749895;
/** 황금비 소수부 — i 가 커져도 값이 고르게 퍼지고, 같은 i 면 항상 같은 값 */
const spread = (i: number, mul: number): number => {
  const v = (i + 1) * GOLDEN * mul;
  return v - Math.floor(v);
};

const DROP_SHADOW = 'drop-shadow(0 2px 3px rgba(0,0,0,.18))';

/**
 * `petalFall` 이 끝날 때 오른쪽으로 밀리는 거리. **index.css 의 키프레임과 같아야 합니다** —
 * 이 값만큼 오른쪽 여유를 비워두지 않으면 낙하 끝에서 이미지가 잘립니다.
 */
const DRIFT_PX = 46;

/**
 * 회전(`rotate(380deg)`)으로 박스 밖으로 삐져나오는 여유 (폭 대비 비율).
 *
 * 정사각형이 45° 돌면 폭의 약 21% 가 양옆으로 튀어나옵니다. 사용자가 올리는 이미지는
 * 세로로 길 수도 있어(1:1.5 까지 감안) 40% 를 비워둡니다. 띠 폭이 320px 여도 이 여유는
 * 20px 이내라 퍼짐이 좁아지지는 않습니다.
 */
const ROTATE_MARGIN = 0.4;

interface PetalsProps {
  /**
   * 떨어질 것들 (아이콘·이미지 섞어서 1~3종). 순서대로 돌려가며 배치합니다.
   *
   * 🔴 **여기 담긴 것만 떨어집니다.** 예전에는 "기본 이미지일 때만 🐾 를 섞는다" 는 규칙이
   *    뷰어 안에 숨어 있어서, 에디터에서 1개를 골랐는데 화면에는 2종류가 떨어졌습니다.
   */
  items: PetalRenderItem[];
  /** 동시에 떨어지는 개수. 0 이면 아무것도 그리지 않습니다 */
  count: number;
}

export function Petals({ items: picked, count }: PetalsProps) {
  const items = useMemo(() => {
    const n = Math.max(0, Math.min(Math.round(count), 40));
    if (picked.length === 0) return [];
    return Array.from({ length: n }, (_, i) => {
      // 고른 것을 순서대로 돌려 씁니다 — 2종을 골랐으면 번갈아, 3종이면 셋씩 반복
      const item = picked[i % picked.length]!;
      const isEmoji = item.kind === 'emoji';
      const duration = 8 + spread(i, 7) * 8; // 8~16초
      // 이모지는 글리프에 여백이 있어 같은 값이면 그림보다 작아 보입니다 — 조금 키웁니다
      const size = isEmoji ? 22 + spread(i, 5) * 16 : 24 + spread(i, 3) * 24;
      /**
       * 가로 위치. **퍼센트만 쓰면 오른쪽 것이 잘립니다** — `left: 92%` 는 이미지의 *왼쪽 끝*이
       * 92% 라는 뜻이어서, 제 몸집(size) + 회전 여유 + 낙하 드리프트만큼 띠 밖으로 나갑니다.
       * 그래서 "띠 폭에서 그만큼 뺀 범위" 안에 비율로 놓습니다. 화면이 좁아도(폭이 확보 폭보다
       * 작아도) `max(0px, …)` 이 음수 left 를 막아 왼쪽으로 삐져나가지 않습니다.
       */
      const margin = Math.round(size * ROTATE_MARGIN);
      const reserve = margin * 2 + Math.round(size) + DRIFT_PX;
      return {
        item,
        left: `calc(${margin}px + ${spread(i, 1).toFixed(4)} * max(0px, 100% - ${reserve}px))`,
        size,
        duration,
        // 음수 delay 로 시작부터 화면 곳곳에 흩어져 있게 합니다
        delay: -spread(i, 11) * duration,
      };
    });
  }, [count, picked]);

  if (items.length === 0) return null;

  /**
   * 낙하가 일어나는 띠. 본문 칼럼(`mx-auto max-w-page`)과 **같은 폭**이어야 합니다.
   *
   * 🔴 `inset-0` 과 `left-1/2` 를 같이 쓰면 폭이 `min(50vw, 430px)` 가 됩니다 — right:0 은
   *    그대로인데 left 만 50% 로 밀리기 때문입니다. 390px 폰에서 띠가 195px 밖에 안 돼
   *    낙하 이미지의 좌우가 `overflow-hidden` 에 잘렸습니다 (2026-08-19 수정).
   *    `inset-y-0` + `w-screen max-w-page` 면 좁은 화면에서는 화면 폭, 넓은 화면에서는
   *    430px 로 본문과 정확히 겹칩니다.
   */
  return (
    <div className="pointer-events-none fixed inset-y-0 left-1/2 z-[60] w-screen max-w-page -translate-x-1/2 overflow-hidden">
      {items.map((p, i) => {
        const style: CSSProperties = {
          position: 'absolute',
          left: p.left,
          top: '-8%',
          animation: `petalFall ${p.duration}s linear ${p.delay}s infinite`,
        };
        return p.item.kind === 'emoji' ? (
          <span key={i} style={{ ...style, fontSize: p.size, lineHeight: 1 }}>
            {p.item.value}
          </span>
        ) : (
          <img
            key={i}
            src={p.item.src}
            alt=""
            style={{ ...style, width: p.size, filter: DROP_SHADOW }}
          />
        );
      })}
    </div>
  );
}
