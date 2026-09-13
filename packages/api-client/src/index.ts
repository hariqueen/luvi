/**
 * REST API 클라이언트.
 *
 * `@luvi/schema` 의 타입을 그대로 쓰므로 엔드포인트 시그니처가 프론트·백엔드에서 어긋나지 않는다.
 * 인증 토큰은 호출 시점에 가져온다 — Firebase ID 토큰은 1시간마다 갱신되므로
 * 클라이언트를 만들 때 한 번 넣어두면 안 된다.
 */
import type {
  AccountProfile,
  AdminEventRow,
  AdminInvitationSummary,
  AdminUserDetail,
  AdminUserList,
  AdminUserReveal,
  ApiError,
  ApiResult,
  ClaimBody,
  ConsentRecord,
  DeleteAccountResult,
  SubmitConsentsBody,
  UpdateAccountBody,
  ClaimPreview,
  ClaimPreviewBody,
  CreateBookingBody,
  CreateGuestbookBody,
  CreateInquiryBody,
  CreateInquiryResult,
  InquiryThread,
  InquiryStatus,
  AdminInquiryDetail,
  AdminInquiryList,
  AdminInquiryReveal,
  AdminReplyBody,
  UpdateInquiryBody,
  InquiryMessage,
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
  SessionResult,
  SignUploadBody,
  SignUploadResult,
  SlugAvailability,
  SocialAuthBody,
  LinkAccountBody,
  LinkAccountResult,
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

    admin: {
      /** 모든 계정의 청첩장. 운영자가 아니면 서버가 403(forbidden) 을 돌려준다 */
      invitations: () => get<AdminInvitationSummary[]>('/admin/invitations'),

      /** 회원 목록. **이메일은 마스킹된 채로 온다** — 원문은 `reveal` 로만 */
      users: () => get<AdminUserList>('/admin/users'),
      user: (uid: string) => get<AdminUserDetail>(`/admin/users/${uid}`),

      /**
       * 가려둔 연락처의 원문.
       *
       * 🔴 **부르는 순간 서버가 감사 로그를 남긴다.** 화면을 그리려고 미리 부르지 마라 —
       *    운영자가 "보기" 를 누른 순간에만 불러야 기록이 사실과 맞는다.
       *    GET 이 아니라 POST 인 것도 브라우저가 멋대로 미리 가져오지 못하게 하기 위해서다.
       */
      revealUser: (uid: string) => post<AdminUserReveal>(`/admin/users/${uid}/reveal`),

      /** D1 이벤트 로그 14일치. `onlyErrors` 면 실패한 것만 */
      userEvents: (uid: string, onlyErrors = false) =>
        get<AdminEventRow[]>(`/admin/users/${uid}/events${onlyErrors ? '?onlyErrors=1' : ''}`),
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
      /** 전체 초기화 — 되돌릴 수 없다. 지운 건수를 돌려준다 */
      clear: (invitationId: string) =>
        del<{ deleted: number }>(`/invitations/${invitationId}/guestbook`),
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
      }) => post<SessionResult>('/auth/session', body),
    },

    /**
     * 약관·개인정보 동의.
     *
     * 철회(선택 항목)도 `submit` 으로 보냅니다 — 서버가 기존 레코드를 고치지 않고
     * `agreed: false` 인 새 레코드를 남깁니다(append-only).
     */
    consents: {
      list: () => get<ConsentRecord[]>('/consents'),
      submit: (body: SubmitConsentsBody) => post<ConsentRecord[]>('/consents', body),
    },

    account: {
      get: () => get<AccountProfile>('/account'),
      update: (body: UpdateAccountBody) => patch<AccountProfile>('/account', body),
      /** 🔴 회원 탈퇴. 청첩장·사진·방명록이 모두 사라지고 되돌릴 수 없습니다 */
      remove: () => del<DeleteAccountResult>('/account'),

      /**
       * 소셜 로그인 수단을 이 계정에 붙인다. **로그인한 상태에서만** 호출된다 —
       * 이메일이 같다고 서버가 알아서 합쳐주지 않는다(계정 탈취 방지).
       */
      link: (provider: SocialProvider, body: LinkAccountBody) =>
        post<LinkAccountResult>(`/account/link/${provider}`, body),

      /** 연결 해제. 마지막 남은 로그인 수단이면 서버가 거절한다 */
      unlink: (provider: SocialProvider) =>
        del<LinkAccountResult>(`/account/link/${provider}`),
    },

    contact: {
      booking: (body: CreateBookingBody) => post<{ id: string }>('/bookings', body),
    },

    inquiries: {
      /**
       * 문의 접수. 비로그인도 부릅니다.
       *
       * 응답의 `token` 은 **여기서 한 번만** 옵니다 (서버는 해시만 보관). 화면은 이 값을
       * 조회 링크로 즉시 보여줘야 합니다 — 메일이 늦거나 오타로 안 갈 수 있습니다.
       */
      create: (body: CreateInquiryBody) => post<CreateInquiryResult>('/inquiries', body),

      /**
       * 첨부 한 장 올리기. **접수가 끝난 뒤에** 부릅니다.
       *
       * 실패해도 문의 본문은 이미 저장돼 있습니다 — 그래서 호출부는 이 실패로
       * "문의가 접수되지 않았다" 고 말하면 안 됩니다.
       */
      uploadAttachment: async (
        id: string,
        uploadToken: string,
        index: number,
        file: Blob,
      ): Promise<ApiResult<{ index: number }>> => {
        try {
          const res = await fetch(
            `${opts.baseUrl}/inquiries/${id}/attachments?index=${index}&token=${encodeURIComponent(uploadToken)}`,
            { method: 'PUT', headers: { 'Content-Type': file.type }, body: file },
          );
          if (!res.ok) {
            const err = (await res.json().catch(() => null)) as { error?: ApiError } | null;
            return {
              ok: false,
              error: err?.error ?? { code: 'internal', message: '첨부 업로드에 실패했습니다' },
            };
          }
          return { ok: true, data: { index } };
        } catch {
          return { ok: false, error: { code: 'internal', message: '업로드 중 연결이 끊겼습니다' } };
        }
      },

      /** 조회 링크로 스레드 보기 (비회원) */
      byToken: (token: string) => get<InquiryThread>(`/inquiries/t/${encodeURIComponent(token)}`),

      /** 내 문의 (회원) */
      mine: () => get<Omit<InquiryThread, 'messages'>[]>('/inquiries/mine'),

      /** 운영자 목록. 운영자가 아니면 서버가 403 을 돌려줍니다 */
      admin: (status?: InquiryStatus) =>
        get<AdminInquiryList>(`/admin/inquiries${status ? `?status=${status}` : ''}`),

      /** 운영자 스레드 상세. 부르면 서버가 '안 읽음' 을 내립니다 */
      adminThread: (id: string) => get<AdminInquiryDetail>(`/admin/inquiries/${id}`),

      /** 🔴 부르는 순간 감사 로그가 남는다. "보기" 를 눌렀을 때만 불러라 */
      adminReveal: (id: string) => post<AdminInquiryReveal>(`/admin/inquiries/${id}/reveal`),

      /** 운영자 답변. 서버가 상태를 'answered' 로 올리고 알림 메일을 띄운다 */
      adminReply: (id: string, body: string) =>
        post<InquiryMessage>(`/admin/inquiries/${id}/messages`, { body } satisfies AdminReplyBody),

      /** 상태 · 내부 메모. 준 것만 바뀐다 */
      adminUpdate: (id: string, changes: UpdateInquiryBody) =>
        patch<{ id: string } & UpdateInquiryBody>(`/admin/inquiries/${id}`, changes),
    },

    public: {
      invitation: (slug: string) =>
        get<PublicInvitation>(`/public/i/${encodeURIComponent(slug)}`),
    },
  };
}

export type LuviClient = ReturnType<typeof createClient>;

export {
  createEventLogger,
  sessionId,
  type EventLogger,
  type EventLoggerOptions,
} from './events';
