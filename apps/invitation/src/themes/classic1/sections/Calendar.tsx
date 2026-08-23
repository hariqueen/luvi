import { useCountdown } from '@/hooks/useCountdown';
import { Eyebrow } from '@/components/common/SectionHeading';
import { useInvitation } from '@/lib/invitationContext';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

/** 예식일이 속한 달의 달력 셀(앞 공백 + 1~말일)을 계산 */
function buildMonthCells(year: number, monthIndex: number): (number | null)[] {
  const leading = new Date(year, monthIndex, 1).getDay();
  const days = new Date(year, monthIndex + 1, 0).getDate();
  return [
    ...Array<null>(leading).fill(null),
    ...Array.from({ length: days }, (_, i) => i + 1),
  ];
}

function CountBox({ value, label, primary }: { value: number; label: string; primary?: boolean }) {
  return (
    <div
      className={
        primary
          ? 'w-16 rounded-[18px] bg-rose py-3.5 shadow-[0_8px_18px_rgba(199,123,139,.42)]'
          : 'w-16 rounded-[18px] border border-line bg-white py-3.5 shadow-sm'
      }
    >
      <div
        className={`font-mono text-[26px] font-extrabold ${primary ? 'text-white' : 'text-ink'}`}
      >
        {value}
      </div>
      <div
        className={`mt-0.5 text-[10.5px] tracking-[0.08em] ${
          primary ? 'text-white/90' : 'text-ink-soft'
        }`}
      >
        {label}
      </div>
    </div>
  );
}

export function Calendar() {
  const invitation = useInvitation();
  const { calendar, weddingAt, sectionText } = invitation;
  const text = sectionText.calendar;
  const cd = useCountdown(weddingAt);

  const target = new Date(weddingAt);
  const cells = buildMonthCells(target.getFullYear(), target.getMonth());

  return (
    <section className="bg-cream px-7 py-[58px] text-center">
      <Eyebrow className="mb-2">{text.eyebrow}</Eyebrow>
      <div className="font-cormorant text-[34px] font-medium text-ink">{calendar.monthLabel}</div>

      <div className="my-6 rounded-2xl border border-line bg-white px-[18px] py-[22px] shadow-sm">
        <div className="mb-2 grid grid-cols-7 text-xs font-bold text-ink-soft">
          {WEEKDAYS.map((w, i) => (
            <div key={w} className={i === 0 ? 'text-rose-deep' : i === 6 ? 'text-sage' : undefined}>
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-1 text-ink">
          {cells.map((n, i) => (
            <div key={i} className="flex aspect-square items-center justify-center text-[13px]">
              {n === calendar.highlightDay ? (
                <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-rose font-bold text-white shadow-[0_4px_10px_rgba(199,123,139,.45)]">
                  {n}
                  <span className="absolute -inset-[5px] animate-pulseRing rounded-full border-2 border-rose" />
                </span>
              ) : (
                <span>{n}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 이름은 어댑터가 이미 치환했습니다 ({신랑}·{신부}) */}
      <div className="mb-[18px] font-myeongjo text-sm text-ink-soft">{text.note}</div>
      <div className="flex justify-center gap-2">
        <CountBox value={cd.d} label="DAYS" primary />
        <CountBox value={cd.h} label="HOURS" />
        <CountBox value={cd.m} label="MIN" />
        <CountBox value={cd.s} label="SEC" />
      </div>
    </section>
  );
}
