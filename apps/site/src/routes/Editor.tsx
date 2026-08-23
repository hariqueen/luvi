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
  COVER_ZONE,
  LAYER_SIZE_RANGE,
  createTextLayer,
  normalizeGame,
  normalizeSectionBg,
  type ContentDoc,
  type Features,
  type LayerAlign,
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
import { env } from '@/lib/env';
import { logEvent } from '@/lib/log';
import { getPath, setPath } from '@/lib/paths';
import { uploadAudio, uploadImageForPath } from '@/lib/upload';
import { EditorProvider, type EditorContextValue } from '@/lib/editorContext';
import { BottomSheet, type SheetSnap } from '@/components/BottomSheet';
import { ColorControl } from '@/components/ColorControl';
import { FieldRenderer } from '@/components/FieldRenderer';
import { SaveState, type SaveStatus } from '@/components/SaveState';
import { SectionBgControl } from '@/components/SectionBgControl';
import { BlockToolbar, type BlockTarget } from '@/components/BlockToolbar';
import { SectionManager } from '@/components/SectionManager';
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

/** 커버 문구 정렬 — align 은 좌표의 **기준점**도 바꾼다 (`alignTransform`) */
const LAYER_ALIGNS: { value: LayerAlign; label: string }[] = [
  { value: 'left', label: '⇤' },
  { value: 'center', label: '↔' },
  { value: 'right', label: '⇥' },
];

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
  const previewReady = useRef(false);

  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [savedAt, setSavedAt] = useState<string | undefined>();

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
    (layerId: string) => setLayers(layers.filter((l) => l.id !== layerId)),
    [layers, setLayers],
  );
  /**
   * 커버 문구 한 줄 추가. 기본 문구('문구를 입력하세요')가 미리보기 가운데에 나타나므로,
   * 곧바로 그 글자를 눌러 고치고 끌어서 옮깁니다 — 여기서 편집 상태를 잡아둘 필요가 없습니다.
   */
  const addLayer = useCallback(() => {
    setLayers([...layers, createTextLayer()]);
  }, [layers, setLayers]);

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

  /**
   * 미리보기에서 누른 문구 — 미리보기 **바로 아래 툴바**가 이 문구의 서식을 다룹니다.
   * 왼쪽 폼에는 문구 편집을 두지 않습니다 (같은 일을 하는 자리가 두 곳이 되면 어느 쪽이
   * 원본인지 헷갈립니다 — `BlockToolbar` 주석).
   */
  const [blockTarget, setBlockTarget] = useState<BlockTarget | null>(null);

  /**
   * 미리보기에서 **그 자리에서 고친 글자**를 초안에 반영합니다.
   *
   * 화면에 보이는 목록(`sectionBlocks`)을 기준으로 그 id 를 찾아 글자만 갈아끼웁니다 —
   * 아직 저장된 값이 없는(디자인 기본 문구) 카드도 이 경로로 첫 편집이 값으로 굳습니다.
   * 이미 지워진 줄이면 아무것도 하지 않습니다(미리보기가 한 박자 늦게 올 수 있습니다).
   */
  /**
   * 미리보기에서 **끌어서 놓은 자리**를 초안에 반영합니다.
   *
   * 좌표는 카드 박스 기준 비율입니다 — 하객의 폰 폭이 달라도 같은 자리에 놓이도록
   * (`apps/invitation` 의 `blockDrag.ts`). `pos` 가 붙으면 그 문구는 흐름에서 빠져나와
   * 절대 배치됩니다. 되돌리는 길은 툴바의 '흐름으로' 입니다.
   */
  const applyBlockPlace = useCallback(
    (section: SectionKey, zone: string, id: string, x: number, y: number) => {
      // 커버 문구는 카드 문구(sectionText)가 아니라 자유 배치 레이어(core.cover.layers)다
      if (section === 'cover') {
        if (zone === COVER_ZONE) patchLayer(id, { x, y });
        return;
      }
      if (zone !== 'head' && zone !== 'foot') return;
      const current = sectionBlocks(themeId, section, normalizeSectionText(doc?.core.sectionText));
      if (!current[zone].some((b) => b.id === id)) return;
      setField(`core.sectionText.${section}`, {
        ...current,
        [zone]: current[zone].map((b) => (b.id === id ? { ...b, pos: { x, y } } : b)),
      });
    },
    [doc, themeId, setField, patchLayer],
  );

  /**
   * 미리보기에서 고친 **초안 값** — 인사말·말풍선·오시는 길처럼 폼에 있던 글자들.
   *
   * `path` 는 폼의 입력칸이 쓰는 것과 같은 점 경로라, 미리보기에서 고쳐도 저장·이력·
   * 자동저장이 폼에서 고친 것과 완전히 같은 길을 지납니다.
   *
   * 🔴 **배열 인덱스가 낀 경로는 그대로 저장할 수 없습니다** (`core.location.transport.0.desc`).
   *    저장 경로는 배열을 통째로만 받습니다(`lib/paths.ts` 주석) — 인덱스를 그대로 보내면
   *    배열이 `{"0": …}` 객체로 바뀌어 순서와 반복이 깨집니다. 그래서 그 배열을 새로 만들어
   *    **배열 경로로** 씁니다. 항목 안에 또 배열이 있는 경우(계좌 그룹 → 항목)도 같은
   *    방식으로 따라 내려갑니다.
   *
   * 모르는 모양의 경로는 무시합니다 — 미리보기는 같은 출처지만, 저장 경로에 아무 값이나
   * 쓰이는 길을 열어두지 않습니다.
   */
  const applyFieldEdit = useCallback(
    (path: string, value: string) => {
      if (!/^(core|theme)\.[A-Za-z0-9_.]+$/.test(path)) return;

      const segments = path.split('.');
      const at = segments.findIndex((seg) => /^\d+$/.test(seg));
      if (at === -1) {
        setField(path, value);
        return;
      }

      /** 배열을 배열로 유지하며 깊은 곳에 값을 씁니다 (`setPath` 는 배열을 객체로 만듭니다) */
      const setDeep = (target: unknown, segs: string[], next: unknown): unknown => {
        if (segs.length === 0) return next;
        const [head, ...rest] = segs;
        if (Array.isArray(target)) {
          const i = Number(head);
          if (!Number.isInteger(i) || i < 0 || i >= target.length) return target;
          return target.map((item, k) => (k === i ? setDeep(item, rest, next) : item));
        }
        const obj = (target && typeof target === 'object' ? target : {}) as Record<string, unknown>;
        return { ...obj, [String(head)]: setDeep(obj[String(head)], rest, next) };
      };

      const arrayPath = segments.slice(0, at).join('.');
      const list = getPath(doc, arrayPath);
      if (!Array.isArray(list)) return;
      setField(arrayPath, setDeep(list, segments.slice(at), value));
    },
    [doc, setField],
  );

  const applyBlockEdit = useCallback(
    (section: SectionKey, zone: string, id: string, text: string) => {
      if (section === 'cover') {
        if (zone === COVER_ZONE) patchLayer(id, { text });
        return;
      }
      if (zone !== 'head' && zone !== 'foot') return;
      const current = sectionBlocks(themeId, section, normalizeSectionText(doc?.core.sectionText));
      const list = current[zone];
      if (!list.some((b) => b.id === id)) return;
      setField(`core.sectionText.${section}`, {
        ...current,
        [zone]: list.map((b) => (b.id === id ? { ...b, text } : b)),
      });
    },
    [doc, themeId, setField, patchLayer],
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
        // 커버도 다른 섹션과 같다 — 폼은 문구 목록·서식, 위치와 글자는 미리보기에서
        openForm('cover');
        return;
      }
      const formKey = SECTION_TO_FORM[key];
      if (formKey) openForm(formKey);
    },
    [openForm],
  );

  // 미리보기(iframe)에서 섹션을 클릭하면 해당 편집을 연다 (커버도 다른 섹션과 같다).
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      const data = e.data as {
        __luviSectionClick?: SectionKey;
        __luviBlockClick?: { section: SectionKey; zone: string; id: string };
        __luviBlockEdit?: { section: SectionKey; zone: string; id: string; text: string };
        __luviFieldEdit?: { path: string; value: string };
        __luviBlockPlace?: {
          section: SectionKey;
          zone: string;
          id: string;
          x: number;
          y: number;
        };
      } | null;

      // 미리보기에서 고친 초안 값 (인사말·말풍선·오시는 길 …)
      const field = data?.__luviFieldEdit;
      if (field?.path) {
        applyFieldEdit(field.path, field.value);
        return;
      }

      // 미리보기에서 끌어서 놓은 문구
      const placed = data?.__luviBlockPlace;
      if (placed?.section) {
        applyBlockPlace(placed.section, placed.zone, placed.id, placed.x, placed.y);
        return;
      }

      // 미리보기에서 직접 고친 글자
      const edit = data?.__luviBlockEdit;
      if (edit?.section) {
        applyBlockEdit(edit.section, edit.zone, edit.id, edit.text);
        return;
      }

      /**
       * 글자를 눌렀다 — 미리보기 아래 툴바가 그 문구를 잡는다.
       * 🔴 부모 문서의 입력칸에 `focus()` 를 걸면 안 된다: 커서는 방금 누른 미리보기의
       *    글자에 있는데, 여기로 포커스를 옮기면 iframe 의 커서를 빼앗아 타이핑이 끊긴다.
       */
      const block = data?.__luviBlockClick;
      if (block?.section) {
        openSectionForm(block.section);
        if (block.zone === 'head' || block.zone === 'foot') {
          setBlockTarget({ section: block.section, zone: block.zone, id: block.id });
        }
        return;
      }

      const key = data?.__luviSectionClick;
      if (key) openSectionForm(key);
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [openSectionForm, applyBlockEdit, applyBlockPlace, applyFieldEdit]);

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

  /** 이 카드의 글자를 미리보기에서 고치는지 — 폼에서 입력칸이 사라진 이유를 한 줄로 알립니다 */
  const hasPreviewText = (fields: FieldDef[]): boolean =>
    fields.some((f) => f.previewEdit || (f.fields ? hasPreviewText(f.fields) : false));

  const formBody = activeForm ? (
    <div className="flex max-w-[520px] flex-col gap-4">
      {hasPreviewText(activeForm.fields) && (
        <p className="rounded-lg border border-line bg-surface px-3 py-2 text-[11.5px] leading-relaxed text-muted">
          이 카드의 <b className="font-semibold text-ink-soft">글자는 오른쪽 미리보기에서</b> 눌러
          고칩니다 — 색·정렬·글씨체는 미리보기 아래 툴바에서 바꿔요.
        </p>
      )}
      {/* 배경색은 섹션 전체에 걸리는 값이라 필드들 위에 둡니다 */}
      {formSectionKey && (
        <>
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
                {/* 정렬 — 끌어서 놓은 자리의 기준점이 함께 바뀝니다 */}
                <div className="flex gap-0.5 rounded-lg bg-surface-sunken p-0.5">
                  {LAYER_ALIGNS.map((a) => (
                    <button
                      key={a.value}
                      type="button"
                      aria-label={`${a.value} 정렬`}
                      onClick={() => patchLayer(layer.id, { align: a.value })}
                      className={`rounded-md px-2.5 py-1.5 text-[12px] ${
                        layer.align === a.value
                          ? 'bg-white font-semibold shadow-sm'
                          : 'text-ink-soft'
                      }`}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
                {/* 그림자 — 밝은 사진 위에 흰 글씨를 얹었을 때 읽히게 합니다 */}
                <button
                  type="button"
                  onClick={() => patchLayer(layer.id, { shadow: !layer.shadow })}
                  className={`rounded-lg px-2.5 py-2 text-[11.5px] ${
                    layer.shadow ? 'bg-ink text-paper-soft' : 'bg-surface-sunken text-ink-soft'
                  }`}
                >
                  그림자
                </button>
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
            위치는 오른쪽 미리보기에서 문구 왼쪽의 손잡이(⠿)를 끌어 옮기세요. 글자는 미리보기에서
            눌러 바로 고칠 수 있어요.
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
          커버 문구의 위치는 오른쪽 미리보기에서 끌어 옮기고, 카톡 미리보기 사진은 “공유 설정”에
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
                <h2 className="mb-1.5 text-[17px] font-bold tracking-[-.03em]">
                  미리보기에서 바로 고치세요
                </h2>
                <p className="mb-4 text-[12.5px] leading-relaxed text-muted">
                  오른쪽 미리보기의 글자를 눌러 그 자리에서 고치고, 왼쪽 손잡이(⠿)를 끌어 옮깁니다.
                  색·정렬·글씨체는 미리보기 아래 툴바에 있어요.
                  <br />
                  사진은 “사진”, 카톡 미리보기는 “공유 설정”에서 바꿉니다.
                  <br />
                  카드를 누르면 그 항목 편집이 열립니다.
                </p>
                <div className="xl:hidden">{sectionsPanel}</div>
              </div>
            )}
          </div>

          {/*
            프리뷰 — 실제 뷰어를 iframe 으로 띄웁니다. 편집은 전부 이 안에서 합니다:
            글자는 눌러서 고치고, 위치는 손잡이(⠿)를 끌어서, 서식은 아래 툴바에서.

            🔴 예전에는 여기 [미리보기] / [커버 편집] 탭이 있었습니다. 커버 문구만 별도 캔버스에서
               편집했는데, 카드 문구가 미리보기에서 직접 편집되게 바뀐 뒤로는 **같은 일을 하는
               화면이 두 개**가 됐습니다. 이제 커버 문구도 미리보기에서 다루므로 탭을 없앴습니다
               (커버 문구 렌더·배선은 뷰어의 `CoverLayers`).
          */}
          <div className="flex h-full w-full flex-col lg:w-[clamp(340px,34vw,460px)] lg:flex-none lg:border-l lg:border-line">
            <div className="flex flex-none items-center gap-1 border-b border-line bg-surface px-3 py-2">
              <span className="text-[12px] font-medium text-ink">미리보기</span>
              <span className="ml-auto text-[10.5px] text-muted-faint">편집 즉시 반영</span>
            </div>

            <div className="relative min-h-0 flex-1">
              {/* 라이브 미리보기 (실제 하객 뷰어를 iframe 으로, 초안 실시간 반영) */}
              <div className="absolute inset-0">
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

            {/* 문구 툴바 — 미리보기 **바로 아래**. 글자를 누른 자리에서 눈을 떼지 않고
                색·정렬·글씨체를 바꿉니다 (왼쪽 폼에는 문구 편집을 두지 않습니다) */}
            <BlockToolbar
              themeId={themeId}
              target={blockTarget}
              addTo={formSectionKey ?? null}
              addToLabel={formSectionKey ? SECTION_META[formSectionKey].label : undefined}
              stored={sectionText}
              onChange={setSectionText}
              onSelect={setBlockTarget}
            />
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
