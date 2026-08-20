/**
 * 필드 타입 → 입력 컨트롤 매핑 (+ 값 바인딩).
 *
 * **화면에 필드를 하드코딩하지 않는 것이 이 파일의 존재 이유입니다.**
 * 테마 매니페스트(`FieldDef`)가 폼을 정의하고, 여기서는 타입별 렌더링과 값 바인딩만 담당합니다.
 *
 * 두 가지 바인딩 모드:
 *  · **최상위** — `field.path`(예 'core.greeting.message')로 에디터 doc 을 직접 읽고 씁니다.
 *  · **제어(하위)** — repeat 항목 안의 칸처럼 doc 경로가 없는 경우, 부모가 `value`/`onChange`를 줍니다.
 */
import { useEffect, useRef, useState } from 'react';
import type { AssetRef, FieldDef, PetalItem, TextBlock, TextBlockStyle } from '@luvi/schema';
import { GAME_LIST, PETAL_EMOJIS, PETAL_ITEM_MAX, createTextBlock } from '@luvi/schema';
import { assetUrl } from '@/lib/env';
import { useEditor, type EditorContextValue } from '@/lib/editorContext';

const inputClass =
  'w-full rounded-lg border border-line-strong bg-white px-3.5 py-3 outline-none transition-colors focus:border-gold';

/** 배열 원소를 from→to 로 옮긴 새 배열 */
function move<T>(arr: T[], from: number, to: number): T[] {
  if (to < 0 || to >= arr.length) return arr;
  const next = [...arr];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item as T);
  return next;
}

function Label({ field }: { field: FieldDef }) {
  return (
    <div className="mb-1.5">
      <label className="text-[12.5px] font-semibold text-ink">
        {field.label}
        {field.required && <span className="ml-1 text-gold-deep">*</span>}
      </label>
      {field.hint && <p className="mt-1 text-[11.5px] leading-snug text-muted">{field.hint}</p>}
    </div>
  );
}

/** datetime-local 은 초를 안 받으므로 'YYYY-MM-DDTHH:mm' 로 자르고, 저장은 초까지 채웁니다 */
function toLocalInput(iso: unknown): string {
  return typeof iso === 'string' ? iso.slice(0, 16) : '';
}
function fromLocalInput(v: string): string {
  return v ? (v.length === 16 ? `${v}:00` : v) : '';
}

interface Binding {
  value: unknown;
  set: (v: unknown) => void;
}

// ───────────────────────── 이미지 (단일) ─────────────────────────

