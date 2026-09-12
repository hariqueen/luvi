/**
 * 법률 문서 렌더러 — `parseLegalDoc()` 이 만든 블록을 그립니다.
 *
 * 🔴 `dangerouslySetInnerHTML` 을 쓰지 않습니다. 지금 입력이 우리 파일이라도, 그 구조를
 *    만들어 두면 언젠가 다른 문서를 태우는 순간 XSS 통로가 됩니다. React 가 이스케이프합니다.
 *
 * 표는 가로로 넘칠 수 있어 각자 스크롤 상자를 갖습니다 — 본문이 가로로 밀리면
 * 모바일에서 읽을 수 없습니다.
 */
import type { Block, Inline } from '@/lib/legalDoc';

function InlineText({ parts }: { parts: Inline[] }) {
  return (
    <>
      {parts.map((p, i) => {
        if (p.kind === 'strong') return <strong key={i} className="font-semibold text-ink">{p.text}</strong>;
        if (p.kind === 'link') {
          const external = /^https?:/.test(p.href);
          return (
            <a
              key={i}
              href={p.href}
              className="text-gold underline underline-offset-2"
              {...(external ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
            >
              {p.text}
            </a>
          );
        }
        return <span key={i}>{p.text}</span>;
      })}
    </>
  );
}

export function LegalDocView({ blocks }: { blocks: Block[] }) {
  return (
    <div className="text-[13px] leading-[1.85] text-muted">
      {blocks.map((b, i) => {
        switch (b.kind) {
          case 'heading': {
            if (b.level === 1) {
              return (
                <h1 key={i} className="mb-6 text-[22px] font-semibold leading-snug text-ink">
                  <InlineText parts={b.content} />
                </h1>
              );
            }
            if (b.level === 2) {
              return (
                <h2 key={i} className="mb-3 mt-10 text-[16px] font-semibold text-ink">
                  <InlineText parts={b.content} />
                </h2>
              );
            }
            return (
              <h3 key={i} className="mb-2 mt-6 text-[14px] font-semibold text-ink">
                <InlineText parts={b.content} />
              </h3>
            );
          }

          case 'para':
            return (
              <p key={i} className="my-3">
                <InlineText parts={b.content} />
              </p>
            );

          case 'list': {
            const Tag = b.ordered ? 'ol' : 'ul';
            return (
              <Tag
                key={i}
                className={`my-3 space-y-1.5 pl-5 ${b.ordered ? 'list-decimal' : 'list-disc'}`}
              >
                {b.items.map((item, j) => (
                  <li key={j}>
                    <InlineText parts={item} />
                  </li>
                ))}
              </Tag>
            );
          }

          case 'table':
            return (
              // 표만 가로 스크롤합니다 — 본문 전체가 밀리면 모바일에서 읽을 수 없습니다
              <div key={i} className="my-5 -mx-1 overflow-x-auto px-1">
                <table className="w-full min-w-[420px] border-collapse text-[12.5px]">
                  <thead>
                    <tr className="border-b border-line">
                      {b.head.map((cell, j) => (
                        <th key={j} className="py-2.5 pr-4 text-left font-semibold text-ink">
                          <InlineText parts={cell} />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {b.rows.map((row, j) => (
                      <tr key={j} className="border-b border-line/60 align-top">
                        {row.map((cell, k) => (
                          <td key={k} className="py-2.5 pr-4">
                            <InlineText parts={cell} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );

          case 'quote':
            return (
              <blockquote
                key={i}
                className="my-4 border-l-2 border-gold/50 bg-surface/60 py-2.5 pl-4 pr-3 text-[12.5px]"
              >
                <InlineText parts={b.content} />
              </blockquote>
            );

          case 'hr':
            return <hr key={i} className="my-8 border-line" />;
        }
      })}
    </div>
  );
}
