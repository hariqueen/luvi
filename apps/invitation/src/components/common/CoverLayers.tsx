/**
 * 커버의 자유 배치 문구 — **미리보기에서 그 자리에서 고치고, 끌어서 옮깁니다.**
 *
 * 두 디자인(classic1·classic2)이 같은 레이어(`core.cover.layers`)를 그립니다. 예전에는
 * 테마마다 이 렌더를 각자 적어뒀는데, 편집 배선까지 두 번 적으면 한쪽만 고쳐졌을 때
 * "그 디자인에서만 커버 문구가 안 움직인다" 가 됩니다 — 화면은 멀쩡해 보여서 찾기 어렵습니다.
 * 그래서 렌더와 배선을 여기 한 곳에 둡니다 (`PreviewSlot` 과 같은 이유).
 *
 * ─── 왜 두 겹인가 ───────────────────────────────────────────────────────────
 *
 * 바깥 div 가 위치(left/top)와 **정렬 기준점**(`alignTransform`)을 잡고, 안쪽 div 가 글자를
 * 그립니다. 🔴 `blockDrag` 는 끄는 동안 대상 요소의 `transform` 을 직접 덮어씁니다 —
 * 정렬 기준점이 같은 요소에 있으면 그것까지 지워져 문구가 툭 튑니다. 카드 문구(`FreeText`)
 * 도 같은 이유로 두 겹입니다.
 *
 * 좌표는 각 디자인의 **기준 박스**(`data-preview-frame="cover"`) 기준 비율입니다.
 * classic1 은 화면 전체, classic2 는 액자가 기준이라 그 박스에 표시를 답니다.
 */
import { COVER_ZONE, FONT_STACK, alignTransform, layerToPx, type TextLayer } from '@luvi/schema';
import { IS_PREVIEW, notifyBlockEdit } from './PreviewSlot';
import { EditableText } from './Editable';
import { Rich } from './Rich';
import { startBlockDrag } from './blockDrag';

interface Props {
  layers: TextLayer[];
  /** 기준 박스의 실제 픽셀 크기 (테마가 ResizeObserver 로 잰 값) */
  size: { width: number; height: number };
  /** 글자가 박스를 넘지 않게 하는 상한. 디자인마다 여백이 달라 값을 받습니다 */
  maxWidth: string;
}

export function CoverLayers({ layers, size, maxWidth }: Props) {
  return (
    <>
      {layers.map((layer) => {
        const px = layerToPx(layer, size);
        return (
          <div
            key={layer.id}
            className="absolute"
            /* maxWidth 는 여기(절대 배치 요소)에 겁니다 — 기준이 커버 박스가 되어야 합니다.
               안쪽 글자 div 에 걸면 기준이 이 div 의 shrink-to-fit 폭이 되어 글자가 좁게 접힙니다. */
            style={{
              left: px.left,
              top: px.top,
              transform: alignTransform(layer.align),
              maxWidth,
            }}
          >
            <div
              data-preview-block={IS_PREVIEW ? `cover:${COVER_ZONE}:${layer.id}` : undefined}
              className={`whitespace-pre-wrap${
                IS_PREVIEW
                  ? ' group relative rounded-[3px] outline-offset-[3px] hover:outline hover:outline-1 hover:outline-gold/60'
                  : ''
              }`}
              style={{
                fontSize: px.fontSize,
                fontFamily: FONT_STACK[layer.font],
                fontWeight: layer.weight,
                lineHeight: layer.lineHeight,
                letterSpacing: `${layer.letterSpacing}em`,
                color: layer.color,
                textAlign: layer.align,
                textShadow: layer.shadow ? '0 1px 12px rgba(0,0,0,.45)' : 'none',
              }}
            >
              {IS_PREVIEW && (
                // 글자는 눌러서 고치고, 이 손잡이는 끌어서 옮깁니다 (카드 문구와 같은 규칙).
                // 커버는 사진 위라 옅은 금색만으로는 안 보일 수 있어 그림자를 함께 겁니다.
                <span
                  title="끌어서 옮기기"
                  onPointerDown={(e) =>
                    startBlockDrag(e.nativeEvent, {
                      section: 'cover',
                      zone: COVER_ZONE,
                      id: layer.id,
                    })
                  }
                  onClick={(e) => e.stopPropagation()}
                  style={{ touchAction: 'none', textShadow: '0 1px 6px rgba(0,0,0,.6)' }}
                  className="absolute -left-[17px] top-1/2 -translate-y-1/2 cursor-grab select-none text-[12px] font-normal leading-none tracking-normal text-gold opacity-60 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
                >
                  ⠿
                </span>
              )}
              {IS_PREVIEW ? (
                <EditableText
                  text={layer.text}
                  onEdit={(next, final) =>
                    notifyBlockEdit('cover', COVER_ZONE, layer.id, next, final)
                  }
                  onDelete={() => notifyBlockEdit('cover', COVER_ZONE, layer.id, '', true)}
                />
              ) : (
                <Rich text={layer.text} />
              )}
            </div>
          </div>
        );
      })}
    </>
  );
}
