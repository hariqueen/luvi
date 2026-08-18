/**
 * 예식일 (classic2) — 흰 카드 달력 + 콜론으로 잇는 카운트다운.
 *
 * 달력 계산(앞 공백 + 말일)은 classic1 과 같은 규칙이지만 표기는 이 디자인의 것입니다
 * (요일 머리글이 국문 '일월화…' 가 아니라 영문 'SUN MON…').
 */
import { useCountdown } from '@/hooks/useCountdown';
import { Heading } from '../ui';
import { useInvitation } from '@/lib/invitationContext';

const WEEKDAYS_EN = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

/** 예식일이 속한 달의 달력 셀(앞 공백 + 1~말일)을 계산 */
function buildMonthCells(year: number, monthIndex: number): (number | null)[] {
  const leading = new Date(year, monthIndex, 1).getDay();
  const days = new Date(year, monthIndex + 1, 0).getDate();
  return [
    ...Array<null>(leading).fill(null),
    ...Array.from({ length: days }, (_, i) => i + 1),
  ];
}

function CountUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="min-w-[52px]">
      <div className="font-cormorant text-[34px] font-medium leading-none text-c2-ink">{value}</div>
      <div className="mt-1 text-[10px] tracking-[0.18em] text-c2-ink-soft">{label}</div>
    </div>
  );
}

export function Calendar() {
  const { calendar, weddingAt, groom, bride } = useInvitation();
  const cd = useCountdown(weddingAt);

  const target = new Date(weddingAt);
  const cells = buildMonthCells(target.getFullYear(), target.getMonth());

  return (
    <section className="bg-c2-ivory px-[30px] py-[60px] text-center">
      <Heading script="The Day" label="예식일" />

      <div className="mt-[26px] rounded-[18px] border border-c2-line bg-white px-5 py-6 shadow-[0_6px_20px_rgba(62,58,51,.05)]">
        <div className="mb-4 font-cormorant text-2xl font-medium tracking-[0.04em] text-c2-ink">
          {calendar.monthLabel}
        </div>

        <div className="mb-2.5 grid grid-cols-7 text-[11px] font-bold tracking-[0.04em] text-c2-ink-soft">
          {WEEKDAYS_EN.map((w) => (
            <div key={w}>{w}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-y-1 font-cormorant text-[13px] text-c2-ink">
          {cells.map((n, i) => (
            <div key={i} className="flex aspect-square items-center justify-center">
              {n !== null && n === calendar.highlightDay ? (
                <span className="flex size-[34px] items-center justify-center rounded-full bg-c2-sage font-semibold text-white shadow-[0_6px_14px_rgba(142,156,132,.5)]">
                  {n}
                </span>
              ) : (
                <span>{n}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 flex items-end justify-center gap-1">
        <CountUnit value={cd.d} label="DAYS" />
        <span className="pb-3.5 font-cormorant text-[26px] text-c2-gold">:</span>
        <CountUnit value={cd.h} label="HOURS" />
        <span className="pb-3.5 font-cormorant text-[26px] text-c2-gold">:</span>
        <CountUnit value={cd.m} label="MIN" />
        <span className="pb-3.5 font-cormorant text-[26px] text-c2-gold">:</span>
        <CountUnit value={cd.s} label="SEC" />
      </div>

      <div className="mt-4 font-myeongjo text-[13px] text-c2-ink-soft">
        {groom.firstName} · {bride.firstName}의 결혼식까지
      </div>
    </section>
  );
}
