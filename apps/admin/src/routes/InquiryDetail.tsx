/**
 * B2 · 문의 상세 — 이번 개발의 핵심 화면.
 *
 * 왼쪽에 스레드, 오른쪽에 맥락. 답변을 쓰면 서버가 세 가지를 함께 합니다:
 * 메시지 추가 · 상태를 '답변함' 으로 · 고객에게 알림 메일(답변 전문 포함).
 *
 * 🔴 **고객 글과 운영자 답변을 평문으로 렌더합니다.** 마크다운·HTML 을 해석하지 않습니다.
 *    `whiteSpace: pre-wrap` 으로 줄바꿈만 살립니다. 운영자 계정이 털렸을 때 고객 화면에서
 *    스크립트가 도는 경로를 만들지 않기 위해서입니다 — 서버도 같은 이유로 평문 저장합니다.
 *
 * 🔴 **내부 메모는 고객에게 보이지 않습니다.** 고객용 `InquiryThread` 에는 `adminNote`
 *    필드 자체가 없습니다. 그래도 화면에서 답변 칸과 헷갈리지 않게 색과 라벨을 다르게 둡니다 —
 *    메모에 쓸 말을 답변 칸에 쓰는 사고가 이 화면에서 가장 비쌉니다.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ADMIN_NOTE_MAX,
  ADMIN_REPLY_MAX,
  INQUIRY_STATUS_LABELS,
  inquiryCategoryLabel,
  type AdminEventRow,
  type AdminInquiryDetail,
  type InquiryStatus,
} from '@luvi/schema';
import { api } from '@/lib/api';
import { siteUrl } from '@/lib/env';
import { formatDay, formatLogTime, formatTouched } from '@/lib/format';
import { MaskedValue } from '@/components/MaskedValue';
import { ScreenFallback } from '@/components/ScreenFallback';

type Load =
  | { state: 'loading' }
  | { state: 'error'; message: string; forbidden: boolean; notFound: boolean }
  | { state: 'ready'; thread: AdminInquiryDetail };

const STATUSES: InquiryStatus[] = ['new', 'open', 'answered', 'closed'];

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <h2 className="mb-3 text-[13px] font-semibold tracking-[-.01em] text-ink">{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-1.5 text-[12.5px]">
      <span className="w-[68px] flex-none text-muted-faint">{label}</span>
      <span className="min-w-0 flex-1 break-words text-ink-soft">{children}</span>
    </div>
  );
}

export default function InquiryDetail() {
  const { id = '' } = useParams();
  const [load, setLoad] = useState<Load>({ state: 'loading' });

  const [reply, setReply] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<null | 'reply' | 'note' | 'status'>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [events, setEvents] = useState<AdminEventRow[] | null>(null);

  const fetchThread = useCallback(async () => {
    const res = await api.inquiries.adminThread(id);
    if (res.ok) {
      setLoad({ state: 'ready', thread: res.data });
      setNote(res.data.adminNote);
    } else {
      setLoad({
        state: 'error',
        message: res.error.message,
        forbidden: res.error.code === 'forbidden',
        notFound: res.error.code === 'not_found',
      });
    }
  }, [id]);

  useEffect(() => {
    void fetchThread();
  }, [fetchThread]);

  // 회원이면 최근 오류를 함께 보여줍니다 — "사진이 안 올라가요" 옆에 upload_fail 이 뜨는 그 연결입니다
  const uid = load.state === 'ready' ? load.thread.uid : null;
  useEffect(() => {
    if (!uid) return;
    void (async () => {
      const res = await api.admin.userEvents(uid, true);
      setEvents(res.ok ? res.data : []);
    })();
  }, [uid]);

  async function sendReply() {
    const body = reply.trim();
    if (!body) return;
    setBusy('reply');
    setError(null);
    setNotice(null);
    const res = await api.inquiries.adminReply(id, body);
    setBusy(null);
    if (!res.ok) {
      setError(res.error.message);
      return;
    }
    setReply('');
    setNotice('답변을 보냈습니다. 고객에게 알림 메일이 갑니다.');
    await fetchThread();
  }

  async function saveNote() {
    setBusy('note');
    setError(null);
    setNotice(null);
    const res = await api.inquiries.adminUpdate(id, { adminNote: note });
    setBusy(null);
    if (!res.ok) setError(res.error.message);
    else setNotice('메모를 저장했습니다.');
  }

  async function changeStatus(status: InquiryStatus) {
    setBusy('status');
    setError(null);
    setNotice(null);
    const res = await api.inquiries.adminUpdate(id, { status });
    setBusy(null);
    if (!res.ok) {
      setError(res.error.message);
      return;
    }
    await fetchThread();
  }

  if (load.state === 'loading') return <ScreenFallback />;

  if (load.state === 'error') {
    return (
      <section className="py-16 text-center">
        <p className="text-[14px] font-medium text-ink">
          {load.forbidden
            ? '운영자 계정만 볼 수 있어요'
            : load.notFound
              ? '없는 문의예요'
              : '불러오지 못했어요'}
        </p>
        <p className="mt-2 text-[13px] text-muted">{load.message}</p>
        <Link to="/inquiries" className="mt-4 inline-block text-[12.5px] text-muted hover:underline">
          문의함으로
        </Link>
      </section>
    );
  }

  const t = load.thread;

  return (
    <section>
      <header>
        <Link to="/inquiries" className="text-[11.5px] text-muted-faint hover:text-muted">
          ← 문의
        </Link>
        <h1 className="mt-1 text-[22px] font-semibold leading-snug tracking-[-.02em]">
          {t.subject || '(제목 없음)'}
        </h1>
        <p className="mt-1 text-[12px] text-muted-faint">
          {t.number} · {inquiryCategoryLabel(t.category)} · {t.name}
          {t.uid ? '' : ' · 비회원'} · 접수 {formatDay(t.createdAt)}
        </p>
      </header>

      <div className="mt-6 grid gap-3 xl:grid-cols-[minmax(0,1fr)_340px]">
        {/* ── 스레드 ── */}
        <div className="flex flex-col gap-3">
          <Panel title="대화">
            <ul className="flex flex-col gap-3">
              {t.messages.map((m) => {
                const admin = m.author === 'admin';
                return (
                  <li
                    key={m.id}
                    className={`rounded-xl border p-3.5 ${
                      admin ? 'border-gold-soft bg-cream' : 'border-line bg-surface-sunken'
                    }`}
                  >
                    <div className="mb-1.5 flex items-baseline justify-between gap-2">
                      <span className="text-[11.5px] font-medium text-ink-soft">
                        {admin ? '러비 고객센터' : t.name}
                      </span>
                      <span className="text-[11px] text-muted-faint">
                        {formatTouched(m.createdAt)}
                      </span>
                    </div>
                    {/* 🔴 평문. dangerouslySetInnerHTML 을 쓰지 마세요 */}
                    <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed text-ink">
                      {m.body}
                    </p>
                    {m.attachments.length > 0 && (
                      <p className="mt-2 text-[11.5px] text-muted-faint">
                        첨부 {m.attachments.length}장
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>

            <div className="mt-4 border-t border-line-soft pt-4">
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value.slice(0, ADMIN_REPLY_MAX))}
                rows={6}
                placeholder="답변을 쓰세요. 이 내용이 그대로 고객 메일에 들어갑니다."
                className="w-full resize-y rounded-xl border border-line-strong bg-white px-3.5 py-3 text-[13px] leading-relaxed outline-none focus:border-gold"
              />
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] text-muted-faint">
                  {reply.length} / {ADMIN_REPLY_MAX} · 평문으로 나갑니다 (마크다운 해석 안 함)
                </span>
                <button
                  type="button"
                  disabled={busy !== null || !reply.trim()}
                  onClick={() => void sendReply()}
                  className="rounded-full bg-ink px-4 py-2 text-[12.5px] text-paper-soft disabled:opacity-40"
                >
                  {busy === 'reply' ? '보내는 중…' : '답변 보내기'}
                </button>
              </div>
              {t.emailMasked === '' && (
                <p className="mt-2 text-[11.5px] text-gold-deep">
                  이 문의에는 보낼 이메일 주소가 없습니다. 답변은 저장되지만 알림 메일은 가지
                  않습니다. 고객은 접수 때 받은 조회 링크로만 볼 수 있습니다.
                </p>
              )}
              {error && <p className="mt-2 text-[12px] text-gold-deep">{error}</p>}
              {notice && <p className="mt-2 text-[12px] text-success">{notice}</p>}
            </div>
          </Panel>

          <Panel title="내부 메모">
            <p className="mb-2 text-[11.5px] text-muted-faint">
              고객에게 보이지 않습니다. 응대 중에 기억해야 할 것을 적어두세요.
            </p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, ADMIN_NOTE_MAX))}
              rows={3}
              className="w-full resize-y rounded-xl border border-dashed border-line-strong bg-surface-sunken px-3.5 py-3 text-[13px] leading-relaxed outline-none focus:border-gold"
            />
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="text-[11px] text-muted-faint">
                {note.length} / {ADMIN_NOTE_MAX}
              </span>
              <button
                type="button"
                disabled={busy !== null || note === t.adminNote}
                onClick={() => void saveNote()}
                className="rounded-full border border-line-strong px-3.5 py-1.5 text-[12px] text-muted disabled:opacity-40"
              >
                {busy === 'note' ? '저장 중…' : '메모 저장'}
              </button>
            </div>
          </Panel>
        </div>

        {/* ── 맥락 ── */}
        <div className="flex flex-col gap-3">
          <Panel title="상태">
            <div className="flex flex-wrap gap-1.5">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={busy !== null || s === t.status}
                  onClick={() => void changeStatus(s)}
                  className={`rounded-full px-3 py-1.5 text-[12px] transition-colors ${
                    s === t.status
                      ? 'bg-ink text-paper-soft'
                      : 'border border-line-strong text-muted hover:border-gold-soft disabled:opacity-40'
                  }`}
                >
                  {INQUIRY_STATUS_LABELS[s]}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-muted-faint">
              답변을 보내면 자동으로 &apos;답변함&apos; 이 됩니다. &apos;종결&apos; 은 직접
              누를 때만 됩니다.
            </p>
          </Panel>

          <Panel title="문의한 사람">
            <Row label="이름">{t.name}</Row>
            <Row label="이메일">
              <MaskedValue
                masked={t.emailMasked || null}
                emptyLabel="없음"
                onReveal={async () => {
                  const res = await api.inquiries.adminReveal(t.id);
                  if (!res.ok) throw new Error(res.error.message);
                  return res.data.email || null;
                }}
              />
            </Row>
            <Row label="연락처">
              <MaskedValue
                masked={t.phoneMasked || null}
                emptyLabel="없음"
                onReveal={async () => {
                  const res = await api.inquiries.adminReveal(t.id);
                  if (!res.ok) throw new Error(res.error.message);
                  return res.data.phone || null;
                }}
              />
            </Row>
            <Row label="계정">
              {t.uid ? (
                <Link to={`/users/${t.uid}`} className="text-ink underline underline-offset-2">
                  회원 상세 보기
                </Link>
              ) : (
                <span className="text-muted-faint">비회원</span>
              )}
            </Row>
            {t.weddingDate && <Row label="예식일">{t.weddingDate}</Row>}
            {t.services && <Row label="희망">{t.services}</Row>}
          </Panel>

          <Panel title="접수 맥락">
            <Row label="위치">{t.entry || '-'}</Row>
            <Row label="경로">{t.path || '-'}</Row>
            <Row label="청첩장">
              {t.invitationId ? (
                <a
                  href={siteUrl(`/app/i/${t.invitationId}/edit`)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-ink underline underline-offset-2"
                >
                  편집 열기 ↗
                </a>
              ) : (
                <span className="text-muted-faint">없음</span>
              )}
            </Row>
            {t.attachments.length > 0 && <Row label="첨부">{t.attachments.length}장</Row>}
          </Panel>

          <Panel title="최근 14일 오류">
            {!t.uid ? (
              <p className="text-[12px] text-muted-faint">
                비회원이라 활동 기록을 이을 수 없습니다.
              </p>
            ) : events === null ? (
              <div className="h-[80px] animate-pulse rounded-lg bg-surface-sunken" />
            ) : events.length === 0 ? (
              <p className="text-[12px] text-muted-faint">실패한 기록이 없습니다.</p>
            ) : (
              <ul className="max-h-[260px] overflow-y-auto">
                {events.map((row, i) => (
                  <li
                    key={`${row.at}-${i}`}
                    className="border-b border-line-soft py-1.5 last:border-0 text-[11.5px]"
                  >
                    <div className="flex gap-2">
                      <span className="flex-none text-muted-faint">{formatLogTime(row.at)}</span>
                      <span className="min-w-0 flex-1 truncate text-gold-deep">{row.name}</span>
                    </div>
                    {row.detail && (
                      <p className="mt-0.5 truncate text-muted" title={row.detail}>
                        {row.detail}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </section>
  );
}
