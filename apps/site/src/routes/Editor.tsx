/**
 * C4 에디터 — 제품의 핵심 화면.
 *
 * 두 가지 편집 방식이 한 화면에 있습니다:
 *  · **커버** — 사진 위 텍스트를 자유 배치 (드래그·정렬·색·크기·글꼴)
 *  · **나머지 섹션** — 매니페스트에서 생성되는 폼 + 섹션 추가/제거/순서 변경
 *
 * 데이터 흐름: 진입 시 `api.invitations.get(id)` 로 초안(ContentDoc)을 불러오고,
 * 편집은 전부 `setField(path, value)` 하나로 모읍니다. 모인 변경분은 **저장을 누를 때만**
 * `api.invitations.updateDraft` 로 올라갑니다 (자동저장 없음 — 아래 '저장' 절 참고).
 * 저장해도 하객 화면은 그대로입니다. 그건 발행이 바꿉니다.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  CORE_SECTIONS,
  DEFAULT_SECTIONS,
  FONT_CATEGORY_LABEL,
  FONT_GROUPS,
  FONTS,
  LAYER_SIZE_RANGE,
  createTextLayer,
  normalizeGame,
  normalizeSectionBg,
  type AssetRef,
  type ContentDoc,
  type Features,
  type FieldDef,
  type LayerFont,
  type SectionDef,
  type SectionKey,
  normalizeSectionText,
  sectionBlocks,
  type SectionBlocks,
  type TextLayer,
  type ThemeId,
  type UpdateDraftBody,
} from '@luvi/schema';
import { api } from '@/lib/api';
import { assetUrl, env } from '@/lib/env';
import { logEvent } from '@/lib/log';
import { setPath } from '@/lib/paths';
import { uploadAudio, uploadImageForPath } from '@/lib/upload';
import { EditorProvider, type EditorContextValue } from '@/lib/editorContext';
import { BottomSheet, type SheetSnap } from '@/components/BottomSheet';
import { ColorControl } from '@/components/ColorControl';
import { CoverCanvas } from '@/components/CoverCanvas';
import { FieldRenderer } from '@/components/FieldRenderer';
import { LayerToolbar } from '@/components/LayerToolbar';
import { SaveState, type SaveStatus } from '@/components/SaveState';
import { SectionBgControl } from '@/components/SectionBgControl';
import { SectionBlocksControl } from '@/components/SectionBlocksControl';
import { SectionManager } from '@/components/SectionManager';
import { TextEditorOverlay } from '@/components/TextEditorOverlay';
import { FORM_TO_SECTION, SECTION_META, SECTION_TO_FORM } from '@/lib/sectionMeta';

/** 시트가 무엇을 보여주는지. 디자인의 panelList / panelEdit 에 대응한다 */
type PanelMode = { kind: 'sections' } | { kind: 'form'; formKey: string };

/** 섹션 목록에 없지만 항상 채워야 하는 코어 폼 (이름·예식·공유). 캔버스인 커버는 뺀다 */
const ALWAYS_FORMS: { formKey: string; label: string }[] = [
  { formKey: 'couple', label: '기본 정보' },
  { formKey: 'ceremony', label: '예식 정보' },
  { formKey: 'photos', label: '사진' },
  { formKey: 'effects', label: '연출' },
  { formKey: 'share', label: '공유 설정' },
];

/**
 * '사진' 폼 — 청첩장에 들어가는 사진을 **한 화면에 모아** 보여줍니다.
 *
 * 사진이 커버 캔버스·갤러리 섹션·마무리 섹션에 흩어져 있으면 어디서 무엇을 바꾸는지
 * 찾아다녀야 하고, 실제로 맨 아래 사진은 편집할 곳을 찾지 못해 커버 사진 그대로 발행되었습니다.
 *
 * 🔴 매니페스트에 사진 섹션을 새로 만들지 **않고** 기존 필드 정의를 참조합니다.
 *    같은 경로가 CORE_SECTIONS 에 두 번 들어가면 발행 요약(diff.ts)에 같은 항목이
 *    두 줄로 뜨고, 섹션을 뺐을 때의 검사 제외 규칙도 어긋납니다.
 */
