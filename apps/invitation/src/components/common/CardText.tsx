/**
 * 카드 문구 그리기 — 블록 목록 하나를 화면에 얹고, **미리보기에서는 그 자리에서 고칩니다.**
 *
 * 문구는 "칸" 이 아니라 목록입니다(`@luvi/schema` 의 `sectionText.ts`). 사용자가 넣고 지우고
 * 순서를 바꿀 수 있으므로, 섹션 컴포넌트는 몇 줄이 올지 모릅니다. 그래서 마크업에 문구
 * 자리를 박지 않고 이 컴포넌트에 목록을 넘깁니다.
 *
 * 🔴 **블록이 없으면 아무것도 렌더하지 않습니다** (`null`). 예전에는 빈 문자열을 받아도
 *    래퍼 `<div className="mb-2">` 가 남아서, 문구를 지워도 **그 자리의 여백이 남았습니다.**
 *
 * ─── 미리보기에서 직접 고치기 ────────────────────────────────────────────────
 *
 * 처음에는 글자를 누르면 **왼쪽 패널의 입력칸으로 커서를 옮겼습니다.** 눌러도 그 자리에서는
 * 아무 일이 없어서 "활성이 안 된다" 로 읽혔습니다 — 누른 곳에서 바로 고쳐지는 게 자연스럽습니다.
 * 그래서 미리보기에서는 글자 자체가 `contentEditable` 입니다. 브라우저가 누른 지점에 커서를
 * 놓아주므로 별도 활성화 단계가 없습니다.
 *
 * 🔴 **편집 중인 요소의 DOM 은 절대 다시 쓰지 않습니다.** 타이핑 → 에디터가 초안을 갱신 →
 *    초안이 미리보기로 다시 내려옴 → 같은 글자를 다시 넣으면 **커서가 맨 앞으로 튑니다.**
 *    그래서 `textContent` 는 포커스가 없을 때만 맞춥니다 (제어 컴포넌트로 두면 매 글자마다
 *    커서가 튀는 그 문제가 그대로 재현됩니다).
 *
 * 크기·색·글꼴은 디자인이 정합니다(`roleClass`). 블록에 값이 있을 때만 덮습니다 — 손대지
 * 않은 문구는 디자인을 바꾸면 같이 따라와야 합니다. `scale` 은 배율이라 `em` 으로 겁니다.
 */
import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import type { SectionBlock, SectionKey, SectionTextRole, SectionZone } from '@luvi/schema';
import { IS_PREVIEW, notifyBlockEdit } from './PreviewSlot';

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

  // 타이핑이 멈추면 올립니다. 매 글자마다 올리면 저장 요청과 미리보기 갱신이 과해집니다
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

export function CardText({
  section,
  zone,
  blocks,
  roleClass,
  className = '',
  gap = 'gap-2',
  append,
}: CardTextProps) {
  if (blocks.length === 0) return null;

  return (
    <div className={`flex flex-col ${gap} ${className}`}>
      {blocks.map((b, i) => (
        <div
          key={b.id}
          // 눌린 글자가 무엇인지 — 에디터가 그 줄을 목록에서 골라줍니다 (PreviewSlot)
          data-preview-block={IS_PREVIEW ? `${section}:${zone}:${b.id}` : undefined}
          className={`${roleClass[b.role]}${
            IS_PREVIEW ? ' rounded-[3px] outline-offset-[3px] hover:outline hover:outline-1 hover:outline-gold/60' : ''
          }`}
          style={{ textAlign: b.align, color: b.color }}
        >
          <span
            className="whitespace-pre-line"
            style={b.scale && b.scale !== 1 ? { fontSize: `${b.scale}em` } : undefined}
          >
            {IS_PREVIEW ? (
              <EditableText
                text={b.text}
                onEdit={(next) => notifyBlockEdit(section, zone, b.id, next)}
              />
            ) : (
              b.text
            )}
            {i === blocks.length - 1 && append}
          </span>
        </div>
      ))}
    </div>
  );
}
