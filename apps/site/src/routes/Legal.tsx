/**
 * `/terms` · `/privacy` — 이용약관과 개인정보처리방침.
 *
 * **원본은 `docs/legal/*-{version}.md` 입니다.** 여기서 다시 쓰지 않고 그 파일을 빌드 시점에
 * 통째로 들여와 렌더링합니다. 문서를 고칠 일이 생기면 마크다운만 고치면 되고, 화면과 문구가
 * 갈라질 여지가 없습니다.
 *
 * 🔴 **개정할 때는 새 버전 파일을 만드세요** (`privacy-1.1.0.md`). 기존 파일을 덮으면 이전
 *    버전을 열람할 수 없게 되는데, 이용자는 "내가 동의했던 그 시점의 문서" 를 볼 수 있어야
 *    합니다. 아래 `VERSIONS` 에 새 항목을 추가하고, **시행일이 되면**
 *    `packages/schema/src/consent.ts` 의 `DOC_VERSIONS` 를 올립니다.
 *
 * 개정 문서는 세 단계를 거칩니다. 이 화면은 그 셋을 구분해 보여줍니다.
 *   1. **예고본** — `VERSIONS` 에는 있지만 `DOC_VERSIONS` 보다 큼. 공고일~시행일 사이
 *   2. **현행본** — `DOC_VERSIONS` 와 같음
 *   3. **지난 버전** — 그 외
 */
import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { DOC_VERSIONS } from '@luvi/schema';
import { LegalDocView } from '@/components/LegalDocView';
import { extractEffectiveDate, parseLegalDoc } from '@/lib/legalDoc';

import privacy100 from '../../../../docs/legal/privacy-1.0.0.md?raw';
import privacy110 from '../../../../docs/legal/privacy-1.1.0.md?raw';
import terms100 from '../../../../docs/legal/terms-1.0.0.md?raw';

type DocKind = 'privacy' | 'terms';

/** 버전별 원문. 개정 시 여기에 줄을 추가합니다 (기존 줄을 지우지 마세요) */
const VERSIONS: Record<DocKind, Record<string, string>> = {
  privacy: { '1.0.0': privacy100, '1.1.0': privacy110 },
  terms: { '1.0.0': terms100 },
};

const TITLES: Record<DocKind, string> = {
  privacy: '개인정보처리방침',
  terms: '서비스 이용약관',
};

/**
 * 조각별 숫자 비교. 문자열 비교로는 '1.10.0' 이 '1.9.0' 보다 작게 나옵니다.
 * 지금은 버전이 둘뿐이라 티가 안 나지만, 그때 가서 고치면 이미 틀린 화면이 배포된 뒤입니다.
 */
function compareVersion(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i += 1) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

export default function Legal({ kind }: { kind: DocKind }) {
  const [params] = useSearchParams();

  const available = Object.keys(VERSIONS[kind]).sort(compareVersion).reverse();
  const current = DOC_VERSIONS[kind];
  const requested = params.get('v');
  // 없는 버전을 요청하면 조용히 현행본을 보여줍니다 — 빈 화면보다 낫습니다
  const version = requested && VERSIONS[kind][requested] ? requested : current;

  const source = VERSIONS[kind][version] ?? '';
  const blocks = useMemo(() => parseLegalDoc(source), [source]);
  const effective = useMemo(() => extractEffectiveDate(source), [source]);
  const isCurrent = version === current;
  /** 공고는 했지만 아직 시행 전인 개정본 */
  const isPending = compareVersion(version, current) > 0;

  // 현행본을 보는 사람에게도 개정 예정을 알려야 고지가 됩니다 (방침 제14조 ②)
  const pending = available.find((v) => compareVersion(v, current) > 0) ?? null;
  const pendingEffective = pending ? extractEffectiveDate(VERSIONS[kind][pending] ?? '') : null;

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

      {isPending && (
        <div className="mb-6 rounded-lg border border-gold/40 bg-gold/5 px-4 py-3 text-[12.5px] leading-relaxed text-ink">
          <strong className="font-semibold">시행 예정인 개정본입니다.</strong>{' '}
          {effective ? `${effective}부터 적용됩니다. ` : ''}
          그때까지는 버전 {current} 이 적용됩니다.{' '}
          <Link to={`/${kind}`} className="text-gold underline underline-offset-2">
            현행본 보기
          </Link>
        </div>
      )}

      {!isCurrent && !isPending && (
        <div className="mb-6 rounded-lg border border-gold/40 bg-gold/5 px-4 py-3 text-[12.5px] text-ink">
          지난 버전을 보고 계십니다.{' '}
          <Link to={`/${kind}`} className="text-gold underline underline-offset-2">
            현행본 보기
          </Link>
        </div>
      )}

      {isCurrent && pending && (
        <div className="mb-6 rounded-lg border border-line bg-surface-sunken px-4 py-3 text-[12.5px] leading-relaxed text-ink">
          이 문서는 {pendingEffective ? `${pendingEffective}자로 ` : ''}버전 {pending} 으로 개정될
          예정입니다.{' '}
          <Link to={`?v=${pending}`} className="text-gold underline underline-offset-2">
            개정본 미리 보기
          </Link>
        </div>
      )}

      <LegalDocView blocks={blocks} />

      {available.length > 1 && (
        <section className="mt-12 border-t border-line pt-5">
          <h2 className="mb-2 text-[13px] font-semibold text-ink">다른 버전</h2>
          <ul className="space-y-1 text-[12.5px]">
            {available.map((v) => (
              <li key={v}>
                <Link
                  to={`?v=${v}`}
                  className={v === version ? 'text-ink' : 'text-gold underline underline-offset-2'}
                >
                  버전 {v}
                  {v === current ? ' (현행)' : ''}
                  {compareVersion(v, current) > 0 ? ' (시행 예정)' : ''}
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
