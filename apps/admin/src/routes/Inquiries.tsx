/**
 * B1 · 문의함.
 *
 * 지금까지 답변을 메일로 해서 기록이 Gmail 에 흩어져 있었습니다. 여기부터 스레드 하나에
 * 고객 글·운영자 답변·상태·내부 메모가 모입니다.
 *
 * 🔴 **연락처는 가려져서 옵니다.** 서버가 `emailMasked` · `phoneMasked` 로만 보냅니다.
 *    원문은 스레드에서 "보기" 를 눌렀을 때만, 기록을 남기고 옵니다.
 *
 * 정렬·검색은 받아온 목록 안에서 합니다. Firestore 에 부분일치가 없고, 건수가 적습니다.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  INQUIRY_STATUS_LABELS,
  inquiryCategoryLabel,
  type AdminInquiryList,
  type InquiryStatus,
} from '@luvi/schema';
import { api } from '@/lib/api';
import { formatTouched } from '@/lib/format';

type Load =
  | { state: 'loading' }
  | { state: 'error'; message: string; forbidden: boolean }
  | { state: 'ready'; data: AdminInquiryList };

/** 탭 순서는 운영 순서입니다 — 아침에 여는 사람은 '미확인' 부터 봅니다 */
const TABS: { value: InquiryStatus | 'all'; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'new', label: INQUIRY_STATUS_LABELS.new },
  { value: 'open', label: INQUIRY_STATUS_LABELS.open },
  { value: 'answered', label: INQUIRY_STATUS_LABELS.answered },
  { value: 'closed', label: INQUIRY_STATUS_LABELS.closed },
];

const STATUS_CLASS: Record<InquiryStatus, string> = {
  new: 'bg-cream text-gold-deep',
  open: 'bg-sand text-gold-deep',
  answered: 'bg-surface-sunken text-muted',
  closed: 'bg-surface-sunken text-muted-faint',
};

export default function Inquiries() {
  const [tab, setTab] = useState<InquiryStatus | 'all'>('all');
  const [load, setLoad] = useState<Load>({ state: 'loading' });
  const [q, setQ] = useState('');

  const fetchList = useCallback(async () => {
    setLoad({ state: 'loading' });
    // 서버가 상태별 전체 건수를 함께 주므로, 탭을 바꿔도 배지는 항상 맞습니다
    const res = await api.inquiries.admin(tab === 'all' ? undefined : tab);
    if (res.ok) setLoad({ state: 'ready', data: res.data });
    else
      setLoad({
        state: 'error',
        message: res.error.message,
        forbidden: res.error.code === 'forbidden',
      });
  }, [tab]);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  const items = useMemo(() => {
    if (load.state !== 'ready') return [];
    const needle = q.trim().toLowerCase();
    if (!needle) return load.data.items;
    return load.data.items.filter((i) =>
      [i.number, i.name, i.subject, i.emailMasked, i.phoneMasked]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle)),
    );
  }, [load, q]);

  const counts = load.state === 'ready' ? load.data.counts : null;
  const unread = load.state === 'ready' ? load.data.items.filter((i) => i.unreadForAdmin).length : 0;

  return (
    <section>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-semibold leading-tight tracking-[-.03em]">
            문의
            {unread > 0 && (
              <span className="ml-2 align-middle rounded-full bg-gold px-2 py-0.5 text-[12px] text-paper-soft">
                안 읽음 {unread}
              </span>
            )}
          </h1>
          <p className="mt-1.5 text-[12.5px] text-muted">
            답변은 스레드에서 씁니다. 쓰면 고객에게 알림 메일이 갑니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="번호 · 이름 · 제목 검색"
            className="w-[min(260px,60vw)] rounded-full border border-line-strong bg-white px-4 py-2 text-[12.5px] outline-none focus:border-gold"
          />
          <button
            type="button"
            onClick={() => void fetchList()}
            className="flex-none rounded-full border border-line-strong px-3.5 py-2 text-[12.5px] text-muted"
          >
            새로고침
          </button>
        </div>
      </header>

      <div className="mt-5 flex flex-wrap gap-1.5">
        {TABS.map((t) => {
          const n =
            t.value === 'all'
              ? counts
                ? Object.values(counts).reduce((a, b) => a + b, 0)
                : null
              : (counts?.[t.value] ?? null);
          const active = tab === t.value;
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => setTab(t.value)}
              className={`rounded-full px-3.5 py-1.5 text-[12.5px] transition-colors ${
                active
                  ? 'bg-ink text-paper-soft'
                  : 'border border-line-strong text-muted hover:border-gold-soft'
              }`}
            >
              {t.label}
              {n !== null && <span className="ml-1.5 opacity-70">{n}</span>}
            </button>
          );
        })}
      </div>

      <div className="mt-5">
        {load.state === 'loading' && (
          <div className="flex flex-col gap-1.5">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-[52px] animate-pulse rounded-lg bg-surface-sunken" />
            ))}
          </div>
        )}

        {load.state === 'error' && (
          <div className="rounded-2xl border border-line-strong bg-surface px-5 py-10 text-center">
            <p className="text-[14px] font-medium text-ink">
              {load.forbidden ? '운영자 계정만 볼 수 있어요' : '목록을 불러오지 못했어요'}
            </p>
            <p className="mt-2 text-[13px] text-muted">{load.message}</p>
          </div>
        )}

        {load.state === 'ready' &&
          (items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line-strong bg-surface px-6 py-12 text-center text-[13px] text-muted">
              {q.trim() ? '검색 결과가 없어요' : '이 상태의 문의가 없어요'}
            </div>
          ) : (
            <ul className="overflow-hidden rounded-2xl border border-line bg-surface">
              {items.map((i) => (
                <li key={i.id} className="border-b border-line-soft last:border-0">
                  <Link
                    to={`/inquiries/${i.id}`}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 transition-colors hover:bg-surface-sunken"
                  >
                    <span
                      className={`flex-none rounded-full px-2 py-0.5 text-[11px] ${STATUS_CLASS[i.status]}`}
                    >
                      {INQUIRY_STATUS_LABELS[i.status]}
                    </span>
                    {i.unreadForAdmin && (
                      <span className="size-[6px] flex-none rounded-full bg-gold" title="안 읽음" />
                    )}
                    <span className="w-[112px] flex-none text-[11.5px] text-muted-faint">
                      {i.number}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[13px] text-ink">
                      {i.subject || '(제목 없음)'}
                    </span>
                    <span className="flex-none text-[12px] text-muted">
                      {i.name}
                      {i.uid ? '' : ' · 비회원'}
                    </span>
                    <span className="w-[92px] flex-none text-right text-[11.5px] text-muted-faint">
                      {inquiryCategoryLabel(i.category)}
                    </span>
                    <span className="w-[86px] flex-none text-right text-[11.5px] text-muted-faint">
                      {formatTouched(i.lastMessageAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ))}
      </div>
    </section>
  );
}
