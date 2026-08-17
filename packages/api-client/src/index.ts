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
      /** 발행 화면에서 새 슬러그를 고르는 중이면 그 슬러그로 필수 검사를 미리 돌려본다 */
      diff: (id: string, slug?: string) =>
        get<DraftDiff>(
          `/invitations/${id}/diff${slug ? `?slug=${encodeURIComponent(slug)}` : ''}`,
        ),
      publish: (id: string, body: PublishBody) =>
        post<PublishResult>(`/invitations/${id}/publish`, body),
      remove: (id: string) => del<{ id: string }>(`/invitations/${id}`),
    },

    slugs: {
      check: (slug: string) =>
        get<SlugAvailability>(`/slugs/${encodeURIComponent(slug)}/available`),
    },

    guestbook: {
      /**
       * 목록. 소유자가 부르면 숨긴 글까지 옵니다 (서버가 uid 로 판단).
       * `limit` 기본값은 서버가 20 이라 관리 화면에서는 넉넉히 넘깁니다 (서버 상한 100).
       */
      list: (invitationId: string, limit?: number) =>
        get<GuestbookEntry[]>(
          `/invitations/${invitationId}/guestbook${limit ? `?limit=${limit}` : ''}`,
        ),
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

      /**
       * 파일 하나를 올립니다 (발급 → PUT 을 한 번에).
       *
       * 발급받은 서명이 **Content-Type 과 정확한 바이트 수에 묶여 있어서**
       * 호출부가 직접 fetch 하면 헤더 하나만 어긋나도 403 이 됩니다. 그래서 여기서 감쌉니다.
       */
      upload: async (
        invitationId: string,
        kind: SignUploadBody['kind'],
        file: Blob,
      ): Promise<ApiResult<{ key: string }>> => {
        const contentType = file.type;
        const size = file.size;

        const signed = await post<SignUploadResult>('/assets/sign', {
          invitationId,
          kind,
          contentType,
          size,
        });
        if (!signed.ok) return signed;

        const token = await opts.getToken?.();
        try {
          const res = await fetch(signed.data.uploadUrl, {
            method: 'PUT',
            headers: {
              'Content-Type': contentType,
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: file,
          });

          if (!res.ok) {
            const err = (await res.json().catch(() => null)) as { error?: ApiError } | null;
            return {
              ok: false,
              error: err?.error ?? { code: 'internal', message: '업로드에 실패했습니다' },
            };
          }
          return { ok: true, data: { key: signed.data.key } };
        } catch {
          return { ok: false, error: { code: 'internal', message: '업로드 중 연결이 끊겼습니다' } };
        }
      },
    },

    claim: {
      preview: (body: ClaimPreviewBody) => post<ClaimPreview>('/claim/preview', body),
      redeem: (body: ClaimBody) => post<{ invitationId: string }>('/claim', body),
    },

    auth: {
      /** 카카오·네이버 공통. Firebase Auth 기본 제공자가 아니라 커스텀 토큰을 받아온다 */
      social: (provider: SocialProvider, body: SocialAuthBody) =>
        post<SocialAuthResult>(`/auth/${provider}`, body),

      /**
       * 로그인 후 `users/{uid}` 문서를 만들거나 갱신한다.
       * 구글·이메일은 Firebase 가 클라이언트에서 처리하므로 서버가 로그인 사실을 알 방법이 없다.
       */
      session: (body: {
        email: string | null;
        displayName: string | null;
        photoURL: string | null;
        provider: string;
      }) => post<{ uid: string }>('/auth/session', body),
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
