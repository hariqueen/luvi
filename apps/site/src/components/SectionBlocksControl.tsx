/**
 * 카드 문구 편집 — 문구를 **넣고 지우고 끌어서 옮깁니다.**
 *
 * ─── 왜 목록인가 ────────────────────────────────────────────────────────────
 *
 * 처음에는 카드마다 입력칸 세 개(윗줄·제목·안내)였습니다. 고치는 건 됐지만 나머지가
 * 막혀 있었습니다 — **지울 수 없고**(비우면 디자인 기본 문구가 되돌아옴), **더할 수 없고**
 * (칸이 세 개), **옮길 수 없었습니다**(순서가 테마 마크업). "캘린더 문구를 아예 빼고 싶다"
 * 는 요구를 그 모델로는 표현할 수 없었습니다.
 *
 * 🔴 **첫 편집에서 디자인 기본 문구를 그대로 값으로 굳힙니다.** 화면에 보이는 목록을
 *    그대로 저장하기 때문입니다. 이게 없으면 "기본 문구 3줄 중 1줄만 지우기" 가 불가능합니다
 *    (지운 줄이 '값 없음' 으로 남아 기본값으로 되살아납니다). 굳힌 뒤에는 빈 배열이
 *    "전부 지웠다" 를 뜻하고, 워커의 `mergeContent` 가 배열을 통째로 대체하므로 그대로 남습니다.
 *
 * 🔴 **자리(zone)는 두 개뿐입니다** — 카드 위, 콘텐츠 아래. 카드 안 자유 좌표를 주면
 *    폰 크기마다 글자가 달력·지도 위에 겹칩니다 (커버는 배경이 고정 비율이라 좌표를 씁니다).
 *
 * 스타일(정렬·크기·색)은 **고른 것만** 저장합니다. 안 고른 값은 디자인을 따라가야
 * 나중에 디자인을 바꿨을 때 손대지 않은 문구가 같이 바뀝니다.
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import {
  SECTION_TEXT_MAX_LENGTH,
  SECTION_TEXT_ROLE_LABEL,
  SECTION_TEXT_ROLES,
  SECTION_TEXT_SCALE_RANGE,
  SECTION_ZONES,
  SECTION_ZONE_LABEL,
  createSectionBlock,
  hasSectionTextOverride,
  normalizeSectionText,
  sectionBlocks,
  type SectionBlock,
  type SectionBlocks,
  type SectionKey,
  type SectionTextAlign,
  type SectionTextMap,
  type SectionTextRole,
  type SectionZone,
  type ThemeId,
} from '@luvi/schema';
import { ColorControl } from '@/components/ColorControl';

const ALIGNS: { value: SectionTextAlign; label: string; title: string }[] = [
  { value: 'left', label: '⇤', title: '왼쪽' },
  { value: 'center', label: '↔', title: '가운데' },
  { value: 'right', label: '⇥', title: '오른쪽' },
];

interface Props {
  themeId: ThemeId;
  sectionKey: SectionKey;
  /** 사용자에게 보이는 카드 이름 (예: '방명록') */
  label: string;
  /** 저장된 값 전체 (`core.sectionText`) */
  stored: SectionTextMap;
  /** 이 카드의 문구를 통째로 저장합니다 (`core.sectionText.{키}`) */
  onChange: (next: Required<SectionBlocks>) => void;
  /**
   * 미리보기에서 누른 블록 — 그 줄을 **골라서 보여주기만** 합니다.
   * 🔴 `focus()` 를 걸지 않습니다: 커서는 방금 누른 미리보기의 글자에 있고, 여기에
   *    포커스를 주면 iframe 의 커서를 빼앗아 타이핑이 끊깁니다.
   */
  selectBlockId?: string | null;
  onSelectHandled?: () => void;
}

