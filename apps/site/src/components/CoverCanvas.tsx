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
      // 선택은 무슨 일이 있어도 먼저 실행한다 — 아래 setPointerCapture 가 실패해도
      // (일부 환경에서 던짐) 선택/툴바가 뜨지 않는 일이 없어야 한다.
      onSelect(layer.id);
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
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* 캡처 실패해도 선택·드래그에는 지장 없음 */
      }
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

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    try {
      e.currentTarget.releasePointerCapture?.(e.pointerId);
    } catch {
      /* noop */
    }
  }, []);

  // 사진이 없어도 편집을 막지 않는다 — 어두운 배경 위에서 텍스트를 편집하고,
  // 배경 사진은 원할 때 올린다. (뷰어도 사진 없이 텍스트를 렌더하므로 화면이 일치한다)
  return (
    <div
      ref={canvasRef}
      // touch-action:none 이 없으면 모바일에서 드래그가 페이지 스크롤로 먹힌다
      className="relative h-full w-full touch-none select-none overflow-hidden bg-ink-deep"
      onPointerDown={() => onSelect(null)}
      style={
        photoUrl
          ? {
              backgroundImage: `url(${photoUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }
          : { backgroundColor: '#15110f' }
      }
    >
      {/* 배경 사진이 없을 때 — 편집은 그대로 되고, 원하면 사진을 올릴 수 있게 */}
      {!photoUrl && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPickPhoto();
          }}
          className="absolute right-2 top-2 z-10 rounded-full bg-paper/90 px-3 py-1.5 text-[11.5px] font-semibold text-ink-deep"
        >
          + 배경 사진
        </button>
      )}

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
            // 포인터 로직과 별개로 선택/편집을 확실히 보장한다
            onClick={(e) => {
              e.stopPropagation();
              onSelect(layer.id);
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              onEditText(layer.id);
            }}
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
