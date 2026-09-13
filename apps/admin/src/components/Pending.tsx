/**
 * 아직 만들지 않은 화면의 자리.
 *
 * 빈 라우트를 두지 않고 이 컴포넌트를 두는 이유: 배포 경로를 먼저 뚫는 단계에서
 * 내비게이션이 **실제로 도는지** 눈으로 확인해야 하고, 다음에 무엇을 만들지가
 * 화면에 적혀 있어야 인수인계가 문서 왕복 없이 끝납니다.
 *
 * 여기 남은 항목이 0이 되면 이 파일을 지우세요.
 */
interface PendingProps {
  title: string;
  /** 요청서(09-admin-console-brief.md)의 어느 절인지 */
  section: string;
  /** 이 화면이 할 일 */
  points: string[];
}

export function Pending({ title, section, points }: PendingProps) {
  return (
    <section>
      <header>
        <h1 className="text-[26px] font-semibold leading-tight tracking-[-.03em]">{title}</h1>
        <p className="mt-1.5 text-[12.5px] text-muted">아직 만들지 않은 화면입니다.</p>
      </header>

      <div className="mt-6 max-w-[620px] rounded-2xl border border-dashed border-line-strong bg-surface px-6 py-7">
        <p className="text-[11px] tracking-[.14em] text-muted-faint">
          09-ADMIN-CONSOLE-BRIEF · {section}
        </p>
        <ul className="mt-3 flex flex-col gap-2">
          {points.map((point) => (
            <li key={point} className="flex gap-2.5 text-[13px] leading-relaxed text-ink-soft">
              <span className="mt-[7px] size-[4px] flex-none rounded-full bg-gold" />
              {point}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
