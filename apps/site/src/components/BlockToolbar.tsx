/**
 * 미리보기 바로 아래 문구 툴바 — 고른 문구의 **색·정렬·글씨체·크기**를 여기서 바꿉니다.
 *
 * ─── 왜 미리보기 아래인가 ────────────────────────────────────────────────────
 *
 * 예전에는 폼 안에 문구 목록이 또 있었습니다(입력칸·역할·스타일). 글자는 미리보기에서
 * 직접 고칠 수 있게 됐는데 폼에도 같은 입력칸이 있으니 **같은 일을 하는 자리가 두 곳**이
 * 됐습니다. 어느 쪽이 원본인지 헷갈리고, 폼을 고치면서 눈은 미리보기를 봐야 했습니다.
 *
 * 그래서 문구 편집은 미리보기 한 곳으로 모읍니다:
 *   · **글자** — 미리보기에서 눌러서 바로 타이핑 (`CardText` 의 contentEditable)
 *   · **위치** — 손잡이(⠿)를 끌어서 (`blockDrag.ts`)
 *   · **서식** — 누른 직후 여기(미리보기 바로 아래)에서
 *
 * ─── 두 가지 문구를 함께 다룹니다 ─────────────────────────────────────────────
 *
 * 🔴 **카드 문구**(`core.sectionText`, zone `head`·`foot`)와 **커버 문구**(`core.cover.layers`,
 *    zone `layer`)는 저장 형태가 다릅니다. 그래도 **사용자에게는 같은 '문구'** 입니다 —
 *    누르면 이 툴바가 잡아야 합니다. 예전에는 커버 문구를 눌러도 툴바가 **직전에 고른 카드
 *    문구를 계속 잡고 있어서**, 글씨체·크기를 바꾸면 화면에 안 보이는 다른 문구가 바뀌었습니다
 *    (사용자에게는 "만져도 미리보기가 안 바뀐다" 로 보입니다).
 *
 * 두 모양의 차이:
 *   · 카드 문구 — 값이 없으면 **디자인 기본**. 그래서 '디자인 글꼴' 같은 되돌리는 길을 둡니다.
 *   · 커버 문구 — 사진 위 자유 배치라 글꼴·색·크기·정렬이 **항상 자기 값**을 가집니다.
 *     크기도 배율(em)이 아니라 청첩장 폭 기준 비율입니다 (`LAYER_SIZE_RANGE`).
 */
import { useMemo, useState } from 'react';
import {
  COVER_ZONE,
  FONT_GROUPS,
  FONT_CATEGORY_LABEL,
  FONTS,
  LAYER_SIZE_RANGE,
  SECTION_TEXT_SCALE_RANGE,
  createSectionBlock,
  normalizeSectionText,
  sectionBlocks,
  type LayerAlign,
  type LayerFont,
  type SectionBlock,
  type SectionBlocks,
  type SectionKey,
  type SectionTextAlign,
  type SectionTextMap,
  type SectionZone,
  type TextLayer,
  type ThemeId,
} from '@luvi/schema';
import { ColorControl } from '@/components/ColorControl';

const ALIGNS: { value: SectionTextAlign; label: string; title: string }[] = [
  { value: 'left', label: '⇤', title: '왼쪽' },
  { value: 'center', label: '↔', title: '가운데' },
  { value: 'right', label: '⇥', title: '오른쪽' },
];

export interface BlockTarget {
  section: SectionKey;
  /** `head`·`foot` = 카드 문구 · `layer` = 커버 문구(자유 배치) */
  zone: SectionZone | typeof COVER_ZONE;
  id: string;
}

interface Props {
  themeId: ThemeId;
  /** 지금 고른 문구 (미리보기에서 누른 것) */
  target: BlockTarget | null;
  /** 지금 편집 중인 카드 — 문구를 새로 추가할 대상 */
  addTo: SectionKey | null;
  /** 카드 이름 (예: '방명록') */
  addToLabel?: string;
  stored: SectionTextMap;
  onChange: (section: SectionKey, next: Required<SectionBlocks>) => void;
  onSelect: (target: BlockTarget | null) => void;
  /** 커버 문구 — 위 주석의 '두 가지 문구' 참고 */
  layers: TextLayer[];
  onPatchLayer: (layerId: string, patch: Partial<TextLayer>) => void;
  onRemoveLayer: (layerId: string) => void;
  onAddLayer: () => void;
}