const PHOTO_FIELDS: { path: string; label: string }[] = [
  // 라벨을 여기서 덮어씁니다 — 세 필드가 나란히 놓이면 갤러리의 원래 라벨('사진')만으로는
  // 커버·마지막 사진과 구분되지 않습니다. 각 섹션 폼에서는 원래 라벨이 그대로 쓰입니다.
  //
  // ⚠️ 이 묶음은 '사진' 칩으로 열었을 때만 보입니다. **마무리 카드는 자기 폼**으로 가서
  //    마지막 사진 하나만 보여줍니다 (`SECTION_TO_FORM.footer`) — 마무리를 편집하러
  //    들어왔는데 첫 화면 사진이 맨 위에 있으면 엉뚱한 사진을 바꾸게 됩니다.
  { path: 'core.cover.image', label: '커버 사진 · 첫 화면' },
  { path: 'core.gallery', label: '갤러리 사진' },
  { path: 'core.footer.image', label: '마지막 사진 · 맨 아래' },
];

/** 매니페스트에서 위 경로의 필드 정의를 찾아 '사진' 폼을 만듭니다 */
function buildPhotosForm(): SectionDef {
  const byPath = new Map<string, FieldDef>();
  for (const section of CORE_SECTIONS) {
    for (const field of section.fields) byPath.set(field.path, field);
  }
  return {
    key: 'photos',
    label: '사진',
    required: true,
    fields: PHOTO_FIELDS.flatMap(({ path, label }) => {
      const field = byPath.get(path);
      // 매니페스트에서 경로가 사라졌다면 빈칸을 그리는 대신 조용히 빠집니다 —
      // 없는 경로에 업로드하면 저장은 되는데 화면에 안 나오는 상태가 됩니다.
      return field ? [{ ...field, label }] : [];
    }),
  };
}

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

/**
 * 커버 캔버스 툴바의 사진 슬롯 버튼.
 *
 * 썸네일을 함께 보여주는 이유: 커버는 캔버스에 깔려 있어 결과가 보이지만, 마지막 사진은
 * 이 화면에 나타나지 않습니다. 라벨만 있으면 무엇을 바꿨는지 확인할 방법이 없어
 * 같은 사진을 두 번 올리는 일이 생깁니다.
 */
function PhotoSlotButton({
  label,
  url,
  busy,
  inherited,
  onClick,
}: {
  label: string;
  url: string | null;
  busy: boolean;
  /** 자기 사진이 없어 다른 사진을 물려받아 보여주는 중 */
  inherited?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className="flex items-center gap-2 rounded-lg border border-line-strong bg-white py-1.5 pl-1.5 pr-3 text-[12px] disabled:opacity-50"
    >
      {url ? (
        <img
          src={url}
          alt=""
          className={`h-7 w-7 flex-none rounded-md object-cover ${inherited ? 'opacity-60' : ''}`}
        />
      ) : (
        <span className="flex h-7 w-7 flex-none items-center justify-center rounded-md bg-surface-sunken text-[13px] text-muted">
          +
        </span>
      )}
      <span className="whitespace-nowrap">
        {busy ? '올리는 중…' : label}
        {!busy && inherited && <span className="text-muted-soft"> · 커버와 같음</span>}
      </span>
    </button>
  );
}

const pad = (n: number) => String(n).padStart(2, '0');
const timeLabel = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/**
 * 미니게임 설정의 빠진 값을 채워 폼에 넣습니다.
 *
 * 서버(`mergeContent`)도 같은 정규화를 하지만, **화면이 그것에 의존하면 안 됩니다** —
 * API 워커는 수동 배포라 사이트가 먼저 나갈 수 있고, 그때 폼은 빈칸인데 하객 화면에는
 * 기본 문구가 떠서 "설정에 없는 글이 화면에 있다" 가 됩니다. 여기서 채우면 폼에 보이는
 * 값이 항상 화면의 값입니다.
 *
 * 이것만으로는 초안이 '변경됨' 이 되지 않습니다 (저장은 사용자가 필드를 고칠 때).
 */