function ImageField({
  field,
  bound,
  editor,
}: {
  field: FieldDef;
  bound: Binding;
  editor: EditorContextValue;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const asset = (bound.value as AssetRef | null) ?? null;

  /**
   * 이 필드가 비었을 때 **실제로 쓰이는** 이미지.
   *
   * 비워두면 다른 값을 물려받는 필드가 있습니다 (떨어지는 이미지 ← 인사말 말풍선 아이콘).
   * 그때 빈 칸을 보여주면 "아무것도 안 떨어진다" 로 읽히는데 화면에는 떨어지고 있습니다.
   * 그래서 물려받은 이미지를 그대로 보여주고, 물려받은 것임을 함께 알립니다.
   */
  const inherited =
    !asset && field.inheritFrom
      ? ((editor.get(field.inheritFrom) as AssetRef | null) ?? null)
      : null;
  const shown = asset ?? inherited;

  const onPick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const next = await editor.uploadImage(field.path, file);
      bound.set(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : '업로드에 실패했습니다');
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = '';
    }
  };

  return (
    <div>
      <Label field={field} />
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => void onPick(e.target.files?.[0])}
      />
      {shown ? (
        <div className="relative overflow-hidden rounded-xl border border-line">
          <img src={assetUrl(shown.key)} alt="" className="max-h-56 w-full object-cover" />
          {inherited && (
            <p className="border-t border-line bg-cream px-3 py-2 text-[11.5px] leading-[1.5] text-gold-deep">
              지금은 <b className="font-semibold">{field.inheritLabel ?? '기본 이미지'}</b>를 쓰고
              있어요. 다른 사진을 고르면 여기에만 적용됩니다.
            </p>
          )}
          <div className="flex gap-2 border-t border-line bg-surface px-3 py-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => ref.current?.click()}
              className="rounded-lg border border-line-strong bg-white px-3 py-1.5 text-[12px] disabled:opacity-50"
            >
              {busy ? '올리는 중…' : inherited ? '다른 사진 고르기' : '바꾸기'}
            </button>
            {/* 물려받은 이미지는 이 필드의 것이 아니라 지울 게 없습니다 */}
            {asset && (
              <button
                type="button"
                onClick={() => bound.set(null)}
                className="rounded-lg px-3 py-1.5 text-[12px] text-muted"
              >
                {field.inheritFrom ? '기본으로 되돌리기' : '삭제'}
              </button>
            )}
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => ref.current?.click()}
          className="flex w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-line-strong bg-surface py-7 text-center disabled:opacity-60"
        >
          <span className="text-[18px]">🖼️</span>
          <span className="text-[12.5px] text-ink-soft">{busy ? '올리는 중…' : '사진 고르기'}</span>
          <span className="text-[11px] text-muted-faint">
            {/* 물려받는 필드는 비어도 기본 이미지가 쓰입니다 — '아무것도 없음' 으로 읽히면 안 됩니다 */}
            {field.inheritFrom
              ? '비워두면 기본 이미지가 쓰입니다'
              : field.aspect
                ? `${field.aspect} 권장`
                : '탭해서 앨범에서 선택'}
          </span>
        </button>
      )}
      {error && <p className="mt-1.5 text-[11.5px] text-gold-deep">{error}</p>}
    </div>
  );
}

// ───────────────────────── 이미지 (여러 장 · 갤러리) ─────────────────────────

