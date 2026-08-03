/**
 * 화면 스캐폴드 공용 껍데기.
 *
 * 디자인 산출물(`docs/design/Luvi.dc.html`)을 옮겨오기 전 자리표시자입니다.
 * 각 화면의 `<Placeholder screen=… >` 값이 디자인의 `data-screen-label` 과 대응하므로,
 * 옮길 때 어느 섹션을 보면 되는지 바로 찾을 수 있습니다.
 */
import type { ReactNode } from 'react';

interface Props {
  /** 디자인 산출물의 화면 코드 (예: 'B1 홈') */
  screen: string;
  title: string;
  desc?: string;
  children?: ReactNode;
}

export function Placeholder({ screen, title, desc, children }: Props) {
  return (
    <section className="px-[clamp(14px,3vw,28px)] py-14">
      <div className="mx-auto max-w-page">
        <span className="inline-block rounded-full border border-gold-soft bg-cream px-3 py-1 text-[11px] tracking-wide text-gold-deep">
          {screen}
        </span>
        <h1 className="mt-4 text-[clamp(24px,4vw,38px)] font-semibold leading-tight tracking-[-.03em]">
          {title}
        </h1>
        {desc && <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">{desc}</p>}
        {children}
        <p className="mt-10 border-t border-line-soft pt-5 text-[12px] text-muted-faint">
          디자인 옮기기: <code>docs/design/Luvi.dc.html</code> 의{' '}
          <code>data-screen-label="{screen}"</code> 섹션
        </p>
      </div>
    </section>
  );
}