function withGameDefaults(draft: ContentDoc): ContentDoc {
  return {
    ...draft,
    theme: {
      ...draft.theme,
      classic1: { ...draft.theme.classic1, game: normalizeGame(draft.theme.classic1?.game) },
    },
  };
}

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
  const footerInputRef = useRef<HTMLInputElement>(null);

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
        setDoc(withGameDefaults(res.data.draft));
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

  // ─────────────── 저장 (자동저장 없음) ───────────────
  /**
   * 편집은 **화면 상태만** 바꿉니다. 서버 초안은 저장을 눌러야 바뀝니다.
   *
   * 예전에는 900ms 디바운스 자동저장이었습니다. 그러면 실수가 곧바로 원본에 새겨집니다 —
   * 초안이 유일한 원본이라 잘못 지운 문구를 되찾을 지점이 남지 않습니다. 실제로 테스트가
   * 인사말을 덮어쓴 뒤 그대로 발행돼 하객 화면까지 나간 사고가 있었습니다.
   *
   * 대신 우측 미리보기는 저장 여부와 무관하게 즉시 반영됩니다(로컬 상태를 iframe 에 보냅니다).
   * 저장하지 않은 변경은 **새로고침·탭 닫기·화면 이탈에서 경고 후 사라집니다.**
   */
  const pendingPatch = useRef<Record<string, unknown>>({});
  const pendingSections = useRef<SectionKey[] | null>(null);
  const pendingFeatures = useRef<Partial<Features> | null>(null);

  /** 저장할 게 남았는지. 저장 버튼·이탈 경고가 이 값을 보므로 ref 가 아니라 state 입니다 */
  const [dirty, setDirty] = useState(false);

  const markDirty = useCallback(() => {
    setDirty(true);
    setSaveStatus('dirty');
  }, []);

  /** 저장. 성공 여부를 돌려줍니다 — 발행 화면으로 넘기기 전에 확인해야 합니다 */
  const save = useCallback(async (): Promise<boolean> => {
    const patch = pendingPatch.current;
    const secs = pendingSections.current;
    const feats = pendingFeatures.current;
    if (Object.keys(patch).length === 0 && !secs && !feats) return true;

    pendingPatch.current = {};
    pendingSections.current = null;
    pendingFeatures.current = null;

    setSaveStatus('saving');
    const body: UpdateDraftBody = { patch };
    if (secs) body.sections = secs;
    if (feats) body.features = feats;

    const res = await api.invitations.updateDraft(id, body);
    logEvent({
      kind: res.ok ? 'click' : 'error',
      name: 'draft_save',
      ok: res.ok,
      invitationId: id,
      detail: res.ok ? `${Object.keys(patch).length}개 항목` : `${res.error.code} ${res.error.message}`,
    });
    if (res.ok) {
      setDirty(false);
      setSaveStatus('saved');
      setSavedAt(timeLabel(res.data.updatedAt));
      return true;
    }

    // 실패한 변경분을 되돌려 넣습니다 — 다시 저장을 누르면 그대로 올라갑니다
    pendingPatch.current = { ...patch, ...pendingPatch.current };
    if (secs && !pendingSections.current) pendingSections.current = secs;
    if (feats) pendingFeatures.current = { ...feats, ...(pendingFeatures.current ?? {}) };
    setSaveStatus('error');
    return false;
  }, [id]);

  const setField = useCallback(
    (path: string, value: unknown) => {
      setDoc((d) => (d ? setPath(d, path, value) : d));
      pendingPatch.current[path] = value;
      markDirty();
    },
    [markDirty],
  );

  const queueSections = useCallback(
    (next: SectionKey[]) => {
      setSections(next);
      pendingSections.current = next;
      markDirty();
    },
    [markDirty],
  );

  const queueFeature = useCallback(
    (key: keyof Features, value: boolean) => {
      setFeatures((f) => ({ ...f, [key]: value }));
      pendingFeatures.current = { ...(pendingFeatures.current ?? {}), [key]: value };
      markDirty();
    },
    [markDirty],
  );

  // 저장하지 않은 채 새로고침·탭 닫기를 막습니다 (자동저장이 없으니 그대로 사라집니다)
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // 문구는 브라우저가 정한 것으로 대체됩니다. 값을 넣어야 옛 브라우저에서도 뜹니다
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  /** 화면을 벗어나기 전 확인 — 링크 이동은 beforeunload 가 잡지 못합니다 */
  const confirmLeave = useCallback(() => {
    if (!dirty) return true;
    return window.confirm('저장하지 않은 변경이 있습니다.\n지금 나가면 사라집니다. 나갈까요?');
  }, [dirty]);

  // ⌘S · Ctrl+S — 문서 편집기의 손버릇이 그대로 통해야 합니다
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void save();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [save]);

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

  /**
   * 맨 아래 '마무리' 사진. 비워두면 뷰어가 커버 사진을 씁니다
   * (`apps/invitation/src/lib/adapter.ts`) — 그래서 여기서도 커버를 물려받아 보여줍니다.
   */
  const footerImage = doc?.core.footer?.image ?? null;
  const footerUrl = footerImage ? assetUrl(footerImage.key) : photoUrl;

  /**
   * 커버 사진과 마지막 사진은 업로드 절차가 같아 한 함수로 둡니다.
   *
   * 두 장을 **같은 화면에서** 바꿀 수 있어야 합니다 — 처음과 끝은 짝이라 한자리에서
   * 고르게 되고, 마지막 사진만 다른 곳에 숨겨두면 커버만 바꾼 채 발행됩니다.
   */
  const [photoBusy, setPhotoBusy] = useState<'cover' | 'footer' | null>(null);
  const onPhotoFile = async (slot: 'cover' | 'footer', file: File | undefined) => {
    if (!file) return;
    const path = slot === 'cover' ? 'core.cover.image' : 'core.footer.image';
    const input = slot === 'cover' ? coverInputRef : footerInputRef;
    setPhotoBusy(slot);
    try {
      const ref: AssetRef = await uploadImageForPath(id, path, file);
      setField(path, ref);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : '사진 업로드에 실패했습니다');
    } finally {
      setPhotoBusy(null);
      if (input.current) input.current.value = '';
    }
  };

  // ─────────────── 섹션 배경색 ───────────────
  /**
   * 섹션마다 고른 배경색 (`core.design.sectionBg`).
   *
   * 이 필드가 생기기 전 문서에는 `design` 이 아예 없어서 `?.` 로 읽습니다.
   * 빈 문자열('')은 지우고 **'고르지 않음'** 을 뜻하므로 그대로 넘깁니다 — 컨트롤이
   * '디자인 기본' 칩을 켜진 상태로 보여줘야 합니다 (없는 값과 같은 뜻입니다).
   */
  const sectionBg = doc?.core.design?.sectionBg ?? {};
  /**
   * 카드마다 고른 문구 (`core.sectionText`). 빈 문자열 = 그 디자인의 기본 문구.
   *
   * 색과 같은 형태로 둡니다 — 섹션 키 아래에 값을 하나씩 넣고, 읽는 쪽이 "비었으면 기본"
   * 한 가지 규칙으로만 판단합니다 (`resolveSectionText`).
   */
  const sectionText = doc?.core.sectionText ?? {};
  /**
   * 🔴 **카드 하나의 문구를 통째로** 씁니다 (칸 하나씩이 아닙니다).
   *
   * 문구는 순서가 있는 목록이라, 지운 줄·옮긴 줄을 표현하려면 배열 전체를 보내야 합니다.
   * 워커의 `mergeContent` 는 배열을 통째로 대체하므로 **빈 배열(= 전부 지움)도 그대로**
   * 저장됩니다 — 키 단위로 보내면 지운 줄이 기본값으로 되살아납니다.
   */
  const setSectionText = useCallback(
    (key: SectionKey, next: Required<SectionBlocks>) =>
      setField(`core.sectionText.${key}`, next),
    [setField],
  );

  /** 미리보기에서 누른 문구 — 왼쪽 목록에서 그 줄을 골라 둡니다 (커서는 미리보기에 있습니다) */
  const [selectBlockId, setSelectBlockId] = useState<string | null>(null);

  /**
   * 미리보기에서 **그 자리에서 고친 글자**를 초안에 반영합니다.
   *
   * 화면에 보이는 목록(`sectionBlocks`)을 기준으로 그 id 를 찾아 글자만 갈아끼웁니다 —
   * 아직 저장된 값이 없는(디자인 기본 문구) 카드도 이 경로로 첫 편집이 값으로 굳습니다.
   * 이미 지워진 줄이면 아무것도 하지 않습니다(미리보기가 한 박자 늦게 올 수 있습니다).
   */
  const applyBlockEdit = useCallback(
    (section: SectionKey, zone: string, id: string, text: string) => {
      if (zone !== 'head' && zone !== 'foot') return;
      const current = sectionBlocks(themeId, section, normalizeSectionText(doc?.core.sectionText));
      const list = current[zone];
      if (!list.some((b) => b.id === id)) return;
      setField(`core.sectionText.${section}`, {
        ...current,
        [zone]: list.map((b) => (b.id === id ? { ...b, text } : b)),
      });
    },
    [doc, themeId, setField],
  );

  const setSectionBg = useCallback(
    (key: SectionKey, color: string) => setField(`core.design.sectionBg.${key}`, color),
    [setField],
  );

  // ─────────────── 폼 ───────────────
  const formSections = useMemo(() => [...CORE_SECTIONS, buildPhotosForm()], []);
  const activeForm: SectionDef | undefined =
    panel.kind === 'form' ? formSections.find((s) => s.key === panel.formKey) : undefined;

  /**
   * 지금 열린 폼이 **어느 섹션**의 것인지 — 배경색·카드 문구는 섹션 단위 값입니다.
   * 섹션이 아닌 폼(기본 정보·연출·공유 설정)과 청첩장에서 빼둔 섹션은 `null` 이라
   * 두 컨트롤이 모두 뜨지 않습니다 (보이지 않는 섹션을 꾸미게 하지 않습니다).
   */
  const formSectionKey: SectionKey | null = useMemo(() => {
    const key = activeForm ? FORM_TO_SECTION[activeForm.key] : undefined;
    return key && sections.includes(key) ? key : null;
  }, [activeForm, sections]);

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
      const data = e.data as {
        __luviSectionClick?: SectionKey;
        __luviBlockClick?: { section: SectionKey; zone: string; id: string };
        __luviBlockEdit?: { section: SectionKey; zone: string; id: string; text: string };
      } | null;

      // 미리보기에서 직접 고친 글자
      const edit = data?.__luviBlockEdit;
      if (edit?.section) {
        applyBlockEdit(edit.section, edit.zone, edit.id, edit.text);
        return;
      }

      /**
       * 글자를 눌렀다 — 그 카드를 열고 목록에서 그 줄을 **고르기만** 한다.
       * 🔴 왼쪽 입력칸에 `focus()` 를 걸면 안 된다: 커서는 방금 누른 미리보기의 글자에
       *    있는데, 부모 문서의 요소에 포커스를 주면 iframe 의 커서를 빼앗아 타이핑이 끊긴다.
       */
      const block = data?.__luviBlockClick;
      if (block?.section) {
        openSectionForm(block.section);
        setSelectBlockId(block.id);
        return;
      }

      const key = data?.__luviSectionClick;
      if (!key) return;
      if (key === 'cover') setRightView('cover');
      else openSectionForm(key);
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [openSectionForm, applyBlockEdit]);

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
        // 카드에 색 점을 찍어, 어느 섹션에 색을 넣었는지 목록에서 바로 보이게 합니다
        bg={normalizeSectionBg(sectionBg)}
        onReorder={queueSections}
        onRemove={(key) => queueSections(sections.filter((k) => k !== key))}
        onAdd={(key) => queueSections([...sections, key])}
        onEdit={openSectionForm}
      />
    </div>
  );

  const formBody = activeForm ? (
    <div className="flex max-w-[520px] flex-col gap-4">
      {/* 배경색은 섹션 전체에 걸리는 값이라 필드들 위에 둡니다 */}
      {formSectionKey && (
        <>
          {/* 카드에 적힌 글자 — 화면에서 가장 먼저 눈에 띄는 값이라 맨 위에 둡니다 */}
          <SectionBlocksControl
            themeId={themeId}
            sectionKey={formSectionKey}
            label={SECTION_META[formSectionKey].label}
            stored={sectionText}
            onChange={(next) => setSectionText(formSectionKey, next)}
            selectBlockId={selectBlockId}
            onSelectHandled={() => setSelectBlockId(null)}
          />
          <SectionBgControl
            themeId={themeId}
            sectionKey={formSectionKey}
            label={SECTION_META[formSectionKey].label}
            value={sectionBg[formSectionKey] ?? ''}
            onChange={(color) => setSectionBg(formSectionKey, color)}
          />
        </>
      )}

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
                <ColorControl
                  value={layer.color}
                  onChange={(color) => patchLayer(layer.id, { color })}
                />
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
      {/* 사진을 모아 보여주는 폼 — 여기에 없는 사진은 어디 있는지 알려준다 */}
      {activeForm.key === 'photos' && (
        <p className="text-[12px] leading-relaxed text-muted">
          커버 문구의 위치는 “커버” 편집에서 끌어 옮기고, 카톡 미리보기 사진은 “공유 설정”에
          있어요.
        </p>
      )}

      {activeForm.fields.length === 0 && activeForm.key !== 'effects' && activeForm.key !== 'cover' && (
        <p className="text-[13px] text-muted">
          {formSectionKey
            ? '이 섹션은 위의 문구·배경색과 켜고 끄는 것만 정할 수 있어요.'
            : '이 섹션은 켜고 끄는 것만 정할 수 있어요.'}
        </p>
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
        onChange={(e) => void onPhotoFile('cover', e.target.files?.[0])}
      />
      <input
        ref={footerInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => void onPhotoFile('footer', e.target.files?.[0])}
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
        <div className="flex flex-none flex-wrap items-center gap-2 border-t border-line bg-surface px-3 py-2.5">
          <button
            type="button"
            onClick={addLayer}
            className="rounded-lg bg-ink px-3 py-2 text-[12px] text-paper-soft"
          >
            + 텍스트
          </button>
          {/* 첫 사진(커버) · 끝 사진(마무리) — 순서대로 둔다 */}
          <PhotoSlotButton
            label="커버 사진"
            url={photoUrl}
            busy={photoBusy === 'cover'}
            onClick={() => coverInputRef.current?.click()}
          />
          <PhotoSlotButton
            label="마지막 사진"
            url={footerUrl}
            // 커버를 물려받아 보여주는 중이라는 표시 — 바꾸면 마무리에만 적용된다
            inherited={!footerImage && !!photoUrl}
            busy={photoBusy === 'footer'}
            onClick={() => footerInputRef.current?.click()}
          />
          <span className="ml-auto text-[11px] text-muted-soft">문구를 탭해서 옮기세요</span>
        </div>
      )}
    </div>
  );

  return (
    <EditorProvider value={editorValue}>
      <div className="flex h-dvh flex-col overflow-hidden bg-bg">
        <header className="z-30 flex h-[52px] flex-none items-center gap-2 border-b border-line bg-ink-deep px-2.5 text-paper">
          <Link
            to="/app"
            aria-label="대시보드로"
            onClick={(e) => {
              if (!confirmLeave()) e.preventDefault();
            }}
            className="px-2 py-1.5 text-[15px] text-muted"
          >
            ←
          </Link>
          <input
            value={title}
            onChange={(e) => setField('core.share.title', e.target.value)}
            placeholder="제목 없음"
            className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 py-1.5 text-sm font-semibold text-paper outline-none focus:border-gold focus:bg-ink-mid"
          />
          <SaveState status={saveStatus} savedAt={savedAt} onRetry={() => void save()} />
          <button
            type="button"
            onClick={() => void save()}
            disabled={!dirty || saveStatus === 'saving'}
            className={`flex-none rounded-md px-3.5 py-2 text-[12px] font-semibold ${
              dirty
                ? 'bg-gold text-ink-deep'
                : 'border border-line-strong/40 text-muted-faint'
            } disabled:cursor-default`}
          >
            {saveStatus === 'saving' ? '저장 중…' : '저장'}
          </button>
          <button
            type="button"
            onClick={async () => {
              // 발행은 **서버에 저장된 초안**을 내보냅니다. 저장하지 않은 변경을 두고 넘어가면
              // "고쳤는데 왜 안 바뀌지?" 가 그대로 재발합니다 → 저장부터 시킵니다.
              if (dirty) {
                const go = window.confirm(
                  '저장하지 않은 변경이 있습니다.\n저장하고 발행 화면으로 갈까요?',
                );
                if (!go) return;
                if (!(await save())) {
                  window.alert('저장에 실패해 이동하지 않았습니다. 잠시 뒤 다시 시도해주세요.');
                  return;
                }
              }
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
                  첫 화면(커버)과 맨 아래 마지막 사진은 오른쪽 아래 버튼에서 바꿉니다.
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
