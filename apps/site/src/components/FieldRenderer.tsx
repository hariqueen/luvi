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
import { useRef, useState } from 'react';
import type { AssetRef, FieldDef } from '@luvi/schema';
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
      if (added.length) bound.set([...items, ...added]);
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
