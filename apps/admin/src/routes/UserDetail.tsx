/**
 * A2 · 회원 상세.
 *
 * 🔴 **이 화면이 콘솔의 존재 이유입니다.** 세 가지가 한 화면에서 이어져야 합니다:
 *    누구인지 · 그 사람의 청첩장 · 그 사람이 무엇을 눌러 무엇이 실패했나.
 *
 * 특히 "최근 활동" 입니다. D1 `events` 테이블은 처음부터 이 목적으로 만들었습니다
 * (`0001_events.sql` 주석: "문의가 들어왔을 때 누가 언제 무엇을 눌러 무엇이 실패했나를
 * SQL 로 바로 훑어야 한다"). 그런데 지금까지 볼 화면이 없어 D1 콘솔에서 SQL 로만
 * 봤습니다. 그 연결을 여기서 완성합니다 — 고객이 "사진이 안 올라가요" 라고만 써도
 * 옆에 `upload_fail ×3 (413)` 이 뜨면 되묻는 왕복이 통째로 사라집니다.
 *
 * 🔴 편집·발행·하객 화면은 전부 **메인 사이트로 새 탭**입니다. 에디터를 여기로
 *    들여오지 마세요. 서버의 `requireOwned()` 가 운영자를 통과시키므로 링크면 됩니다.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  INQUIRY_STATUS_LABELS,
  type AdminEventRow,
  type AdminUserDetail,
} from '@luvi/schema';
import { api } from '@/lib/api';
import { siteUrl } from '@/lib/env';
import { formatDate, formatDay, formatLogTime, formatTouched, providerLabels } from '@/lib/format';
import { MaskedValue } from '@/components/MaskedValue';
import { ScreenFallback } from '@/components/ScreenFallback';

type Load =
  | { state: 'loading' }
  | { state: 'error'; message: string; forbidden: boolean; notFound: boolean }
  | { state: 'ready'; user: AdminUserDetail };

// 라벨은 @luvi/schema 의 INQUIRY_STATUS_LABELS 하나만 씁니다 — 화면마다 따로 적으면
// 상태가 하나 늘 때 한쪽만 고쳐 서로 다른 말이 보입니다.

function Panel({ title, aside, children }: { title: string; aside?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-[13px] font-semibold tracking-[-.01em] text-ink">{title}</h2>
        {aside && <span className="text-[11.5px] text-muted-faint">{aside}</span>}
      </div>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-1.5 text-[12.5px]">
      <span className="w-[76px] flex-none text-muted-faint">{label}</span>
      <span className="min-w-0 flex-1 text-ink-soft">{children}</span>
    </div>
  );
}

/**
 * 이벤트 한 줄.
 *
 * 실패를 눈에 띄게 합니다 — 이 패널을 여는 이유의 대부분이 "무엇이 실패했나" 입니다.
 * `ok === 0` 이거나 `kind === 'error'` 면 실패로 봅니다. 서버가 남기는 실패는 전자,
 * 화면이 보내는 오류는 후자라 둘 다 봐야 합니다.
 */
function EventLine({ row }: { row: AdminEventRow }) {
  const failed = row.ok === 0 || row.kind === 'error';
  return (
    <li className="flex gap-3 border-b border-line-soft py-1.5 last:border-0 text-[12px]">
      <span className="w-[92px] flex-none text-muted-faint">{formatLogTime(row.at)}</span>
      <span className={`w-[150px] flex-none truncate ${failed ? 'text-gold-deep' : 'text-ink-soft'}`}>
        {failed && '⚠ '}
        {row.name}
      </span>
      <span className="min-w-0 flex-1 truncate text-muted" title={row.detail ?? ''}>
        {row.detail ?? ''}
      </span>
    </li>
  );
}

