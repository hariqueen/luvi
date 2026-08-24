/**
 * 미리보기에서 **글자를 그 자리에서 고치기** — 카드 문구든 폼 값이든 같은 방식.
 *
 * 예전에는 인사말·말풍선·오시는 길처럼 대부분의 글자를 왼쪽 폼에서만 고칠 수 있었습니다.
 * 화면에 보이는 글자를 눌러도 아무 일이 없어서, 어디를 고쳐야 그 글자가 바뀌는지 매번
 * 폼에서 찾아야 했습니다. 그래서 **뷰어가 그리는 글자는 전부 여기를 지나갑니다.**
 *
 * 두 가지 쓰임이 있습니다:
 *   · `EditableText` — 값을 직접 다루는 저수준 조각 (카드 문구가 씁니다)
 *   · `Field`        — 초안의 **점 경로**(`core.greeting.message`)를 가리키는 값. 고치면
 *                      그 경로로 부모(에디터)에게 보냅니다 (폼의 입력칸과 같은 경로입니다)
 *
 * ─── 굵게 · 기울임 ──────────────────────────────────────────────────────────
 *
 * ⌘/Ctrl+B 로 굵게, ⌘/Ctrl+I 로 기울임. 넣은 서식은 **값 안에** `<b>`/`<i>` 로 담깁니다
 * (`@luvi/schema` 의 `richText.ts`) — 값의 모양이 문자열 그대로라 저장·이력·발행 경로를
 * 아무것도 바꾸지 않습니다.
 *
 * 🔴 **DOM 을 그대로 담지 않습니다.** `innerHTML` 을 읽어 저장하면 붙여넣기로 들어온 남의
 *    스타일·태그가 청첩장에 실려 들어옵니다. 대신 DOM 을 직접 훑어(`serializeRich`) 굵게·
 *    기울임·줄바꿈만 남깁니다. 붙여넣기도 글자만 받습니다.
 *
 * 🔴 **편집 중인 요소의 DOM 은 다시 쓰지 않습니다.** 타이핑 → 에디터가 초안 갱신 →
 *    초안이 미리보기로 되돌아옴 → 같은 글자를 다시 넣으면 **커서가 맨 앞으로 튑니다.**
 *    그래서 내용은 포커스가 없을 때만 맞춥니다(제어 컴포넌트로 두면 매 글자마다 커서가
 *    튀는 그 문제가 그대로 재현됩니다).
 *
 * 🔴 하객 화면에서는 **아무 것도 덧붙이지 않습니다** — 같은 글자를 그냥 그립니다.
 *    `contentEditable` 이 하객에게 노출되면 글자를 지울 수 있는 것처럼 보입니다.
 */
import { useCallback, useEffect, useRef } from 'react';
import { escapeRich, richToHtml } from '@luvi/schema';
import { IS_PREVIEW, notifyFieldEdit } from './PreviewSlot';
import { Rich } from './Rich';

/** 줄바꿈으로 읽는 태그 — `contentEditable` 에서 Enter 는 브라우저마다 다른 태그가 됩니다 */
const BLOCK_TAGS = new Set(['DIV', 'P', 'LI', 'BLOCKQUOTE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6']);

function isBold(el: HTMLElement): boolean {
  if (el.tagName === 'B' || el.tagName === 'STRONG') return true;
  const w = el.style.fontWeight;
  return w === 'bold' || w === 'bolder' || Number(w) >= 600;
}

function isItalic(el: HTMLElement): boolean {
  return el.tagName === 'I' || el.tagName === 'EM' || el.style.fontStyle === 'italic';
}

/**
 * `contentEditable` 의 DOM → 저장할 문자열 (`<b>`·`<i>`·줄바꿈만 남깁니다).
 *
 * 브라우저가 만든 것이든 붙여넣기로 들어온 것이든 **여기서 허용한 것만** 값이 됩니다.
 */
