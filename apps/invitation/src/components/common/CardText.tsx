/**
 * 카드 문구 그리기 — **미리보기에서 그 자리에서 고치고, 끌어서 원하는 자리에 놓습니다.**
 *
 * 문구는 "칸" 이 아니라 목록입니다(`@luvi/schema` 의 `sectionText.ts`). 두 가지 배치가 섞입니다:
 *
 *  · **흐름 배치** — `pos` 가 없는 블록. 카드 위(head)·콘텐츠 아래(foot)에서 위→아래로 쌓입니다.
 *  · **자유 배치** — `pos` 가 있는 블록. 카드 박스 기준 비율 좌표에 절대 배치됩니다(`FreeText`).
 *    끌어서 옮기면 이 상태가 됩니다.
 *
 * 🔴 **블록이 없으면 아무것도 렌더하지 않습니다.** 예전에는 빈 문자열을 받아도 래퍼
 *    `<div className="mb-2">` 가 남아서, 문구를 지워도 **그 자리의 여백이 남았습니다.**
 *
 * ─── 미리보기에서 직접 고치기 ────────────────────────────────────────────────
 *
 * 글자 자체가 `contentEditable` 입니다. 브라우저가 누른 지점에 커서를 놓아주므로 별도
 * 활성화 단계가 없습니다. **편집 중인 요소의 DOM 은 다시 쓰지 않습니다** — 타이핑 →
 * 초안 갱신 → 초안이 미리보기로 되돌아옴 → 같은 글자를 다시 넣으면 커서가 맨 앞으로
 * 튑니다. 그래서 `textContent` 는 포커스가 없을 때만 맞춥니다.
 *
 * 옮기기는 **손잡이(⠿)** 로 갈라둡니다. 글자에서 바로 끌면 contentEditable 의 '글자 선택'
 * 과 부딪힙니다 (`blockDrag.ts`).
 *
 * 크기·색·글씨체는 블록에 값이 있을 때만 덮습니다 — 손대지 않은 문구는 디자인을 바꾸면
 * 같이 따라와야 합니다. `scale` 은 배율이라 `em` 으로 겁니다.
 */
import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import {
  FONT_STACK,
  alignTransform,
  ensureFonts,
  type LayerAlign,
  type SectionBlock,
  type SectionKey,
  type SectionTextRole,
  type SectionZone,
} from '@luvi/schema';
import { IS_PREVIEW, notifyBlockEdit } from './PreviewSlot';
import { startBlockDrag } from './blockDrag';

/** 역할 → 이 디자인의 타이포 클래스 */
export type RoleClass = Record<SectionTextRole, string>;

export interface CardTextProps {
  section: SectionKey;
  zone: SectionZone;
  blocks: SectionBlock[];
  roleClass: RoleClass;
  /** 이 자리 전체의 바깥 여백 (섹션이 정합니다) */
  className?: string;
  /** 블록 사이 간격. 기본 `gap-2` */
  gap?: string;
  /**
   * 마지막 블록 뒤에 붙는 것 — 방명록 건수 `(3)`, 갤러리의 '· 옆으로 넘겨 다음 사진' 처럼
   * **문구의 일부가 아니라 화면이 계산해 붙이는 것**입니다. 편집 대상이 아니므로 편집
   * 영역 밖에 둡니다. 블록이 하나도 없으면 같이 사라집니다.
   */
  append?: ReactNode;
}

/** 글자를 타이핑할 수 있게 만드는 부분 — 미리보기에서만 씁니다 */
function EditableText({ text, onEdit }: { text: string; onEdit: (next: string) => void }) {
  const ref = useRef<HTMLSpanElement>(null);
  const timer = useRef<number | null>(null);

  // 포커스가 없을 때만 DOM 을 맞춥니다 (편집 중에 덮어쓰면 커서가 튑니다)
  useEffect(() => {
    const el = ref.current;
    if (!el || document.activeElement === el) return;
    if (el.textContent !== text) el.textContent = text;
  }, [text]);

  const flush = useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    const el = ref.current;
    if (el) onEdit(el.textContent ?? '');
  }, [onEdit]);

  // 타이핑이 멈추면 올립니다. 매 글자마다 올리면 저장 요청과 미리보기 갱신이 과합니다
  const schedule = useCallback(() => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(flush, 250);
  }, [flush]);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  return (
    <span
      ref={ref}
      role="textbox"
      tabIndex={0}
      // 'plaintext-only' — 붙여넣기로 서식·태그가 들어오면 청첩장 마크업이 깨집니다
      contentEditable="plaintext-only"
      suppressContentEditableWarning
      onInput={schedule}
      onBlur={flush}
      onKeyDown={(e) => {
        if (e.key === 'Escape') e.currentTarget.blur();
      }}
      // 빈 줄도 누를 수 있어야 합니다 — 다 지운 뒤 다시 쓰려면 집을 자리가 필요합니다
      className="inline-block min-w-[2ch] outline-none focus:bg-white/50 focus:ring-1 focus:ring-gold"
    />
  );
}

