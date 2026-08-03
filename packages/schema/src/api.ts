/**
 * REST API 계약 — 클라이언트와 Worker가 공유하는 타입.
 *
 * 이 파일이 프론트와 백엔드를 잇는 유일한 접점입니다.
 * 엔드포인트를 추가할 때 여기부터 고치면 양쪽 타입이 자동으로 맞습니다.
 */
import type { ContentDoc, Features, Invitation, SectionKey, ThemeId } from './content';

/** 모든 응답의 공통 껍데기. 성공/실패를 HTTP 상태와 함께 본문에서도 구분한다. */
export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError };

export interface ApiError {
  /** 화면에서 분기할 수 있는 코드 */
  code:
    | 'unauthorized'
    | 'forbidden'
    | 'not_found'
    | 'validation_failed'
    | 'slug_taken'
    | 'claim_invalid'
    | 'claim_expired'
    | 'claim_used'
    | 'rate_limited'
    | 'internal';
  /** 사용자에게 그대로 보여줄 수 있는 한국어 메시지 */
  message: string;
  /** validation_failed 일 때 어느 필드가 문제인지 */
  fields?: { path: string; message: string }[];
}

// ─────────────────────────── 청첩장 ───────────────────────────

/** GET /api/invitations — 내 청첩장 목록 (대시보드) */
export interface InvitationSummary {
  id: string;
  slug: string;
  themeId: ThemeId;
  status: Invitation['status'];
  /** 신랑♥신부 표시용 */
  coupleLabel: string;
  weddingAt: string;
  /** 커버 썸네일 R2 키 */
  thumbKey: string | null;
  /** 발행본과 초안이 다른 항목 수. 0이면 '발행됨', 1 이상이면 '발행됨 · 변경 N건' */
  unpublishedChanges: number;
  updatedAt: string;
}

/** POST /api/invitations */
export interface CreateInvitationBody {
  themeId: ThemeId;
  /** 비우면 샘플 데이터로 채운 초안을 만든다 (빈 폼보다 이탈이 훨씬 적다) */
  fromSample?: boolean;
}

/** PATCH /api/invitations/:id — 자동저장. 초안만 바뀌고 하객 화면은 그대로다 */
export interface UpdateDraftBody {
  /**
   * 바뀐 필드만 보낸다 (경로 → 값).
   *
   * 최상위는 `core` 또는 `theme` 만 허용된다 — 서버가 그 밖의 경로를 거부한다.
   * (허용하면 `ownerUid` 같은 문서 필드를 클라이언트가 덮어쓸 수 있다)
   *
   * 🔴 **배열은 인덱스가 아니라 통째로 보낸다.** Firestore 는 배열 원소를 가리키는
   *    필드 경로를 지원하지 않으므로 `core.gallery.0` 은 거부된다.
   */
  patch: Record<string, unknown>;
  features?: Partial<Features>;
  /** 섹션 구성·순서. 배열 순서가 곧 화면 순서다 */
  sections?: SectionKey[];
}

/** POST /api/invitations/:id/publish */
export interface PublishBody {
  slug: string;
}

export interface PublishResult {
  slug: string;
  url: string;
  publishedAt: string;
}

/** GET /api/invitations/:id/diff — 발행 화면의 '변경사항 요약' */
export interface DraftDiff {
  changes: { path: string; label: string }[];
  /** 필수 항목 누락. 하나라도 있으면 발행을 막는다 */
  missing: { path: string; label: string }[];
}

// ─────────────────────────── 슬러그 ───────────────────────────

/** GET /api/slugs/:slug/available */
export interface SlugAvailability {
  slug: string;
  available: boolean;
  /** 이미 쓰는 경우 제안 */
  suggestions?: string[];
}

// ─────────────────────────── 방명록 ───────────────────────────

export interface GuestbookEntry {
  id: string;
  name: string;
  msg: string;
  hidden: boolean;
  createdAt: string;
}

/** POST /api/invitations/:id/guestbook — 하객이 남긴다 (비로그인) */
export interface CreateGuestbookBody {
  name: string;
  msg: string;
}

