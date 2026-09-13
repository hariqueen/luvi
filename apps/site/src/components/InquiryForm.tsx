/**
 * 문의 폼 — **네 군데 진입점이 공유하는 하나의 컴포넌트**입니다.
 * (푸터/고객센터 · 에디터·대시보드 도움 · 플로팅 버튼 · 식전영상·초대장 제작문의)
 *
 * 화면마다 폼을 따로 만들면 개인정보 동의 문구나 길이 제한이 한 곳만 바뀌는 일이 생깁니다.
 * 그건 곧 방침과 화면이 어긋나는 상태입니다.
 *
 * 🔴 **로그인 상태면 이름·이메일을 묻지 않습니다.** 계정 값을 서버가 직접 채웁니다 —
 *    화면이 보낸 이름·이메일을 서버가 믿지 않는 것과 짝을 이룹니다.
 *
 * 모바일이 1급입니다. 문의는 **막힌 그 순간 그 화면에서** 쓰고, 그 화면은 대개 모바일입니다.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { sessionId } from '@luvi/api-client';
import {
  INQUIRY_ATTACHMENT_TYPES,
  INQUIRY_CATEGORIES,
  INQUIRY_EXTRAS_ENABLED,
  INQUIRY_LIMITS,
  INQUIRY_TEMPLATES,
  type CreateInquiryResult,
  type InquiryCategory,
  type InquiryContext,
} from '@luvi/schema';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { logEvent } from '@/lib/log';
import { Turnstile } from '@/components/Turnstile';

export interface InquiryFormProps {
  entry: InquiryContext['entry'];
  /** 편집 중이던 청첩장 — 되묻지 않기 위해 함께 보냅니다 */
  invitationId?: string;
  slug?: string;
  /** 유형을 미리 정해 여는 경우 (식전영상 페이지에서는 '제작 상담') */
  defaultCategory?: InquiryCategory;
  onDone?: (result: CreateInquiryResult) => void;
}

type State =
  | { phase: 'editing' }
  | { phase: 'sending' }
  | { phase: 'done'; result: CreateInquiryResult; uploaded: number; failed: number };

const inputClass =
  'w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-[14px] text-ink outline-none placeholder:text-muted-faint focus:border-gold';
const labelClass = 'mb-1.5 block text-[12.5px] font-medium text-ink';

