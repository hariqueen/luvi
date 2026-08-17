/**
 * 커버 텍스트 레이어의 좌표 변환과 기본값.
 *
 * 에디터와 뷰어가 **반드시 같은 계산을 써야** 합니다. 한쪽만 바뀌면 편집 화면과
 * 하객이 보는 화면의 텍스트 위치가 달라집니다. 그래서 스키마 패키지에 둡니다.
 */
import type { LayerAlign, TextLayer } from './content';

/** 캔버스 실측 크기 (px) */
export interface CanvasSize {
  width: number;
  height: number;
}

/** 비율 좌표 → 화면 px */
export function layerToPx(layer: TextLayer, canvas: CanvasSize) {
  return {
    left: layer.x * canvas.width,
    top: layer.y * canvas.height,
    /** 폰트 크기는 **폭** 기준이다 — 높이 기준으로 하면 화면 비율이 다를 때 글자가 들쭉날쭉해진다 */
    fontSize: layer.size * canvas.width,
  };
}

/** 0~1 범위로 자른다 */
const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

/**
 * 드래그 결과를 비율로 되돌린다.
 *
 * 캔버스 밖으로 완전히 나가지 않도록 여백을 둡니다 — 텍스트를 잃어버리면
 * 사용자가 되찾을 방법이 없습니다.
 */
export function pxToLayerPosition(
  px: { left: number; top: number },
  canvas: CanvasSize,
): { x: number; y: number } {
  if (canvas.width <= 0 || canvas.height <= 0) return { x: 0.5, y: 0.5 };
  return {
    x: clamp01(px.left / canvas.width),
    y: clamp01(px.top / canvas.height),
  };
}

/** CSS transform 기준점 — align 에 따라 좌표가 가리키는 지점이 달라진다 */
export function alignTransform(align: LayerAlign): string {
  if (align === 'center') return 'translate(-50%, -50%)';
  if (align === 'right') return 'translate(-100%, -50%)';
  return 'translate(0, -50%)';
}

/* 글꼴 목록(FONTS)·스택·라벨·로더는 `fonts.ts` 로 옮겼습니다 — 글꼴을 늘리려면 그쪽을 보세요 */

/** 사진 위에서 안전한 색만 제공합니다 — 아무 색이나 열어두면 안 보이는 조합이 나옵니다 */
export const LAYER_COLORS = [
  { value: '#FFFFFF', label: '흰색' },
  { value: '#1A1917', label: '검정' },
  { value: '#C9A063', label: '골드' },
  { value: '#F7F3EC', label: '아이보리' },
] as const;

export const LAYER_SIZE_RANGE = { min: 0.035, max: 0.16 } as const;

let seq = 0;
/** 레이어 ID. crypto.randomUUID 가 없는 환경도 있어 폴백을 둔다 */
function nextId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  seq += 1;
  return `layer-${seq}`;
}

export function createTextLayer(overrides: Partial<TextLayer> = {}): TextLayer {
  return {
    id: nextId(),
    text: '문구를 입력하세요',
    x: 0.5,
    y: 0.5,
    size: 0.07,
    align: 'center',
    color: '#FFFFFF',
    font: 'sans',
    weight: 500,
    lineHeight: 1.35,
    // 사진 위가 기본 사용처이므로 그림자를 켠 상태로 시작합니다
    shadow: true,
    letterSpacing: 0,
    ...overrides,
  };
}

/**
 * 새 청첩장의 기본 커버 레이어.
 *
 * 빈 사진으로 시작하면 무엇을 해야 할지 알 수 없으므로, 완성된 배치를 먼저 보여주고
 * 문구만 바꾸게 합니다. 이 뒤에 자유롭게 옮길 수 있습니다.
 */
export function defaultCoverLayers(input: {
  eyebrow: string;
  names: string;
  dateLabel: string;
}): TextLayer[] {
  return [
    createTextLayer({
      text: input.eyebrow,
      y: 0.14,
      size: 0.042,
      font: 'script',
      color: '#F7F3EC',
      letterSpacing: 0.04,
      weight: 400,
    }),
    createTextLayer({
      text: input.names,
      y: 0.5,
      size: 0.095,
      font: 'serif',
      weight: 600,
    }),
    createTextLayer({
      text: input.dateLabel,
      y: 0.86,
      size: 0.038,
      color: '#F7F3EC',
      letterSpacing: 0.08,
      weight: 400,
    }),
  ];
}
