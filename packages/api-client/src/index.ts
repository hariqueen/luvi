/**
 * REST API 클라이언트.
 *
 * `@luvi/schema` 의 타입을 그대로 쓰므로 엔드포인트 시그니처가 프론트·백엔드에서 어긋나지 않는다.
 * 인증 토큰은 호출 시점에 가져온다 — Firebase ID 토큰은 1시간마다 갱신되므로
 * 클라이언트를 만들 때 한 번 넣어두면 안 된다.
 */
import type {
  ApiError,
  ApiResult,
  ClaimBody,
  ClaimPreview,
  ClaimPreviewBody,
  CreateBookingBody,
  CreateGuestbookBody,
  CreateInquiryBody,
  CreateInvitationBody,
  CreateRankBody,
  DraftDiff,
  GuestbookEntry,
  Invitation,
  InvitationSummary,
  PublicInvitation,
  PublishBody,
  PublishResult,
  RankEntry,
  SignUploadBody,
  SignUploadResult,
  SlugAvailability,
  SocialAuthBody,
  SocialAuthResult,
  SocialProvider,
  UpdateDraftBody,
} from '@luvi/schema';

export interface ClientOptions {
  /** API 베이스 (예: '/api' 또는 'https://api.luv-ai.co.kr') */
  baseUrl: string;
  /** 매 요청마다 호출된다. 비로그인이면 null 을 반환하세요 */
  getToken?: () => Promise<string | null>;
}

/** fetch 실패·JSON 파싱 실패까지 ApiResult 로 정규화한다 — 호출부에 try/catch 를 강요하지 않기 위해 */
async function request<T>(
  opts: ClientOptions,
  method: string,
  path: string,
  body?: unknown,
): Promise<ApiResult<T>> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const token = await opts.getToken?.();
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const res = await fetch(`${opts.baseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    const text = await res.text();
    const json: unknown = text ? JSON.parse(text) : null;

    if (!res.ok) {
      const err = (json as { error?: ApiError } | null)?.error;
      return {
        ok: false,
        error: err ?? { code: 'internal', message: `요청이 실패했습니다 (${res.status})` },
      };
    }
    return { ok: true, data: (json as { data: T }).data };
  } catch {
    return {
      ok: false,
      error: { code: 'internal', message: '네트워크에 연결할 수 없습니다' },
    };
  }
}

export function createClient(opts: ClientOptions) {
  const get = <T>(p: string) => request<T>(opts, 'GET', p);
  const post = <T>(p: string, b?: unknown) => request<T>(opts, 'POST', p, b ?? {});
  const patch = <T>(p: string, b: unknown) => request<T>(opts, 'PATCH', p, b);
  const del = <T>(p: string) => request<T>(opts, 'DELETE', p);

  return {
    invitations: {
      list: () => get<InvitationSummary[]>('/invitations'),
      get: (id: string) => get<Invitation>(`/invitations/${id}`),
      create: (body: CreateInvitationBody) => post<Invitation>('/invitations', body),
      /** 자동저장 — 초안만 갱신. 하객 화면은 발행할 때까지 그대로다 */
      updateDraft: (id: string, body: UpdateDraftBody) =>
        patch<{ updatedAt: string }>(`/invitations/${id}`, body),
      diff: (id: string) => get<DraftDiff>(`/invitations/${id}/diff`),
      publish: (id: string, body: PublishBody) =>
        post<PublishResult>(`/invitations/${id}/publish`, body),
      remove: (id: string) => del<{ id: string }>(`/invitations/${id}`),
    },

    slugs: {
      check: (slug: string) =>
        get<SlugAvailability>(`/slugs/${encodeURIComponent(slug)}/available`),
    },

    guestbook: {
      list: (invitationId: string) =>
        get<GuestbookEntry[]>(`/invitations/${invitationId}/guestbook`),
      create: (invitationId: string, body: CreateGuestbookBody) =>
        post<GuestbookEntry>(`/invitations/${invitationId}/guestbook`, body),
      /** 숨김 — 삭제와 다르다. 하객이 남긴 축하 메시지이므로 되돌릴 수 있어야 한다 */
      setHidden: (invitationId: string, entryId: string, hidden: boolean) =>
        patch<GuestbookEntry>(`/invitations/${invitationId}/guestbook/${entryId}`, { hidden }),
      remove: (invitationId: string, entryId: string) =>
        del<{ id: string }>(`/invitations/${invitationId}/guestbook/${entryId}`),
    },

    rankings: {
      list: (invitationId: string) =>
        get<RankEntry[]>(`/invitations/${invitationId}/rankings`),
      create: (invitationId: string, body: CreateRankBody) =>
        post<RankEntry>(`/invitations/${invitationId}/rankings`, body),
      remove: (invitationId: string, entryId: string) =>
        del<{ id: string }>(`/invitations/${invitationId}/rankings/${entryId}`),
    },

    assets: {
      signUpload: (body: SignUploadBody) => post<SignUploadResult>('/assets/sign', body),
    },

    claim: {
      preview: (body: ClaimPreviewBody) => post<ClaimPreview>('/claim/preview', body),
      redeem: (body: ClaimBody) => post<{ invitationId: string }>('/claim', body),
    },

    auth: {
      /** 카카오·네이버 공통. Firebase Auth 기본 제공자가 아니라 커스텀 토큰을 받아온다 */
      social: (provider: SocialProvider, body: SocialAuthBody) =>
        post<SocialAuthResult>(`/auth/${provider}`, body),
    },

    contact: {
      inquiry: (body: CreateInquiryBody) => post<{ id: string }>('/inquiries', body),
      booking: (body: CreateBookingBody) => post<{ id: string }>('/bookings', body),
    },

    public: {
      invitation: (slug: string) =>
        get<PublicInvitation>(`/public/i/${encodeURIComponent(slug)}`),
    },
  };
}

export type LuviClient = ReturnType<typeof createClient>;
