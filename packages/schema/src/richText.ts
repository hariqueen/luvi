/**
 * 아주 작은 서식 — **굵게(⌘/Ctrl+B)와 기울임(⌘/Ctrl+I) 두 가지뿐**.
 *
 * 청첩장의 글자는 전부 미리보기에서 그 자리에서 고칩니다(`Editable.tsx`). 거기서 넣은
 * 굵게·기울임을 어딘가에는 담아야 하는데, 값의 모양을 바꾸지 않으려고 **같은 문자열 안에**
 * 담습니다: `아버지 · 어머니 <b>의 장남</b> 신랑`.
 *
 * 🔴 **허용하는 태그는 `<b>` 와 `<i>` 뿐입니다.** 저장된 값은 언제든 하객 화면에 그려지므로,
 *    브라우저가 준 HTML 을 그대로 담으면 남의 스타일·스크립트가 청첩장에 실려 들어옵니다.
 *    그래서 편집기는 DOM 을 직접 훑어 이 두 가지만 남기고(`serializeRich`), 그리는 쪽은
 *    문자열을 토큰으로 쪼개 **React 요소로** 만듭니다(`parseRich`) — `innerHTML` 로 그리는
 *    길은 열지 않습니다.
 *
 * 🔴 태그가 없는 옛 값은 그대로 한 덩어리 글자입니다 — 이 파일이 생기기 전에 저장된
 *    청첩장도 아무 변환 없이 같은 화면을 그립니다.
 */

/** 서식이 같은 글자 덩어리 하나 */
export interface RichToken {
  text: string;
  bold: boolean;
  italic: boolean;
}

const TAG = /<\/?(b|strong|i|em)\s*\/?>/gi;

const ENTITY: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

/** 글자를 서식 문자열에 담을 수 있게 만듭니다 (`<` 가 태그로 읽히지 않도록) */
export function escapeRich(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function unescapeRich(text: string): string {
  return text.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (whole, name: string) => {
    if (name[0] === '#') {
      const code = name[1] === 'x' || name[1] === 'X' ? parseInt(name.slice(2), 16) : Number(name.slice(1));
      return Number.isFinite(code) && code > 0 ? String.fromCodePoint(code) : whole;
    }
    return ENTITY[name.toLowerCase()] ?? whole;
  });
}

/**
 * 서식 문자열 → 글자 덩어리 목록.
 *
 * 태그가 하나도 없으면 덩어리 하나(= 옛 값 그대로)입니다. 짝이 맞지 않는 닫는 태그는
 * 무시합니다 — 값이 조금 망가져도 **글자는 반드시 다 보여야** 하기 때문입니다.
 */
export function parseRich(value: string): RichToken[] {
  const tokens: RichToken[] = [];
  let bold = 0;
  let italic = 0;
  let last = 0;

  const push = (raw: string) => {
    if (!raw) return;
    const text = unescapeRich(raw);
    const prev = tokens[tokens.length - 1];
    if (prev && prev.bold === bold > 0 && prev.italic === italic > 0) prev.text += text;
    else tokens.push({ text, bold: bold > 0, italic: italic > 0 });
  };

  TAG.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TAG.exec(value)) !== null) {
    push(value.slice(last, m.index));
    last = m.index + m[0].length;

    const closing = m[0][1] === '/';
    const tag = (m[1] ?? '').toLowerCase();
    if (tag === 'b' || tag === 'strong') bold = Math.max(0, bold + (closing ? -1 : 1));
    else italic = Math.max(0, italic + (closing ? -1 : 1));
  }
  push(value.slice(last));

  return tokens;
}

/**
 * 서식을 뺀 글자.
 *
 * 화면이 아닌 곳에 쓰는 값은 반드시 이걸 지나야 합니다 — 캘린더 일정의 장소, `title`
 * 속성처럼 **태그를 그릴 수 없는 자리**에 `<b>` 가 그대로 박히면 사용자가 보게 됩니다.
 */
export function richToPlain(value: string): string {
  return parseRich(value)
    .map((t) => t.text)
    .join('');
}

/**
 * 서식 문자열 → `<b>`/`<i>` 만 남은 정규형.
 *
 * 편집기가 `contentEditable` 안을 채울 때 씁니다. 저장된 값이 어떤 모양이든(옛 값, 손으로
 * 넣은 `<strong>`) 여기를 지나면 같은 모양이 되므로, 편집 → 저장 → 다시 편집을 반복해도
 * 값이 조금씩 달라지지 않습니다.
 */
export function richToHtml(value: string): string {
  return parseRich(value)
    .map((t) => {
      let html = escapeRich(t.text);
      if (t.italic) html = `<i>${html}</i>`;
      if (t.bold) html = `<b>${html}</b>`;
      return html;
    })
    .join('');
}