/** 툴바 한 줄을 감싸는 껍데기 — 어떤 문구를 고르든 같은 자리·같은 높이여야 합니다 */
function Shell({ children }: { children: React.ReactNode }) {
  return <div className="flex-none border-t border-line bg-surface px-2 py-1.5">{children}</div>;
}

const SELECT_CLASS =
  'min-w-0 flex-1 rounded-md border border-line bg-white px-1.5 py-1 text-[11.5px] outline-none';

/** 글씨체 고르기. `allowDefault` 는 '디자인 글꼴로 되돌리기' 를 열어둡니다 (카드 문구 전용) */
function FontSelect({
  value,
  allowDefault,
  onPick,
}: {
  value: string;
  allowDefault: boolean;
  onPick: (font: LayerFont | null) => void;
}) {
  return (
    <select
      aria-label="글씨체"
      value={value}
      onChange={(e) => onPick(e.target.value ? (e.target.value as LayerFont) : null)}
      className={SELECT_CLASS}
    >
      {allowDefault && <option value="">디자인 글꼴</option>}
      {FONT_GROUPS.map((g) => (
        <option key={g.category} disabled>
          ── {FONT_CATEGORY_LABEL[g.category]}
        </option>
      ))}
      {FONT_GROUPS.flatMap((g) =>
        g.fonts.map((f) => (
          <option key={f} value={f}>
            {FONTS[f].label}
          </option>
        )),
      )}
    </select>
  );
}

/** 정렬 3칸. `onPick(null)` 은 '디자인 기본으로' (카드 문구에서 같은 것을 다시 누를 때) */
function AlignButtons({
  value,
  clearable,
  onPick,
}: {
  value: string | undefined;
  clearable: boolean;
  onPick: (align: SectionTextAlign | null) => void;
}) {
  return (
    <div className="flex flex-none overflow-hidden rounded-md border border-line">
      {ALIGNS.map((a) => (
        <button
          key={a.value}
          type="button"
          title={a.title}
          onClick={() => onPick(clearable && value === a.value ? null : a.value)}
          className={`px-2 py-1 text-[12px] ${
            value === a.value ? 'bg-cream font-semibold text-gold-deep' : 'bg-white text-muted'
          }`}
        >
          {a.label}
        </button>
      ))}
    </div>
  );
}

/**
 * 고른 문구의 글자 (라벨용).
 *
 * 굵게·기울임은 값 안의 태그로 저장되므로 라벨에서는 벗겨 보여줍니다 — 태그가 그대로
 * 보이면 사용자는 자기가 그런 글자를 적은 줄 압니다. 스키마의 변환 함수를 쓰지 않고
 * 여기서 지우는 이유: 라벨은 **보여주기 전용**이라 저장 형태를 알 필요가 없습니다.
 */
const plainLabel = (text: string) => text.replace(/<[^>]*>/g, '').trim();

function Label({ text }: { text: string }) {
  return (
    <span className="max-w-[110px] flex-none truncate text-[11px] text-muted">
      {plainLabel(text) || '(빈 문구)'}
    </span>
  );
}

const trashClass =
  'flex-none rounded-md px-1.5 py-1 text-[13px] text-muted-faint hover:text-gold-deep';
const addClass =
  'flex-none rounded-full border border-line-strong bg-white px-2.5 py-1 text-[11px] text-ink-soft';

