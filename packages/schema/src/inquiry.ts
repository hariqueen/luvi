/**
 * 고객문의 — 티켓·스레드.
 *
 * **왜 공용 스키마에 두는가:** 길이 제한과 유형 목록을 화면과 서버가 **같은 값**으로 봐야
 * 합니다. 한쪽만 고치면 "화면은 보냈는데 서버가 400" 이 되고, 그 400 은 문의를 하려다
 * 실패한 사람에게 일어납니다. 문의 창구가 막히는 것이 가장 나쁜 실패입니다.
 *
 * 설계 근거는 `docs/08-support-plan.md` 입니다.
 */

import { DOC_VERSIONS, compareDocVersion } from './consent';

/**
 * 🔴 **첨부 이미지와 자동수집 맥락은 개인정보처리방침 1.1.0 이 시행 중일 때만 수집합니다.**
 *
 * 방침 1.0.0 이 문의에 대해 덮는 항목은 이름·문의 내용·전화번호·이메일까지입니다.
 * 첨부 이미지와 접근 경로·브라우저 정보·세션 식별자·청첩장 식별자는 **1.1.0 에서 새로
 * 추가한 항목**이고, 1.1.0 의 시행일은 2026-09-23 입니다. 그 전에 수집하면 고지 없이
 * 수집한 상태가 됩니다.
 *
 * **왜 날짜가 아니라 문서 버전에 묶는가:** 날짜를 박아두면 시행일이 바뀔 때 두 곳을 고쳐야
 * 하고, 한쪽만 고치면 어긋납니다. `DOC_VERSIONS.privacy` 를 올리는 **그 한 번의 변경으로**
 * 방침 시행과 수집 개시가 함께 일어나는 편이 안전합니다. 의미도 정확합니다 —
 * "그 항목을 적어둔 방침이 시행 중일 때만 그 항목을 받는다".
 */
export const INQUIRY_EXTRAS_ENABLED = compareDocVersion(DOC_VERSIONS.privacy, '1.1.0') >= 0;

/** 문의 유형. 화면의 선택지이자 운영자 목록의 필터입니다 */
export type InquiryCategory =
  | 'invitation'
  | 'publish'
  | 'consult'
  | 'payment'
  | 'account'
  | 'etc';

export const INQUIRY_CATEGORIES: { value: InquiryCategory; label: string }[] = [
  { value: 'invitation', label: '청첩장 제작·편집' },
  { value: 'publish', label: '발행·공유' },
  { value: 'consult', label: '제작 상담 (식전영상·초대장)' },
  { value: 'payment', label: '결제' },
  { value: 'account', label: '계정·로그인' },
  { value: 'etc', label: '기타' },
];

export function inquiryCategoryLabel(value: string): string {
  return INQUIRY_CATEGORIES.find((c) => c.value === value)?.label ?? '기타';
}

/**
 * 내용 칸에 미리 채워 넣는 뼈대.
 *
 * 빈 칸을 주면 "안돼요" 세 글자가 옵니다. 되묻는 왕복을 한 번 줄이는 것이
 * 1인 운영에서는 큰 차이입니다.
 */
export const INQUIRY_TEMPLATES: Record<InquiryCategory, string> = {
  invitation: '- 무엇을 하려다가:\n- 어떻게 됐는지:\n',
  publish: '- 청첩장 주소:\n- 무엇을 하려다가:\n- 어떻게 됐는지:\n',
  consult: '- 예식일:\n- 희망 서비스:\n- 문의 내용:\n',
  payment: '- 결제 일시:\n- 문의 내용:\n',
  account: '- 로그인 수단 (카카오·구글·네이버·이메일):\n- 어떻게 됐는지:\n',
  etc: '',
};

/** 접수 → 확인 → 답변 → 종결 */
export type InquiryStatus = 'new' | 'open' | 'answered' | 'closed';

export const INQUIRY_STATUS_LABELS: Record<InquiryStatus, string> = {
  new: '미확인',
  open: '처리 중',
  answered: '답변함',
  closed: '종결',
};

/** 문의 폼이 열린 자리. "어디서 막혔나" 를 되묻지 않기 위해 함께 받습니다 */
export type InquiryEntry = 'footer' | 'support' | 'editor' | 'dashboard' | 'film' | 'card' | 'float';

