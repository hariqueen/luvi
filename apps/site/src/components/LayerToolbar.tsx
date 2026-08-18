/**
 * 선택된 커버 텍스트의 서식 도구.
 *
 * 캔버스 아래에 붙는 가로 스크롤 바 형태입니다 — 모바일에서 세로 공간을 최소로 쓰고,
 * 손가락이 캔버스를 가리지 않는 위치입니다.
 */
import {
  FONT_CATEGORY_LABEL,
  FONT_GROUPS,
  FONTS,
  LAYER_SIZE_RANGE,
  type LayerAlign,
  type LayerFont,
  type TextLayer,
} from '@luvi/schema';
import { ColorControl } from './ColorControl';

const ALIGNS: { value: LayerAlign; label: string }[] = [
  { value: 'left', label: '⇤' },
  { value: 'center', label: '↔' },
  { value: 'right', label: '⇥' },
];

interface Props {
  layer: TextLayer;
  onChange: (patch: Partial<TextLayer>) => void;
  onEditText: () => void;
  onRemove: () => void;
}

export function LayerToolbar({ layer, onChange, onEditText, onRemove }: Props) {
  return (
    <div className="flex flex-none items-center gap-1.5 overflow-x-auto border-t border-line bg-surface px-3 py-2.5 no-scrollbar">
      <button
        type="button"
        onClick={onEditText}
        className="flex-none rounded-lg bg-ink px-3 py-2 text-[12px] text-paper-soft"
      >
        문구 수정
      </button>

      {/* 글꼴 — 목록은 이름만 기본 서체로 띄웁니다. 고르는 순간 그 글꼴만 받아와
          캔버스의 실제 사진·문구에 반영되므로, 목록 자체는 로딩 비용이 없습니다. */}
      <label className="flex flex-none items-center gap-1.5 rounded-lg bg-surface-sunken px-2 py-1">
        <span className="text-[11px] text-muted">글꼴</span>
        <select
          value={layer.font}
          aria-label="글꼴"
          onChange={(e) => onChange({ font: e.target.value as LayerFont })}
          className="max-w-[150px] rounded-md border border-line bg-white px-2 py-1 text-[13px] outline-none focus:border-gold"
        >
          {FONT_GROUPS.map((group) => (
            <optgroup key={group.category} label={FONT_CATEGORY_LABEL[group.category]}>
              {group.fonts.map((f) => (
                <option key={f} value={f}>
                  {FONTS[f].label}
                  {FONTS[f].latinOnly ? ' (영문 전용)' : ''}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>

      {/* 정렬 — align 은 좌표의 기준점도 바꾼다 */}
      <div className="flex flex-none gap-0.5 rounded-lg bg-surface-sunken p-0.5">
        {ALIGNS.map((a) => (
          <button
            key={a.value}
            type="button"
            aria-label={`${a.value} 정렬`}
            onClick={() => onChange({ align: a.value })}
            className={`rounded-md px-2.5 py-1.5 text-[12px] ${
              layer.align === a.value ? 'bg-white font-semibold shadow-sm' : 'text-ink-soft'
            }`}
          >
            {a.label}
          </button>
        ))}
      </div>

      {/* 색 — 추천 색 · 스포이드(색상표) · HEX 입력. `ColorControl` 참고 */}
      <ColorControl value={layer.color} onChange={(color) => onChange({ color })} />

      {/* 크기 — 비율(0~1)이라 사용자에게는 백분율로 보여준다 */}
      <label className="flex flex-none items-center gap-1.5 rounded-lg bg-surface-sunken px-2.5 py-1.5">
        <span className="text-[11px] text-muted">크기</span>
        <input
          type="range"
          min={LAYER_SIZE_RANGE.min * 1000}
          max={LAYER_SIZE_RANGE.max * 1000}
          value={layer.size * 1000}
          onChange={(e) => onChange({ size: Number(e.target.value) / 1000 })}
          className="w-[72px] accent-gold"
        />
      </label>

      {/* 그림자 — 밝은 사진 위 가독성 보정 */}
      <button
        type="button"
        onClick={() => onChange({ shadow: !layer.shadow })}
        className={`flex-none rounded-lg px-2.5 py-2 text-[11.5px] ${
          layer.shadow ? 'bg-ink text-paper-soft' : 'bg-surface-sunken text-ink-soft'
        }`}
      >
        그림자
      </button>

      <button
        type="button"
        onClick={onRemove}
        className="ml-auto flex-none rounded-lg px-2.5 py-2 text-[11.5px] text-gold-deep"
      >
        삭제
      </button>
    </div>
  );
}