function ImagesField({
  field,
  bound,
  editor,
}: {
  field: FieldDef;
  bound: Binding;
  editor: EditorContextValue;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const items = (bound.value as AssetRef[] | undefined) ?? [];
  const max = field.max ?? 30;

  const onAdd = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    setError(null);
    const room = Math.max(0, max - items.length);
    const picked = Array.from(files).slice(0, room);
    const added: AssetRef[] = [];
    try {
      // 순차 업로드 — 한 장이 실패해도 앞서 성공한 것들은 살립니다
      for (const file of picked) {
        added.push(await editor.uploadImage(field.path, file));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '일부 사진을 올리지 못했습니다');
    } finally {
      if (added.length) bound.set(max === 1 ? added.slice(0, 1) : [...items, ...added]);
      setBusy(false);
      if (ref.current) ref.current.value = '';
    }
  };

  const removeAt = (i: number) => bound.set(items.filter((_, idx) => idx !== i));
  const reorder = (from: number, to: number) => bound.set(move(items, from, to));

  return (
    <div>
      <Label field={field} />
      <input
        ref={ref}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => void onAdd(e.target.files)}
      />

      {items.length > 0 && (
        <div className="mb-2 grid grid-cols-3 gap-2">
          {items.map((asset, i) => (
            <div
              key={asset.key}
              draggable
              onDragStart={() => setDragIndex(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragIndex !== null && dragIndex !== i) reorder(dragIndex, i);
                setDragIndex(null);
              }}
              className={`group relative aspect-square overflow-hidden rounded-lg border ${
                i === 0 ? 'border-gold' : 'border-line'
              } ${dragIndex === i ? 'opacity-40' : ''}`}
            >
              <img src={assetUrl(asset.key)} alt="" className="size-full cursor-move object-cover" />
              {i === 0 && (
                <span className="absolute left-1 top-1 rounded bg-gold px-1.5 py-0.5 text-[9px] font-semibold text-white">
                  대표
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/45 px-1 py-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => reorder(i, i - 1)}
                  className="px-1 text-[13px] leading-none text-white disabled:opacity-30"
                  disabled={i === 0}
                  aria-label="앞으로"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={() => removeAt(i)}
                  className="px-1 text-[11px] leading-none text-white"
                  aria-label="삭제"
                >
                  ✕
                </button>
                <button
                  type="button"
                  onClick={() => reorder(i, i + 1)}
                  className="px-1 text-[13px] leading-none text-white disabled:opacity-30"
                  disabled={i === items.length - 1}
                  aria-label="뒤로"
                >
                  ›
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        disabled={busy || items.length >= max}
        onClick={() => ref.current?.click()}
        className="w-full rounded-lg border border-dashed border-line-strong py-3 text-[12.5px] text-ink-soft disabled:opacity-50"
      >
        {busy
          ? '올리는 중…'
          : items.length >= max
            ? `최대 ${max}장까지예요`
            : `+ 사진 추가 (${items.length}/${max})`}
      </button>
      {error && <p className="mt-1.5 text-[11.5px] text-gold-deep">{error}</p>}
    </div>
  );
}

// ───────────────────────── 오디오 ─────────────────────────

function AudioField({
  field,
  bound,
  editor,
}: {
  field: FieldDef;
  bound: Binding;
  editor: EditorContextValue;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const asset = (bound.value as AssetRef | null) ?? null;

  const onPick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      bound.set(await editor.uploadAudio(file));
    } catch (e) {
      setError(e instanceof Error ? e.message : '업로드에 실패했습니다');
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = '';
    }
  };

  return (
    <div>
      <Label field={field} />
      <input
        ref={ref}
        type="file"
        accept="audio/mpeg"
        className="hidden"
        onChange={(e) => void onPick(e.target.files?.[0])}
      />
      <div className="flex items-center gap-2 rounded-xl border border-line bg-white px-3.5 py-3">
        {asset ? (
          <audio controls src={assetUrl(asset.key)} className="h-9 min-w-0 flex-1" />
        ) : (
          <span className="flex-1 truncate text-[12.5px] text-muted">
            {busy ? '올리는 중…' : '선택된 음원 없음'}
          </span>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={() => ref.current?.click()}
          className="flex-none text-[12px] text-gold-deep disabled:opacity-50"
        >
          {asset ? '바꾸기' : '고르기'}
        </button>
        {asset && (
          <button
            type="button"
            onClick={() => bound.set(null)}
            className="flex-none text-[12px] text-muted"
          >
            삭제
          </button>
        )}
      </div>
      {error && <p className="mt-1.5 text-[11.5px] text-gold-deep">{error}</p>}
    </div>
  );
}

// ───────────────────────── 반복 항목 ─────────────────────────

/** 하위 필드 정의로 빈 항목 하나를 만듭니다 (icon 은 첫 선택지, 반복은 빈 배열) */
// ─────────── 낙하 요소 (아이콘·사진을 섞어서 최대 3개) ───────────

/**
 * '떨어지는 것' 컨트롤.
 *
 * 아이콘과 사진을 **한 컨트롤에서** 고릅니다. 필드를 둘로 나누면 "아이콘 2개 + 사진 2개" 처럼
 * 합계 제한을 두 곳에서 지켜야 하고, 사용자는 무엇이 떨어질지 두 칸을 합쳐 상상해야 합니다.
 * 고른 것을 한 줄에 그대로 보여주는 편이 화면에 떨어질 것과 1:1 로 맞습니다.
 */
function PetalItemsField({
  field,
  bound,
  editor,
  /** 옛 단일 이미지(`…petals.image`) 승격을 할지. 낙하 연출에만 있는 사정입니다 */
  legacy,
}: {
  field: FieldDef;
  bound: Binding;
  editor: EditorContextValue;
  legacy: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const items = (bound.value as PetalItem[] | undefined) ?? [];
  const max = field.max ?? PETAL_ITEM_MAX;
  const full = items.length >= max;
  /** 아이콘 후보 — 매니페스트가 주면 그것, 없으면 낙하 연출용 프리셋 */
  const emojis: readonly string[] = field.options?.map((o) => o.value) ?? PETAL_EMOJIS;

  /**
   * 옛 문서 승격 — `…petals.image` 만 들고 있는 문서를 열면 그 사진을 **실제 선택**으로 올립니다.
   *
   * 뷰어도 같은 승격을 하므로(`normalizePetalItems`) 화면에는 이미 그 사진이 떨어지고 있습니다.
   * 에디터에만 안 보이면 "설정에는 없는데 화면에는 떨어지는" 상태가 되고, 아이콘을 하나
   * 고르는 순간 사진이 사라진 것처럼 보입니다 — 실제로 그 신고를 받았습니다.
   * 초안이 '변경됨' 이 되지만 저장은 사용자가 누를 때만 일어납니다.
   */
  const promoted = useRef(false);
  useEffect(() => {
    if (!legacy || promoted.current || items.length > 0) return;
    const legacyImage =
      (editor.get(field.path.replace(/\.items$/, '.image')) as AssetRef | null) ?? null;
    if (!legacyImage) return;
    promoted.current = true;
    bound.set([{ kind: 'image', asset: legacyImage }]);
  }, [bound, editor, field.path, items.length, legacy]);

  const hasEmoji = (value: string) => items.some((it) => it.kind === 'emoji' && it.value === value);

  const toggleEmoji = (value: string) => {
    if (hasEmoji(value)) {
      bound.set(items.filter((it) => !(it.kind === 'emoji' && it.value === value)));
    } else if (max === 1) {
      // 하나만 고르는 필드는 곧바로 바꿔칩니다 — 먼저 빼게 하면 두 번 눌러야 합니다
      bound.set([{ kind: 'emoji', value }]);
    } else if (!full) {
      bound.set([...items, { kind: 'emoji', value }]);
    }
  };

  const onAddPhotos = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    setError(null);
    // 남은 자리만큼만 받습니다 — 넘치게 올려두고 조용히 버리면 왜 안 들어갔는지 알 수 없습니다
    const room = max === 1 ? 1 : Math.max(0, max - items.length);
    const picked = Array.from(files).slice(0, room);
    const added: PetalItem[] = [];
    try {
      for (const file of picked) {
        added.push({ kind: 'image', asset: await editor.uploadImage(field.path, file) });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '사진을 올리지 못했습니다');
    } finally {
      if (added.length) bound.set([...items, ...added]);
      setBusy(false);
      if (ref.current) ref.current.value = '';
    }
  };

  const removeAt = (i: number) => bound.set(items.filter((_, idx) => idx !== i));

  return (
    <div>
      <Label field={field} />
      <input
        ref={ref}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => void onAddPhotos(e.target.files)}
      />

      <div className="rounded-xl border border-line bg-surface p-3">
        {/* ── 고른 것 ── */}
        <div className="mb-2.5 flex items-center justify-between">
          <span className="text-[12px] font-semibold text-ink-soft">
            {field.pickedLabel ?? '고른 것'}
          </span>
          <span className={`text-[11.5px] ${full ? 'text-gold-deep' : 'text-muted'}`}>
            {items.length} / {max}
          </span>
        </div>

        {items.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {items.map((it, i) => (
              <div
                key={it.kind === 'emoji' ? `e-${it.value}` : `i-${it.asset.key}`}
                className="relative size-14 overflow-hidden rounded-lg border border-line-strong bg-white"
              >
                {it.kind === 'emoji' ? (
                  <span className="flex size-full items-center justify-center text-[26px] leading-none">
                    {it.value}
                  </span>
                ) : (
                  <img src={assetUrl(it.asset.key)} alt="" className="size-full object-cover" />
                )}
                <button
                  type="button"
                  aria-label="빼기"
                  onClick={() => removeAt(i)}
                  className="absolute right-0 top-0 flex size-5 items-center justify-center bg-black/50 text-[11px] leading-none text-white"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-lg bg-cream px-3 py-2 text-[11.5px] leading-[1.6] text-gold-deep">
            {field.emptyHint ?? (
              <>
                아직 고른 것이 없어서 <b className="font-semibold">아무것도 떨어지지 않아요.</b>{' '}
                아래에서 아이콘이나 사진을 고르면 고른 것만 떨어집니다 — 섞어서 {max}개까지
                (사진만 {max}개도 됩니다).
              </>
            )}
          </p>
        )}

        {/* ── 아이콘 고르기 ── */}
        <p className="mb-1.5 mt-3.5 text-[12px] font-semibold text-ink-soft">아이콘</p>
        <div className="flex flex-wrap gap-1.5">
          {emojis.map((emoji) => {
            const on = hasEmoji(emoji);
            return (
              <button
                key={emoji}
                type="button"
                // 이미 다 골랐으면 '빼기'만 되게 둡니다 — 눌렀는데 아무 일도 없으면 고장으로 읽힙니다
                disabled={!on && full}
                onClick={() => toggleEmoji(emoji)}
                className={`flex size-10 items-center justify-center rounded-lg border bg-white text-[19px] leading-none transition-colors ${
                  on ? 'border-gold ring-1 ring-gold' : 'border-line-strong'
                } disabled:opacity-35`}
              >
                {emoji}
              </button>
            );
          })}
        </div>

        {/* ── 사진 올리기 ── */}
        <p className="mb-1.5 mt-3.5 text-[12px] font-semibold text-ink-soft">내 사진</p>

        {/*
          '이미 올린 사진에서 고르기' 를 뒀다가 뺐습니다 (2026-08-19). 초안의 이미지를 다 모으면
          커버·갤러리 같은 **배경 있는 결혼식 사진**이 후보로 올라오는데, 낙하 요소는 배경이
          없는 스티커형이어야 해서 어울리지 않습니다. 목록이 방해만 됐습니다.
        */}
        <button
          type="button"
          disabled={busy || (full && max !== 1)}
          onClick={() => ref.current?.click()}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-line-strong bg-white py-3 text-[12.5px] text-ink-soft disabled:opacity-50"
        >
          <span>🖼️</span>
          {busy ? '올리는 중…' : full ? `최대 ${max}개까지예요` : '사진 올리기'}
        </button>
        {error && <p className="mt-1.5 text-[11.5px] text-gold-deep">{error}</p>}
      </div>
    </div>
  );
}

// ───────────────── 문단 목록 (소개 문구) ─────────────────

const BLOCK_STYLES: { value: TextBlockStyle; label: string }[] = [
  { value: 'badge', label: '배지' },
  { value: 'title', label: '제목' },
  { value: 'body', label: '설명' },
];

/**
 * 순서를 바꿀 수 있는 문단 목록.
 *
 * 커버 텍스트와 같은 조작(수정·추가·삭제·이동)을 제공하지만, 커버는 사진 위 좌표를
 * 드래그하고 이쪽은 **위아래 순서**만 있습니다 — 흐름 배치라 좌표가 없습니다.
 *
 * 🔴 `style` 은 크기를 직접 정하지 않고 **역할**만 정합니다 (배지/제목/설명).
 *    실제 크기·색은 디자인이 정하므로, 같은 값이 테마마다 다르게 그려집니다.
 *    폰트 크기를 여기서 숫자로 받으면 어떤 디자인에서는 반드시 깨집니다.
 */
function TextBlocksField({ field, bound }: { field: FieldDef; bound: Binding }) {
  const blocks = (bound.value as TextBlock[] | undefined) ?? [];

  const patch = (i: number, next: Partial<TextBlock>) =>
    bound.set(blocks.map((b, idx) => (idx === i ? { ...b, ...next } : b)));

  return (
    <div>
      <Label field={field} />
      <div className="flex flex-col gap-2">
        {blocks.map((block, i) => (
          <div key={block.id} className="rounded-xl border border-line bg-white p-3">
            <div className="mb-2 flex items-center gap-1">
              <div className="flex gap-0.5 rounded-lg bg-surface-sunken p-0.5">
                {BLOCK_STYLES.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => patch(i, { style: o.value })}
                    className={`rounded-md px-2 py-1 text-[11.5px] ${
                      block.style === o.value
                        ? 'bg-white font-semibold text-ink shadow-sm'
                        : 'text-ink-soft'
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                aria-label="위로"
                disabled={i === 0}
                onClick={() => bound.set(move(blocks, i, i - 1))}
                className="ml-auto rounded-md border border-line-strong px-2 py-1 text-[11px] text-ink-soft disabled:opacity-30"
              >
                ↑
              </button>
              <button
                type="button"
                aria-label="아래로"
                disabled={i === blocks.length - 1}
                onClick={() => bound.set(move(blocks, i, i + 1))}
                className="rounded-md border border-line-strong px-2 py-1 text-[11px] text-ink-soft disabled:opacity-30"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => bound.set(blocks.filter((_, idx) => idx !== i))}
                className="rounded-md px-2 py-1 text-[11.5px] text-gold-deep"
              >
                삭제
              </button>
            </div>
            <textarea
              rows={block.style === 'body' ? 3 : 1}
              value={block.text}
              onChange={(e) => patch(i, { text: e.target.value })}
              placeholder="문구를 입력하세요"
              maxLength={300}
              className={`${inputClass} resize-none leading-relaxed`}
            />
          </div>
        ))}
      </div>

      {blocks.length === 0 && (
        <p className="rounded-lg bg-cream px-3 py-2 text-[11.5px] leading-[1.6] text-gold-deep">
          문단을 모두 지웠어요. 이대로 두면 게임 위에 아무 글도 보이지 않습니다.
        </p>
      )}

      <button
        type="button"
        onClick={() => bound.set([...blocks, createTextBlock('', 'body')])}
        className="mt-2 rounded-lg bg-ink px-3 py-2 text-[12px] text-paper-soft"
      >
        + 문단 추가
      </button>
    </div>
  );
}

// ───────────────── 게임 선택 ─────────────────

/**
 * 고를 수 있는 게임 카드.
 *
 * 지금은 게임이 하나뿐이라 카드도 하나만 뜹니다 — 그래도 목록으로 그립니다.
 * "이게 무슨 게임인지" 를 보여주지 않으면 아래의 문구·난이도 설정이 무엇에 대한
 * 설정인지 알 수 없고, 게임이 늘어날 때 이 화면을 다시 만들지 않아도 됩니다.
 */
function GamePickerField({ field, bound }: { field: FieldDef; bound: Binding }) {
  const current = typeof bound.value === 'string' ? bound.value : GAME_LIST[0]?.id;

  return (
    <div>
      <Label field={field} />
      <div className="flex flex-col gap-2">
        {GAME_LIST.map((game) => {
          const on = current === game.id;
          return (
            <button
              key={game.id}
              type="button"
              onClick={() => bound.set(game.id)}
              className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-colors ${
                on ? 'border-gold bg-cream' : 'border-line bg-white'
              }`}
            >
              <span className="mt-0.5 flex size-9 flex-none items-center justify-center rounded-lg bg-white text-[20px] leading-none shadow-sm">
                {game.icon}
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-1.5">
                  <b className="text-[13.5px] font-semibold text-ink">{game.name}</b>
                  {on && <span className="text-[11px] text-gold-deep">사용 중</span>}
                </span>
                <span className="mt-0.5 block text-[11.5px] text-muted">{game.tagline}</span>
                <span className="mt-1 block text-[11.5px] leading-[1.6] text-ink-soft">
                  {game.description}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      {GAME_LIST.length === 1 && (
        <p className="mt-1.5 text-[11.5px] text-muted">
          지금은 게임이 하나예요. 새 게임이 준비되면 여기에 함께 보입니다.
        </p>
      )}
    </div>
  );
}

function emptyItem(fields: FieldDef[]): Record<string, unknown> {
  const item: Record<string, unknown> = {};
  for (const f of fields) {
    if (f.type === 'repeat' || f.type === 'repeatGroup') item[f.path] = [];
    else if (f.type === 'icon') item[f.path] = f.options?.[0]?.value ?? '';
    else if (f.type === 'toggle') item[f.path] = false;
    else item[f.path] = '';
  }
  return item;
}

function RepeatField({ field, bound }: { field: FieldDef; bound: Binding }) {
  const items = (bound.value as Record<string, unknown>[] | undefined) ?? [];
  const subFields = field.fields ?? [];

  const patchItem = (i: number, key: string, value: unknown) =>
    bound.set(items.map((it, idx) => (idx === i ? { ...it, [key]: value } : it)));
  const removeAt = (i: number) => bound.set(items.filter((_, idx) => idx !== i));
  const reorder = (from: number, to: number) => bound.set(move(items, from, to));

  return (
    <div>
      <Label field={field} />
      <div className="flex flex-col gap-2">
        {items.map((item, i) => (
          <div key={i} className="rounded-xl border border-line bg-white p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] font-medium text-muted-faint">#{i + 1}</span>
              <div className="flex items-center gap-1 text-[13px] text-muted">
                <button type="button" disabled={i === 0} onClick={() => reorder(i, i - 1)} className="px-1 disabled:opacity-30" aria-label="위로">↑</button>
                <button type="button" disabled={i === items.length - 1} onClick={() => reorder(i, i + 1)} className="px-1 disabled:opacity-30" aria-label="아래로">↓</button>
                <button type="button" onClick={() => removeAt(i)} className="px-1 text-gold-deep" aria-label="삭제">✕</button>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              {subFields.map((sub) => (
                <FieldRenderer
                  key={sub.path}
                  field={sub}
                  compact
                  value={item[sub.path]}
                  onChange={(v) => patchItem(i, sub.path, v)}
                />
              ))}
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => bound.set([...items, emptyItem(subFields)])}
          className="rounded-lg border border-dashed border-line-strong py-2.5 text-[12.5px] text-ink-soft"
        >
          + 추가
        </button>
      </div>
    </div>
  );
}

// ───────────────────────── 진입점 ─────────────────────────

export function FieldRenderer({
  field,
  compact,
  value,
  onChange,
}: {
  field: FieldDef;
  compact?: boolean;
  /** 제어 모드 값 (repeat 하위 필드). 없으면 field.path 로 doc 을 바인딩합니다 */
  value?: unknown;
  onChange?: (value: unknown) => void;
}) {
  const editor = useEditor();
  const bound: Binding = onChange
    ? { value, set: onChange }
    : { value: editor.get(field.path), set: (v) => editor.set(field.path, v) };

  const str = typeof bound.value === 'string' ? bound.value : '';

  switch (field.type) {
    case 'textarea':
      return (
        <div>
          <Label field={field} />
          <textarea
            rows={field.rows ?? 3}
            maxLength={field.maxLength}
            value={str}
            onChange={(e) => bound.set(e.target.value)}
            placeholder={field.label}
            className={`${inputClass} resize-none leading-relaxed`}
          />
        </div>
      );

    case 'datetime':
      return (
        <div>
          <Label field={field} />
          <input
            type="datetime-local"
            value={toLocalInput(bound.value)}
            onChange={(e) => bound.set(fromLocalInput(e.target.value))}
            className={inputClass}
          />
        </div>
      );

    case 'number':
      return (
        <div>
          <Label field={field} />
          <input
            type="number"
            inputMode="numeric"
            value={typeof bound.value === 'number' ? bound.value : ''}
            onChange={(e) => bound.set(e.target.value === '' ? 0 : Number(e.target.value))}
            className={inputClass}
          />
        </div>
      );

    case 'range': {
      const min = field.min ?? 0;
      const max = field.max ?? 100;
      const step = field.step ?? 1;
      // 값이 아직 없으면(옛 문서) 슬라이더가 맨 왼쪽으로 튀지 않게 중간값을 보여줍니다
      const current =
        typeof bound.value === 'number' ? bound.value : Math.round((min + max) / 2);
      return (
        <div>
          <div className="flex items-baseline justify-between">
            <Label field={field} />
            <span className="ml-2 flex-none text-[12px] font-semibold tabular-nums text-gold-deep">
              {current}
              {field.unit ?? ''}
            </span>
          </div>
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={current}
            onChange={(e) => bound.set(Number(e.target.value))}
            className="mt-1 h-6 w-full accent-gold"
          />
          <div className="flex justify-between text-[10.5px] text-muted-faint">
            <span>
              {min}
              {field.unit ?? ''}
            </span>
            <span>
              {max}
              {field.unit ?? ''}
            </span>
          </div>
        </div>
      );
    }

    case 'toggle':
      return (
        <label className="flex items-center justify-between gap-3 rounded-xl border border-line bg-white px-3.5 py-3">
          <span className="text-[13px] font-medium">{field.label}</span>
          <input
            type="checkbox"
            checked={bound.value === true}
            onChange={(e) => bound.set(e.target.checked)}
            className="h-5 w-9 accent-gold"
          />
        </label>
      );

    case 'segment':
      return (
        <div>
          <Label field={field} />
          <div className="flex gap-1 rounded-lg bg-surface-sunken p-1">
            {field.options?.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => bound.set(o.value)}
                className={`flex-1 rounded-md py-2 text-[12.5px] ${
                  bound.value === o.value ? 'bg-white font-semibold text-ink shadow-sm' : 'text-ink-soft'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      );

    case 'icon':
      return (
        <div>
          <Label field={field} />
          <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {field.options?.map((o) => (
              <button
                key={o.value}
                type="button"
                title={o.label}
                onClick={() => bound.set(o.value)}
                className={`flex-none rounded-lg border bg-white px-3 py-2 text-[15px] ${
                  bound.value === o.value ? 'border-gold ring-1 ring-gold' : 'border-line-strong'
                }`}
              >
                {o.value}
              </button>
            ))}
          </div>
        </div>
      );

    case 'petals':
      return <PetalItemsField field={field} bound={bound} editor={editor} legacy />;
    case 'items':
      return <PetalItemsField field={field} bound={bound} editor={editor} legacy={false} />;

    case 'textBlocks':
      return <TextBlocksField field={field} bound={bound} />;
    case 'game':
      return <GamePickerField field={field} bound={bound} />;

    case 'image':
      return <ImageField field={field} bound={bound} editor={editor} />;
    case 'images':
      return <ImagesField field={field} bound={bound} editor={editor} />;
    case 'audio':
      return <AudioField field={field} bound={bound} editor={editor} />;

    case 'repeat':
    case 'repeatGroup':
      return <RepeatField field={field} bound={bound} />;

    case 'url':
      return (
        <div>
          <Label field={field} />
          <input
            type="url"
            inputMode="url"
            value={str}
            onChange={(e) => bound.set(e.target.value)}
            placeholder="https://"
            className={inputClass}
          />
        </div>
      );

    case 'tel':
      return (
        <div>
          <Label field={field} />
          <input
            type="tel"
            inputMode="tel"
            value={str}
            onChange={(e) => bound.set(e.target.value)}
            className={inputClass}
          />
        </div>
      );

    case 'slug':
      // 슬러그는 발행 화면에서만 편집합니다 (문서 필드라 doc 패치 대상이 아님)
      return null;

    case 'text':
    default:
      return (
        <div>
          {compact ? (
            <label className="mb-1.5 block text-[11.5px] font-medium text-muted">
              {field.label}
            </label>
          ) : (
            <Label field={field} />
          )}
          <input
            type="text"
            maxLength={field.maxLength}
            value={str}
            onChange={(e) => bound.set(e.target.value)}
            placeholder={field.label}
            className={inputClass}
          />
        </div>
      );
  }
}