export function SectionBlocksControl({
  themeId,
  sectionKey,
  label,
  stored,
  onChange,
  selectBlockId,
  onSelectHandled,
}: Props) {
  // 저장된 값은 검사하지 않은 원본입니다 — 범위 밖 크기·빈 색·id 없는 줄을 여기서 걸러야
  // 에디터가 그리는 목록과 뷰어가 그리는 목록이 같아집니다 (뷰어도 같은 함수를 씁니다)
  const normalized = useMemo(() => normalizeSectionText(stored), [stored]);
  const blocks = useMemo(
    () => sectionBlocks(themeId, sectionKey, normalized),
    [themeId, sectionKey, normalized],
  );
  const touched = hasSectionTextOverride(normalized, sectionKey);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const inputs = useRef(new Map<string, HTMLTextAreaElement>());
  const rows = useRef(new Map<string, HTMLLIElement>());

  /** 미리보기에서 글자를 누르면 그 줄을 골라 보여줍니다 (스타일 툴바가 열립니다) */
  useEffect(() => {
    if (!selectBlockId) return;
    setSelectedId(selectBlockId);
    rows.current.get(selectBlockId)?.scrollIntoView({ block: 'nearest' });
    onSelectHandled?.();
  }, [selectBlockId, onSelectHandled]);

  const commit = useCallback(
    (zone: SectionZone, next: SectionBlock[]) =>
      onChange({ ...blocks, [zone]: next } as Required<SectionBlocks>),
    [blocks, onChange],
  );

  const patchBlock = (zone: SectionZone, id: string, patch: Partial<SectionBlock>) =>
    commit(
      zone,
      blocks[zone].map((b) => (b.id === id ? { ...b, ...patch } : b)),
    );

  /** 값을 지워 '디자인 기본' 으로 되돌립니다 (키를 남기면 그 값이 계속 이깁니다) */
  const clearStyle = (zone: SectionZone, id: string, keys: (keyof SectionBlock)[]) =>
    commit(
      zone,
      blocks[zone].map((b) => {
        if (b.id !== id) return b;
        const next = { ...b };
        for (const k of keys) delete next[k];
        return next;
      }),
    );

  const removeBlock = (zone: SectionZone, id: string) => {
    commit(
      zone,
      blocks[zone].filter((b) => b.id !== id),
    );
    if (selectedId === id) setSelectedId(null);
  };

  const addBlock = (zone: SectionZone) => {
    // 이미 있는 줄이 무엇인지 보고 역할을 고릅니다 — 제목이 없으면 제목, 있으면 안내
    const roles = new Set(blocks[zone].map((b) => b.role));
    const role: SectionTextRole = zone === 'foot' || roles.has('title') ? 'note' : 'title';
    const block = createSectionBlock(role, '');
    commit(zone, [...blocks[zone], block]);
    setSelectedId(block.id);
    // 방금 만든 줄에 커서 — 목록이 그려진 다음이어야 ref 가 있습니다
    requestAnimationFrame(() => inputs.current.get(block.id)?.focus());
  };

  const move = (zone: SectionZone, from: number, to: number) => {
    if (to < 0 || to >= blocks[zone].length || from === to) return;
    const next = [...blocks[zone]];
    const [moved] = next.splice(from, 1);
    if (moved) next.splice(to, 0, moved);
    commit(zone, next);
  };

  /**
   * 끌어서 옮기기.
   *
   * 목록 전체의 좌표를 계산하지 않고 **바로 옆 줄의 중간선을 넘었는지만** 봅니다 — 줄마다
   * 높이가 다르고(여러 줄 문구·툴바 펼침) 드래그 중에 순서가 바뀌므로, 전체 좌표를 미리
   * 재두면 엉뚱한 자리에 떨어집니다.
   *
   * `setPointerCapture` 는 빠르게 끌 때 포인터가 핸들을 벗어나도 이벤트를 계속 받기 위한
   * 것이고(커버 캔버스와 같은 이유), 핸들의 `touch-action: none` 이 없으면 모바일에서
   * 드래그가 페이지 스크롤로 먹힙니다.
   */
  const drag = useRef<{ zone: SectionZone; id: string } | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const onDragStart = (zone: SectionZone, id: string) => (e: ReactPointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { zone, id };
    setDraggingId(id);
  };

  const onDragMove = (e: ReactPointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const list = blocks[d.zone];
    const cur = list.findIndex((b) => b.id === d.id);
    if (cur < 0) return;

    const rect = (idx: number) => {
      const b = list[idx];
      return b ? (rows.current.get(b.id)?.getBoundingClientRect() ?? null) : null;
    };
    const prev = rect(cur - 1);
    const next = rect(cur + 1);
    if (prev && e.clientY < prev.top + prev.height / 2) move(d.zone, cur, cur - 1);
    else if (next && e.clientY > next.top + next.height / 2) move(d.zone, cur, cur + 1);
  };

  const onDragEnd = () => {
    drag.current = null;
    setDraggingId(null);
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-line bg-white p-3">
      <div className="flex items-baseline gap-2">
        <span className="text-[12.5px] font-semibold">{label} 문구</span>
        <span className="text-[11px] text-muted-soft">끌어서 순서 · 🗑 로 제거</span>
        {touched && (
          <button
            type="button"
            onClick={() => {
              // 디자인 기본 문구를 다시 값으로 씁니다 (키를 지우는 길은 저장 경로에 없습니다)
              const { head, foot } = sectionBlocks(themeId, sectionKey, undefined);
              onChange({ head, foot });
              setSelectedId(null);
            }}
            className="ml-auto text-[11.5px] text-gold-deep"
          >
            기본 문구로
          </button>
        )}
      </div>

      {SECTION_ZONES.map((zone) => (
        <div key={zone} className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-muted">{SECTION_ZONE_LABEL[zone]}</span>
            <button
              type="button"
              onClick={() => addBlock(zone)}
              className="ml-auto rounded-full border border-line-strong bg-white px-2.5 py-1 text-[11px] text-ink-soft"
            >
              + 문구 추가
            </button>
          </div>

          {blocks[zone].length === 0 ? (
            <p className="rounded-lg border border-dashed border-line bg-surface px-3 py-2.5 text-[11.5px] text-muted-faint">
              문구 없음 — 이 자리에는 아무것도 안 보입니다
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {blocks[zone].map((block, i) => {
                const selected = selectedId === block.id;
                const lines = Math.min(4, block.text.split('\n').length);
                return (
                  <li
                    key={block.id}
                    ref={(el) => {
                      if (el) rows.current.set(block.id, el);
                      else rows.current.delete(block.id);
                    }}
                    className={`rounded-lg border bg-surface p-1.5 ${
                      selected ? 'border-gold' : 'border-line'
                    } ${draggingId === block.id ? 'opacity-60 shadow-md' : ''}`}
                  >
                    <div className="flex items-start gap-1">
                      {/* 순서 — ≡ 를 끌어서 옮기고, ▲▼ 는 키보드·한 손 조작용으로 함께 둡니다 */}
                      <div className="flex flex-none flex-col items-center">
                        <button
                          type="button"
                          title="위로"
                          disabled={i === 0}
                          onClick={() => move(zone, i, i - 1)}
                          className="px-1 text-[10px] leading-tight text-muted disabled:opacity-25"
                        >
                          ▲
                        </button>
                        <span
                          title="끌어서 순서 바꾸기"
                          onPointerDown={onDragStart(zone, block.id)}
                          onPointerMove={onDragMove}
                          onPointerUp={onDragEnd}
                          onPointerCancel={onDragEnd}
                          style={{ touchAction: 'none' }}
                          className="cursor-grab px-1 text-[11px] leading-tight text-muted-faint active:cursor-grabbing"
                        >
                          ≡
                        </span>
                        <button
                          type="button"
                          title="아래로"
                          disabled={i === blocks[zone].length - 1}
                          onClick={() => move(zone, i, i + 1)}
                          className="px-1 text-[10px] leading-tight text-muted disabled:opacity-25"
                        >
                          ▼
                        </button>
                      </div>

                      <textarea
                        ref={(el) => {
                          if (el) inputs.current.set(block.id, el);
                          else inputs.current.delete(block.id);
                        }}
                        value={block.text}
                        rows={lines}
                        onFocus={() => setSelectedId(block.id)}
                        onChange={(e) => patchBlock(zone, block.id, { text: e.target.value })}
                        maxLength={SECTION_TEXT_MAX_LENGTH[block.role]}
                        placeholder="문구를 적어주세요"
                        className="min-w-0 flex-1 resize-none rounded-md border border-line bg-white px-2.5 py-1.5 text-[13px] leading-[1.5] outline-none focus:border-gold"
                      />

                      <select
                        value={block.role}
                        aria-label="글자 역할"
                        onChange={(e) =>
                          patchBlock(zone, block.id, { role: e.target.value as SectionTextRole })
                        }
                        className="flex-none rounded-md border border-line bg-white px-1.5 py-1.5 text-[11px] text-ink-soft outline-none"
                      >
                        {SECTION_TEXT_ROLES.map((r) => (
                          <option key={r} value={r}>
                            {SECTION_TEXT_ROLE_LABEL[r]}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        title="이 문구 제거"
                        onClick={() => removeBlock(zone, block.id)}
                        className="flex-none px-1 py-1 text-[13px] text-muted-faint hover:text-gold-deep"
                      >
                        🗑
                      </button>
                    </div>

                    {selected && (
                      <div className="mt-1.5 flex flex-col gap-2 border-t border-line pt-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="flex overflow-hidden rounded-md border border-line">
                            {ALIGNS.map((a) => (
                              <button
                                key={a.value}
                                type="button"
                                title={a.title}
                                onClick={() =>
                                  block.align === a.value
                                    ? clearStyle(zone, block.id, ['align'])
                                    : patchBlock(zone, block.id, { align: a.value })
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

                          <label className="flex flex-1 items-center gap-1.5 text-[11px] text-muted">
                            크기
                            <input
                              type="range"
                              min={SECTION_TEXT_SCALE_RANGE.min * 100}
                              max={SECTION_TEXT_SCALE_RANGE.max * 100}
                              step={SECTION_TEXT_SCALE_RANGE.step * 100}
                              value={(block.scale ?? 1) * 100}
                              onChange={(e) =>
                                patchBlock(zone, block.id, {
                                  scale: Number(e.target.value) / 100,
                                })
                              }
                              className="min-w-[80px] flex-1"
                            />
                            <span className="w-9 flex-none tabular-nums text-right">
                              {Math.round((block.scale ?? 1) * 100)}%
                            </span>
                          </label>
                        </div>

                        <ColorControl
                          value={block.color ?? ''}
                          onChange={(color) => patchBlock(zone, block.id, { color })}
                          onClear={() => clearStyle(zone, block.id, ['color'])}
                          clearLabel="디자인 기본"
                        />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ))}

      <p className="text-[11.5px] leading-relaxed text-muted">
        <b className="font-semibold">{'{신랑}'}</b> · <b className="font-semibold">{'{신부}'}</b>{' '}
        라고 쓰면 기본 정보에 적은 이름이 들어갑니다. 미리보기의 글자를 눌러도 그 줄이 열립니다.
      </p>
    </div>
  );
}
