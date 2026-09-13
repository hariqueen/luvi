import { useState } from 'react';
import { useGuestbook } from '@/hooks/useGuestbook';
import { useInvitation } from '@/lib/invitationContext';
import { SectionText } from '../ui';
import { Field, showOptional } from '@/components/common/Editable';

const fmtDate = (ts: number) =>
  new Date(ts).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });

export function Guestbook() {
  const { entries, submit } = useGuestbook();
  const { sectionText, labels } = useInvitation();
  const text = sectionText.guestbook;
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
      <SectionText
        section="guestbook"
        zone="head"
        blocks={text.head}
        className="mb-[22px]"
        override={{ note: 'text-[12.5px] text-ink-soft' }}
        append={` (${entries.length})`}
      />

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
        // 비어 있을 때의 안내 — 지우면 이 자리가 통째로 사라집니다 (labels.ts)
        showOptional(labels.guestbookEmpty) && (
          <div className="px-0 pb-[22px] pt-1.5 text-[13px] text-ink-soft">
            <Field
              path="core.labels.guestbookEmpty"
              value={labels.guestbookEmpty}
              placeholder="비었을 때 안내"
            />
          </div>
        )
      )}

      <div className="flex flex-col gap-2.5 rounded-xl bg-cream p-4">
        {/* 머리글은 지울 수 있습니다. 💌 는 글자가 아니라 이 줄의 장식이라 남습니다 */}
        {showOptional(labels.guestbookFormTitle) && (
          <div className="mb-0.5 flex items-center justify-center gap-[7px]">
            <span className="text-[17px]">💌</span>
            <span className="text-[12.5px] font-bold text-rose-deep">
              <Field
                path="core.labels.guestbookFormTitle"
                value={labels.guestbookFormTitle}
                placeholder="머리글"
              />
            </span>
          </div>
        )}
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={labels.guestbookNamePlaceholder}
          maxLength={10}
          className="rounded-sm border border-line bg-white px-3.5 py-[11px] text-sm text-ink outline-none"
        />
        <textarea
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          placeholder={labels.guestbookMessagePlaceholder}
          maxLength={120}
          rows={3}
          className="resize-none rounded-sm border border-line bg-white px-3.5 py-[11px] text-sm text-ink outline-none"
        />
        <button
          onClick={onSubmit}
          className="cursor-pointer rounded-full border-none bg-rose py-3 text-sm font-extrabold text-white shadow-[0_6px_0_#A65A6E] transition-[transform,box-shadow] duration-100 active:translate-y-[3px] active:shadow-[0_3px_0_#A65A6E]"
        >
          {labels.guestbookSubmit}
        </button>
      </div>

      <SectionText section="guestbook" zone="foot" blocks={text.foot} className="mt-7" />
    </section>
  );
}
