/**
 * `/support/t/:token` — 조회 링크로 보는 문의 스레드.
 *
 * **M1 에서는 읽기 전용입니다.** 답변 작성과 이어쓰기는 M2 입니다 (10/25 이후).
 * 그때까지 답변은 메일로 나가므로, 이 화면은 그 사실을 분명히 말해야 합니다 —
 * "여기서 기다리면 답이 올 것" 이라고 오해하면 답변을 놓칩니다.
 *
 * 🔴 이 주소를 아는 사람은 문의 내용을 볼 수 있습니다. 그래서 서버가 연락처를 가려서
 *    보내고(`emailMasked` · `phoneMasked`), 화면은 받은 값을 그대로 그립니다.
 */
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { INQUIRY_STATUS_LABELS, inquiryCategoryLabel, type InquiryThread as Thread } from '@luvi/schema';
import { api } from '@/lib/api';

type Load =
  | { state: 'loading' }
  | { state: 'error'; message: string }
  | { state: 'ready'; thread: Thread };

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function InquiryThreadView() {
  const { token = '' } = useParams();
  const [load, setLoad] = useState<Load>({ state: 'loading' });

  useEffect(() => {
    let alive = true;
    void (async () => {
      const res = await api.inquiries.byToken(token);
      if (!alive) return;
      setLoad(
        res.ok
          ? { state: 'ready', thread: res.data }
          : { state: 'error', message: res.error.message },
      );
    })();
    return () => {
      alive = false;
    };
  }, [token]);

  return (
    <article className="mx-auto w-full max-w-[760px] px-[clamp(16px,4vw,28px)] py-[clamp(32px,6vw,64px)]">
      <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted">Support</p>

      {load.state === 'loading' && <p className="text-[13px] text-muted">불러오는 중…</p>}

      {load.state === 'error' && (
        <>
          <h1 className="text-[20px] font-semibold text-ink">문의를 찾을 수 없습니다</h1>
          <p className="mt-2 text-[13px] leading-relaxed text-muted">
            링크가 잘못되었거나 오래되어 만료되었을 수 있습니다. 문의번호를 알고 계시면{' '}
            <a href="mailto:help@luv-ai.co.kr" className="text-gold underline underline-offset-2">
              help@luv-ai.co.kr
            </a>{' '}
            으로 알려주세요.
          </p>
          <p className="mt-6 text-[12.5px]">
            <Link to="/support" className="text-gold underline underline-offset-2">
              고객센터로 가기
            </Link>
          </p>
        </>
      )}

      {load.state === 'ready' && (
        <>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h1 className="text-[20px] font-semibold leading-snug text-ink">
              {load.thread.subject}
            </h1>
            <span className="rounded bg-surface-sunken px-2 py-0.5 text-[11.5px] text-muted">
              {INQUIRY_STATUS_LABELS[load.thread.status]}
            </span>
          </div>
          <p className="mt-2 text-[12px] text-muted">
            <span className="font-mono">{load.thread.number}</span> ·{' '}
            {inquiryCategoryLabel(load.thread.category)} · {formatWhen(load.thread.createdAt)}
          </p>
          <p className="mt-1 text-[12px] text-muted-faint">
            {load.thread.name} · {load.thread.emailMasked}
            {load.thread.phoneMasked ? ` · ${load.thread.phoneMasked}` : ''}
          </p>

          <div className="mt-8 space-y-4">
            {load.thread.messages.map((m) => (
              <div
                key={m.id}
                className={
                  m.author === 'admin'
                    ? 'rounded-xl border border-gold/40 bg-gold/5 p-4'
                    : 'rounded-xl border border-line p-4'
                }
              >
                <p className="mb-2 text-[11.5px] font-medium text-muted">
                  {m.author === 'admin' ? '러비 고객센터' : load.thread.name}
                  {' · '}
                  {formatWhen(m.createdAt)}
                </p>
                {/* 평문으로 그립니다 — 마크다운·HTML 을 해석하지 않습니다 (XSS 표면 최소화) */}
                <p className="whitespace-pre-wrap text-[13.5px] leading-[1.8] text-ink">{m.body}</p>
                {m.attachments.length > 0 && (
                  <p className="mt-2 text-[12px] text-muted">첨부 {m.attachments.length}장</p>
                )}
              </div>
            ))}
          </div>

          <p className="mt-8 rounded-lg bg-surface-sunken px-4 py-3 text-[12.5px] leading-relaxed text-muted">
            답변이 준비되면 <strong className="text-ink">이메일로 보내드립니다.</strong> 이 화면에서
            바로 이어서 문의하는 기능은 준비 중입니다. 그때까지는 받으신 메일에 회신해 주시거나{' '}
            <Link to="/support" className="text-gold underline underline-offset-2">
              새 문의
            </Link>
            를 남겨주세요.
          </p>

          <p className="mt-4 text-[11.5px] leading-relaxed text-muted-faint">
            이 링크를 아는 사람은 문의 내용을 볼 수 있습니다. 다른 사람과 공유하지 마세요.
          </p>
        </>
      )}
    </article>
  );
}
