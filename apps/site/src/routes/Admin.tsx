/**
 * 운영자 — 전체 청첩장.
 *
 * 대시보드는 `ownerUid == 내 uid` 로 필터하므로, 운영자여도 **남의 청첩장은 목록에 오지 않습니다**
 * (권한은 개별 문서 접근에만 적용됩니다). 고객 대신 손봐줄 때 ID 를 알 방법이 없어서 이 화면을 둡니다.
 *
 * 여기서 가장 중요한 정보는 "**누구** 청첩장인지" 입니다 — 같은 신랑신부 이름이 여럿 생기면
 * 소유자를 못 보고 고치다가 남의 청첩장을 건드립니다. 그래서 소유자를 제목만큼 크게 보여줍니다.
 *
 * 목록 접근 자체도 서버가 매 요청 판단합니다 (`GET /api/admin/invitations` → 403). 이 화면은
 * 숨기는 역할만 하고, 권한의 근거가 아닙니다.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { assetUrl } from '@/lib/env';
import type { AdminInvitationSummary } from '@luvi/schema';

type Load =
  | { state: 'loading' }
  | { state: 'error'; message: string; forbidden: boolean }
  | { state: 'ready'; items: AdminInvitationSummary[] };

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const pad = (n: number) => String(n).padStart(2, '0');

/** "2026-10-24T13:00:00" → "2026. 10. 24 (토)" */
function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()} (${WEEKDAYS[d.getDay()]})`;
}

/** 수정 시각은 "오늘 21:04" 처럼 — 운영 중에는 '언제 만졌는지'가 날짜보다 중요합니다 */
function formatTouched(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const today = new Date();
  const sameDay =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return sameDay ? `오늘 ${time}` : `${d.getMonth() + 1}. ${d.getDate()} ${time}`;
}

function statusBadge(inv: AdminInvitationSummary): { label: string; className: string } {
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

const PROVIDER_LABEL: Record<string, string> = {
  'google.com': '구글',
  password: '이메일',
  kakao: '카카오',
  naver: '네이버',
};

/** 소유자 한 줄. 이름·이메일은 소셜 로그인에서 선택 동의라 없을 수 있어 uid 로 떨어집니다 */
function ownerLabel(inv: AdminInvitationSummary): string {
  if (!inv.ownerUid) return '소유자 없음 (미인계)';
  return inv.ownerName ?? inv.ownerEmail ?? inv.ownerUid;
}

export default function Admin() {
  const [load, setLoad] = useState<Load>({ state: 'loading' });
  const [q, setQ] = useState('');

  const fetchList = useCallback(async () => {
    setLoad({ state: 'loading' });
    const res = await api.admin.invitations();
    if (res.ok) setLoad({ state: 'ready', items: res.data });
    else
      setLoad({
        state: 'error',
        message: res.error.message,
        forbidden: res.error.code === 'forbidden',
      });
  }, []);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  // 검색은 서버로 보내지 않습니다 — 건수가 적고, 운영자가 uid 조각으로도 찾을 수 있어야 합니다
  const items = useMemo(() => {
    if (load.state !== 'ready') return [];
    const needle = q.trim().toLowerCase();
    if (!needle) return load.items;
    return load.items.filter((inv) =>
      [inv.coupleLabel, inv.slug, inv.ownerName, inv.ownerEmail, inv.ownerUid, inv.id]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle)),
    );
  }, [load, q]);

  return (
    <section>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[clamp(24px,4vw,34px)] font-semibold leading-tight tracking-[-.03em]">
            전체 청첩장
          </h1>
          <p className="mt-2 text-[13px] text-muted">
            모든 계정의 청첩장입니다. 고객을 대신해 수정·발행할 때 씁니다 — 소유자를 꼭 확인하세요.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="이름 · 이메일 · 주소 · uid 검색"
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

      <div className="mt-7">
        {load.state === 'loading' && (
          <div className="flex flex-col gap-2.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-[96px] animate-pulse rounded-2xl bg-surface-sunken" />
            ))}
          </div>
        )}

        {load.state === 'error' && (
          <div className="rounded-2xl border border-line-strong bg-surface px-5 py-10 text-center">
            <p className="text-[14px] font-medium text-ink">
              {load.forbidden ? '운영자 계정만 볼 수 있어요' : '목록을 불러오지 못했어요'}
            </p>
            <p className="mt-2 text-[13px] text-muted">{load.message}</p>
            {!load.forbidden && (
              <button
                type="button"
                onClick={() => void fetchList()}
                className="mt-4 rounded-full border border-line-strong px-4 py-2 text-[12.5px] text-muted"
              >
                다시 시도
              </button>
            )}
          </div>
        )}

        {load.state === 'ready' && (
          <>
            <p className="mb-3 text-[12px] text-muted-faint">
              전체 {load.items.length}건
              {q.trim() && ` · 검색 결과 ${items.length}건`}
            </p>

            {items.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-line-strong bg-surface px-6 py-12 text-center text-[13px] text-muted">
                {q.trim() ? '검색 결과가 없어요' : '아직 만들어진 청첩장이 없어요'}
              </div>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {items.map((inv) => {
                  const badge = statusBadge(inv);
                  const thumb = assetUrl(inv.thumbKey);
                  const providers = inv.ownerProviders
                    .map((p) => PROVIDER_LABEL[p] ?? p)
                    .join(' · ');
                  return (
                    <li
                      key={inv.id}
                      className="flex gap-4 rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-line-strong"
                    >
                      <div className="size-[64px] flex-none overflow-hidden rounded-xl bg-surface-sunken">
                        {thumb ? (
                          <img src={thumb} alt="" className="size-full object-cover" />
                        ) : (
                          <div className="flex size-full items-center justify-center font-script text-xl text-muted-faint">
                            L
                          </div>
                        )}
                      </div>

                      <div className="flex min-w-0 flex-1 flex-col">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[11px] ${badge.className}`}
                          >
                            {badge.label}
                          </span>
                          <span className="truncate text-[14.5px] font-semibold text-ink">
                            {ownerLabel(inv)}
                          </span>
                          {providers && (
                            <span className="text-[11px] text-muted-faint">{providers}</span>
                          )}
                        </div>

                        <p className="mt-1 truncate text-[13px] text-ink-soft">
                          {inv.coupleLabel || '제목 없음'}
                          <span className="text-muted-faint"> · {formatDate(inv.weddingAt)}</span>
                        </p>

                        <p className="mt-0.5 truncate text-[11.5px] text-muted-faint">
                          {inv.slug ? `/i/${inv.slug}` : '주소 없음'} · 수정{' '}
                          {formatTouched(inv.updatedAt)} · {inv.ownerEmail ?? '이메일 없음'} ·{' '}
                          {inv.ownerUid ?? 'uid 없음'}
                        </p>

                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px]">
                          <Link
                            to={`/app/i/${inv.id}/edit`}
                            className="font-medium text-ink hover:underline"
                          >
                            편집
                          </Link>
                          <Link
                            to={`/app/i/${inv.id}/publish`}
                            className="text-muted hover:underline"
                          >
                            발행
                          </Link>
                          <Link
                            to={`/app/i/${inv.id}/guestbook`}
                            className="text-muted hover:underline"
                          >
                            방명록
                          </Link>
                          {inv.status === 'published' && inv.slug && (
                            <a
                              href={`/i/${inv.slug}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-muted hover:underline"
                            >
                              하객 화면 ↗
                            </a>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </div>
    </section>
  );
}