export default function UserDetail() {
  const { uid = '' } = useParams();
  const [load, setLoad] = useState<Load>({ state: 'loading' });

  const [events, setEvents] = useState<AdminEventRow[] | null>(null);
  const [onlyErrors, setOnlyErrors] = useState(false);
  const [eventsBusy, setEventsBusy] = useState(false);

  const fetchUser = useCallback(async () => {
    setLoad({ state: 'loading' });
    const res = await api.admin.user(uid);
    if (res.ok) setLoad({ state: 'ready', user: res.data });
    else
      setLoad({
        state: 'error',
        message: res.error.message,
        forbidden: res.error.code === 'forbidden',
        notFound: res.error.code === 'not_found',
      });
  }, [uid]);

  const fetchEvents = useCallback(
    async (errorsOnly: boolean) => {
      setEventsBusy(true);
      const res = await api.admin.userEvents(uid, errorsOnly);
      // 로그를 못 읽는 것으로 화면을 깨뜨리지 않습니다 — 빈 목록으로 둡니다
      setEvents(res.ok ? res.data : []);
      setEventsBusy(false);
    },
    [uid],
  );

  useEffect(() => {
    void fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    void fetchEvents(onlyErrors);
  }, [fetchEvents, onlyErrors]);

  if (load.state === 'loading') return <ScreenFallback />;

  if (load.state === 'error') {
    return (
      <section className="py-16 text-center">
        <p className="text-[14px] font-medium text-ink">
          {load.forbidden
            ? '운영자 계정만 볼 수 있어요'
            : load.notFound
              ? '없는 회원이에요'
              : '불러오지 못했어요'}
        </p>
        <p className="mt-2 text-[13px] text-muted">{load.message}</p>
        <Link to="/users" className="mt-4 inline-block text-[12.5px] text-muted hover:underline">
          회원 목록으로
        </Link>
      </section>
    );
  }

  const u = load.user;

  return (
    <section>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link to="/users" className="text-[11.5px] text-muted-faint hover:text-muted">
            ← 회원
          </Link>
          <h1 className="mt-1 text-[26px] font-semibold leading-tight tracking-[-.03em]">
            {u.displayName ?? '이름 없음'}
            {u.role === 'admin' && (
              <span className="ml-2 align-middle rounded-full bg-sand px-2 py-0.5 text-[11px] text-gold-deep">
                운영자
              </span>
            )}
          </h1>
          <p className="mt-1 select-all text-[11.5px] text-muted-faint">{u.uid}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            void fetchUser();
            void fetchEvents(onlyErrors);
          }}
          className="rounded-full border border-line-strong px-3.5 py-2 text-[12.5px] text-muted"
        >
          새로고침
        </button>
      </header>

      <div className="mt-6 grid gap-3 xl:grid-cols-3">
        <Panel title="회원">
          <Row label="이메일">
            <MaskedValue
              masked={u.emailMasked}
              emptyLabel="이메일 없음"
              onReveal={async () => {
                const res = await api.admin.revealUser(u.uid);
                if (!res.ok) throw new Error(res.error.message);
                return res.data.email;
              }}
            />
          </Row>
          <Row label="로그인">{providerLabels(u.providers) || '-'}</Row>
          <Row label="요금제">{u.plan}</Row>
          <Row label="가입">{formatDay(u.createdAt)}</Row>
          <Row label="최종 로그인">{formatTouched(u.lastLoginAt)}</Row>
          <Row label="동의">
            {u.consent.satisfied ? (
              <span className="text-success">완료</span>
            ) : (
              <span className="text-gold-deep">
                {u.consent.missing.length > 0 ? `필요: ${u.consent.missing.join(' · ')}` : '없음'}
              </span>
            )}
          </Row>

          {u.consentHistory.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-[11.5px] text-muted-faint">
                동의 이력 {u.consentHistory.length}건
              </summary>
              <ul className="mt-2">
                {u.consentHistory.map((r) => (
                  <li key={r.id} className="flex gap-2 py-1 text-[11.5px] text-muted">
                    <span className="w-[90px] flex-none text-muted-faint">
                      {formatDay(r.agreedAt)}
                    </span>
                    <span className="flex-1">
                      {r.docType} v{r.docVersion}
                    </span>
                    <span className={r.agreed ? 'text-success' : 'text-gold-deep'}>
                      {r.agreed ? '동의' : '철회'}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </Panel>

        <Panel title="청첩장" aside={`${u.invitations.length}건`}>
          {u.invitations.length === 0 ? (
            <p className="py-3 text-[12.5px] text-muted-faint">만든 청첩장이 없습니다.</p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {u.invitations.map((inv) => (
                <li key={inv.id} className="border-b border-line-soft pb-2.5 last:border-0 last:pb-0">
                  <p className="truncate text-[13px] font-medium text-ink">
                    {inv.coupleLabel || '제목 없음'}
                  </p>
                  <p className="mt-0.5 truncate text-[11.5px] text-muted-faint">
                    {inv.status === 'published' ? '발행됨' : inv.status === 'archived' ? '보관됨' : '초안'}
                    {inv.unpublishedChanges > 0 && ` · 변경 ${inv.unpublishedChanges}건`}
                    {' · '}
                    {formatDate(inv.weddingAt)}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[12px]">
                    <a
                      href={siteUrl(`/app/i/${inv.id}/edit`)}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-ink hover:underline"
                    >
                      편집 ↗
                    </a>
                    {inv.status === 'published' && inv.slug && (
                      <a
                        href={siteUrl(`/i/${inv.slug}`)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-muted hover:underline"
                      >
                        하객 화면 ↗
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="최근 활동"
          aside={events === null ? '불러오는 중' : `${events.length}건 · 14일 보관`}
        >
          <label className="mb-2 flex items-center gap-1.5 text-[11.5px] text-muted">
            <input
              type="checkbox"
              checked={onlyErrors}
              onChange={(e) => setOnlyErrors(e.target.checked)}
              className="size-3.5 accent-[#C9A063]"
            />
            오류만 보기
          </label>

          {events === null || eventsBusy ? (
            <div className="h-[120px] animate-pulse rounded-lg bg-surface-sunken" />
          ) : events.length === 0 ? (
            <p className="py-3 text-[12.5px] text-muted-faint">
              {onlyErrors ? '14일 안에 실패한 기록이 없습니다.' : '남은 활동 기록이 없습니다.'}
            </p>
          ) : (
            <ul className="max-h-[420px] overflow-y-auto">
              {events.map((row, i) => (
                <EventLine key={`${row.at}-${i}`} row={row} />
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="mt-3">
        <Panel title="이 회원의 문의" aside={`${u.inquiries.length}건`}>
          {u.inquiries.length === 0 ? (
            <p className="py-3 text-[12.5px] text-muted-faint">접수된 문의가 없습니다.</p>
          ) : (
            <ul className="flex flex-col">
              {u.inquiries.map((q) => (
                <li key={q.id} className="border-b border-line-soft last:border-0">
                  <Link
                    to={`/inquiries/${q.id}`}
                    className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2 text-[12.5px] transition-colors hover:bg-surface-sunken"
                  >
                    <span className="w-[110px] flex-none text-muted-faint">{q.number}</span>
                    <span className="min-w-0 flex-1 truncate text-ink-soft">{q.subject}</span>
                    <span className="text-muted">{INQUIRY_STATUS_LABELS[q.status]}</span>
                    {q.unreadForAdmin && (
                      <span className="rounded-full bg-cream px-2 py-px text-[11px] text-gold-deep">
                        안 읽음
                      </span>
                    )}
                    <span className="w-[86px] flex-none text-right text-muted-faint">
                      {formatTouched(q.lastMessageAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </section>
  );
}
