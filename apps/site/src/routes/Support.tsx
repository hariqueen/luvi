/**
 * `/support` — 고객센터.
 *
 * 순서가 설계의 전부입니다:
 *
 *   FAQ  →  로그인하고 문의 (1순위)  →  로그인 없이 문의 (접힌 탈출구)  →  안내 사항
 *
 * 🔴 **로그인 유도를 폼 아래로 내리지 마세요.** 이 기능의 목적은 예쁜 폼이 아니라
 *    **문의를 메일 밖으로 빼내는 것**이고, 그건 로그인 전환율로 달성됩니다.
 *    소셜 로그인 3초가 이메일 주소를 타이핑하는 것보다 빠릅니다. 로그인한 사람은
 *    이름·이메일을 묻지 않아도 되고, 답변을 서비스 안에서 받고, 창구가 하나로 모입니다.
 *
 * 근거: `docs/08-support-plan.md` 4장.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { InquiryForm } from '@/components/InquiryForm';
import { FAQ } from '@/lib/faq';
import { useAuth } from '@/lib/auth';
import { logEvent } from '@/lib/log';

function Faq() {
  return (
    <section className="mt-10">
      <h2 className="text-[15px] font-semibold text-ink">자주 묻는 질문</h2>
      <div className="mt-3 divide-y divide-line border-y border-line">
        {FAQ.map((item) => (
          <details key={item.q} className="group py-3.5">
            <summary className="flex cursor-pointer list-none items-start gap-2 text-[14px] font-medium text-ink [&::-webkit-details-marker]:hidden">
              <span className="mt-0.5 text-muted-faint transition-transform group-open:rotate-90">
                ›
              </span>
              <span>{item.q}</span>
            </summary>
            <p className="mt-2 pl-5 text-[13px] leading-[1.8] text-muted">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

function Notes() {
  return (
    <section className="mt-10 border-t border-line pt-6 text-[12px] leading-relaxed text-muted">
      <h2 className="mb-2 text-[12.5px] font-semibold text-ink">안내 사항</h2>
      <ul className="space-y-1.5">
        {/*
          🔴 **운영시간을 적지 않습니다.** 상담 창구가 시간을 지켜 도는 구조가 아닌데
             시간을 적으면 지키지 못할 약속이 됩니다. 응답 목표 시간을 적지 않기로 한 것과
             같은 이유입니다 (`docs/08-support-plan.md` 결정 8).

             대신 "시간이 걸린다" 는 사실만 알려 재문의·독촉을 줄입니다.
        */}
        <li>· 답변에는 시간이 조금 걸려요. 확인하는 대로 차례대로 답변드릴게요 :)</li>
        <li>· 문의 내용을 자세히 남겨주시면 더 빠르게 도와드릴 수 있어요.</li>
        <li>
          · 답변은 이메일로 보내드려요. 로그인하고 문의하시면 이 사이트에서도 확인하실 수 있어요.
        </li>
        {/*
          산업안전보건법 제41조(고객응대근로자 보호)의 취지. 1인 사업자에게도 유효하고,
          욕설 문의는 반드시 옵니다. 미리 적어두는 것이 사후 대응의 근거가 됩니다.
        */}
        <li>
          · 산업안전보건법에 따라 고객을 응대하는 사람을 보호하고 있어요. 성희롱·욕설 등 폭언이
          있으면 서비스 이용과 상담이 제한되거나 법적 조치가 이루어질 수 있어요.
        </li>
        {/*
          🔴 "문의하기 버튼을 누르면 고지사항을 확인한 것으로 간주됩니다" 는 쓰지 않습니다.
             비로그인 폼에서 **명시적 체크박스**로 동의를 받고 있어서(`InquiryForm.tsx`)
             서로 어긋나고, 클릭 갈음보다 체크박스가 확실합니다. 안내와 링크만 둡니다.
        */}
        <li>
          · 문의를 접수하면서 개인정보를 수집해요. 어떤 정보를 왜 받는지는{' '}
          <Link to="/privacy" className="text-gold underline underline-offset-2">
            개인정보처리방침
          </Link>
          에서 확인하실 수 있어요.
        </li>
      </ul>
    </section>
  );
}

export default function Support() {
  const { status, user } = useAuth();
  const signedIn = status === 'signed-in' && Boolean(user);
  const [guestOpen, setGuestOpen] = useState(false);

  return (
    // ⚠️ `<main>` 을 쓰지 않습니다 — `SiteLayout` 이 이미 `<main>` 안에서 Outlet 을 그립니다.
    <article className="mx-auto w-full max-w-[760px] px-[clamp(16px,4vw,28px)] py-[clamp(32px,6vw,64px)]">
      <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted">Support</p>
      <h1 className="text-[24px] font-semibold text-ink">고객센터</h1>
      <p className="mt-2 text-[13.5px] leading-relaxed text-muted">
        먼저 아래 자주 묻는 질문을 확인해 주세요. 찾는 답이 없으면 문의해 주시면 됩니다.
      </p>

      <Faq />

      <section className="mt-12">
        <h2 className="text-[15px] font-semibold text-ink">문의하기</h2>

        {signedIn ? (
          <div className="mt-4">
            <p className="mb-4 rounded-lg bg-surface-sunken px-3 py-2.5 text-[12.5px] text-muted">
              <strong className="text-ink">{user?.displayName ?? '회원'}</strong>님으로 문의합니다.
              답변은 이 사이트와 이메일로 알려드립니다.
            </p>
            <InquiryForm entry="support" />
          </div>
        ) : (
          <>
            {/* 1순위 — 이 블록이 폼보다 위에 있어야 합니다 */}
            <div className="mt-4 rounded-xl border border-gold/40 bg-gold/5 p-5">
              <p className="text-[14px] font-semibold text-ink">
                로그인하면 답변을 여기서 바로 받아볼 수 있어요
              </p>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">
                카카오·구글·네이버로 3초면 됩니다. 이름과 이메일을 입력하지 않으셔도 되고,
                답변이 오면 사이트에서 바로 확인하실 수 있습니다.
              </p>
              <Link
                to="/login?returnTo=%2Fsupport"
                onClick={() => void logEvent({ kind: 'click', name: 'support_login_cta', ok: true })}
                className="mt-4 inline-block rounded-lg bg-ink px-4 py-2.5 text-[13.5px] font-medium text-bg"
              >
                로그인하고 문의하기
              </Link>
            </div>

            {/* 2순위 — 탈출구. 접어두되 숨기지는 않습니다 */}
            <div className="mt-4">
              {guestOpen ? (
                <div className="rounded-xl border border-line p-5">
                  <p className="mb-4 text-[12.5px] leading-relaxed text-muted">
                    로그인 없이 문의하시면 <strong className="text-ink">답변을 이메일로만</strong>{' '}
                    받으실 수 있습니다. 이메일 주소를 정확히 입력해 주세요.
                  </p>
                  <InquiryForm entry="support" />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setGuestOpen(true);
                    void logEvent({ kind: 'click', name: 'support_guest_open', ok: true });
                  }}
                  className="text-[13px] text-muted underline underline-offset-2 hover:text-ink"
                >
                  로그인 없이 문의하기
                </button>
              )}
            </div>
          </>
        )}
      </section>

      <Notes />
    </article>
  );
}
