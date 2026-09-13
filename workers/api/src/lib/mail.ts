/**
 * 메일 발송 (Resend).
 *
 * 🔴 **From 은 반드시 루트 도메인 주소(`help@luv-ai.co.kr`)입니다.**
 *    `send.luv-ai.co.kr` 로 보내면 방침·약관에 적어둔 주소와 어긋납니다.
 *    실측 근거는 `운영노트.md` 9-4 에 있습니다 (루트 도메인이 인증돼 있습니다).
 *
 * 🔴 **여기서 보내는 메일은 거래·서비스 메일입니다.** 광고 수신 동의와 무관하게 보낼 수
 *    있지만, **본문에 프로모션을 섞는 순간 광고성 정보**가 되어 사전 동의·야간 발송 제한
 *    규제를 받습니다. 할인·신규 기능 홍보를 문의 메일에 끼워 넣지 마세요.
 *
 * 🔴 **메일 실패가 접수 실패가 되면 안 됩니다.** 이 모듈의 함수는 던지지 않고 `false` 를
 *    돌려줍니다. 부르는 쪽은 `ctx.waitUntil()` 로 띄우고 결과를 기다리지 않습니다.
 *    문의는 이미 Firestore 에 있고, 메일은 알림일 뿐입니다.
 *
 * 무료 한도는 하루 100통입니다. 문의 1건당 최대 4통이라 하루 25건까지 버팁니다.
 */

const ENDPOINT = 'https://api.resend.com/emails';

export const FROM = 'Luvi 러비 <help@luv-ai.co.kr>';
export const SUPPORT_ADDRESS = 'help@luv-ai.co.kr';

export interface MailEnv {
  RESEND_API_KEY?: string;
  SITE_ORIGIN: string;
}

interface SendInput {
  to: string;
  subject: string;
  /** 평문. HTML 을 만들지 않습니다 — 템플릿 엔진도, 이스케이프 걱정도 필요 없습니다 */
  text: string;
  replyTo?: string;
}

export async function send(env: MailEnv, input: SendInput): Promise<boolean> {
  if (!env.RESEND_API_KEY) {
    console.error('[mail] RESEND_API_KEY 가 없어 발송을 건너뜁니다:', input.subject);
    return false;
  }
  if (!input.to) return false;

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM,
        to: [input.to],
        subject: input.subject,
        text: input.text,
        ...(input.replyTo ? { reply_to: input.replyTo } : {}),
      }),
    });

    if (!res.ok) {
      console.error('[mail] 발송 실패', res.status, (await res.text()).slice(0, 300));
      return false;
    }
    return true;
  } catch (e) {
    console.error('[mail] 발송 중 오류', e);
    return false;
  }
}

// ─────────────────────────── 문의 템플릿 ───────────────────────────

export interface InquiryMailInput {
  number: string;
  category: string;
  name: string;
  message: string;
  /** 조회 링크의 열쇠 원문 */
  token: string;
}

/** 고객에게 — 접수 확인 + 조회 링크 */
export function receiptMail(env: MailEnv, input: InquiryMailInput): SendInput {
  const link = `${env.SITE_ORIGIN}/support/t/${input.token}`;
  return {
    to: '',
    subject: `문의가 접수됐습니다 (${input.number})`,
    replyTo: SUPPORT_ADDRESS,
    text: `${input.name}님, 문의해 주셔서 감사합니다.

아래 내용으로 접수됐습니다. 확인한 뒤 답변드리겠습니다.

문의번호  ${input.number}
문의유형  ${input.category}

${input.message}

─────────────────────────────
문의 내용과 답변은 아래 링크에서 확인하실 수 있습니다.

${link}

이 링크를 아는 사람은 문의 내용을 볼 수 있습니다. 다른 사람과 공유하지 마세요.
링크를 잃어버리셨다면 ${SUPPORT_ADDRESS} 으로 문의번호와 함께 알려주세요.

러비 (Luvi) · ${env.SITE_ORIGIN}
`,
  };
}

/** 운영자에게 — 새 문의 알림 */
export function adminAlertMail(
  env: MailEnv,
  input: InquiryMailInput & {
    id: string;
    email: string;
    phone: string;
    entry: string;
    invitationId: string | null;
    sessionId: string | null;
  },
): SendInput {
  return {
    to: SUPPORT_ADDRESS,
    subject: `[문의] ${input.number} · ${input.category} · ${input.name}`,
    ...(input.email ? { replyTo: input.email } : {}),
    text: `새 문의가 접수됐습니다.

번호      ${input.number}
유형      ${input.category}
이름      ${input.name}
이메일    ${input.email || '(없음)'}
연락처    ${input.phone || '(없음)'}
접수 위치 ${input.entry}
청첩장    ${input.invitationId ?? '(없음)'}
세션      ${input.sessionId ?? '(없음)'}

${input.message}

─────────────────────────────
운영자 화면: ${env.SITE_ORIGIN}/app/admin/inquiries

이 사람이 무엇을 하다 실패했는지 보려면 D1 콘솔에서:
  SELECT at, kind, name, ok, detail, path FROM events
  WHERE ${input.sessionId ? `session = '${input.sessionId}'` : `ip_hash = '(문서의 ipHash)'`}
  ORDER BY at DESC LIMIT 50;
`,
  };
}
