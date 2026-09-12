/**
 * `/terms` · `/privacy` — 이용약관과 개인정보처리방침.
 *
 * **원본은 `docs/legal/*-{version}.md` 입니다.** 여기서 다시 쓰지 않고 그 파일을 빌드 시점에
 * 통째로 들여와 렌더링합니다. 문서를 고칠 일이 생기면 마크다운만 고치면 되고, 화면과 문구가
 * 갈라질 여지가 없습니다.
 *
 * 🔴 **개정할 때는 새 버전 파일을 만드세요** (`privacy-1.1.0.md`). 기존 파일을 덮으면 이전
 *    버전을 열람할 수 없게 되는데, 이용자는 "내가 동의했던 그 시점의 문서" 를 볼 수 있어야
 *    합니다. 아래 `VERSIONS` 에 새 항목을 추가하고 `packages/schema/src/consent.ts` 의
 *    `DOC_VERSIONS` 를 올리면 재동의까지 함께 트리거됩니다.
 */
import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { DOC_VERSIONS } from '@luvi/schema';
import { LegalDocView } from '@/components/LegalDocView';
import { extractEffectiveDate, parseLegalDoc } from '@/lib/legalDoc';

import privacy100 from '../../../../docs/legal/privacy-1.0.0.md?raw';
import terms100 from '../../../../docs/legal/terms-1.0.0.md?raw';

type DocKind = 'privacy' | 'terms';

/** 버전별 원문. 개정 시 여기에 줄을 추가합니다 (기존 줄을 지우지 마세요) */
const VERSIONS: Record<DocKind, Record<string, string>> = {
  privacy: { '1.0.0': privacy100 },
  terms: { '1.0.0': terms100 },
};

const TITLES: Record<DocKind, string> = {
  privacy: '개인정보처리방침',
  terms: '서비스 이용약관',
};

export default function Legal({ kind }: { kind: DocKind }) {
  const [params] = useSearchParams();

  const available = Object.keys(VERSIONS[kind]).sort().reverse();
  const current = DOC_VERSIONS[kind];
  const requested = params.get('v');
  // 없는 버전을 요청하면 조용히 현행본을 보여줍니다 — 빈 화면보다 낫습니다
  const version = requested && VERSIONS[kind][requested] ? requested : current;

  const source = VERSIONS[kind][version] ?? '';
  const blocks = useMemo(() => parseLegalDoc(source), [source]);
  const effective = useMemo(() => extractEffectiveDate(source), [source]);
  const isCurrent = version === current;

  return (
    // ⚠️ `<main>` 을 쓰지 않습니다 — `SiteLayout` 이 이미 `<main>` 안에서 Outlet 을 그립니다.
    //    중첩되면 잘못된 HTML 이고 스크린리더가 문서의 주 영역을 둘로 봅니다.
    <article className="mx-auto w-full max-w-[760px] px-[clamp(16px,4vw,28px)] py-[clamp(32px,6vw,64px)]">
      <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted">Legal</p>

      <div className="mb-8 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="text-[24px] font-semibold text-ink">{TITLES[kind]}</h1>
        <span className="text-[12px] text-muted">
          버전 {version}
          {effective ? ` · 시행일 ${effective}` : ''}
        </span>
      </div>

      {!isCurrent && (
        <div className="mb-6 rounded-lg border border-gold/40 bg-gold/5 px-4 py-3 text-[12.5px] text-ink">
          지난 버전을 보고 계십니다.{' '}
          <Link to={`/${kind === 'privacy' ? 'privacy' : 'terms'}`} className="text-gold underline underline-offset-2">
            현행본 보기
          </Link>
        </div>
      )}

      <LegalDocView blocks={blocks} />

      {available.length > 1 && (
        <section className="mt-12 border-t border-line pt-5">
          <h2 className="mb-2 text-[13px] font-semibold text-ink">이전 버전</h2>
          <ul className="space-y-1 text-[12.5px]">
            {available.map((v) => (
              <li key={v}>
                <Link
                  to={`?v=${v}`}
                  className={v === version ? 'text-ink' : 'text-gold underline underline-offset-2'}
                >
                  버전 {v}
                  {v === current ? ' (현행)' : ''}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-10 text-[12px] text-muted">
        문의: <a href="mailto:help@luv-ai.co.kr" className="text-gold underline underline-offset-2">help@luv-ai.co.kr</a>
      </p>
    </article>
  );
}