function serializeRich(root: HTMLElement): string {
  const walk = (node: Node, first: boolean): string => {
    if (node.nodeType === Node.TEXT_NODE) return escapeRich(node.nodeValue ?? '');
    if (node.nodeType !== Node.ELEMENT_NODE) return '';

    const el = node as HTMLElement;
    if (el.tagName === 'BR') return '\n';

    let inner = '';
    el.childNodes.forEach((child, i) => {
      inner += walk(child, i === 0);
    });
    if (!inner) return '';

    if (isItalic(el)) inner = `<i>${inner}</i>`;
    if (isBold(el)) inner = `<b>${inner}</b>`;
    // 블록은 줄을 바꿉니다 — 첫 줄 앞에는 넣지 않습니다 (빈 줄이 하나 생깁니다)
    return BLOCK_TAGS.has(el.tagName) && !first ? `\n${inner}` : inner;
  };

  const children = Array.from(root.childNodes);
  // 브라우저가 마지막에 넣어두는 <br> (커서 자리 유지용) 은 값이 아닙니다
  const last = children[children.length - 1];
  if (last && last.nodeType === Node.ELEMENT_NODE && (last as HTMLElement).tagName === 'BR') {
    children.pop();
  }

  return children.map((child, i) => walk(child, i === 0)).join('');
}

interface EditableTextProps {
  text: string;
  /**
   * `final` — **편집을 마쳤습니다**(포커스가 빠졌습니다). 타이핑 도중의 갱신과 구분하는
   * 이유: 다 지운 문구를 지우는(= 빈 텍스트 상자 삭제) 판단은 **손을 뗀 뒤**에만 해야
   * 합니다. 타이핑 중에 지우면 방금 전부 선택해 새로 쓰려던 사람의 커서가 사라집니다.
   */
  onEdit: (next: string, final: boolean) => void;
  /**
   * **빈 상자에서 한 번 더 지웠습니다** — 사용자가 추가한 텍스트 상자를 없애는 신호.
   *
   * 손을 떼는 순간(`final`)에도 없어지지만, PPT 처럼 **지우던 손으로 계속 지우면 그 자리에서
   * 사라져야** 합니다 — 다 지웠는데 빈 상자가 남아 있으면 "왜 안 지워지지" 가 됩니다.
   *
   * 없으면(= 인사말·예식장처럼 자리가 정해진 값) 지워지지 않습니다. 없어지면 다시 넣을
   * 곳이 없기 때문입니다.
   */
  onDelete?: () => void;
  className?: string;
  /**
   * 다 지웠을 때 그 자리에 보이는 안내 (`index.css` 의 `:empty::before`).
   *
   * 🔴 이게 없으면 **글자를 다 지운 순간 누를 자리가 사라집니다.** 폼에 입력칸을 두지
   *    않기로 했으므로(같은 일을 두 곳에서 하지 않기 위해) 여기가 유일한 회복 경로입니다.
   */
  placeholder?: string;
}

