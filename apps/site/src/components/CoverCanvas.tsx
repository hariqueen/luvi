/**
 * 커버 편집 캔버스 — 사진 위 텍스트를 자유 배치합니다.
 *
 * 구현에서 신경 쓴 것 (여기를 대충 하면 못 쓰는 기능이 됩니다):
 *
 *  1. **좌표를 비율로 저장** — 에디터의 프레임 폭과 하객의 실제 폰 폭이 다릅니다.
 *     px 로 저장하면 하객 화면에서 위치가 어긋납니다. (`@luvi/schema` 의 `layers.ts`)
 *  2. **탭과 드래그를 구분** — 탭은 문구 편집, 드래그는 이동. 손가락은 가만히 있어도
 *     몇 px 흔들리므로 임계값(6px)을 둡니다.
 *  3. **`setPointerCapture`** — 빠르게 끌면 포인터가 요소를 벗어나는데, 캡처를 안 하면
 *     드래그가 중간에 끊깁니다.
 *  4. **`touch-action: none`** — 없으면 모바일에서 드래그가 페이지 스크롤로 먹힙니다.
 *  5. **캔버스 밖으로 못 나가게 클램프** — 텍스트를 잃어버리면 되찾을 방법이 없습니다.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FONT_STACK,
  alignTransform,
  layerToPx,
  pxToLayerPosition,
  type TextLayer,
} from '@luvi/schema';

/** 이 거리를 넘어야 드래그로 본다 (px) */
const DRAG_THRESHOLD = 6;

interface Props {
  /** 배경 사진 URL. 없으면 "사진 먼저" 안내를 띄운다 */
  photoUrl: string | null;
  layers: TextLayer[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onChange: (id: string, patch: Partial<TextLayer>) => void;
  /** 이미 선택된 레이어를 다시 탭하면 문구 편집 */
  onEditText: (id: string) => void;
  onPickPhoto: () => void;
  onAddText: () => void;
}

export function CoverCanvas({
  photoUrl,
  layers,
  selectedId,
  onSelect,
  onChange,
  onEditText,
  onPickPhoto,
  onAddText,
}: Props) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  /** 캔버스 실측. 창 크기·시트 높이가 바뀌면 다시 재야 한다 */
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  /** 드래그 중 상태. 리렌더를 유발하지 않게 ref 에 둔다 */
  const drag = useRef<{
    id: string;
    startX: number;
    startY: number;
    originLeft: number;
    originTop: number;
    moved: boolean;
  } | null>(null);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, layer: TextLayer) => {
      e.stopPropagation();
      const px = layerToPx(layer, size);
      drag.current = {
        id: layer.id,
        startX: e.clientX,
        startY: e.clientY,
        originLeft: px.left,
        originTop: px.top,
        moved: false,
      };
      // 빠르게 끌 때 포인터가 요소를 벗어나도 이벤트를 계속 받는다
      e.currentTarget.setPointerCapture(e.pointerId);
      onSelect(layer.id);
    },
    [size, onSelect],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const d = drag.current;
      if (!d) return;

      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;

      if (!d.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      d.moved = true;

      const next = pxToLayerPosition(
        { left: d.originLeft + dx, top: d.originTop + dy },
        size,
      );
      onChange(d.id, next);
    },
    [size, onChange],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      const d = drag.current;
      drag.current = null;
      if (!d) return;

      e.currentTarget.releasePointerCapture?.(e.pointerId);
      // 움직이지 않았으면 탭 — 이미 선택된 레이어였다면 문구 편집으로 들어간다
      if (!d.moved && selectedId === d.id) onEditText(d.id);
    },
    [selectedId, onEditText],
  );

  // ── 사진이 없으면 편집 자체를 막는다 ──
  if (!photoUrl) {
    return (
      <div className="relative h-full w-full overflow-hidden bg-ink-deep">
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center">
          <div>
            <p className="font-script text-[30px] leading-none text-gold">Start here</p>
            <p className="mt-2 text-sm font-semibold text-paper">대표 사진을 먼저 골라주세요</p>
          </div>
          <button
            type="button"
            onClick={onPickPhoto}
            className="rounded-full bg-paper px-5 py-2.5 text-[12.5px] font-semibold text-ink-deep"
          >
            앨범에서 올리기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={canvasRef}
      // touch-action:none 이 없으면 모바일에서 드래그가 페이지 스크롤로 먹힌다
      className="relative h-full w-full touch-none select-none overflow-hidden bg-ink-deep"
      onPointerDown={() => onSelect(null)}
      style={{
        backgroundImage: `url(${photoUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {layers.map((layer) => {
        const px = layerToPx(layer, size);
        const selected = layer.id === selectedId;

        return (
          <div
            key={layer.id}
            role="button"
            tabIndex={0}
            onPointerDown={(e) => handlePointerDown(e, layer)}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className={`absolute cursor-move whitespace-pre-wrap ${
              selected ? 'outline-dashed outline-2 outline-offset-4 outline-gold' : ''
            }`}
            style={{
              left: px.left,
              top: px.top,
              transform: alignTransform(layer.align),
              fontSize: px.fontSize,
              fontFamily: FONT_STACK[layer.font],
              fontWeight: layer.weight,
              lineHeight: layer.lineHeight,
              letterSpacing: `${layer.letterSpacing}em`,
              color: layer.color,
              textAlign: layer.align,
              // 밝은 사진에 흰 글씨를 얹었을 때 안 보이는 걸 막는 최소 보정
              textShadow: layer.shadow ? '0 1px 12px rgba(0,0,0,.45)' : 'none',
              maxWidth: '86%',
            }}
          >
            {layer.text || '문구를 입력하세요'}
          </div>
        );
      })}

      {layers.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3">
          <button
            type="button"
            onClick={onAddText}
            className="pointer-events-auto rounded-full border border-paper/30 bg-ink-deep/75 px-5 py-3 text-[13px] text-paper"
          >
            + 텍스트 추가
          </button>
          <span className="rounded-full bg-surface/70 px-2.5 py-1 text-[11px] text-ink-soft">
            사진만 둬도 됩니다
          </span>
        </div>
      )}
    </div>
  );
}
