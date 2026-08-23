/**
 * 미리보기 바로 아래 문구 툴바 — 고른 문구의 **색·정렬·글씨체**를 여기서 바꿉니다.
 *
 * ─── 왜 미리보기 아래인가 ────────────────────────────────────────────────────
 *
 * 예전에는 왼쪽 폼 안에 문구 목록이 또 있었습니다(입력칸·역할·스타일). 글자는 미리보기에서
 * 직접 고칠 수 있게 됐는데 왼쪽에도 같은 입력칸이 있으니 **같은 일을 하는 자리가 두 곳**이
 * 됐습니다. 어느 쪽이 원본인지 헷갈리고, 왼쪽을 고치면 눈은 오른쪽을 봐야 했습니다.
 *
 * 그래서 문구 편집은 미리보기 한 곳으로 모읍니다:
 *   · **글자** — 미리보기에서 눌러서 바로 타이핑 (`CardText` 의 contentEditable)
 *   · **위치** — 손잡이(⠿)를 끌어서 (`blockDrag.ts`)
 *   · **서식** — 누른 직후 여기(미리보기 바로 아래)에서
 *
 * 🔴 값을 고르지 않은 항목은 **저장하지 않습니다.** 색·정렬·글씨체를 안 고른 문구는
 *    디자인을 따라가야, 나중에 디자인을 바꿨을 때 손대지 않은 문구가 같이 바뀝니다.
 *    그래서 각 컨트롤에 '디자인 기본' 으로 되돌리는 길을 함께 둡니다.
 */
import { useMemo, useState } from 'react';
import {
  FONT_GROUPS,
  FONT_CATEGORY_LABEL,
  FONTS,
  SECTION_TEXT_SCALE_RANGE,
  createSectionBlock,
  normalizeSectionText,
  sectionBlocks,
  type LayerFont,
  type SectionBlock,
  type SectionBlocks,
  type SectionKey,
  type SectionTextAlign,
  type SectionTextMap,
  type SectionZone,
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
  zone: SectionZone;
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
}

export function BlockToolbar({
  themeId,
  target,
  addTo,
  addToLabel,
  stored,
  onChange,
  onSelect,
}: Props) {
  const [openColor, setOpenColor] = useState(false);

  const normalized = useMemo(() => normalizeSectionText(stored), [stored]);
  const section = target?.section ?? addTo;
  const blocks = useMemo(
    () => (section ? sectionBlocks(themeId, section, normalized) : null),
    [themeId, section, normalized],
  );
  const block: SectionBlock | null =
    (target && blocks ? blocks[target.zone].find((b) => b.id === target.id) : null) ?? null;

  if (!section || !blocks) return null;

  /** 고른 문구 한 줄만 바꿔 카드 전체를 다시 씁니다 (배열은 통째로 저장됩니다) */
  const patch = (next: Partial<SectionBlock>, remove: (keyof SectionBlock)[] = []) => {
    if (!target) return;
    onChange(section, {
      ...blocks,
      [target.zone]: blocks[target.zone].map((b) => {
        if (b.id !== target.id) return b;
        const merged = { ...b, ...next };
        for (const k of remove) delete merged[k];
        return merged;
      }),
    } as Required<SectionBlocks>);
  };

  const remove = () => {
    if (!target) return;
    onChange(section, {
      ...blocks,
      [target.zone]: blocks[target.zone].filter((b) => b.id !== target.id),
    } as Required<SectionBlocks>);
    onSelect(null);
  };

  const add = () => {
    const created = createSectionBlock('note', '새 문구');
    onChange(section, { ...blocks, head: [...blocks.head, created] });
    onSelect({ section, zone: 'head', id: created.id });
  };

  return (
    <div className="flex-none border-t border-line bg-surface px-2 py-1.5">
      {!block ? (
        <div className="flex items-center gap-2 px-1 py-0.5">
          <span className="text-[11.5px] text-muted">
            미리보기의 글자를 누르면 색·정렬·글씨체를 바꿀 수 있어요
          </span>
          {addTo && (
            <button
              type="button"
              onClick={add}
              className="ml-auto flex-none rounded-full border border-line-strong bg-white px-2.5 py-1 text-[11px] text-ink-soft"
            >
              + {addToLabel ?? '카드'}에 문구 추가
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="max-w-[110px] flex-none truncate text-[11px] text-muted">
              {block.text.trim() || '(빈 문구)'}
            </span>

            {/* 글씨체 — 커버 문구와 같은 목록입니다 (한 곳에서 늘립니다: schema 의 fonts.ts) */}
            <select
              aria-label="글씨체"
              value={block.font ?? ''}
              onChange={(e) =>
                e.target.value
                  ? patch({ font: e.target.value as LayerFont })
                  : patch({}, ['font'])
              }
              className="min-w-0 flex-1 rounded-md border border-line bg-white px-1.5 py-1 text-[11.5px] outline-none"
            >
              <option value="">디자인 글꼴</option>
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

            {/* 정렬 — 같은 것을 다시 누르면 디자인 기본으로 */}
            <div className="flex flex-none overflow-hidden rounded-md border border-line">
              {ALIGNS.map((a) => (
                <button
                  key={a.value}
                  type="button"
                  title={a.title}
                  onClick={() =>
                    block.align === a.value ? patch({}, ['align']) : patch({ align: a.value })
                  }
                  className={`px-2 py-1 text-[12px] ${
                    block.align === a.value
                      ? 'bg-cream font-semibold text-gold-deep'
                      : 'bg-white text-muted'
                  }`}
                >
                  {a.label}
                </button>
              ))}
            </div>

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
                min={SECTION_TEXT_SCALE_RANGE.min * 100}
                max={SECTION_TEXT_SCALE_RANGE.max * 100}
                step={SECTION_TEXT_SCALE_RANGE.step * 100}
                value={(block.scale ?? 1) * 100}
                onChange={(e) => patch({ scale: Number(e.target.value) / 100 })}
                className="w-[70px]"
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

            <button
              type="button"
              onClick={remove}
              title="이 문구 제거"
              className="flex-none rounded-md px-1.5 py-1 text-[13px] text-muted-faint hover:text-gold-deep"
            >
              🗑
            </button>

            <button
              type="button"
              onClick={add}
              className="flex-none rounded-full border border-line-strong bg-white px-2.5 py-1 text-[11px] text-ink-soft"
            >
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
    </div>
  );
}