export function BlockToolbar({
  themeId,
  target,
  addTo,
  addToLabel,
  stored,
  onChange,
  onSelect,
  layers,
  onPatchLayer,
  onRemoveLayer,
  onAddLayer,
}: Props) {
  const [openColor, setOpenColor] = useState(false);

  const normalized = useMemo(() => normalizeSectionText(stored), [stored]);
  const cardSection = target && target.zone !== COVER_ZONE ? target.section : addTo;
  const blocks = useMemo(
    () => (cardSection ? sectionBlocks(themeId, cardSection, normalized) : null),
    [themeId, cardSection, normalized],
  );

  /* ───────────────── 커버 문구 (자유 배치 레이어) ───────────────── */
  if (target?.zone === COVER_ZONE) {
    const layer = layers.find((l) => l.id === target.id) ?? null;
    // 방금 지운 문구를 계속 잡고 있으면 빈 컨트롤이 남습니다
    if (!layer) {
      return (
        <Shell>
          <div className="flex items-center gap-2 px-1 py-0.5">
            <span className="text-[11.5px] text-muted">
              미리보기의 글자를 누르면 색·정렬·글씨체를 바꿀 수 있어요
            </span>
            <button type="button" onClick={onAddLayer} className={`ml-auto ${addClass}`}>
              + 커버에 문구 추가
            </button>
          </div>
        </Shell>
      );
    }

    return (
      <Shell>
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <Label text={layer.text} />

            {/* 커버 문구는 언제나 자기 글꼴을 가집니다 — '디자인 글꼴' 로 되돌릴 대상이 없습니다 */}
            <FontSelect
              value={layer.font}
              allowDefault={false}
              onPick={(font) => font && onPatchLayer(layer.id, { font })}
            />

            <AlignButtons
              value={layer.align}
              clearable={false}
              onPick={(align) => align && onPatchLayer(layer.id, { align: align as LayerAlign })}
            />

            <button
              type="button"
              title="색"
              onClick={() => setOpenColor((v) => !v)}
              className={`flex flex-none items-center gap-1 rounded-md border px-2 py-1 text-[11.5px] ${
                openColor ? 'border-gold bg-cream text-gold-deep' : 'border-line bg-white text-muted'
              }`}
            >
              <span
                className="size-3 flex-none rounded-full border border-line-strong"
                style={{ background: layer.color }}
              />
              색
            </button>

            {/* 커버 크기는 배율이 아니라 청첩장 폭 기준 비율입니다 (화면 폭이 달라도 같은 비율) */}
            <label className="flex flex-none items-center gap-1 text-[11px] text-muted">
              크기
              <input
                type="range"
                aria-label="크기"
                min={LAYER_SIZE_RANGE.min * 1000}
                max={LAYER_SIZE_RANGE.max * 1000}
                step={5}
                value={layer.size * 1000}
                onChange={(e) => onPatchLayer(layer.id, { size: Number(e.target.value) / 1000 })}
                className="w-[70px] accent-gold"
              />
            </label>

            {/* 그림자 — 밝은 사진 위에 흰 글씨를 얹었을 때 읽히게 합니다 */}
            <button
              type="button"
              onClick={() => onPatchLayer(layer.id, { shadow: !layer.shadow })}
              className={`flex-none rounded-md px-2 py-1 text-[11px] ${
                layer.shadow ? 'bg-ink text-paper-soft' : 'border border-line bg-white text-muted'
              }`}
            >
              그림자
            </button>

            <button
              type="button"
              onClick={() => {
                onRemoveLayer(layer.id);
                onSelect(null);
              }}
              title="이 문구 제거"
              className={trashClass}
            >
              🗑
            </button>

            <button type="button" onClick={onAddLayer} className={addClass}>
              + 문구
            </button>
          </div>

          {openColor && (
            <ColorControl
              value={layer.color}
              onChange={(color) => onPatchLayer(layer.id, { color })}
            />
          )}
        </div>
      </Shell>
    );
  }

  /* ───────────────── 카드 문구 (head · foot) ───────────────── */
  /**
   * 여기부터의 대상은 **카드 문구뿐**입니다 (커버는 위에서 처리하고 돌아갔습니다).
   * 좁힌 값을 따로 두는 이유: 아래 콜백들은 나중에 불리므로 타입 좁힘이 유지되지 않습니다.
   */
  const cardTarget: { section: SectionKey; zone: SectionZone; id: string } | null = target
    ? { section: target.section, zone: target.zone, id: target.id }
    : null;

  const block: SectionBlock | null =
    (cardTarget && blocks ? blocks[cardTarget.zone].find((b) => b.id === cardTarget.id) : null) ??
    null;

  if (!cardSection || !blocks) return null;

  /** 고른 문구 한 줄만 바꿔 카드 전체를 다시 씁니다 (배열은 통째로 저장됩니다) */
  const patch = (next: Partial<SectionBlock>, remove: (keyof SectionBlock)[] = []) => {
    if (!cardTarget) return;
    onChange(cardSection, {
      ...blocks,
      [cardTarget.zone]: blocks[cardTarget.zone].map((b) => {
        if (b.id !== cardTarget.id) return b;
        const merged = { ...b, ...next };
        for (const k of remove) delete merged[k];
        return merged;
      }),
    } as Required<SectionBlocks>);
  };

  const remove = () => {
    if (!cardTarget) return;
    onChange(cardSection, {
      ...blocks,
      [cardTarget.zone]: blocks[cardTarget.zone].filter((b) => b.id !== cardTarget.id),
    } as Required<SectionBlocks>);
    onSelect(null);
  };

  const add = () => {
    const created = createSectionBlock('note', '새 문구');
    onChange(cardSection, { ...blocks, head: [...blocks.head, created] });
    onSelect({ section: cardSection, zone: 'head', id: created.id });
  };

  return (
    <Shell>
      {!block ? (
        <div className="flex items-center gap-2 px-1 py-0.5">
          <span className="text-[11.5px] text-muted">
            미리보기의 글자를 누르면 색·정렬·글씨체를 바꿀 수 있어요 · 굵게 ⌘/Ctrl+B · 기울임
            ⌘/Ctrl+I
          </span>
          {addTo && (
            <button type="button" onClick={add} className={`ml-auto ${addClass}`}>
              + {addToLabel ?? '카드'}에 문구 추가
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <Label text={block.text} />

            {/* 글씨체 — 커버 문구와 같은 목록입니다 (한 곳에서 늘립니다: schema 의 fonts.ts) */}
            <FontSelect
              value={block.font ?? ''}
              allowDefault
              onPick={(font) => (font ? patch({ font }) : patch({}, ['font']))}
            />

            {/* 정렬 — 같은 것을 다시 누르면 디자인 기본으로 */}
            <AlignButtons
              value={block.align}
              clearable
              onPick={(align) => (align ? patch({ align }) : patch({}, ['align']))}
            />

            {/* 색 — 고르는 UI 가 커서 필요할 때만 펼칩니다 */}
            <button
              type="button"
              title="색"
              onClick={() => setOpenColor((v) => !v)}
              className={`flex flex-none items-center gap-1 rounded-md border px-2 py-1 text-[11.5px] ${
                openColor ? 'border-gold bg-cream text-gold-deep' : 'border-line bg-white text-muted'
              }`}
            >
              <span
                className="size-3 flex-none rounded-full border border-line-strong"
                style={{ background: block.color || 'transparent' }}
              />
              색
            </button>

            <label className="flex flex-none items-center gap-1 text-[11px] text-muted">
              크기
              <input
                type="range"
                aria-label="크기"
                min={SECTION_TEXT_SCALE_RANGE.min * 100}
                max={SECTION_TEXT_SCALE_RANGE.max * 100}
                step={SECTION_TEXT_SCALE_RANGE.step * 100}
                value={(block.scale ?? 1) * 100}
                onChange={(e) => patch({ scale: Number(e.target.value) / 100 })}
                className="w-[70px] accent-gold"
              />
            </label>

            {/* 자유 배치를 되돌리는 길 — 끌어서 옮긴 뒤 원래 흐름으로 */}
            {block.pos && (
              <button
                type="button"
                onClick={() => patch({}, ['pos'])}
                title="원래 자리(흐름)로 되돌리기"
                className="flex-none rounded-md border border-line bg-white px-2 py-1 text-[11px] text-muted"
              >
                흐름으로
              </button>
            )}

            <button type="button" onClick={remove} title="이 문구 제거" className={trashClass}>
              🗑
            </button>

            <button type="button" onClick={add} className={addClass}>
              + 문구
            </button>
          </div>

          {openColor && (
            <ColorControl
              value={block.color ?? ''}
              onChange={(color) => patch({ color })}
              onClear={() => patch({}, ['color'])}
              clearLabel="디자인 기본"
            />
          )}
        </div>
      )}
    </Shell>
  );
}
