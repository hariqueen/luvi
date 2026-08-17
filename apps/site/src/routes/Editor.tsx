/**
 * C4 에디터 — 제품의 핵심 화면.
 *
 * 두 가지 편집 방식이 한 화면에 있습니다:
 *  · **커버** — 사진 위 텍스트를 자유 배치 (드래그·정렬·색·크기·글꼴)
 *  · **나머지 섹션** — 매니페스트에서 생성되는 폼 + 섹션 추가/제거/순서 변경
 *
 * 데이터 흐름: 진입 시 `api.invitations.get(id)` 로 초안(ContentDoc)을 불러오고,
 * 편집은 전부 `setField(path, value)` 하나로 모읍니다. 그 변경분을 디바운스로 묶어
 * `api.invitations.updateDraft` 로 자동저장합니다 — **발행 전이라 하객 화면은 그대로입니다.**
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  CORE_SECTIONS,
  DEFAULT_SECTIONS,
  FONT_CATEGORY_LABEL,
  FONT_GROUPS,
  FONTS,
  LAYER_COLORS,
  LAYER_SIZE_RANGE,
  createTextLayer,
  type AssetRef,
  type ContentDoc,
  type Features,
  type LayerFont,
  type SectionDef,
  type SectionKey,
  type TextLayer,
  type ThemeId,
  type UpdateDraftBody,
} from '@luvi/schema';
import { api } from '@/lib/api';
import { assetUrl, env } from '@/lib/env';
import { setPath } from '@/lib/paths';
import { uploadAudio, uploadImageForPath } from '@/lib/upload';
import { EditorProvider, type EditorContextValue } from '@/lib/editorContext';
import { BottomSheet, type SheetSnap } from '@/components/BottomSheet';
import { CoverCanvas } from '@/components/CoverCanvas';
import { FieldRenderer } from '@/components/FieldRenderer';
import { LayerToolbar } from '@/components/LayerToolbar';
import { SaveState, type SaveStatus } from '@/components/SaveState';
import { SectionManager } from '@/components/SectionManager';
import { TextEditorOverlay } from '@/components/TextEditorOverlay';
import { SECTION_META, SECTION_TO_FORM } from '@/lib/sectionMeta';

/** 시트가 무엇을 보여주는지. 디자인의 panelList / panelEdit 에 대응한다 */
type PanelMode = { kind: 'sections' } | { kind: 'form'; formKey: string };

/** 섹션 목록에 없지만 항상 채워야 하는 코어 폼 (이름·예식·공유). 캔버스인 커버는 뺀다 */
const ALWAYS_FORMS: { formKey: string; label: string }[] = [
  { formKey: 'couple', label: '기본 정보' },
  { formKey: 'ceremony', label: '예식 정보' },
  { formKey: 'effects', label: '연출' },
  { formKey: 'share', label: '공유 설정' },
];

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-xl border border-line bg-white px-3.5 py-3">
      <span className="text-[13px] font-medium">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-5 w-9 accent-gold"
      />
    </label>
  );
}

const DEBOUNCE_MS = 900;
const pad = (n: number) => String(n).padStart(2, '0');
const timeLabel = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

type Load =
  | { state: 'loading' }
  | { state: 'error'; message: string }
  | { state: 'ready' };

