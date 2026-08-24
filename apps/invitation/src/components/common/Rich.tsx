/**
 * 굵게·기울임이 섞인 글자 그리기 — **하객 화면의 그리는 쪽**.
 *
 * 저장된 값은 `<b>`/`<i>` 두 태그만 담을 수 있는 문자열입니다(`@luvi/schema` 의 `richText.ts`).
 *
 * 🔴 **`dangerouslySetInnerHTML` 을 쓰지 않습니다.** 문자열을 토큰으로 쪼개 React 요소로
 *    만듭니다 — 값이 어떤 경로로 들어왔든(옛 스냅샷, 손으로 고친 JSON) 이 화면에 태그가
 *    실려 들어올 길 자체를 열지 않습니다.
 *
 * 🔴 서식이 없는 값(= 지금까지의 모든 청첩장)은 **글자 그대로** 돌려줍니다. 요소를 덧씌우면
 *    `whitespace-pre-line` 이나 줄바꿈 계산이 미묘하게 달라집니다.
 */
import { Fragment } from 'react';
import { parseRich } from '@luvi/schema';

export function Rich({ text }: { text: string }) {
  const tokens = parseRich(text);
  if (tokens.length === 0) return null;
  if (tokens.length === 1 && !tokens[0].bold && !tokens[0].italic) return <>{tokens[0].text}</>;

  return (
    <>
      {tokens.map((t, i) => {
        let node = <Fragment key={i}>{t.text}</Fragment>;
        if (t.italic) node = <i key={i}>{t.text}</i>;
        if (t.bold) node = <b key={i}>{t.italic ? <i>{t.text}</i> : t.text}</b>;
        return node;
      })}
    </>
  );
}
