/**
 * C4 에디터 — 제품의 핵심 화면.
 *
 * 두 가지 편집 방식이 한 화면에 있습니다:
 *
 *  · **커버** — 사진 위 텍스트를 자유 배치 (드래그·정렬·색·크기·글꼴)
 *  · **나머지 섹션** — 매니페스트에서 생성되는 폼 + 섹션 추가/제거/순서 변경
 *
 * 레이아웃 3단 (`docs/05-design-brief.md §2`):
 *   xl ≥1280  섹션 목록 + 폼 + 프리뷰 (3열)
 *   lg 1024~  폼 + 프리뷰 (2열)
 *   md 이하    프리뷰 전체화면 + 바텀시트
 *
 * 모바일이 축소판이 아닌 이유: 폰에서는 프리뷰에 기기 프레임이 필요 없습니다. 폰 자체가
 * 프레임이고 커버가 1:1 실제 크기로 보이므로, 드래그 배치를 **실제로 보이는 크기에서**
 * 할 수 있습니다. 데스크톱보다 오히려 정확합니다.
 */
import { useCallback, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  CORE_SECTIONS,
  DEFAULT_SECTIONS,
  createTextLayer,
  defaultCoverLayers,
  type SectionDef,
  type SectionKey,
  type TextLayer,
} from '@luvi/schema';
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