/** 문구 한 줄 — 흐름 배치와 자유 배치가 같은 모양이어야 하므로 한 곳에서 그립니다 */
function Block({
  section,
  zone,
  block,
  roleClass,
  append,
}: {
  section: SectionKey;
  zone: SectionZone;
  block: SectionBlock;
  roleClass: RoleClass;
  append?: ReactNode;
}) {
  return (
    <div
      data-preview-block={IS_PREVIEW ? `${section}:${zone}:${block.id}` : undefined}
      className={`${roleClass[block.role]}${
        IS_PREVIEW
          ? ' group relative rounded-[3px] outline-offset-[3px] hover:outline hover:outline-1 hover:outline-gold/60'
          : ''
      }`}
      style={{
        textAlign: block.align,
        color: block.color,
        fontFamily: block.font ? FONT_STACK[block.font] : undefined,
      }}
    >
      {IS_PREVIEW && (
        // 글자는 눌러서 고치고, 이 손잡이는 끌어서 옮깁니다 — 두 동작을 손잡이로 갈라둡니다
        // 항상 옅게 보입니다: hover 로만 나타내면 터치 화면에서는 찾을 수 없습니다
        <span
          title="끌어서 옮기기"
          onPointerDown={(e) => startBlockDrag(e.nativeEvent, { section, zone, id: block.id })}
          onClick={(e) => e.stopPropagation()}
          style={{ touchAction: 'none' }}
          className="absolute -left-[17px] top-1/2 -translate-y-1/2 cursor-grab select-none text-[12px] font-normal leading-none tracking-normal text-gold-deep opacity-30 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
        >
          ⠿
        </span>
      )}
      <span
        className="whitespace-pre-line"
        style={block.scale && block.scale !== 1 ? { fontSize: `${block.scale}em` } : undefined}
      >
        {IS_PREVIEW ? (
          <EditableText
            text={block.text}
            onEdit={(next) => notifyBlockEdit(section, zone, block.id, next)}
          />
        ) : (
          block.text
        )}
        {append}
      </span>
    </div>
  );
}

/** 글씨체를 고른 블록이 있으면 그 글꼴만 불러옵니다 (전부 미리 받으면 첫 화면이 늦습니다) */
function useBlockFonts(blocks: SectionBlock[]) {
  const key = blocks
    .map((b) => b.font ?? '')
    .filter(Boolean)
    .join(',');
  useEffect(() => {
    if (key) ensureFonts(key.split(',') as Parameters<typeof ensureFonts>[0]);
  }, [key]);
}

export function CardText({
  section,
  zone,
  blocks,
  roleClass,
  className = '',
  gap = 'gap-2',
  append,
}: CardTextProps) {
  // 자유 배치 블록은 `FreeText` 가 카드 위에 얹습니다 — 흐름에서는 빠집니다
  const flow = blocks.filter((b) => !b.pos);
  useBlockFonts(flow);

  // 이 자리에 흐름 배치 문구가 없으면 아무것도 그리지 않습니다 (여백까지 사라집니다)
  if (flow.length === 0) return null;

  return (
    <div className={`flex flex-col ${gap} ${className}`}>
      {flow.map((b, i) => (
        <Block
          key={b.id}
          section={section}
          zone={zone}
          block={b}
          roleClass={roleClass}
          append={i === flow.length - 1 ? append : undefined}
        />
      ))}
    </div>
  );
}

/**
 * 자유 배치된 문구 — 카드 위에 얹는 층.
 *
 * 카드 전체를 덮지만 `pointer-events-none` 이라 아래의 버튼·지도를 가리지 않습니다.
 * 글자에만 `pointer-events-auto` 를 줘서 그것만 눌립니다.
 *
 * `left/top` 은 비율(%)이고 `transform` 은 정렬 기준점입니다 — 가운데 정렬이면 그 점이
 * 글자의 가운데가 되어야 사용자가 놓은 자리와 보이는 자리가 일치합니다.
 */
export function FreeText({
  section,
  zones,
  roleClass,
}: {
  section: SectionKey;
  /**
   * 자리별 목록을 그대로 받습니다 — 자유 배치가 됐어도 **원래 자리는 기억합니다.**
   * 편집·삭제 메시지가 그 자리를 가리켜야 에디터가 그 줄을 찾고, '흐름으로 되돌리기' 도
   * 원래 자리로 돌아갑니다.
   */
  zones: { head: SectionBlock[]; foot: SectionBlock[] };
  roleClass: RoleClass;
}) {
  const free = (['head', 'foot'] as const).flatMap((zone) =>
    zones[zone].filter((b) => b.pos).map((block) => ({ zone, block })),
  );
  useBlockFonts(free.map((f) => f.block));
  if (free.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-[5]">
      {free.map(({ zone, block }) => (
        <div
          key={block.id}
          className="pointer-events-auto absolute max-w-[88%]"
          style={{
            left: `${(block.pos?.x ?? 0) * 100}%`,
            top: `${(block.pos?.y ?? 0) * 100}%`,
            transform: alignTransform((block.align ?? 'center') as LayerAlign),
          }}
        >
          <Block section={section} zone={zone} block={block} roleClass={roleClass} />
        </div>
      ))}
    </div>
  );
}