/** 타이핑을 받는 조각. 값은 **비제어**로 다룹니다 (커서 보존) */
export function EditableText({
  text,
  onEdit,
  onDelete,
  className = '',
  placeholder = '글자 입력',
}: EditableTextProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const timer = useRef<number | null>(null);

  // 포커스가 없을 때만 DOM 을 맞춥니다 (편집 중에 덮어쓰면 커서가 튑니다)
  useEffect(() => {
    const el = ref.current;
    if (!el || document.activeElement === el) return;
    const html = richToHtml(text);
    if (el.innerHTML !== html) el.innerHTML = html;
  }, [text]);

  const flush = useCallback(
    (final: boolean) => {
      if (timer.current !== null) {
        window.clearTimeout(timer.current);
        timer.current = null;
      }
      const el = ref.current;
      if (el) onEdit(serializeRich(el), final);
    },
    [onEdit],
  );

  // 타이핑이 멈추면 올립니다. 매 글자마다 올리면 저장 요청과 미리보기 갱신이 과합니다
  const schedule = useCallback(() => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => flush(false), 250);
  }, [flush]);

  const onInput = useCallback(() => {
    const el = ref.current;
    // 다 지우면 브라우저가 <br> 을 남깁니다 — 그대로 두면 `:empty` 안내가 뜨지 않습니다
    if (el && el.textContent === '' && el.innerHTML !== '') el.innerHTML = '';
    schedule();
  }, [schedule]);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  /**
   * 굵게 · 기울임.
   *
   * `styleWithCSS` 를 꺼서 `<span style>` 이 아니라 `<b>`/`<i>` 가 나오게 합니다 —
   * 저장 형식과 같은 모양이라 편집 중 화면과 하객 화면이 어긋나지 않습니다.
   * 키는 `code` 로도 봅니다: 한글 입력 중에는 `key` 가 'ㅠ' 처럼 옵니다.
   */
  const format = (command: 'bold' | 'italic') => {
    document.execCommand('styleWithCSS', false, 'false');
    document.execCommand(command);
    schedule();
  };

  return (
    <span
      ref={ref}
      role="textbox"
      tabIndex={0}
      contentEditable
      suppressContentEditableWarning
      onInput={onInput}
      onBlur={() => flush(true)}
      // 붙여넣기는 **글자만** 받습니다 (남의 서식·태그가 청첩장 마크업을 깨뜨립니다)
      onPaste={(e) => {
        e.preventDefault();
        document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
      }}
      // 끌어다 놓는 것도 같습니다 — 사진·서식 덩어리가 아니라 글자만 들어옵니다
      onDrop={(e) => {
        e.preventDefault();
        const dropped = e.dataTransfer.getData('text/plain');
        if (dropped) document.execCommand('insertText', false, dropped);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.currentTarget.blur();
          return;
        }
        // 이미 빈 상자에서 한 번 더 지우면 상자째 사라집니다 (PPT 와 같습니다)
        if (onDelete && (e.key === 'Backspace' || e.key === 'Delete')) {
          if (e.currentTarget.textContent === '') {
            e.preventDefault();
            onDelete();
            return;
          }
        }
        if (!e.metaKey && !e.ctrlKey) return;
        const key = (code: string, letter: string) => e.code === code || e.key.toLowerCase() === letter;

        if (key('KeyB', 'b')) {
          e.preventDefault();
          format('bold');
          return;
        }
        if (key('KeyI', 'i')) {
          e.preventDefault();
          format('italic');
          return;
        }
        /**
         * 밑줄(⌘/Ctrl+U)은 **막습니다.** 담을 수 있는 서식은 굵게·기울임 둘뿐이라,
         * 그대로 두면 브라우저가 그어준 밑줄이 저장할 때 조용히 사라집니다 —
         * 아무 일도 일어나지 않는 것이 사라지는 것보다 낫습니다.
         */
        if (key('KeyU', 'u')) e.preventDefault();
      }}
      // 빈 값도 누를 수 있어야 합니다 — 다 지운 뒤 다시 쓰려면 집을 자리가 필요합니다
      data-luvi-editable={placeholder}
      title={`⌘/Ctrl+B 굵게 · ⌘/Ctrl+I 기울임${onDelete ? ' · 다 지우면 사라집니다' : ''}`}
      className={`inline-block min-w-[2ch] outline-none focus:bg-white/50 focus:ring-1 focus:ring-gold ${className}`}
    />
  );
}

interface FieldProps {
  /** 초안의 점 경로 (예: `core.greeting.message`). 폼의 입력칸과 같은 경로입니다 */
  path: string;
  value: string;
  className?: string;
  /** 다 지웠을 때 보이는 안내 (예: '인사말'). 없으면 '글자 입력' */
  placeholder?: string;
}

/**
 * 초안의 값 하나 — 미리보기에서는 눌러서 고치고, 하객 화면에서는 그냥 글자입니다.
 *
 * 배열 안의 값(`core.location.transport.0.desc`)도 그대로 가리킵니다. 저장 경로는 배열
 * 인덱스를 받지 못하므로(`apps/site` 의 `paths.ts`), **에디터가 그 배열을 통째로 다시
 * 씁니다** — 뷰어는 어디를 고쳤는지만 알려주면 됩니다.
 *
 * 🔴 여기서는 **다 지워도 사라지지 않습니다** — 인사말·예식장처럼 자리가 정해진 값이라,
 *    없어지면 다시 넣을 곳이 없습니다. 지우면 사라지는 것은 사용자가 추가한 텍스트
 *    상자뿐입니다 (`CardText`).
 */
export function Field({ path, value, className, placeholder }: FieldProps) {
  if (!IS_PREVIEW) return <Rich text={value} />;
  return (
    <EditableText
      text={value}
      className={className}
      placeholder={placeholder}
      onEdit={(next) => notifyFieldEdit(path, next)}
    />
  );
}
