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
 * 🔴 **편집 중인 요소의 DOM 은 다시 쓰지 않습니다.** 타이핑 → 에디터가 초안 갱신 →
 *    초안이 미리보기로 되돌아옴 → 같은 글자를 다시 넣으면 **커서가 맨 앞으로 튑니다.**
 *    그래서 `textContent` 는 포커스가 없을 때만 맞춥니다(제어 컴포넌트로 두면 매 글자마다
 *    커서가 튀는 그 문제가 그대로 재현됩니다).
 *
 * 🔴 하객 화면에서는 **아무 것도 덧붙이지 않습니다** — 같은 글자를 그냥 그립니다.
 *    `contentEditable` 이 하객에게 노출되면 글자를 지울 수 있는 것처럼 보입니다.
 */
import { useCallback, useEffect, useRef } from 'react';
import { IS_PREVIEW, notifyFieldEdit } from './PreviewSlot';

interface EditableTextProps {
  text: string;
  onEdit: (next: string) => void;
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
  className = '',
  placeholder = '글자 입력',
}: EditableTextProps) {
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
      // 빈 값도 누를 수 있어야 합니다 — 다 지운 뒤 다시 쓰려면 집을 자리가 필요합니다
      data-luvi-editable={placeholder}
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
 */
export function Field({ path, value, className, placeholder }: FieldProps) {
  if (!IS_PREVIEW) return <>{value}</>;
  return (
    <EditableText
      text={value}
      className={className}
      placeholder={placeholder}
      onEdit={(next) => notifyFieldEdit(path, next)}
    />
  );
}
