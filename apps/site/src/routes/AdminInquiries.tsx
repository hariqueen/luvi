/**
 * `/app/admin/inquiries` — 운영자 문의함.
 *
 * **M1 에서는 읽기 전용입니다.** 답변 작성·상태 변경·내부 메모는 M2 입니다.
 * 그때까지 답변은 메일로 하고, 이 화면은 "무엇이 들어왔는지" 를 놓치지 않게 합니다.
 *
 * 목록은 서버가 `403` 으로 막습니다 — 이 화면은 숨기는 역할만 하고 권한의 근거가 아닙니다
 * (`Admin.tsx` 와 같은 원칙).
 *
 * 검색은 화면에서 거릅니다. Firestore 에 부분일치 검색이 없고, 그걸 위해 색인 서비스를
 * 붙일 규모가 아닙니다 (문의는 하루 몇 건입니다).
 */
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  INQUIRY_STATUS_LABELS,
  inquiryCategoryLabel,
  type AdminInquiryList,
  type AdminInquirySummary,
  type InquiryStatus,
} from '@luvi/schema';
import { api } from '@/lib/api';

type Load =
  | { state: 'loading' }
  | { state: 'error'; message: string; forbidden: boolean }
  | { state: 'ready'; data: AdminInquiryList };

const STATUSES: InquiryStatus[] = ['new', 'open', 'answered', 'closed'];

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  const today = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const sameDay =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
  return sameDay ? `오늘 ${time}` : `${d.getMonth() + 1}. ${d.getDate()} ${time}`;
}

function Row({ item }: { item: AdminInquirySummary }) {
  return (
    <li className="border-b border-line-soft py-4 last:border-0">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        {item.unreadForAdmin && (
          <span className="rounded bg-cream px-1.5 py-0.5 text-[11px] font-medium text-gold-deep">
            새 문의
          </span>
        )}
        <span className="text-[14px] font-medium leading-snug text-ink">{item.subject}</span>
      </div>

      <p className="mt-1 text-[12px] text-muted">
        <span className="font-mono">{item.number}</span> · {inquiryCategoryLabel(item.category)} ·{' '}
        {INQUIRY_STATUS_LABELS[item.status]} · {formatWhen(item.lastMessageAt)}
      </p>

      {/*
        "누가" 를 제목만큼 크게 보여줍니다 — 답장할 주소를 여기서 바로 복사해야 하고,
        M1 에서는 답변을 메일로 하기 때문입니다.
      */}
      <p className="mt-1.5 text-[12.5px] text-ink">
        {item.name}
        {item.uid ? (
          <span className="ml-1 text-[11.5px] text-muted">(회원)</span>
        ) : (
          <span className="ml-1 text-[11.5px] text-muted">(비회원)</span>
        )}
        {item.email && (
          <>
            {' · '}
            <a
              href={`mailto:${item.email}?subject=${encodeURIComponent(`[러비] 문의 ${item.number} 답변`)}`}
              className="text-gold underline underline-offset-2"
            >
              {item.email}
            </a>
          </>
        )}
        {item.phone && <> · {item.phone}</>}
      </p>

      <p className="mt-1 text-[11.5px] text-muted-faint">
        접수 위치 {item.entry}
        {item.attachmentCount > 0 && ` · 첨부 ${item.attachmentCount}장`}
        {item.invitationId && (
          <>
            {' · '}
            <Link
              to={`/app/i/${item.invitationId}/edit`}
              className="text-gold underline underline-offset-2"
            >
              청첩장 열기
            </Link>
          </>
        )}
      </p>
    </li>
  );
}

export default function AdminInquiries() {
  const [load, setLoad] = useState<Load>({ state: 'loading' });
  const [filter, setFilter] = useState<InquiryStatus | 'all'>('all');
  const [q, setQ] = useState('');

  useEffect(() => {
    let alive = true;
    setLoad({ state: 'loading' });
    void (async () => {
      const res = await api.inquiries.admin(filter === 'all' ? undefined : filter);
      if (!alive) return;
      setLoad(
        res.ok
          ? { state: 'ready', data: res.data }
          : {
              state: 'error',
              message: res.error.message,
              forbidden: res.error.code === 'forbidden',
            },
      );
    })();
    return () => {
      alive = false;
    };
  }, [filter]);

  const visible = useMemo(() => {
    if (load.state !== 'ready') return [];
    const needle = q.trim().toLowerCase();
    if (!needle) return load.data.items;
    return load.data.items.filter((i) =>
      [i.number, i.name, i.email, i.phone, i.subject]
        .join(' ')
        .toLowerCase()
        .includes(needle),
    );
  }, [load, q]);

  return (
    <section className="mx-auto w-full max-w-[900px] px-[clamp(14px,3vw,28px)] py-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-[20px] font-semibold text-ink">문의함</h1>
        {load.state === 'ready' && (
          <p className="text-[12px] text-muted">
            미확인 {load.data.counts.new}건 · 처리 중 {load.data.counts.open}건
          </p>
        )}
      </div>

      <p className="mt-2 text-[12px] leading-relaxed text-muted-faint">
        지금은 읽기 전용입니다. 답변은 이메일로 보내주세요 (이름 옆 주소를 누르면 제목이 채워집니다).
        사이트 안에서 답변하는 기능은 10/25 이후에 붙습니다.
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {(['all', ...STATUSES] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={`rounded-full px-3 py-1.5 text-[12.5px] ${
              filter === s ? 'bg-ink text-bg' : 'bg-surface-sunken text-muted hover:text-ink'
            }`}
          >
            {s === 'all' ? '전체' : INQUIRY_STATUS_LABELS[s]}
          </button>
        ))}
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="번호·이름·이메일 검색"
          className="ml-auto w-full rounded-lg border border-line bg-bg px-3 py-1.5 text-[12.5px] text-ink outline-none placeholder:text-muted-faint focus:border-gold sm:w-56"
        />
      </div>

      {load.state === 'loading' && <p className="mt-8 text-[13px] text-muted">불러오는 중…</p>}

      {load.state === 'error' && (
        <p className="mt-8 rounded-lg bg-surface-sunken px-4 py-3 text-[13px] text-muted">
          {load.forbidden ? '운영자만 볼 수 있는 화면입니다.' : load.message}
        </p>
      )}

      {load.state === 'ready' && (
        <ul className="mt-4">
          {visible.length === 0 ? (
            <li className="py-8 text-[13px] text-muted">문의가 없습니다.</li>
          ) : (
            visible.map((item) => <Row key={item.id} item={item} />)
          )}
        </ul>
      )}
    </section>
  );
}
