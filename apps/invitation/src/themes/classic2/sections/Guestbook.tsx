/**
 * 방명록 (classic2) — 아이보리 카드 목록 + 세이지 등록 버튼.
 *
 * 저장·불러오기는 `useGuestbook()` 이 합니다 (미리보기에서는 서버에 쓰지 않습니다).
 */
import { useState } from 'react';
import { useGuestbook } from '@/hooks/useGuestbook';
import { Heading } from '../ui';

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
    <section className="bg-white px-[30px] py-[60px] text-center">
      <Heading script="Guestbook" label="축하 방명록" />

      <div className="mb-6 mt-2 font-myeongjo text-[12.5px] text-c2-ink-soft">
        저희 둘에게 따뜻한 방명록을 남겨주세요 ({entries.length})
      </div>

      {entries.length > 0 ? (
        <div className="mb-6 flex flex-col gap-2.5 text-left">
          {entries.map((g, i) => (
            <div key={i} className="border border-c2-line bg-c2-ivory px-4 py-3.5">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="font-myeongjo text-[13.5px] text-c2-sage-deep">{g.name}</span>
                <span className="text-[11px] text-c2-ink-soft">{fmtDate(g.ts)}</span>
              </div>
              <div className="font-myeongjo text-[13.5px] leading-[1.7] text-c2-ink">{g.msg}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="px-0 pb-6 pt-1.5 font-myeongjo text-[13px] text-c2-ink-soft">
          아직 방명록이 없어요. 첫 한마디를 남겨주세요.
        </div>
      )}

      <div className="flex flex-col gap-2.5 border border-c2-line bg-c2-ivory p-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="이름"
          maxLength={10}
          className="border border-c2-line bg-white px-3.5 py-[11px] text-sm text-c2-ink outline-none"
        />
        <textarea
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          placeholder="축하 메시지를 남겨주세요"
          maxLength={120}
          rows={3}
          className="resize-none border border-c2-line bg-white px-3.5 py-[11px] text-sm text-c2-ink outline-none"
        />
        <button
          onClick={onSubmit}
          className="cursor-pointer rounded-full border-none bg-c2-sage py-3 font-myeongjo text-[14px] tracking-[0.04em] text-white"
        >
          방명록 남기기
        </button>
      </div>
    </section>
  );
}