// ─────────────────────────── 랭킹 ───────────────────────────

export interface RankEntry {
  id: string;
  nick: string;
  /** 생존 시간(초). 소수 1자리 — 정수가 아니다 */
  score: number;
  caught: number;
  createdAt: string;
}

export interface CreateRankBody {
  nick: string;
  score: number;
  caught: number;
}

// ─────────────────────────── 에셋 ───────────────────────────

/**
 * POST /api/assets/sign — R2 업로드 URL 발급.
 * 이미지는 브라우저에서 리사이즈·WebP 변환한 뒤 올린다 (Cloudflare Images 는 유료).
 */
export interface SignUploadBody {
  invitationId: string;
  kind: 'cover' | 'gallery' | 'greeting' | 'game' | 'og' | 'audio' | 'footer';
  contentType: string;
  /** 변환 후 바이트 수 */
  size: number;
}

export interface SignUploadResult {
  /**
   * 이 URL 로 PUT 한다. 우리 API 를 향하는 주소이며 **`Authorization` 헤더와
   * 발급 때와 동일한 `Content-Type`·바이트 수**를 그대로 보내야 한다
   * (서명이 그 값들에 묶여 있다).
   */
  uploadUrl: string;
  /** ContentDoc 에 저장할 키 */
  key: string;
  /** 업로드 URL 만료 시각 (ISO). 지나면 다시 발급받아야 한다 */
  expiresAt: string;
}

// ─────────────────────────── 인계 (클레임) ───────────────────────────

/** POST /api/claim/preview — 코드가 어떤 청첩장인지 먼저 보여준다 */
export interface ClaimPreviewBody {
  code: string;
}

export interface ClaimPreview {
  invitationId: string;
  coupleLabel: string;
  weddingAt: string;
  thumbKey: string | null;
}

/** POST /api/claim — 소유권 이전 */
export interface ClaimBody {
  code: string;
}

// ─────────────────────────── 인증 ───────────────────────────

/**
 * Firebase Auth 가 기본 지원하지 않는 소셜 제공자.
 * 둘 다 Worker 에서 커스텀 토큰을 서명해 발급한다.
 */
export type SocialProvider = 'kakao' | 'naver';

/** POST /api/auth/:provider — 인가 코드 → Firebase 커스텀 토큰 */
export interface SocialAuthBody {
  code: string;
  /** 인가 요청에 쓴 값과 정확히 같아야 한다 */
  redirectUri: string;
  /** CSRF 방지용. 네이버는 토큰 교환에도 필요하다 */
  state?: string;
}

export interface SocialAuthResult {
  /** signInWithCustomToken() 에 넣는다 */
  customToken: string;
  /** 최초 로그인이면 프로필 저장에 쓴다. 둘 다 이메일은 선택 동의라 null 일 수 있다 */
  profile: {
    provider: SocialProvider;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
  };
}

// ─────────────────────────── 예약 · 문의 ───────────────────────────

export interface CreateInquiryBody {
  name: string;
  phone?: string;
  email?: string;
  message: string;
}

export interface CreateBookingBody {
  name: string;
  phone: string;
  email?: string;
  weddingDate?: string;
  services?: string;
  preferred?: string;
  message?: string;
}

// ─────────────────────────── 뷰어 ───────────────────────────

/**
 * GET /api/public/i/:slug — 발행본.
 * 실제 하객 트래픽은 이 엔드포인트를 타지 않는다 — 엣지에서 KV 스냅샷을 읽어
 * HTML 에 인라인하므로 페이지뷰당 API·Firestore 호출이 0이다.
 * 이 엔드포인트는 에디터 프리뷰와 개발용이다.
 */
export interface PublicInvitation {
  slug: string;
  themeId: ThemeId;
  /** 담긴 섹션 — 배열 순서가 곧 렌더 순서 */
  sections: SectionKey[];
  features: Features;
  content: ContentDoc;
  /** 에셋 URL 조립용 (예: 'https://cdn.luv-ai.co.kr') */
  cdnBase: string;
}