export function InquiryForm({
  entry,
  invitationId,
  slug,
  defaultCategory,
  onDone,
}: InquiryFormProps) {
  const { status, user } = useAuth();
  const signedIn = status === 'signed-in' && Boolean(user);

  const [category, setCategory] = useState<InquiryCategory>(defaultCategory ?? 'invitation');
  const [message, setMessage] = useState(INQUIRY_TEMPLATES[defaultCategory ?? 'invitation']);
  /** 사용자가 내용을 건드렸으면 유형을 바꿔도 템플릿으로 덮지 않습니다 */
  const touched = useRef(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [weddingDate, setWeddingDate] = useState('');
  const [services, setServices] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [company, setCompany] = useState(''); // 허니팟
  const [turnstileToken, setTurnstileToken] = useState('');

  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<State>({ phase: 'editing' });

  // 유형을 고르면 그에 맞는 뼈대를 채웁니다. 빈 칸을 주면 "안돼요" 세 글자가 옵니다.
  useEffect(() => {
    if (!touched.current) setMessage(INQUIRY_TEMPLATES[category]);
  }, [category]);

  /**
   * 🔴 자동수집 맥락은 **방침 1.1.0 이 시행 중일 때만** 보냅니다
   *    (`INQUIRY_EXTRAS_ENABLED` 주석 참고). 서버도 같은 값으로 한 번 더 버립니다 —
   *    화면만 막으면 요청을 직접 보내는 경로가 남습니다.
   */
  const context: InquiryContext | undefined = useMemo(
    () =>
      INQUIRY_EXTRAS_ENABLED
        ? {
            entry,
            path: typeof window === 'undefined' ? '' : window.location.pathname,
            ...(invitationId ? { invitationId } : {}),
            ...(slug ? { slug } : {}),
            sessionId: sessionId(),
          }
        : undefined,
    [entry, invitationId, slug],
  );

  function pickFiles(list: FileList | null) {
    if (!list) return;
    const next = [...files];
    for (const f of Array.from(list)) {
      if (next.length >= INQUIRY_LIMITS.attachments) break;
      if (!(INQUIRY_ATTACHMENT_TYPES as readonly string[]).includes(f.type)) {
        setError('JPG · PNG · WEBP 이미지만 첨부할 수 있어요');
        continue;
      }
      if (f.size > INQUIRY_LIMITS.attachmentBytes) {
        setError('이미지 한 장은 5MB 까지예요');
        continue;
      }
      next.push(f);
    }
    setFiles(next);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!message.trim()) {
      setError('문의 내용을 입력해주세요');
      return;
    }
    if (!signedIn) {
      if (!name.trim()) return setError('이름을 입력해주세요');
      if (!email.includes('@')) return setError('답변을 받을 이메일 주소를 정확히 입력해주세요');
      if (!agreed) return setError('개인정보 수집·이용에 동의해주세요');
    }

    setState({ phase: 'sending' });

    const res = await api.inquiries.create({
      category,
      message,
      ...(signedIn ? {} : { name, email, privacyAgreed: agreed, turnstileToken }),
      ...(category === 'consult' ? { weddingDate, services } : {}),
      ...(context ? { context } : {}),
      ...(company ? { company } : {}),
    });

    if (!res.ok) {
      setState({ phase: 'editing' });
      setError(res.error.message);
      void logEvent({ kind: 'error', name: 'inquiry_submit', ok: false, detail: res.error.code });
      return;
    }

    void logEvent({
      kind: 'click',
      name: 'inquiry_submit',
      ok: true,
      detail: `${category} ${signedIn ? 'member' : 'guest'}`,
    });

    // 🔴 첨부는 접수가 끝난 **뒤에** 올립니다. 여기서 실패해도 문의는 이미 저장됐습니다 —
    //    그래서 "접수되지 않았다" 고 말하지 않고, 몇 장이 실패했는지만 알려줍니다.
    let uploaded = 0;
    let failed = 0;
    for (let i = 0; i < files.length; i += 1) {
      const file = files[i];
      if (!file) continue;
      const up = await api.inquiries.uploadAttachment(res.data.id, res.data.uploadToken, i, file);
      if (up.ok) uploaded += 1;
      else failed += 1;
    }

    setState({ phase: 'done', result: res.data, uploaded, failed });
    onDone?.(res.data);
  }

  if (state.phase === 'done') {
    const link = `/support/t/${state.result.token}`;
    return (
      <div className="rounded-xl border border-gold/40 bg-gold/5 p-5">
        <h3 className="text-[16px] font-semibold text-ink">문의가 접수됐습니다</h3>
        <p className="mt-2 text-[13px] leading-relaxed text-muted">
          문의번호 <strong className="font-mono text-ink">{state.result.number}</strong>
          <br />
          확인한 뒤 답변드리겠습니다.
        </p>

        {state.failed > 0 && (
          <p className="mt-3 rounded-lg bg-surface-sunken px-3 py-2 text-[12.5px] text-muted">
            첨부 {state.failed}장은 올리지 못했어요. <strong className="text-ink">문의는 정상
            접수됐습니다.</strong> 사진이 필요하면 답변 메일에 회신으로 보내주세요.
          </p>
        )}

        {/*
          🔴 메일만 믿지 않습니다. 이메일 오타 = 답변 도달 실패이므로,
             조회 링크를 화면에서 한 번 더 보여주고 저장을 권합니다.
        */}
        <div className="mt-4 rounded-lg border border-line bg-bg p-3">
          <p className="text-[12.5px] font-medium text-ink">이 링크를 저장해두세요</p>
          <Link to={link} className="mt-1 block break-all text-[12.5px] text-gold underline underline-offset-2">
            {state.result.token ? `${window.location.origin}${link}` : ''}
          </Link>
          <p className="mt-2 text-[11.5px] leading-relaxed text-muted-faint">
            같은 링크를 메일로도 보냈습니다. 이 링크를 아는 사람은 문의 내용을 볼 수 있으니
            다른 사람과 공유하지 마세요.
          </p>
        </div>
      </div>
    );
  }

  const sending = state.phase === 'sending';

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className={labelClass} htmlFor="inq-category">
          문의 유형
        </label>
        <select
          id="inq-category"
          value={category}
          onChange={(e) => setCategory(e.target.value as InquiryCategory)}
          className={inputClass}
        >
          {INQUIRY_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {!signedIn && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="inq-name">
              이름
            </label>
            <input
              id="inq-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={INQUIRY_LIMITS.name}
              className={inputClass}
              placeholder="홍길동"
              autoComplete="name"
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="inq-email">
              이메일 <span className="text-gold">(답변을 여기로 보냅니다)</span>
            </label>
            <input
              id="inq-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={INQUIRY_LIMITS.email}
              className={inputClass}
              placeholder="name@example.com"
              autoComplete="email"
            />
          </div>
        </div>
      )}

      {/*
        🔴 전화번호는 받지 않습니다.

        비회원은 이메일로, 회원은 서비스 안에서 답변을 받습니다. 두 경로 모두 전화번호가
        필요 없고, 전화번호는 이메일보다 민감한 개인정보입니다. **쓰지 않을 개인정보를
        "선택" 이라는 이름으로 받아두지 않습니다.**

        전화 연락을 원하는 분은 문의 내용에 직접 적으면 됩니다 — 그건 본인이 목적을 알고
        제공하는 것이라 성격이 다릅니다.

        (`bookings` 폼은 여전히 전화번호를 받습니다. 그쪽은 상담 예약이라 통화가 목적입니다)
      */}

      {category === 'consult' && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="inq-date">
              예식 예정일 <span className="font-normal text-muted-faint">(선택)</span>
            </label>
            <input
              id="inq-date"
              value={weddingDate}
              onChange={(e) => setWeddingDate(e.target.value)}
              className={inputClass}
              placeholder="2027년 3월 중"
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="inq-services">
              희망 서비스 <span className="font-normal text-muted-faint">(선택)</span>
            </label>
            <input
              id="inq-services"
              value={services}
              onChange={(e) => setServices(e.target.value)}
              maxLength={200}
              className={inputClass}
              placeholder="식전영상, 종이 청첩장"
            />
          </div>
        </div>
      )}

      <div>
        <label className={labelClass} htmlFor="inq-message">
          문의 내용
        </label>
        <textarea
          id="inq-message"
          value={message}
          onChange={(e) => {
            touched.current = true;
            setMessage(e.target.value);
          }}
          maxLength={INQUIRY_LIMITS.message}
          rows={8}
          className={`${inputClass} resize-y leading-relaxed`}
        />
        <p className="mt-1 text-right text-[11.5px] text-muted-faint">
          {message.length}/{INQUIRY_LIMITS.message}
        </p>
      </div>

      {/*
        🔴 방침 1.1.0 시행(2026-09-23) 전에는 첨부 칸 자체를 그리지 않습니다.
           고를 수 있게 해두고 서버가 거절하면, 사용자는 고른 사진이 왜 사라졌는지 모릅니다.
      */}
      {INQUIRY_EXTRAS_ENABLED ? (
      <div>
        <label className={labelClass}>
          사진 첨부 <span className="font-normal text-muted-faint">(선택 · 최대 3장 · 장당 5MB)</span>
        </label>
        <div className="flex flex-wrap items-center gap-2">
          {files.map((f, i) => (
            <span
              key={`${f.name}-${i}`}
              className="flex items-center gap-1.5 rounded-lg bg-surface-sunken px-2.5 py-1.5 text-[12px] text-ink"
            >
              <span className="max-w-[140px] truncate">{f.name}</span>
              <button
                type="button"
                onClick={() => setFiles(files.filter((_, x) => x !== i))}
                className="text-muted hover:text-ink"
                aria-label={`${f.name} 첨부 제거`}
              >
                ✕
              </button>
            </span>
          ))}
          {files.length < INQUIRY_LIMITS.attachments && (
            <label className="cursor-pointer rounded-lg border border-dashed border-line px-3 py-1.5 text-[12.5px] text-muted hover:border-gold hover:text-ink">
              사진 고르기
              <input
                type="file"
                accept={INQUIRY_ATTACHMENT_TYPES.join(',')}
                multiple
                className="hidden"
                onChange={(e) => {
                  pickFiles(e.target.files);
                  e.target.value = '';
                }}
              />
            </label>
          )}
        </div>
      </div>
      ) : (
        <p className="rounded-lg bg-surface-sunken px-3 py-2.5 text-[12px] leading-relaxed text-muted">
          사진 첨부는 <strong className="text-ink">2026년 9월 23일</strong>부터 이용하실 수 있습니다.
          그때까지는 화면이 어떻게 보이는지 글로 적어주시면 확인해 드리겠습니다.
        </p>
      )}

      {/*
        허니팟. 사람에게는 보이지 않고 스크린리더에도 읽히지 않지만 봇은 채웁니다.
        `display:none` 대신 화면 밖으로 밀어냅니다 — 일부 봇은 숨긴 필드를 건너뜁니다.
      */}
      <div className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
        <label htmlFor="inq-company">회사명</label>
        <input
          id="inq-company"
          name="company"
          tabIndex={-1}
          autoComplete="off"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
        />
      </div>

      {!signedIn && (
        <>
          <div className="rounded-lg border border-line bg-surface-sunken p-3">
            <label className="flex cursor-pointer items-start gap-2.5">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-gold"
              />
              <span className="text-[12.5px] leading-relaxed text-ink">
                <strong className="font-semibold">개인정보 수집·이용에 동의합니다 (필수)</strong>
                <br />
                <span className="text-muted">
                  {/*
                    🔴 실제로 받는 것과 한 글자도 어긋나면 안 됩니다.
                       방침에는 휴대전화번호가 '선택' 으로 적혀 있지만 **폼에서 받지 않으므로**
                       여기에도 적지 않습니다. 적게 받는 것은 고지 없이 바로 할 수 있습니다
                       (사전 고지가 필요한 것은 항목이 **늘** 때입니다).
                  */}
                  수집 항목: 이름, 이메일 주소, 문의 내용 (필수)
                  {INQUIRY_EXTRAS_ENABLED ? ' / 첨부 이미지 (선택)' : ''}
                  <br />
                  이용 목적: 문의 접수 및 답변 · 보유 기간: 처리 완료 후 1년
                  <br />
                  동의를 거부하실 수 있으나, 그 경우 문의 접수가 어렵습니다.{' '}
                  <Link to="/privacy" target="_blank" className="text-gold underline underline-offset-2">
                    개인정보처리방침
                  </Link>
                </span>
              </span>
            </label>
          </div>

          <Turnstile onToken={setTurnstileToken} />
        </>
      )}

      {error && (
        <p role="alert" className="rounded-lg bg-surface-sunken px-3 py-2 text-[12.5px] text-ink">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={sending}
        className="w-full rounded-lg bg-ink px-4 py-3 text-[14px] font-medium text-bg disabled:opacity-50"
      >
        {sending ? '보내는 중…' : '문의하기'}
      </button>
    </form>
  );
}