/**
 * 화면이 자동으로 채우는 맥락.
 *
 * 🔴 개인정보처리방침 제2조 ⑤ 의 "공통 자동 생성" 항목과 **정확히 일치해야 합니다.**
 *    여기에 필드를 늘리면 방침 개정이 먼저입니다.
 */
export interface InquiryContext {
  entry: InquiryEntry;
  /** 눌렀을 때 보고 있던 화면 경로 */
  path?: string;
  /** 편집 중이던 청첩장 */
  invitationId?: string;
  slug?: string;
  /** D1 이벤트 로그와 잇는 열쇠 (사람을 식별하지 않습니다) */
  sessionId?: string;
}

export const INQUIRY_LIMITS = {
  name: 40,
  email: 120,
  phone: 30,
  message: 2000,
  /** 첨부 장수 */
  attachments: 3,
  /** 장당 바이트. Worker 업로드 상한(6MB)보다 작게 둡니다 */
  attachmentBytes: 5 * 1024 * 1024,
} as const;

export const INQUIRY_ATTACHMENT_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export interface CreateInquiryBody {
  category: InquiryCategory;
  message: string;
  /** 비회원은 필수. 회원은 계정 값으로 채워집니다 */
  name?: string;
  email?: string;
  phone?: string;
  /** 유형이 'consult' 일 때만 씁니다 */
  weddingDate?: string;
  services?: string;
  context?: InquiryContext;
  /** 비회원만. 개인정보 수집·이용 동의 (필수) */
  privacyAgreed?: boolean;
  /** Cloudflare Turnstile 토큰 (비회원) */
  turnstileToken?: string;
  /**
   * 허니팟. **사람에게는 보이지 않는 칸**이라 값이 차 있으면 봇입니다.
   * 이름을 그럴듯하게(`company`) 둬야 봇이 채웁니다.
   */
  company?: string;
}

export interface CreateInquiryResult {
  id: string;
  /** 사람이 부를 수 있는 번호 */
  number: string;
  /** 조회 링크의 열쇠. **이 응답과 메일에만 나옵니다** (서버는 해시만 보관) */
  token: string;
  /** 첨부 업로드용 단기 토큰. 첨부가 없으면 쓰지 않습니다 */
  uploadToken: string;
}

export interface InquiryAttachment {
  name: string;
  size: number;
  contentType: string;
}

export interface InquiryMessage {
  id: string;
  author: 'user' | 'admin';
  body: string;
  attachments: InquiryAttachment[];
  createdAt: string;
}

/** 고객에게 돌려주는 스레드. `adminNote · ipHash` 는 **들어 있지 않습니다** */
export interface InquiryThread {
  id: string;
  number: string;
  status: InquiryStatus;
  category: InquiryCategory;
  subject: string;
  name: string;
  /** 가려진 값 (`ab***@naver.com`) — 링크를 주운 사람에게 원문을 보여줄 이유가 없습니다 */
  emailMasked: string;
  phoneMasked: string;
  createdAt: string;
  messages: InquiryMessage[];
}

/**
 * 운영자 목록의 한 줄. 스레드를 읽지 않고 그릴 수 있어야 합니다.
 *
 * 🔴 **연락처는 가려서 내려보냅니다** (`emailMasked` · `phoneMasked`).
 *    2026-09-13 이전에는 `email` · `phone` 을 원문으로 보냈습니다 — 목록을 한 번 여는 것만으로
 *    문의한 사람 전원의 연락처가 브라우저에 내려갔다는 뜻입니다. 그건 열람 기록으로 남길
 *    수도 없고 남길 의미도 없습니다. 원문이 필요하면
 *    `POST /api/admin/inquiries/:id/reveal` 로 한 건씩, 기록을 남기고 받습니다.
 */
export interface AdminInquirySummary {
  id: string;
  number: string;
  status: InquiryStatus;
  category: InquiryCategory;
  subject: string;
  name: string;
  /** `ab***@naver.com`. 값이 없으면 빈 문자열 */
  emailMasked: string;
  phoneMasked: string;
  /** 회원이면 uid, 비회원이면 null */
  uid: string | null;
  invitationId: string | null;
  entry: string;
  attachmentCount: number;
  messageCount: number;
  unreadForAdmin: boolean;
  createdAt: string;
  lastMessageAt: string;
}

