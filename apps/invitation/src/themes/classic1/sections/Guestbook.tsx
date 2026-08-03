import { useState } from 'react';
import { useGuestbook } from '@/hooks/useGuestbook';
import { SectionHeading } from '@/components/common/SectionHeading';

const fmtDate = (ts: number) =>
  new Date(ts).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });

export function Guestbook() {
  const { entries, submit } = useGuestbook();
  const [name, setName] = useState('');
  const [msg, setMsg] = useState('');

  const onSubmit = () => {
    if (submit(name, msg)) {
      setName('');
      setMsg('');
    }
  };

  return (
    <section className="bg-white px-7 py-[56px] text-center">
      <SectionHeading eyebrow="🐾 GUESTBOOK" title="축하 방명록" />
      <div className="mb-[22px] mt-1 text-[12.5px] text-ink-soft">
        저희 둘에게 따뜻한 방명록을 남겨주세요 ({entries.length})
      </div>

      {entries.length > 0 ? (
        <div className="mb-[22px] flex flex-col gap-2.5 text-left">
          {entries.map((g, i) => (
            <div
              key={i}
              className="rounded-lg border border-line bg-white px-4 py-3.5 shadow-xs"
            >
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[13.5px] font-bold text-rose-deep">🐾 {g.name}</span>
                <span className="text-[11px] text-ink-soft">{fmtDate(g.ts)}</span>
              </div>
              <div className="text-[13.5px] leading-[1.6] text-ink">{g.msg}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="px-0 pb-[22px] pt-1.5 text-[13px] text-ink-soft">
          아직 메시지가 없어요. 첫 한마디를 남겨주세요 💌
        </div>
      )}

      <div className="flex flex-col gap-2.5 rounded-xl bg-cream p-4">
        <div className="mb-0.5 flex items-center justify-center gap-[7px]">
          <span className="text-[17px]">💌</span>
          <span className="text-[12.5px] font-bold text-rose-deep">
            신랑 · 신부에게 한마디 남기기
          </span>
        </div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="이름"
          maxLength={10}
          className="rounded-sm border border-line bg-white px-3.5 py-[11px] text-sm text-ink outline-none"
        />
        <textarea
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          placeholder="축하 메시지를 남겨주세요"
          maxLength={120}
          rows={3}
          className="resize-none rounded-sm border border-line bg-white px-3.5 py-[11px] text-sm text-ink outline-none"
        />
        <button
          onClick={onSubmit}
          className="cursor-pointer rounded-full border-none bg-rose py-3 text-sm font-extrabold text-white shadow-[0_6px_0_#A65A6E] transition-[transform,box-shadow] duration-100 active:translate-y-[3px] active:shadow-[0_3px_0_#A65A6E]"
        >
          💌 메시지 남기기
        </button>
      </div>
    </section>
  );
}