export default function Editor() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [load, setLoad] = useState<Load>({ state: 'loading' });
  const [doc, setDoc] = useState<ContentDoc | null>(null);
  const [sections, setSections] = useState<SectionKey[]>([...DEFAULT_SECTIONS]);
  const [features, setFeatures] = useState<Features>({ bgm: false, petals: true });
  const [themeId, setThemeId] = useState<ThemeId>('classic1');

  // ── 우측 라이브 미리보기 (실제 뷰어를 iframe 으로) ──
  const [rightView, setRightView] = useState<'preview' | 'cover'>('preview');
  const previewReady = useRef(false);

  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [savedAt, setSavedAt] = useState<string | undefined>();

  // ── 커버 편집 (UI 상태만 로컬, 데이터는 doc.core.cover) ──
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // ── 시트 ──
  const [panel, setPanel] = useState<PanelMode>({ kind: 'sections' });
  const [snap, setSnap] = useState<SheetSnap>('peek');

  // ─────────────── 로드 ───────────────
  useEffect(() => {
    let alive = true;
    void (async () => {
      const res = await api.invitations.get(id);
      if (!alive) return;
      if (res.ok) {
        setDoc(res.data.draft);
        setSections(res.data.sections);
        setFeatures(res.data.features);
        setThemeId(res.data.themeId);
        setLoad({ state: 'ready' });
      } else {
        setLoad({ state: 'error', message: res.error.message });
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  // ─────────────── 자동저장 엔진 ───────────────
  const pendingPatch = useRef<Record<string, unknown>>({});
  const pendingSections = useRef<SectionKey[] | null>(null);
  const pendingFeatures = useRef<Partial<Features> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(async () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    const patch = pendingPatch.current;
    const secs = pendingSections.current;
    const feats = pendingFeatures.current;
    if (Object.keys(patch).length === 0 && !secs && !feats) return;

    pendingPatch.current = {};
    pendingSections.current = null;
    pendingFeatures.current = null;

    setSaveStatus('saving');
    const body: UpdateDraftBody = { patch };
    if (secs) body.sections = secs;
    if (feats) body.features = feats;

    const res = await api.invitations.updateDraft(id, body);
    if (res.ok) {
      setSaveStatus('saved');
      setSavedAt(timeLabel(res.data.updatedAt));
    } else {
      // 실패한 변경분을 되돌려 넣어 재시도(또는 다음 편집)에 다시 반영되게 합니다
      pendingPatch.current = { ...patch, ...pendingPatch.current };
      if (secs && !pendingSections.current) pendingSections.current = secs;
      if (feats) pendingFeatures.current = { ...feats, ...(pendingFeatures.current ?? {}) };
      setSaveStatus('error');
    }
  }, [id]);

  const schedule = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), DEBOUNCE_MS);
  }, [flush]);

  const setField = useCallback(
    (path: string, value: unknown) => {
      setDoc((d) => (d ? setPath(d, path, value) : d));
      pendingPatch.current[path] = value;
      schedule();
    },
    [schedule],
  );

  const queueSections = useCallback(
    (next: SectionKey[]) => {
      setSections(next);
      pendingSections.current = next;
      schedule();
    },
    [schedule],
  );

  const queueFeature = useCallback(
    (key: keyof Features, value: boolean) => {
      setFeatures((f) => ({ ...f, [key]: value }));
      pendingFeatures.current = { ...(pendingFeatures.current ?? {}), [key]: value };
      schedule();
    },
    [schedule],
  );

  // 화면을 떠날 때 남은 변경분을 흘려보냅니다 (발행 화면이 최신 초안을 읽도록)
  useEffect(() => {
    return () => {
      void flush();
    };
  }, [flush]);

  // 전체 새로고침·탭 닫기 방어
  useEffect(() => {
    const handler = () => void flush();
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [flush]);

  // ─────────────── 라이브 미리보기 전송 ───────────────
  // 편집 중인 초안을 iframe(실제 뷰어)에 실시간으로 보내 우측에 그대로 그려지게 한다.
  const postPreview = useCallback(() => {
    if (!doc) return;
    // invitationId 를 비워 보냅니다 — 미리보기에서 방명록·랭킹을 쓰면 하객 글 사이에
    // 내 테스트 기록이 실제로 저장됩니다. 뷰어는 빈 ID 를 '로컬 전용' 으로 해석합니다.
    const pub = {
      slug: 'preview',
      invitationId: '',
      themeId,
      sections,
      features,
      content: doc,
      cdnBase: env.cdnBase,
    };
    document
      .querySelectorAll<HTMLIFrameElement>('iframe[data-luvi-preview]')
      .forEach((f) => f.contentWindow?.postMessage({ __luviPreview: true, pub }, window.location.origin));
  }, [doc, themeId, sections, features]);

  // 뷰어가 "준비됐다"고 알리면 현재 초안을 즉시 보낸다
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      const data = e.data as { __luviPreviewReady?: boolean } | null;
      if (data && data.__luviPreviewReady) {
        previewReady.current = true;
        postPreview();
      }
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [postPreview]);

  // 초안·섹션·연출이 바뀔 때마다 다시 보낸다 (준비된 뒤에만)
  useEffect(() => {
    if (previewReady.current) postPreview();
  }, [postPreview]);

  // ─────────────── 컨텍스트 ───────────────
  const editorValue: EditorContextValue | null = useMemo(() => {
    if (!doc) return null;
    return {
      invitationId: id,
      doc,
      get: (path) => {
        let cursor: unknown = doc;
        for (const seg of path.split('.')) {
          if (cursor === null || typeof cursor !== 'object') return undefined;
          cursor = (cursor as Record<string, unknown>)[seg];
        }
        return cursor;
      },
      set: setField,
      uploadImage: (path, file, alt) => uploadImageForPath(id, path, file, alt),
      uploadAudio: (file) => uploadAudio(id, file),
    };
  }, [doc, id, setField]);

  // ─────────────── 커버 ───────────────
  const layers = doc?.core.cover.layers ?? [];
  const coverImage = doc?.core.cover.image ?? null;
  const photoUrl = coverImage ? assetUrl(coverImage.key) : null;
  const selectedLayer = layers.find((l) => l.id === selectedId) ?? null;
  const editingLayer = layers.find((l) => l.id === editingTextId) ?? null;

  const setLayers = useCallback(
    (next: TextLayer[]) => setField('core.cover.layers', next),
    [setField],
  );
  const patchLayer = useCallback(
    (layerId: string, patch: Partial<TextLayer>) =>
      setLayers(layers.map((l) => (l.id === layerId ? { ...l, ...patch } : l))),
    [layers, setLayers],
  );
  const removeLayer = useCallback(
    (layerId: string) => {
      setLayers(layers.filter((l) => l.id !== layerId));
      setSelectedId(null);
    },
    [layers, setLayers],
  );
  const addLayer = useCallback(() => {
    const layer = createTextLayer();
    setLayers([...layers, layer]);
    setSelectedId(layer.id);
    setEditingTextId(layer.id);
  }, [layers, setLayers]);

  const [coverBusy, setCoverBusy] = useState(false);
  const onCoverFile = async (file: File | undefined) => {
    if (!file) return;
    setCoverBusy(true);
    try {
      const ref: AssetRef = await uploadImageForPath(id, 'core.cover.image', file);
      setField('core.cover.image', ref);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : '사진 업로드에 실패했습니다');
    } finally {
      setCoverBusy(false);
      if (coverInputRef.current) coverInputRef.current.value = '';
    }
  };

  // ─────────────── 폼 ───────────────
  const formSections = useMemo(() => CORE_SECTIONS, []);
  const activeForm: SectionDef | undefined =
    panel.kind === 'form' ? formSections.find((s) => s.key === panel.formKey) : undefined;

  const openForm = useCallback((formKey: string) => {
    setPanel({ kind: 'form', formKey });
    setSnap('full');
  }, []);

  const openSectionForm = useCallback(
    (key: SectionKey) => {
      if (key === 'cover') {
        // 커버는 가운데에 문구 편집 폼을 띄우고(다른 섹션과 동일한 경험),
        // 오른쪽은 캔버스로 전환해 위치를 드래그로 잡을 수 있게 한다
        openForm('cover');
        setRightView('cover');
        return;
      }
      const formKey = SECTION_TO_FORM[key];
      if (formKey) openForm(formKey);
    },
    [openForm],
  );

  // 미리보기(iframe)에서 섹션을 클릭하면 해당 편집을 연다.
  // 커버는 폼이 없으므로 우측을 "커버 편집" 캔버스로 전환한다.
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      const data = e.data as { __luviSectionClick?: SectionKey } | null;
      const key = data?.__luviSectionClick;
      if (!key) return;
      if (key === 'cover') setRightView('cover');
      else openSectionForm(key);
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [openSectionForm]);

  const sheetTitle = panel.kind === 'sections' ? '청첩장 구성' : (activeForm?.label ?? '편집');
  const title = (doc?.core.share.title ?? '') as string;

  // ─────────────── 로딩 · 오류 ───────────────
  if (load.state !== 'ready' || !doc || !editorValue) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-3 bg-bg text-center">
        {load.state === 'error' ? (
          <>
            <p className="text-[14px] text-ink-soft">{load.message}</p>
            <Link to="/app" className="rounded-full border border-line-strong px-4 py-2 text-[12.5px] text-muted">
              대시보드로
            </Link>
          </>
        ) : (
          <p className="text-[13px] text-muted">불러오는 중…</p>
        )}
      </div>
    );
  }

  const quickForms = (
    <div className="mb-3 flex flex-wrap gap-1.5">
      {ALWAYS_FORMS.map((f) => (
        <button
          key={f.formKey}
          type="button"
          onClick={() => openForm(f.formKey)}
          className={`rounded-full border px-3 py-1.5 text-[12px] ${
            panel.kind === 'form' && panel.formKey === f.formKey
              ? 'border-gold bg-cream text-gold-deep'
              : 'border-line-strong bg-white text-ink-soft'
          }`}
        >
          {f.label}
        </button>
      ))}
    </div>
  );

  const sectionsPanel = (
    <div>
      {quickForms}
      <SectionManager
        active={sections}
        meta={SECTION_META}
        onReorder={queueSections}
        onRemove={(key) => queueSections(sections.filter((k) => k !== key))}
        onAdd={(key) => queueSections([...sections, key])}
        onEdit={openSectionForm}
      />
    </div>
  );

  const formBody = activeForm ? (
    <div className="flex max-w-[520px] flex-col gap-4">
      {activeForm.fields.map((f) => (
        <FieldRenderer key={f.path} field={f} />
      ))}

      {/* 커버는 자유 배치 텍스트라 매니페스트 필드가 없다 — 여기서 문구/글꼴/색/크기를 직접 편집한다 */}
      {activeForm.key === 'cover' && (
        <div className="flex flex-col gap-3">
          {layers.length === 0 && (
            <p className="text-[13px] text-muted">아직 문구가 없어요. 아래 버튼으로 추가하세요.</p>
          )}
          {layers.map((layer, i) => (
            <div key={layer.id} className="flex flex-col gap-2 rounded-xl border border-line bg-white p-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted">문구 {i + 1}</span>
                <button
                  type="button"
                  onClick={() => removeLayer(layer.id)}
                  className="text-[11.5px] text-gold-deep"
                >
                  삭제
                </button>
              </div>
              <textarea
                value={layer.text}
                onChange={(e) => patchLayer(layer.id, { text: e.target.value })}
                rows={2}
                placeholder="문구를 입력하세요"
                className="w-full resize-none rounded-lg border border-line bg-surface px-3 py-2 text-[14px] outline-none focus:border-gold"
              />
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={layer.font}
                  aria-label="글꼴"
                  onChange={(e) => patchLayer(layer.id, { font: e.target.value as LayerFont })}
                  className="rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[13px] outline-none focus:border-gold"
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
                <div className="flex items-center gap-1 rounded-lg bg-surface-sunken px-1.5 py-1">
                  {LAYER_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      aria-label={c.label}
                      onClick={() => patchLayer(layer.id, { color: c.value })}
                      className={`h-5 w-5 rounded-full border ${
                        layer.color === c.value
                          ? 'border-gold ring-2 ring-gold/40'
                          : 'border-line-strong'
                      }`}
                      style={{ background: c.value }}
                    />
                  ))}
                </div>
                <label className="flex items-center gap-1.5 rounded-lg bg-surface-sunken px-2.5 py-1.5">
                  <span className="text-[11px] text-muted">크기</span>
                  <input
                    type="range"
                    min={LAYER_SIZE_RANGE.min * 1000}
                    max={LAYER_SIZE_RANGE.max * 1000}
                    value={layer.size * 1000}
                    onChange={(e) => patchLayer(layer.id, { size: Number(e.target.value) / 1000 })}
                    className="w-[72px] accent-gold"
                  />
                </label>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={addLayer}
            className="self-start rounded-lg bg-ink px-3 py-2 text-[12px] text-paper-soft"
          >
            + 문구 추가
          </button>
          <p className="text-[12px] leading-relaxed text-muted">
            위치는 오른쪽 “커버 편집” 화면에서 문구를 끌어 옮길 수 있어요.
          </p>
        </div>
      )}

      {/* 낙하 효과·배경음악은 매니페스트 필드가 아니라 features 문서 필드라 여기서 직접 그린다 */}
      {activeForm.key === 'effects' && (
        <>
          {/*
            '꽃잎'이라 부르지 않는다 — 이미지를 바꿀 수 있는데 꽃잎이라고 하면
            꽃잎만 되는 것처럼 읽힌다. 데이터 필드명은 features.petals 로 남아 있지만
            (이미 저장된 문서·스냅샷이 있어 못 바꾼다) 화면 문구는 중립적으로 쓴다.
          */}
          <ToggleRow
            label="떨어지는 효과"
            checked={features.petals}
            onChange={(v) => queueFeature('petals', v)}
          />
          <ToggleRow
            label="배경음악 자동재생"
            checked={features.bgm}
            onChange={(v) => queueFeature('bgm', v)}
          />
        </>
      )}
      {activeForm.fields.length === 0 && activeForm.key !== 'effects' && activeForm.key !== 'cover' && (
        <p className="text-[13px] text-muted">이 섹션은 켜고 끄는 것만 정할 수 있어요.</p>
      )}
    </div>
  ) : null;

  // ── 프리뷰 (커버 캔버스 + 서식 도구) ──
  const canvas = (
    <div className="relative flex h-full w-full flex-col">
      <input
        ref={coverInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => void onCoverFile(e.target.files?.[0])}
      />
      <div className="relative min-h-0 flex-1">
        <CoverCanvas
          photoUrl={photoUrl}
          layers={layers}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onChange={patchLayer}
          onEditText={setEditingTextId}
          onPickPhoto={() => coverInputRef.current?.click()}
          onAddText={addLayer}
        />
        {editingLayer && (
          <TextEditorOverlay
            layer={editingLayer}
            onCancel={() => setEditingTextId(null)}
            onDone={(text) => {
              patchLayer(editingLayer.id, { text });
              setEditingTextId(null);
            }}
          />
        )}
      </div>

      {selectedLayer && !editingLayer && (
        <LayerToolbar
          layer={selectedLayer}
          onChange={(patch) => patchLayer(selectedLayer.id, patch)}
          onEditText={() => setEditingTextId(selectedLayer.id)}
          onRemove={() => removeLayer(selectedLayer.id)}
        />
      )}

      {!selectedLayer && !editingLayer && (
        <div className="flex flex-none items-center gap-2 border-t border-line bg-surface px-3 py-2.5">
          <button
            type="button"
            onClick={addLayer}
            className="rounded-lg bg-ink px-3 py-2 text-[12px] text-paper-soft"
          >
            + 텍스트
          </button>
          <button
            type="button"
            disabled={coverBusy}
            onClick={() => coverInputRef.current?.click()}
            className="rounded-lg border border-line-strong bg-white px-3 py-2 text-[12px] disabled:opacity-50"
          >
            {coverBusy ? '올리는 중…' : photoUrl ? '사진 바꾸기' : '사진 올리기'}
          </button>
          <span className="ml-auto text-[11px] text-muted-soft">문구를 탭해서 옮기세요</span>
        </div>
      )}
    </div>
  );

  return (
    <EditorProvider value={editorValue}>
      <div className="flex h-dvh flex-col overflow-hidden bg-bg">
        <header className="z-30 flex h-[52px] flex-none items-center gap-2 border-b border-line bg-ink-deep px-2.5 text-paper">
          <Link to="/app" aria-label="대시보드로" className="px-2 py-1.5 text-[15px] text-muted">
            ←
          </Link>
          <input
            value={title}
            onChange={(e) => setField('core.share.title', e.target.value)}
            placeholder="제목 없음"
            className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 py-1.5 text-sm font-semibold text-paper outline-none focus:border-gold focus:bg-ink-mid"
          />
          <SaveState status={saveStatus} savedAt={savedAt} onRetry={() => void flush()} />
          <button
            type="button"
            onClick={async () => {
              await flush();
              navigate(`/app/i/${id}/publish`);
            }}
            className="flex-none rounded-md bg-paper px-3.5 py-2 text-[12px] font-semibold text-ink-deep"
          >
            발행
          </button>
        </header>

        <div className="relative min-h-0 flex-1 lg:flex">
          {/* xl — 섹션 구성을 항상 보이는 열로 */}
          <aside className="hidden w-[260px] flex-none overflow-y-auto border-r border-line p-3 xl:block">
            {sectionsPanel}
          </aside>

          {/* lg 이상 — 폼 열 */}
          <div className="hidden min-w-0 flex-1 overflow-y-auto p-5 lg:block">
            {panel.kind === 'form' && activeForm ? (
              <>
                <button
                  type="button"
                  onClick={() => setPanel({ kind: 'sections' })}
                  className="mb-3 text-[12px] text-muted xl:hidden"
                >
                  ← 구성으로
                </button>
                <h2 className="mb-4 text-[17px] font-bold tracking-[-.03em]">{activeForm.label}</h2>
                {formBody}
              </>
            ) : (
              <div className="xl:mx-auto xl:max-w-[520px]">
                <h2 className="mb-1.5 text-[17px] font-bold tracking-[-.03em]">커버 편집</h2>
                <p className="mb-4 text-[12.5px] leading-relaxed text-muted">
                  오른쪽 사진 위 문구를 끌어서 옮기고, 탭하면 서식을 바꿀 수 있어요.
                  <br />
                  다른 항목은 아래에서 편집하세요.
                </p>
                <div className="xl:hidden">{sectionsPanel}</div>
              </div>
            )}
          </div>

          {/* 프리뷰 — 미리보기(실제 뷰어) / 커버 편집 토글 */}
          <div className="flex h-full w-full flex-col lg:w-[clamp(340px,34vw,460px)] lg:flex-none lg:border-l lg:border-line">
            <div className="flex flex-none items-center gap-1 border-b border-line bg-surface px-1.5 py-1.5">
              <button
                type="button"
                onClick={() => setRightView('preview')}
                className={`rounded-md px-3 py-1.5 text-[12px] font-medium ${rightView === 'preview' ? 'bg-ink text-paper' : 'text-muted'}`}
              >
                미리보기
              </button>
              <button
                type="button"
                onClick={() => setRightView('cover')}
                className={`rounded-md px-3 py-1.5 text-[12px] font-medium ${rightView === 'cover' ? 'bg-ink text-paper' : 'text-muted'}`}
              >
                커버 편집
              </button>
              <span className="ml-auto pr-1 text-[10.5px] text-muted-faint">편집 즉시 반영</span>
            </div>

            <div className="relative min-h-0 flex-1">
              {/* 커버 편집 (사진 위 문구 드래그 배치)
                  폰 목업 테두리를 두면 편집 영역이 좁아진다 — 우측 열을 그대로 채운다 */}
              <div className={`absolute inset-0 ${rightView === 'cover' ? '' : 'hidden'}`}>
                {/* 활성일 때만 마운트한다 — 숨긴 채(display:none) 마운트하면 캔버스 크기를
                    0 으로 재어 글자가 0px(안 보임)·클릭 불가가 된다 */}
                <div className="h-full w-full overflow-hidden bg-surface">
                  {rightView === 'cover' && canvas}
                </div>
              </div>

              {/* 라이브 미리보기 (실제 하객 뷰어를 iframe 으로, 초안 실시간 반영) */}
              <div className={`absolute inset-0 ${rightView === 'preview' ? '' : 'hidden'}`}>
                <div className="h-full w-full overflow-hidden bg-ivory">
                  <iframe
                    data-luvi-preview
                    src="/i/?preview=1"
                    title="청첩장 미리보기"
                    className="h-full w-full border-0"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 모바일 바텀시트 */}
          <div className="lg:hidden">
            <BottomSheet
              title={sheetTitle}
              snap={snap}
              onSnapChange={setSnap}
              onDone={() => setSnap('peek')}
            >
              {panel.kind === 'sections' ? (
                sectionsPanel
              ) : (
                <div className="flex flex-col gap-4">
                  <button
                    type="button"
                    onClick={() => setPanel({ kind: 'sections' })}
                    className="self-start text-[12px] text-muted"
                  >
                    ← 구성으로
                  </button>
                  {formBody}
                </div>
              )}
            </BottomSheet>
          </div>
        </div>
      </div>
    </EditorProvider>
  );
}
