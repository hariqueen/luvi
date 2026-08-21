/**
 * 갤러리 이미지 확대 보기 — 좌우로 끌어서 다음/이전 사진.
 *
 * 화살표 버튼을 두지 않았습니다. 작은 화면에서 버튼은 사진을 가리고, 하객은 이미 다른 앱에서
 * '끌어서 넘기기'에 익숙합니다. 대신 아래에 "3 / 8" 만 두어 **넘길 것이 남았다는 사실**을
 * 알립니다 (표시가 없으면 한 장만 있는 줄 알고 넘겨보지 않습니다).
 *
 * 구현에서 신경 쓴 것 (여기를 대충 하면 못 쓰는 기능이 됩니다):
 *
 *  1. **탭과 스와이프를 구분** — 탭은 닫기(지금까지의 동작), 끌면 넘기기. 손가락은 가만히
 *     있어도 몇 px 흔들리므로 임계값을 둡니다.
 *  2. **닫기를 `click` 이 아니라 `pointerup` 에서** — 마우스로 끌면 끝에 click 이 함께
 *     발생합니다. onClick 으로 닫으면 사진을 넘긴 직후 창이 닫혀버립니다.
 *  3. **`setPointerCapture`** — 빠르게 끌면 포인터가 요소를 벗어나는데, 캡처를 안 하면
 *     스와이프가 중간에 끊깁니다.
 *  4. **`touch-action: none`** — 없으면 모바일에서 가로 스와이프가 페이지 스크롤로 먹힙니다.
 *  5. **양 끝에서 고무줄** — 더 넘길 게 없다는 것을 움직임으로 알려줍니다.
 *  6. **앞뒤 한 장만 내려받기** — 10장을 한꺼번에 받으면 하객의 데이터를 씁니다.
 */
import { useEffect, useRef, useState } from 'react';

/** 이 거리를 넘어야 스와이프로 본다 (px) */
const DRAG_THRESHOLD = 8;
/** 화면 폭의 이 비율만큼 끌면 다음 사진으로 넘어간다 */
const COMMIT_RATIO = 0.18;
/** 화면이 좁아도 최소한 이만큼은 끌어야 넘어간다 (px) */
const COMMIT_MIN = 44;

interface LightboxProps {
  /** 확대해서 볼 사진들 — 갤러리에 보이는 순서 그대로 */
  images: string[];
  /** 지금 보고 있는 사진. `null` 이면 닫힘 */
  index: number | null;
  onIndexChange: (next: number) => void;
  onClose: () => void;
}

export function Lightbox({ images, index, onIndexChange, onClose }: LightboxProps) {
  /** 끌고 있는 거리(px). 손을 떼면 0 으로 돌아가고 index 가 바뀐다 */
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ startX: number; width: number; moved: boolean } | null>(null);

  // 데스크톱에서는 마우스를 끌지 않고 키보드로도 넘길 수 있어야 한다
  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') onIndexChange(Math.min(index + 1, images.length - 1));
      else if (e.key === 'ArrowLeft') onIndexChange(Math.max(index - 1, 0));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, images.length, onIndexChange, onClose]);

  // 사진이 바뀌면 끌던 값을 버린다 — 키보드로 넘겼을 때 남아 있으면 위치가 어긋난다
  useEffect(() => setDragX(0), [index]);

  const handlePointerDown = (e: React.PointerEvent) => {
    drag.current = {
      startX: e.clientX,
      width: trackRef.current?.clientWidth ?? window.innerWidth,
      moved: false,
    };
    setDragging(true);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* 캡처가 안 되는 환경이어도 스와이프 자체는 동작한다 */
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || index === null) return;

    const dx = e.clientX - d.startX;
    if (!d.moved && Math.abs(dx) < DRAG_THRESHOLD) return;
    d.moved = true;

    // 첫 장에서 오른쪽, 마지막 장에서 왼쪽으로 끌면 저항을 준다
    const atEdge =
      (index === 0 && dx > 0) || (index === images.length - 1 && dx < 0);
    setDragX(atEdge ? dx / 3 : dx);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    setDragging(false);
    try {
      e.currentTarget.releasePointerCapture?.(e.pointerId);
    } catch {
      /* noop */
    }
    if (!d || index === null) return;

    // 끌지 않았으면 그냥 탭 — 지금까지처럼 닫는다
    if (!d.moved) {
      onClose();
      return;
    }

    const dx = e.clientX - d.startX;
    const commit = Math.max(COMMIT_MIN, d.width * COMMIT_RATIO);
    setDragX(0);
    if (dx <= -commit && index < images.length - 1) onIndexChange(index + 1);
    else if (dx >= commit && index > 0) onIndexChange(index - 1);
  };

  if (index === null || images.length === 0) return null;
  const multiple = images.length > 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="사진 크게 보기"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      // touch-action:none 이 없으면 모바일에서 가로 스와이프가 페이지 스크롤로 먹힌다
      className="fixed inset-0 z-[90] flex animate-fadeUp touch-none select-none items-center justify-center"
      style={{
        background: 'rgba(28,24,22,.9)',
        cursor: multiple ? (dragging ? 'grabbing' : 'grab') : 'zoom-out',
      }}
    >
      <div ref={trackRef} className="relative h-full w-full overflow-hidden">
        <div
          className="flex h-full"
          style={{
            transform: `translate3d(calc(${-index * 100}% + ${dragX}px), 0, 0)`,
            // 끌고 있는 동안은 손가락을 그대로 따라와야 한다 (전환을 걸면 늦게 따라온다)
            transition: dragging ? 'none' : 'transform 280ms cubic-bezier(.22,.61,.36,1)',
          }}
        >
          {images.map((src, i) => (
            <div
              key={i}
              className="flex h-full w-full flex-none items-center justify-center p-6"
            >
              {Math.abs(i - index) <= 1 && (
                <img
                  src={src}
                  alt=""
                  draggable={false}
                  className="max-h-[88vh] max-w-full rounded-lg"
                  style={{ boxShadow: '0 20px 48px rgba(28,36,64,0.16)' }}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {multiple && (
        <div className="pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-black/35 px-3 py-1 text-[11.5px] tracking-[0.08em] text-white/90">
          {index + 1} / {images.length}
        </div>
      )}
    </div>
  );
}