export interface AdminInquiryList {
  items: AdminInquirySummary[];
  /** 상태별 건수 — 헤더 배지에 씁니다 */
  counts: Record<InquiryStatus, number>;
}

/**
 * 운영자 스레드 상세.
 *
 * 고객용 `InquiryThread` 와 다른 점은 셋입니다: **내부 메모**가 있고, 접수 맥락(경로·세션·
 * 청첩장)이 붙고, 회원이면 `uid` 로 회원 상세와 이어집니다. 연락처는 여전히 가려져 있고,
 * `ipHash` · `accessTokenHash` 는 여기에도 **필드 자체를 만들지 않습니다.**
 */
export interface AdminInquiryDetail {
  id: string;
  number: string;
  status: InquiryStatus;
  category: InquiryCategory;
  subject: string;
  name: string;
  emailMasked: string;
  phoneMasked: string;
  /** 회원이면 uid — 화면이 회원 상세로 잇습니다 */
  uid: string | null;
  /** 접수 맥락. "어디서 막혔나" 를 되묻지 않기 위한 값들입니다 */
  entry: string;
  path: string;
  invitationId: string | null;
  slug: string | null;
  sessionId: string | null;
  /** 유형이 'consult' 일 때만 채워집니다 */
  weddingDate: string;
  services: string;
  attachments: InquiryAttachment[];
  /** 🔴 고객에게 보이지 않는 운영 메모 */
  adminNote: string;
  createdAt: string;
  lastMessageAt: string;
  messages: InquiryMessage[];
}

/** POST /api/admin/inquiries/:id/reveal — 가려둔 연락처의 원문. 부르면 기록이 남습니다 */
export interface AdminInquiryReveal {
  id: string;
  email: string;
  phone: string;
}

/** POST /api/admin/inquiries/:id/messages — 운영자 답변 */
export interface AdminReplyBody {
  body: string;
}

/** PATCH /api/admin/inquiries/:id — 상태·내부 메모. 둘 다 선택입니다 */
export interface UpdateInquiryBody {
  status?: InquiryStatus;
  adminNote?: string;
}

/** 운영자 답변 길이 상한. 고객 입력(2000)보다 넉넉합니다 — 안내가 길어질 수 있습니다 */
export const ADMIN_REPLY_MAX = 4000;

/** 내부 메모 길이 상한 */
export const ADMIN_NOTE_MAX = 2000;

/**
 * `hariqueen@naver.com` → `har***@naver.com`. **본인 확인용이지 노출용이 아닙니다.**
 *
 * 문의 스레드와 "이미 가입된 계정" 힌트가 같은 함수를 씁니다 — 가리는 규칙이 화면마다
 * 다르면 어느 쪽이 안전한지 판단할 수 없게 됩니다.
 */
export function maskEmail(email: string): string {
  if (!email) return '';
  const at = email.lastIndexOf('@');
  if (at <= 0) return '***';
  const local = email.slice(0, at);
  const head = local.slice(0, Math.min(3, local.length));
  return `${head}***${email.slice(at)}`;
}

/** `01012341234` → `010****1234` (자리수가 달라도 앞 3·뒤 4는 남깁니다) */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 7) return phone ? '***' : '';
  return `${digits.slice(0, 3)}${'*'.repeat(digits.length - 7)}${digits.slice(-4)}`;
}

/**
 * 본문 첫 줄에서 제목을 만듭니다.
 *
 * 템플릿 프리필 때문에 첫 줄이 `- 무엇을 하려다가:` 처럼 **빈 뼈대**일 수 있어서,
 * 값이 있는 첫 줄을 찾습니다. 목록에서 제목이 전부 똑같으면 목록이 쓸모없어집니다.
 */
export function deriveSubject(message: string): string {
  const lines = message.split('\n').map((l) => l.trim());
  const meaningful =
    lines.find((l) => {
      if (!l) return false;
      const withoutBullet = l.replace(/^[-*]\s*/, '');
      // `라벨:` 만 있고 뒤가 빈 줄은 건너뜁니다
      const colon = withoutBullet.indexOf(':');
      if (colon >= 0 && withoutBullet.slice(colon + 1).trim() === '') return false;
      return true;
    }) ?? '';
  const text = meaningful.replace(/^[-*]\s*/, '').trim();
  return (text || '내용 없음').slice(0, 60);
}