export default function Editor() {
  const { id } = useParams<{ id: string }>();

  const [title, setTitle] = useState('호석 ♥ 송희');
  const [saveStatus] = useState<SaveStatus>('saved');

  // ── 섹션 ──
  const [sections, setSections] = useState<SectionKey[]>([...DEFAULT_SECTIONS]);

  // ── 커버 ──
  // TODO(실구현): 실제 청첩장 데이터에서 불러온다. 지금은 배치 동작 확인용 초기값.
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [layers, setLayers] = useState<TextLayer[]>(() =>
    defaultCoverLayers({
      eyebrow: 'The Wedding of',
      names: '호석 · 송희',
      dateLabel: '2026. 10. 24 SAT',
    }),
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);

  // ── 시트 ──
  const [panel, setPanel] = useState<PanelMode>({ kind: 'sections' });
  const [snap, setSnap] = useState<SheetSnap>('peek');

  const selectedLayer = layers.find((l) => l.id === selectedId) ?? null;
  const editingLayer = layers.find((l) => l.id === editingTextId) ?? null;

  const patchLayer = useCallback((layerId: string, patch: Partial<TextLayer>) => {
    setLayers((prev) => prev.map((l) => (l.id === layerId ? { ...l, ...patch } : l)));
  }, []);

  const removeLayer = useCallback((layerId: string) => {
    setLayers((prev) => prev.filter((l) => l.id !== layerId));
    setSelectedId(null);
  }, []);

  const addLayer = useCallback(() => {
    const layer = createTextLayer();
    setLayers((prev) => [...prev, layer]);
    setSelectedId(layer.id);
    setEditingTextId(layer.id);
  }, []);

  const formSections = useMemo(() => CORE_SECTIONS, []);
  const activeForm: SectionDef | undefined =
    panel.kind === 'form' ? formSections.find((s) => s.key === panel.formKey) : undefined;

  const openSectionForm = useCallback((key: SectionKey) => {
    const formKey = SECTION_TO_FORM[key];
    // 커버는 폼이 아니라 캔버스에서 직접 편집한다
    if (key === 'cover') {
      setPanel({ kind: 'sections' });
      setSnap('peek');
      return;
    }
    if (formKey) {
      setPanel({ kind: 'form', formKey });
      setSnap('full');
    }
  }, []);

  const sheetTitle = panel.kind === 'sections' ? '청첩장 구성' : (activeForm?.label ?? '편집');

  // ── 프리뷰 (커버 캔버스 + 서식 도구) ──
  const canvas = (
    <div className="relative flex h-full w-full flex-col">
      <div className="relative min-h-0 flex-1">
        <CoverCanvas
          photoUrl={photoUrl}
          layers={layers}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onChange={patchLayer}
          onEditText={setEditingTextId}
          // TODO(실구현): 업로더를 연결한다. 지금은 배치 동작을 볼 수 있게 샘플을 넣는다.
          onPickPhoto={() =>
            setPhotoUrl(
              'data:image/svg+xml;utf8,' +
                encodeURIComponent(
                  `<svg xmlns="http://www.w3.org/2000/svg" width="390" height="844">
                     <rect width="390" height="844" fill="#8A8175"/>
                   </svg>`,
                ),
            )
          }
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

      {photoUrl && !selectedLayer && !editingLayer && (
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
            onClick={() => setPhotoUrl(null)}
            className="rounded-lg border border-line-strong bg-white px-3 py-2 text-[12px]"
          >
            사진 바꾸기
          </button>
          <span className="ml-auto text-[11px] text-muted-soft">문구를 탭해서 옮기세요</span>
        </div>
      )}
    </div>
  );

  const sheetBody =
    panel.kind === 'sections' ? (
      <SectionManager
        active={sections}
        meta={SECTION_META}
        onReorder={setSections}
        onRemove={(key) => setSections((prev) => prev.filter((k) => k !== key))}
        onAdd={(key) => setSections((prev) => [...prev, key])}
        onEdit={openSectionForm}
      />
    ) : (
      <div className="flex flex-col gap-4">
        <button
          type="button"
          onClick={() => setPanel({ kind: 'sections' })}
          className="self-start text-[12px] text-muted"
        >
          ← 구성으로
        </button>
        {activeForm?.fields.map((f) => <FieldRenderer key={f.path} field={f} />)}
        {activeForm?.fields.length === 0 && (
          <p className="text-[13px] text-muted">이 섹션은 켜고 끄는 것만 정할 수 있어요.</p>
        )}
      </div>
    );

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-bg">
      <header className="z-30 flex h-[52px] flex-none items-center gap-2 border-b border-line bg-ink-deep px-2.5 text-paper">
        <Link to="/app" aria-label="대시보드로" className="px-2 py-1.5 text-[15px] text-muted">
          ←
        </Link>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="제목 없음"
          className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 py-1.5 text-sm font-semibold text-paper outline-none focus:border-gold focus:bg-ink-mid"
        />
        <SaveState status={saveStatus} />
        <Link
          to={`/app/i/${id}/publish`}
          className="flex-none rounded-md bg-paper px-3.5 py-2 text-[12px] font-semibold text-ink-deep"
        >
          발행
        </Link>
      </header>

      <div className="relative min-h-0 flex-1 lg:flex">
        {/* xl — 섹션 구성을 항상 보이는 열로 */}
        <aside className="hidden w-[260px] flex-none overflow-y-auto border-r border-line p-3 xl:block">
          <SectionManager
            active={sections}
            meta={SECTION_META}
            onReorder={setSections}
            onRemove={(key) => setSections((prev) => prev.filter((k) => k !== key))}
            onAdd={(key) => setSections((prev) => [...prev, key])}
            onEdit={openSectionForm}
          />
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
              <div className="flex max-w-[520px] flex-col gap-4">
                {activeForm.fields.map((f) => (
                  <FieldRenderer key={f.path} field={f} />
                ))}
              </div>
            </>
          ) : (
            <div className="xl:mx-auto xl:max-w-[520px]">
              <h2 className="mb-1.5 text-[17px] font-bold tracking-[-.03em]">커버 편집</h2>
              <p className="mb-4 text-[12.5px] leading-relaxed text-muted">
                오른쪽 사진 위 문구를 끌어서 옮기고, 탭하면 서식을 바꿀 수 있어요.
                <br />
                다른 섹션은 왼쪽 구성 목록에서 편집하세요.
              </p>
              <div className="xl:hidden">
                <SectionManager
                  active={sections}
                  meta={SECTION_META}
                  onReorder={setSections}
                  onRemove={(key) => setSections((prev) => prev.filter((k) => k !== key))}
                  onAdd={(key) => setSections((prev) => [...prev, key])}
                  onEdit={openSectionForm}
                />
              </div>
            </div>
          )}
        </div>

        {/* 프리뷰 · 커버 캔버스 */}
        <div className="h-full w-full lg:w-[clamp(340px,34vw,460px)] lg:flex-none lg:border-l lg:border-line">
          {/* 데스크톱은 실제 폭을 짐작할 수 없어 기기 프레임이 필요하다 */}
          <div className="hidden h-full items-center justify-center bg-ink-deep p-6 lg:flex">
            <div className="h-[min(840px,calc(100dvh-140px))] w-[calc(min(840px,100dvh-140px)*9/19)] flex-none rounded-phone-outer bg-black p-2 shadow-[0_40px_90px_-44px_rgba(0,0,0,.9)]">
              <div className="h-full w-full overflow-hidden rounded-phone bg-surface">{canvas}</div>
            </div>
          </div>
          {/* 모바일은 폰이 곧 프레임 — 커버가 실제 크기로 보인다 */}
          <div className="h-full lg:hidden">{canvas}</div>
        </div>

        {/* 모바일 바텀시트 */}
        <div className="lg:hidden">
          <BottomSheet
            title={sheetTitle}
            snap={snap}
            onSnapChange={setSnap}
            onDone={() => setSnap('peek')}
          >
            {sheetBody}
          </BottomSheet>
        </div>
      </div>
    </div>
  );
}
