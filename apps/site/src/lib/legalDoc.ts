/**
 * 법률 문서(마크다운) → React 렌더용 블록.
 *
 * **왜 라이브러리를 안 쓰는가:** 문서 두 개를 보여주려고 마크다운 파서를 번들에 넣는 것은
 * 과합니다. 그리고 입력이 **우리가 쓴 파일 두 개로 고정**되어 있어, 그 문법만 처리하면
 * 충분합니다. 임의의 사용자 입력을 다루는 게 아니므로 파서의 견고함이 필요 없습니다.
 *
 * 🔴 **HTML 을 만들어 `dangerouslySetInnerHTML` 로 넣지 않습니다.** 지금은 입력이 우리
 *    파일이지만, 언젠가 다른 문서를 여기 태우는 순간 그 구조가 XSS 통로가 됩니다.
 *    대신 구조화된 블록을 돌려주고 React 가 그립니다 — 이스케이프를 React 가 합니다.
 *
 * 지원하는 문법은 `docs/legal/*.md` 가 실제로 쓰는 것뿐입니다:
 *   `#`~`###` 제목 · `**굵게**` · `[링크](url)` · 표 · `-` 목록 · `1.` 목록
 *   `>` 인용 · `---` 구분선 · 문단
 */

/** 한 줄 안의 조각 — 굵게·링크만 구분합니다 */
export type Inline =
  | { kind: 'text'; text: string }
  | { kind: 'strong'; text: string }
  | { kind: 'link'; text: string; href: string };

export type Block =
  | { kind: 'heading'; level: 1 | 2 | 3; content: Inline[] }
  | { kind: 'para'; content: Inline[] }
  | { kind: 'list'; ordered: boolean; items: Inline[][] }
  | { kind: 'table'; head: Inline[][]; rows: Inline[][][] }
  | { kind: 'quote'; content: Inline[] }
  | { kind: 'hr' };

/** `**굵게**` 와 `[텍스트](주소)` 만 나눕니다. 나머지는 평문입니다 */
function parseInline(raw: string): Inline[] {
  const out: Inline[] = [];
  // 링크를 먼저 잡습니다 — 링크 텍스트 안의 `**` 가 따로 잘리면 표시가 깨집니다
  const pattern = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*/g;

  let last = 0;
  for (let m = pattern.exec(raw); m; m = pattern.exec(raw)) {
    if (m.index > last) out.push({ kind: 'text', text: raw.slice(last, m.index) });
    if (m[1] !== undefined) out.push({ kind: 'link', text: m[1], href: m[2] ?? '#' });
    else out.push({ kind: 'strong', text: m[3] ?? '' });
    last = m.index + m[0].length;
  }
  if (last < raw.length) out.push({ kind: 'text', text: raw.slice(last) });

  return out.length > 0 ? out : [{ kind: 'text', text: raw }];
}

/** `| a | b |` → ['a', 'b'] */
function splitRow(line: string): string[] {
  return line
    .replace(/^\s*\|/, '')
    .replace(/\|\s*$/, '')
    .split('|')
    .map((c) => c.trim());
}

const isTableRow = (l: string) => /^\s*\|/.test(l);
/** `| --- | --- |` 구분줄 */
const isTableDivider = (l: string) => /^\s*\|[\s:|-]+\|?\s*$/.test(l) && l.includes('-');

export function parseLegalDoc(source: string): Block[] {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i] ?? '';

    if (!line.trim()) {
      i += 1;
      continue;
    }

    // 구분선
    if (/^\s*---+\s*$/.test(line)) {
      blocks.push({ kind: 'hr' });
      i += 1;
      continue;
    }

    // 제목
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      blocks.push({
        kind: 'heading',
        level: (heading[1]?.length ?? 1) as 1 | 2 | 3,
        content: parseInline((heading[2] ?? '').trim()),
      });
      i += 1;
      continue;
    }

    // 표 — 헤더 + 구분줄이 이어질 때만 표로 봅니다
    if (isTableRow(line) && isTableDivider(lines[i + 1] ?? '')) {
      const head = splitRow(line).map(parseInline);
      i += 2;
      const rows: Inline[][][] = [];
      while (i < lines.length && isTableRow(lines[i] ?? '')) {
        rows.push(splitRow(lines[i] ?? '').map(parseInline));
        i += 1;
      }
      blocks.push({ kind: 'table', head, rows });
      continue;
    }

    // 인용 — 이어지는 줄을 하나로 합칩니다
    if (/^\s*>\s?/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i] ?? '')) {
        buf.push((lines[i] ?? '').replace(/^\s*>\s?/, ''));
        i += 1;
      }
      blocks.push({ kind: 'quote', content: parseInline(buf.join(' ').trim()) });
      continue;
    }

    // 목록
    const bullet = /^\s*[-*]\s+(.*)$/.exec(line);
    const numbered = /^\s*\d+\.\s+(.*)$/.exec(line);
    if (bullet || numbered) {
      const ordered = Boolean(numbered);
      const items: Inline[][] = [];
      while (i < lines.length) {
        const cur = lines[i] ?? '';
        const m = ordered ? /^\s*\d+\.\s+(.*)$/.exec(cur) : /^\s*[-*]\s+(.*)$/.exec(cur);
        if (!m) break;
        items.push(parseInline((m[1] ?? '').trim()));
        i += 1;
      }
      blocks.push({ kind: 'list', ordered, items });
      continue;
    }

    // 문단 — 빈 줄이나 다른 블록이 나올 때까지 이어 붙입니다
    const buf: string[] = [];
    while (i < lines.length) {
      const l = lines[i] ?? '';
      if (
        !l.trim() ||
        /^(#{1,3})\s/.test(l) ||
        /^\s*---+\s*$/.test(l) ||
        isTableRow(l) ||
        /^\s*>\s?/.test(l) ||
        /^\s*[-*]\s+/.test(l) ||
        /^\s*\d+\.\s+/.test(l)
      ) {
        break;
      }
      buf.push(l.trim());
      i += 1;
    }
    if (buf.length > 0) blocks.push({ kind: 'para', content: parseInline(buf.join(' ')) });
  }

  return blocks;
}

/**
 * 문서 첫머리의 `**버전 1.0.0 · 공고일 … · 시행일 …**` 줄에서 시행일을 뽑습니다.
 * 화면 상단에 "시행일" 을 따로 보여주기 위한 것이고, 못 찾으면 표시하지 않습니다.
 */
export function extractEffectiveDate(source: string): string | null {
  const m = /시행일\s*([0-9]{4}년\s*[0-9]{1,2}월\s*[0-9]{1,2}일)/.exec(source);
  return m?.[1] ? m[1].replace(/\s+/g, ' ') : null;
}
