/**
 * C2 대시보드 — 내 청첩장.
 *
 * 로그인한 계정이 **소유한** 청첩장만 보여줍니다 (`GET /api/invitations` 는 서버에서
 * `ownerUid == 내 uid` 로 필터합니다). 다른 계정의 청첩장은 애초에 목록에 오지 않고,
 * 편집·삭제도 서버의 `requireOwned` 가 소유자에게만 허용합니다.
 *
 * 상태 배지 4종으로 "지금 무슨 상태인지"를 한눈에 보여줍니다. 특히 `발행됨 · 변경 N건` 이
 * "고쳤는데 왜 안 바뀌지?" 를 원천에서 막아줍니다 — 초안은 바뀌었지만 아직 발행 전이라는 뜻.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { assetUrl } from '@/lib/env';
import type { InvitationSummary } from '@luvi/schema';

type Load =
  | { state: 'loading' }
  | { state: 'error'; message: string }
  | { state: 'ready'; items: InvitationSummary[] };

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const pad = (n: number) => String(n).padStart(2, '0');

/** "2026-10-24T13:00:00" → "2026. 10. 24 (토) 오후 1:00" */
function formatWeddingAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '날짜 미정';
  const ampm = d.getHours() < 12 ? '오전' : '오후';
  const h12 = d.getHours() % 12 || 12;
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()} (${WEEKDAYS[d.getDay()]}) ${ampm} ${h12}:${pad(d.getMinutes())}`;
}

function statusBadge(inv: InvitationSummary): { label: string; className: string } {
  if (inv.status === 'archived') {
    return { label: '보관됨', className: 'bg-surface-sunken text-muted-faint' };
  }
  if (inv.status === 'published') {
    return inv.unpublishedChanges > 0
      ? { label: `발행됨 · 변경 ${inv.unpublishedChanges}건`, className: 'bg-cream text-gold-deep' }
      : { label: '발행됨', className: 'bg-cream text-gold-deep' };
  }
  return { label: '초안', className: 'bg-surface-sunken text-muted' };
}

export default function Dashboard() {
  const { isAdmin } = useAuth();
  const [load, setLoad] = useState<Load>({ state: 'loading' });
  const [busyId, setBusyId] = useState<string | null>(null);

  // 클라이언트가 실패까지 ApiResult 로 정규화하므로 try/catch 없이 .ok 로 분기합니다
  const fetchList = useCallback(async () => {
    setLoad({ state: 'loading' });
    const res = await api.invitations.list();
    if (res.ok) setLoad({ state: 'ready', items: res.data });
    else setLoad({ state: 'error', message: res.error.message });
  }, []);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  const onDelete = async (inv: InvitationSummary) => {
    const published = inv.status === 'published';
    const ok = window.confirm(
      published
        ? `"${inv.coupleLabel}" 청첩장을 삭제할까요?\n하객에게 공유된 링크도 함께 사라지고 되돌릴 수 없습니다.`
        : `"${inv.coupleLabel}" 청첩장을 삭제할까요? 되돌릴 수 없습니다.`,
    );
    if (!ok) return;
    setBusyId(inv.id);
    const res = await api.invitations.remove(inv.id);
    setBusyId(null);
    if (res.ok) await fetchList();
    else window.alert(res.error.message);
  };

  return (
    <section>
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-[clamp(24px,4vw,34px)] font-semibold leading-tight tracking-[-.03em]">
            내 청첩장
          </h1>
          <p className="mt-2 text-[13px] text-muted">
            내가 만든 청첩장을 직접 수정·발행하고 방명록을 관리합니다.
          </p>
        </div>
      </header>

      <div className="mt-8">
        {load.state === 'loading' && (
          <div className="grid gap-3 sm:grid-cols-2">
            {[0, 1].map((i) => (
              <div key={i} className="h-[120px] animate-pulse rounded-2xl bg-surface-sunken" />
            ))}
          </div>
        )}

        {load.state === 'error' && (
          <div className="rounded-2xl border border-line-strong bg-surface px-5 py-6 text-center">
            <p className="text-[13px] text-ink-soft">{load.message}</p>
            <button
              type="button"
              onClick={() => void fetchList()}
              className="mt-3 rounded-full border border-line-strong px-4 py-2 text-[12.5px] text-muted"
            >
              다시 시도
            </button>
          </div>
        )}

        {load.state === 'ready' && load.items.length === 0 && (
          <div className="rounded-2xl border border-dashed border-line-strong bg-surface px-6 py-14 text-center">
            {/*
              운영자 계정은 **청첩장을 소유하지 않습니다**(서버가 생성을 막습니다). 그래서 이
              화면은 늘 비어 있는 것이 정상이고, 안내를 '전체 청첩장' 으로 돌립니다 —
              여기서 만들라고 하면 막힌 길로 보냅니다.
            */}
            {isAdmin ? (
              <>
                <p className="text-[15px] font-medium text-ink">운영자 계정은 청첩장을 갖지 않아요</p>
                <p className="mt-2 text-[13px] text-muted">
                  다른 계정의 청첩장을 손봐주는 계정입니다. 목록은 상단{' '}
                  <b className="font-medium text-ink">전체 청첩장</b> 에서 볼 수 있어요.
                </p>
                <Link
                  to="/app/admin"
                  className="mt-5 inline-block rounded-full bg-ink px-5 py-2.5 text-[13px] text-paper-soft"
                >
                  전체 청첩장 보기
                </Link>
              </>
            ) : (
              <>
                <p className="text-[15px] font-medium text-ink">아직 만든 청첩장이 없어요</p>
                <p className="mt-2 text-[13px] text-muted">첫 청첩장을 만들어 시작해보세요.</p>
                <Link
                  to="/app/new"
                  className="mt-5 inline-block rounded-full bg-ink px-5 py-2.5 text-[13px] text-paper-soft"
                >
                  + 새 청첩장 만들기
                </Link>
              </>
            )}
          </div>
        )}

        {load.state === 'ready' && load.items.length > 0 && (
          <ul className="grid gap-3 sm:grid-cols-2">
            {load.items.map((inv) => {
              const badge = statusBadge(inv);
              const thumb = assetUrl(inv.thumbKey);
              const busy = busyId === inv.id;
              return (
                <li
                  key={inv.id}
                  className="flex gap-4 rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-line-strong"
                >
                  <div className="size-[76px] flex-none overflow-hidden rounded-xl bg-surface-sunken">
                    {thumb ? (
                      <img src={thumb} alt="" className="size-full object-cover" />
                    ) : (
                      <div className="flex size-full items-center justify-center font-script text-2xl text-muted-faint">
                        L
                      </div>
                    )}
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col">
                    <span
                      className={`inline-block w-fit rounded-full px-2.5 py-0.5 text-[11px] ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                    <h3 className="mt-1.5 truncate text-[15px] font-semibold text-ink">
                      {inv.coupleLabel || '제목 없음'}
                    </h3>
                    <p className="mt-0.5 text-[12px] text-muted">{formatWeddingAt(inv.weddingAt)}</p>

                    <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-2.5 text-[12.5px]">
                      <Link to={`/app/i/${inv.id}/edit`} className="font-medium text-ink hover:underline">
                        편집
                      </Link>
                      <Link to={`/app/i/${inv.id}/publish`} className="text-muted hover:underline">
                        발행
                      </Link>
                      <Link to={`/app/i/${inv.id}/guestbook`} className="text-muted hover:underline">
                        방명록
                      </Link>
                      {inv.status === 'published' && inv.slug && (
                        <a
                          href={`/i/${inv.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-muted hover:underline"
                        >
                          하객 링크 ↗
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => void onDelete(inv)}
                        disabled={busy}
                        className="ml-auto text-muted-faint hover:text-gold-deep disabled:opacity-50"
                      >
                        {busy ? '삭제 중…' : '삭제'}
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
