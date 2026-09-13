/**
 * Luvi REST API — Cloudflare Workers + Hono.
 *
 * 데이터는 **Firestore(원본) + Workers KV(발행 스냅샷)** 입니다.
 * Admin SDK 가 Workers 에서 동작하지 않으므로 Firestore 는 REST 로 직접 호출합니다 (`lib/firestore.ts`).
 *
 * ─── 이 파일의 규칙 ─────────────────────────────────────────
 *
 * 1. **청첩장을 건드리는 모든 라우트는 `requireOwned()` 를 통과해야 합니다.**
 *    ID 만 알면 남의 청첩장을 고칠 수 있는 상태가 되면 안 됩니다.
 * 2. **자동저장은 KV 에 쓰지 않습니다.** KV 쓰기 무료 한도가 하루 1,000회입니다.
 *    KV 쓰기는 발행할 때만 일어납니다 (`lib/snapshot.ts`).
 * 3. **하객 경로는 Firestore 를 읽지 않습니다.** 발행 스냅샷을 KV 에서 읽습니다.
 */
import { Hono, type Context } from 'hono';
import { cors } from 'hono/cors';
import type {
  AdminInvitationSummary,
  ApiError,
  EventLogBody,
  EventLogItem,
  ClaimPreview,
  CreateInvitationBody,
  DraftDiff,
  GuestbookEntry,
  Invitation,
  InvitationSummary,
  PublicInvitation,
  PublishResult,
  RankEntry,
  SessionResult,
  SignUploadResult,
  SlugAvailability,
  SocialAuthBody,
  SocialAuthResult,
  UpdateDraftBody,
  AccountProfile,
  ConsentRecord,
  DeleteAccountResult,
  ExistingAccountHint,
  LinkAccountBody,
  LinkAccountResult,
  LinkedIdentity,
  SocialProvider,
  SubmitConsentsBody,
  UpdateAccountBody,
  AdminInquiryList,
  CreateInquiryBody,
  CreateInquiryResult,
  InquiryCategory,
  InquiryContext,
  InquiryStatus,
  InquiryThread,
} from '@luvi/schema';
import {
  DOC_VERSIONS,
  INQUIRY_ATTACHMENT_TYPES,
  INQUIRY_CATEGORIES,
  INQUIRY_EXTRAS_ENABLED,
  INQUIRY_LIMITS,
  deriveSubject,
  inquiryCategoryLabel,
  isRequiredConsent,
  maskEmail,
  maskPhone,
  parseThemeId,
  toConsentStatus,
} from '@luvi/schema';

import { createCustomToken } from './lib/customToken';
import { resolveSocialProfile } from './lib/social';
import { verifyIdToken } from './lib/idToken';
import { Firestore, fsTimestamp, isPreconditionFailure } from './lib/firestore';
import * as eventsRepo from './repo/events';
import { computeDiff } from './lib/diff';
import { PatchError, prepareDraftPatch } from './lib/patch';
import {
  readHostSlug,
  readSnapshot,
  removeSnapshot,
  writeSnapshot,
} from './lib/snapshot';
import {
  hashAccessToken,
  hashIp,
  randomAccessToken,
  signInquiryUpload,
  signUploadToken,
  verifyInquiryUpload,
  verifyUploadToken,
  SecretError,
} from './lib/secrets';
import { verifyTurnstile } from './lib/turnstile';
import { adminAlertMail, receiptMail, send as sendMail } from './lib/mail';
import {
  AssetError,
  IMMUTABLE_CACHE,
  MAX_UPLOAD_BYTES,
  buildAssetKey,
  invitationIdFromKey,
  isAllowedContentType,
} from './lib/assets';
import { deleteAuthAccount } from './lib/identityToolkit';
import * as invitationsRepo from './repo/invitations';
import * as guestbookRepo from './repo/guestbook';
import * as rankingsRepo from './repo/rankings';
import * as usersRepo from './repo/users';
import * as consentsRepo from './repo/consents';
import * as identitiesRepo from './repo/identities';
import * as inquiriesRepo from './repo/inquiries';
import { createFormEntry } from './repo/forms';
import { sampleContent } from './sample';

export interface Env {
  /** 발행 스냅샷 · 호스트/슬러그 매핑 */
  LUVI_KV: KVNamespace;
  /**
   * 이벤트 로그 (D1). **없어도 서비스는 정상 동작합니다** — 로그만 조용히 버려집니다.
   * 바인딩을 필수로 만들면 D1 장애가 청첩장 장애가 됩니다.
   */
  LUVI_LOGS?: D1Database;
  /** 업로드된 이미지·오디오 */
  LUVI_ASSETS: R2Bucket;
  /**
   * 재동의 게이트 on/off. `"true"` 일 때만 미동의 회원의 생성·편집·발행을 막습니다.
   *
   * 🔴 **동의 화면(3단계)이 배포되기 전에 켜지 마세요** — 기존 회원이 동의할 방법 없이
   *    잠깁니다. 자세한 이유는 `requireConsent()` 주석.
   */
  CONSENT_ENFORCED?: string;
  /** 에셋 서빙 베이스 */
  CDN_BASE: string;
  /** 정식 도메인 */
  SITE_ORIGIN: string;
  /** Firebase 프로젝트 ID — ID 토큰의 aud·iss 검증 기준입니다 */
  FIREBASE_PROJECT_ID: string;

  /** 업로드 서명 · IP 해시의 뿌리 키 (Secret) */
  APP_SECRET?: string;

  /** 카카오 REST API 키 (Secret) — 공유용 JavaScript 키와 다른 값입니다 */
  KAKAO_REST_KEY?: string;
  /** 카카오 콘솔에서 "Client Secret 사용"을 켠 경우에만 (Secret) */
  KAKAO_CLIENT_SECRET?: string;
  /** 네이버 애플리케이션 Client ID / Secret */
  NAVER_CLIENT_ID?: string;
  NAVER_CLIENT_SECRET?: string;

  /** Firebase 서비스 계정 — 커스텀 토큰 서명 + Firestore 접근 (Secret) */
  FIREBASE_PRIVATE_KEY?: string;
  FIREBASE_CLIENT_EMAIL?: string;

  /**
   * 메일 발송 (Secret). 없으면 문의는 접수되지만 **알림이 아무에게도 가지 않습니다** —
   * 고객은 답변을 못 받고 우리는 문의가 온 줄 모릅니다. 배포 전에 반드시 등록하세요.
   */
  RESEND_API_KEY?: string;

  /**
   * Turnstile 비밀키 (Secret). 없으면 비로그인 문의의 **봇 검증이 통째로 꺼집니다.**
   * 값이 없을 때마다 오류 로그를 남기고 `/health` 에 드러냅니다.
   */
  TURNSTILE_SECRET?: string;

  /**
   * 🔴 로컬 개발용 우회. `Authorization: Bearer dev` 를 이 uid 로 취급합니다.
   * **운영에는 절대 설정하지 마세요** — 누구나 이 계정으로 로그인됩니다.
   * 값이 설정되어 있으면 요청마다 경고 로그를 남깁니다.
   */
  DEV_FAKE_UID?: string;
}

type Vars = { uid: string | null };

const app = new Hono<{ Bindings: Env; Variables: Vars }>();

// ─────────────────────────── 공통 ───────────────────────────

const ok = <T>(data: T) => ({ ok: true as const, data });
const fail = (error: ApiError) => ({ ok: false as const, error });

/** HTTP 상태 코드 매핑 — 코드 하나로 관리해 라우트마다 숫자를 흩뿌리지 않는다 */
const STATUS: Record<ApiError['code'], 400 | 401 | 403 | 404 | 409 | 429 | 500> = {
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  validation_failed: 400,
  slug_taken: 409,
  claim_invalid: 400,
  claim_expired: 400,
  claim_used: 409,
  rate_limited: 429,
  // 인증은 됐지만 재동의 전까지 이 동작을 허용하지 않습니다 — 401 이 아니라 403 입니다.
  // 401 로 주면 클라이언트가 "토큰 만료" 로 보고 로그아웃시켜, 동의할 화면조차 못 엽니다.
  consent_required: 403,
  account_exists: 409,
  // 이 로그인 수단을 다른 계정이 이미 쓰고 있습니다. 붙일 자리가 없다는 뜻이라 409 입니다.
  link_conflict: 409,
  internal: 500,
};

class HttpError extends Error {
  constructor(public readonly detail: ApiError) {
    super(detail.message);
  }
}

/**
 * CORS.
 *
 * 오리진을 무제한 반영하지 않습니다. 쿠키를 쓰지 않고 Bearer 토큰만 쓰므로
 * `credentials` 는 끕니다 — 켜두면 나중에 쿠키를 도입하는 순간 CSRF 표면이 열립니다.
 *
 * 청첩장 뷰어는 `*.pages.dev` 에서 방명록을 POST 하므로 함께 허용합니다.
 */
function allowOrigin(origin: string, env: Env): string | undefined {
  if (!origin) return undefined;
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return undefined;
  }
  if (origin === env.SITE_ORIGIN) return origin;
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return origin;
  if (url.hostname === 'pages.dev' || url.hostname.endsWith('.pages.dev')) return origin;
  if (url.hostname.endsWith('.luv-ai.co.kr')) return origin;
  return undefined;
}

app.use('*', (c, next) =>
  cors({
    origin: (origin) => allowOrigin(origin, c.env),
    allowMethods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86_400,
  })(c, next),
);

/**
 * Bearer 토큰에서 uid 를 얻습니다.
 *
 * 토큰이 있는데 검증에 실패하면 `uid` 를 비웁니다 — 잘못된 토큰을 비로그인으로 취급해도
 * 로그인 필수 라우트는 `requireUid()` 에서 401 이 됩니다.
 */
app.use('/api/*', async (c, next) => {
  const header = c.req.header('Authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7).trim() : null;

  c.set('uid', null);

  if (token) {
    if (c.env.DEV_FAKE_UID && token === 'dev') {
      console.warn('[api] ⚠️ DEV_FAKE_UID 로 인증을 우회했습니다. 운영 환경이면 즉시 제거하세요');
      c.set('uid', c.env.DEV_FAKE_UID);
    } else {
      try {
        const verified = await verifyIdToken(token, c.env.FIREBASE_PROJECT_ID);
        c.set('uid', verified.uid);
      } catch (e) {
        console.warn('[api] ID 토큰 검증 실패', e instanceof Error ? e.message : e);
      }
    }
  }

  await next();
});

function requireUid(c: { get: (k: 'uid') => string | null }): string {
  const uid = c.get('uid');
  if (!uid) throw new HttpError({ code: 'unauthorized', message: '로그인이 필요합니다' });
  return uid;
}

/** 서비스 계정이 없으면 Firestore 도, 커스텀 토큰도 불가능합니다 */
function serviceAccount(env: Env): { clientEmail: string; privateKeyPem: string } {
  if (!env.FIREBASE_CLIENT_EMAIL || !env.FIREBASE_PRIVATE_KEY) {
    console.error('[api] FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY 시크릿이 없습니다');
    throw new HttpError({ code: 'internal', message: '서버 설정이 완료되지 않았습니다' });
  }
  return {
    clientEmail: env.FIREBASE_CLIENT_EMAIL,
    privateKeyPem: env.FIREBASE_PRIVATE_KEY,
  };
}

function firestore(env: Env): Firestore {
  // 인스턴스 생성은 값이 싸고, 액세스 토큰은 모듈 수준에서 캐시됩니다
  return new Firestore(env.FIREBASE_PROJECT_ID, serviceAccount(env));
}

/**
 * 청첩장 소유권 확인. **ID 를 받는 모든 라우트가 이걸 통과해야 합니다.**
 *
 * 아직 인계되지 않은 청첩장(`ownerUid === null`)은 운영자만 접근할 수 있습니다.
 */
async function requireOwned(
  c: { env: Env; get: (k: 'uid') => string | null },
  db: Firestore,
  id: string,
): Promise<invitationsRepo.StoredInvitation> {
  const uid = requireUid(c);

  const invitation = await invitationsRepo.findInvitation(db, id);
  if (!invitation) {
    throw new HttpError({ code: 'not_found', message: '청첩장을 찾을 수 없습니다' });
  }
  if (invitation.ownerUid === uid) return invitation;

  // 소유자가 아닐 때만 운영자 여부를 봅니다 — 매 요청에 읽기를 하나 더 쓰지 않기 위해
  if (await usersRepo.isAdmin(db, uid)) return invitation;

  throw new HttpError({ code: 'forbidden', message: '이 청첩장에 접근할 수 없습니다' });
}

/** 소유자인지만 알고 싶을 때 (방명록의 숨긴 글 노출 여부) */
async function isOwnerOf(
  db: Firestore,
  invitationId: string,
  uid: string | null,
): Promise<boolean> {
  if (!uid) return false;
  const invitation = await invitationsRepo.findInvitation(db, invitationId);
  if (!invitation) return false;
  return invitation.ownerUid === uid || (await usersRepo.isAdmin(db, uid));
}

/**
 * 관리 이력(감사 로그) — **누가 언제 무엇을 지우거나 숨겼나**.
 *
 * 🔴 왜 서버가 남기는가: 화면에서 보내는 로그(`POST /api/events`)는 **지운 사람이 보내지
 *    않으면 기록이 없습니다.** 지운 흔적은 지운 쪽의 선의에 기대면 안 됩니다. 그래서
 *    되돌릴 수 없는 동작(삭제·초기화)과 하객 화면을 바꾸는 동작(숨김)은 서버가 직접 씁니다.
 *
 * 개인정보는 넣지 않습니다 — 하객 이름·글 내용은 기록하지 않고 **문서 ID 만** 남깁니다
 * (migrations/0001_events.sql 의 원칙). "누가" 는 `uid`, "언제" 는 `at` 입니다.
 *
 * 로그 실패가 동작을 막아서는 안 되므로 `insertEvents` 는 던지지 않습니다.
 * 조회는 D1 콘솔에서 SQL 로만 합니다 (웹 화면을 만들지 않는다 — 운영노트 7).
 */
async function audit(
  c: Context<{ Bindings: Env; Variables: Vars }>,
  input: {
    name: string;
    /**
     * 대상 청첩장. **계정 단위 사건(탈퇴·동의)에는 없습니다** — 그때는 생략하고,
     * "누가" 는 `uid` 로만 남습니다.
     */
    invitationId?: string;
    detail?: string;
    /**
     * 그 청첩장의 소유자 uid. 주면 `by=owner` / `by=admin` 을 앞에 붙입니다 —
     * **"누가 건드렸나" 는 uid 만으로는 부족합니다.** 운영자가 남의 청첩장을 고칠 수 있으니
     * (그게 운영자 계정의 목적입니다), 같은 동작이라도 *자기 것을 고친 것*과
     * *남의 것을 고친 것*은 전혀 다른 사건입니다. 로그를 읽는 순간 구분돼야 합니다.
     */
    ownerUid?: string | null;
  },
): Promise<void> {
  const uid = c.get('uid');
  const by = input.ownerUid ? (input.ownerUid === uid ? 'owner' : 'admin') : null;
  const detail = [by ? `by=${by}` : null, input.detail]
    .filter(Boolean)
    .join(' ')
    .slice(0, 500);

  await eventsRepo.insertEvents(c.env.LUVI_LOGS, [
    {
      at: new Date().toISOString(),
      kind: 'admin',
      name: input.name.slice(0, 60),
      ok: 1,
      detail: detail || null,
      invitationId: input.invitationId?.slice(0, 60) ?? null,
      slug: null,
      session: null,
      uid: c.get('uid'),
      path: c.req.path.slice(0, 200),
      ua: (c.req.header('User-Agent') ?? '').slice(0, 200),
      ipHash: await hashIp(c.env.APP_SECRET, clientIp(c)).catch(() => null),
    },
  ]);
}

function clientIp(c: { req: { header: (k: string) => string | undefined } }): string {
  return c.req.header('CF-Connecting-IP') ?? c.req.header('X-Forwarded-For') ?? '0.0.0.0';
}

/**
 * 요청 본문을 읽습니다. 본문이 없거나 JSON 이 아니면 빈 객체를 돌려줍니다 —
 * 파싱 실패와 "필드 누락" 을 각 라우트에서 따로 처리할 이유가 없고,
 * 어느 쪽이든 아래 검증에서 같은 메시지로 걸러집니다.
 */
async function readJson<T>(req: { json: <U>() => Promise<U> }): Promise<Partial<T>> {
  try {
    const parsed = await req.json<T>();
    return parsed && typeof parsed === 'object' ? (parsed as Partial<T>) : {};
  } catch {
    return {};
  }
}

app.onError((err, c) => {
  if (err instanceof HttpError) {
    return c.json(fail(err.detail), STATUS[err.detail.code]);
  }
  if (err instanceof PatchError) {
    return c.json(
      fail({
        code: 'validation_failed',
        message: err.message,
        ...(err.path ? { fields: [{ path: err.path, message: err.message }] } : {}),
      }),
      400,
    );
  }
  if (err instanceof AssetError) {
    return c.json(fail({ code: 'validation_failed', message: err.message }), 400);
  }
  if (err instanceof SecretError) {
    // 설정 누락은 사용자 잘못이 아니므로 원인을 로그에만 남깁니다
    console.error('[api] 시크릿 설정 오류', err.message);
    return c.json(fail({ code: 'internal', message: '서버 설정이 완료되지 않았습니다' }), 500);
  }

  console.error('[api] 처리되지 않은 오류', err);
  return c.json(fail({ code: 'internal', message: '알 수 없는 오류가 발생했습니다' }), 500);
});

app.notFound((c) => c.json(fail({ code: 'not_found', message: '없는 경로입니다' }), 404));

app.get('/', (c) => c.json(ok({ service: 'Luvi API', version: '0.2.0' })));

/** 배포 직후 설정 누락을 확인하는 용도. 값은 노출하지 않고 있음/없음만 알려줍니다 */
app.get('/health', (c) =>
  c.json(
    ok({
      firestore: Boolean(c.env.FIREBASE_CLIENT_EMAIL && c.env.FIREBASE_PRIVATE_KEY),
      appSecret: Boolean(c.env.APP_SECRET),
      kakao: Boolean(c.env.KAKAO_REST_KEY),
      naver: Boolean(c.env.NAVER_CLIENT_ID && c.env.NAVER_CLIENT_SECRET),
      kv: Boolean(c.env.LUVI_KV),
      r2: Boolean(c.env.LUVI_ASSETS),
      // 문의 기능의 전제 둘. resend 가 false 면 알림이 아무에게도 가지 않고,
      // turnstile 이 false 면 비로그인 폼의 봇 검증이 꺼져 있습니다.
      resend: Boolean(c.env.RESEND_API_KEY),
      turnstile: Boolean(c.env.TURNSTILE_SECRET),
      devAuthBypass: Boolean(c.env.DEV_FAKE_UID),
    }),
  ),
);

// ─────────────────────────── 청첩장 ───────────────────────────

/**
 * 클라이언트 이벤트 로그. **비로그인 하객도 보냅니다.**
 *
 * 카카오 공유·음원 재생처럼 서버를 거치지 않는 동작은 실패해도 서버 로그에 안 남습니다.
 * 그래서 화면이 알려주게 합니다. 다만 이 경로는 인증이 없으므로 다음을 지킵니다:
 *
 *  · 배치 최대 20건, 필드 길이 제한 — 로그로 D1 를 채우는 장난을 막습니다
 *  · 시각·IP·UA 는 **서버가** 채웁니다 (클라이언트 값을 믿지 않습니다)
 *  · 실패해도 항상 200 — 로그 실패가 화면 동작을 방해하면 안 됩니다
 */
app.post('/api/events', async (c) => {
  const body = await readJson<EventLogBody>(c.req).catch(() => ({ events: [] }));
  const items = Array.isArray(body?.events) ? body.events.slice(0, eventsRepo.MAX_BATCH) : [];
  if (items.length === 0) return c.json(ok({ stored: 0 }));

  const at = new Date().toISOString();
  const ua = (c.req.header('User-Agent') ?? '').slice(0, 200);
  const ipHash = await hashIp(c.env.APP_SECRET, clientIp(c)).catch(() => null);
  const uid = c.get('uid');

  const kind = (v: unknown): string =>
    v === 'click' || v === 'error' || v === 'view' ? v : 'click';
  const str = (v: unknown, max: number): string | null =>
    typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null;

  const rows = items
    .filter((e): e is EventLogItem => Boolean(e) && typeof e.name === 'string')
    .map((e) => ({
      at,
      kind: kind(e.kind),
      name: String(e.name).slice(0, 60),
      ok: e.ok === true ? 1 : e.ok === false ? 0 : null,
      detail: str(e.detail, 500),
      invitationId: str(e.invitationId, 60),
      slug: str(e.slug, 60),
      session: str(e.session, 40),
      uid,
      path: str(e.path, 200),
      ua,
      ipHash,
    }));

  const stored = await eventsRepo.insertEvents(c.env.LUVI_LOGS, rows);
  return c.json(ok({ stored }));
});

app.get('/api/invitations', async (c) => {
  const uid = requireUid(c);
  const db = firestore(c.env);

  const invitations = await invitationsRepo.listByOwner(db, uid);
  return c.json(ok<InvitationSummary[]>(invitations.map(invitationsRepo.toSummary)));
});

/**
 * 운영자 목록 — 모든 계정의 청첩장.
 *
 * 대시보드(`GET /api/invitations`)는 소유자 기준이라 운영자에게도 자기 것만 보입니다.
 * 남의 청첩장을 대신 손봐주려면 ID 를 알아야 하는데, 그걸 알 방법이 없었습니다.
 *
 * `/api/invitations/:id` 보다 **먼저** 선언해야 합니다 — 뒤에 두면 'admin' 이
 * 청첩장 ID 로 잡혀 404 가 됩니다.
 */
app.get('/api/admin/invitations', async (c) => {
  const uid = requireUid(c);
  const db = firestore(c.env);

  if (!(await usersRepo.isAdmin(db, uid))) {
    throw new HttpError({ code: 'forbidden', message: '운영자만 볼 수 있습니다' });
  }

  const invitations = await invitationsRepo.listAll(db);
  const owners = await usersRepo.readOwnerProfiles(
    db,
    invitations.map((inv) => inv.ownerUid).filter((v): v is string => Boolean(v)),
  );

  return c.json(
    ok<AdminInvitationSummary[]>(
      invitations.map((inv) => {
        const owner = inv.ownerUid ? owners.get(inv.ownerUid) : undefined;
        return {
          ...invitationsRepo.toSummary(inv),
          ownerUid: inv.ownerUid,
          ownerName: owner?.displayName ?? null,
          ownerEmail: owner?.email ?? null,
          ownerProviders: owner?.providers ?? [],
          createdAt: inv.createdAt,
        };
      }),
    ),
  );
});

app.get('/api/invitations/:id', async (c) => {
  const db = firestore(c.env);
  const invitation = await requireOwned(c, db, c.req.param('id'));
  return c.json(ok<Invitation>(invitationsRepo.toPublicShape(invitation)));
});

app.post('/api/invitations', async (c) => {
  const uid = requireUid(c);
  const db = firestore(c.env);
  await requireConsent(c.env, db, uid);
  const body = await readJson<CreateInvitationBody>(c.req);

  /**
   * 🔴 **운영자 계정은 청첩장을 만들지 못합니다.**
   *
   * 운영자는 *남의* 청첩장을 대신 손봐주는 계정입니다. 그런데 운영자 계정으로도 만들 수
   * 있게 두니, 2026-08-18 에 테스트로 만든 빈 초안이 그대로 남아 **한 결혼식에 청첩장이
   * 두 개**처럼 보였습니다 (실제 발행본은 신부 계정 소유, 초안은 운영자 계정 소유).
   * 관리 화면·방명록에서 둘이 나란히 뜨니 "계정별로 갈라졌다" 로 읽힙니다.
   *
   * 테스트가 필요하면 `e2e/` 하네스를 쓰세요 — **일회용 계정과 청첩장을 스스로 만들고
   * finally 에서 지웁니다.** 실계정에 흔적을 남기지 않는 유일한 방법입니다.
   */
  if (await usersRepo.isAdmin(db, uid)) {
    throw new HttpError({
      code: 'forbidden',
      message:
        '운영자 계정으로는 청첩장을 만들 수 없습니다. ' +
        '테스트가 필요하면 e2e 하네스(일회용 계정)를 쓰세요',
    });
  }

  // 모르는 디자인 이름은 기본 디자인으로 떨어집니다 (카탈로그가 판정합니다)
  const themeId = parseThemeId(body.themeId);

  // 빈 폼이 아니라 샘플로 채운 초안을 줍니다 — 완성된 화면을 먼저 보여주는 쪽이 이탈이 훨씬 적습니다
  const invitation = await invitationsRepo.createInvitation(db, {
    ownerUid: uid,
    themeId,
    content: sampleContent(),
  });

  return c.json(ok<Invitation>(invitationsRepo.toPublicShape(invitation)), 201);
});

/**
 * 자동저장. **초안만** 바뀌고 하객 화면은 발행할 때까지 그대로입니다.
 * KV 는 건드리지 않습니다 (쓰기 한도 소진 방지).
 */
app.patch('/api/invitations/:id', async (c) => {
  const db = firestore(c.env);
  const id = c.req.param('id');
  await requireOwned(c, db, id);
  await requireConsent(c.env, db, requireUid(c));

  const body = await readJson<UpdateDraftBody>(c.req);

  const updatedAt = new Date().toISOString();
  const prepared = prepareDraftPatch({
    patch: body.patch,
    features: body.features as Record<string, unknown> | undefined,
    sections: body.sections,
    updatedAt: fsTimestamp(updatedAt),
  });

  await invitationsRepo.updateDraft(db, id, prepared.fields, prepared.updateMask);
  return c.json(ok({ updatedAt }));
});

app.get('/api/invitations/:id/diff', async (c) => {
  const db = firestore(c.env);
  const invitation = await requireOwned(c, db, c.req.param('id'));

  // 발행 화면에서 새 슬러그를 고르는 중일 수 있으므로 쿼리로 덮어쓸 수 있게 합니다
  const slug = c.req.query('slug') ?? invitation.slug;

  return c.json(
    ok<DraftDiff>(
      computeDiff({
        draft: invitation.draft,
        published: invitation.published,
        sections: invitation.sections,
        slug,
      }),
    ),
  );
});

app.post('/api/invitations/:id/publish', async (c) => {
  const db = firestore(c.env);
  const id = c.req.param('id');
  const invitation = await requireOwned(c, db, id);
  await requireConsent(c.env, db, requireUid(c));

  const { slug: rawSlug } = await readJson<{ slug: string }>(c.req);
  const slug = (rawSlug ?? invitation.slug).trim().toLowerCase();
  assertValidSlug(slug);

  // 필수 항목이 비어 있으면 발행을 막습니다 — 하객이 빈칸을 보는 것보다 낫습니다
  const diff = computeDiff({
    draft: invitation.draft,
    published: invitation.published,
    sections: invitation.sections,
    slug,
  });
  if (diff.missing.length > 0) {
    throw new HttpError({
      code: 'validation_failed',
      message: '아직 비어 있는 필수 항목이 있습니다',
      fields: diff.missing.map((m) => ({ path: m.path, message: `${m.label}을(를) 채워주세요` })),
    });
  }

  // 이미 이 청첩장이 쓰던 슬러그면 다시 선점하지 않습니다 (재발행)
  const reservation = await invitationsRepo.readSlugReservation(db, slug);
  if (reservation && reservation.invitationId !== id) {
    throw new HttpError({ code: 'slug_taken', message: '이미 사용 중인 주소입니다' });
  }

  let publishedAt: string;
  try {
    publishedAt = await invitationsRepo.publishInvitation(db, {
      invitation,
      slug,
      reserveSlug: !reservation,
    });
  } catch (e) {
    // 동시에 같은 슬러그를 발행한 경우 exists:false 조건이 걸립니다
    if (isPreconditionFailure(e)) {
      throw new HttpError({ code: 'slug_taken', message: '방금 다른 분이 사용한 주소입니다' });
    }
    throw e;
  }

  // 하객 화면이 바뀌는 지점은 **여기** 입니다 (Firestore 가 아니라 KV)
  const snapshot: PublicInvitation = {
    slug,
    invitationId: id,
    themeId: invitation.themeId,
    sections: invitation.sections,
    features: invitation.features,
    content: invitation.draft,
    cdnBase: c.env.CDN_BASE,
  };

  await writeSnapshot({
    kv: c.env.LUVI_KV,
    invitationId: id,
    snapshot,
    previousSlug: invitation.slug || null,
    pinnedHost: invitation.pinnedHost,
  });

  /**
   * 발행 이력 — **하객 화면이 바뀌는 유일한 동작**이라 가장 중요한 기록입니다.
   * 화면에서도 `publish` 이벤트를 보내지만, 그건 발행한 쪽이 안 보내면 남지 않습니다.
   */
  await audit(c, {
    name: 'invitation_publish',
    invitationId: id,
    ownerUid: invitation.ownerUid,
    detail: `slug=${slug}`,
  });

  return c.json(
    ok<PublishResult>({
      slug,
      url: `${c.env.SITE_ORIGIN}/i/${slug}`,
      publishedAt,
    }),
  );
});

app.delete('/api/invitations/:id', async (c) => {
  const db = firestore(c.env);
  const id = c.req.param('id');
  const invitation = await requireOwned(c, db, id);

  // 하객 화면부터 내립니다 — Firestore 를 먼저 지우면 그 사이 KV 가 유령 청첩장을 계속 서빙합니다
  await removeSnapshot(c.env.LUVI_KV, id, invitation.slug || null, invitation.pinnedHost);
  await deleteAssets(c.env.LUVI_ASSETS, `inv/${id}/`);
  await invitationsRepo.deleteInvitation(db, invitation);
  await audit(c, {
    name: 'invitation_delete',
    invitationId: id,
    ownerUid: invitation.ownerUid,
    detail: `slug=${invitation.slug || '없음'} status=${invitation.status}`,
  });

  return c.json(ok({ id }));
});

/** R2 는 프리픽스 삭제 API 가 없어 목록을 받아 지웁니다 */
async function deleteAssets(bucket: R2Bucket, prefix: string): Promise<void> {
  let cursor: string | undefined;
  do {
    const listed = await bucket.list({ prefix, limit: 500, cursor });
    if (listed.objects.length > 0) {
      await bucket.delete(listed.objects.map((o) => o.key));
    }
    cursor = listed.truncated ? listed.cursor : undefined;
  } while (cursor);
}

// ─────────────────────────── 슬러그 ───────────────────────────

const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/;
const RESERVED = new Set([
  'api',
  'app',
  'admin',
  'i',
  'assets',
  'cdn',
  'www',
  'login',
  'new',
  'health',
  'static',
  'public',
]);

function assertValidSlug(slug: string): void {
  if (!SLUG_PATTERN.test(slug) || RESERVED.has(slug)) {
    throw new HttpError({
      code: 'validation_failed',
      message: '영문 소문자·숫자·하이픈만 쓸 수 있고 3~40자여야 합니다',
      fields: [{ path: 'slug', message: '형식이 올바르지 않습니다' }],
    });
  }
}

app.get('/api/slugs/:slug/available', async (c) => {
  const slug = c.req.param('slug').toLowerCase();
  assertValidSlug(slug);

  const db = firestore(c.env);
  const reservation = await invitationsRepo.readSlugReservation(db, slug);

  // 내가 이미 쓰는 주소면 "사용 가능" 으로 보여줘야 합니다 (재발행 시 중복 경고가 뜨면 혼란)
  const uid = c.get('uid');
  let mine = false;
  if (reservation && uid) {
    const owned = await invitationsRepo.findInvitation(db, reservation.invitationId);
    mine = owned?.ownerUid === uid;
  }

  const available = !reservation || mine;
  const result: SlugAvailability = {
    slug,
    available,
    ...(available ? {} : { suggestions: [`${slug}-wedding`, `${slug}-2026`, `${slug}-day`] }),
  };
  return c.json(ok(result));
});

// ─────────────────────────── 방명록 ───────────────────────────

app.get('/api/invitations/:id/guestbook', async (c) => {
  const db = firestore(c.env);
  const id = c.req.param('id');

  // 소유자에게만 숨긴 글까지 보여줍니다
  const includeHidden = await isOwnerOf(db, id, c.get('uid'));
  const limit = Number(c.req.query('limit') ?? 20);

  const entries = await guestbookRepo.listGuestbook(db, id, {
    limit: Number.isFinite(limit) ? limit : 20,
    includeHidden,
  });
  return c.json(ok<GuestbookEntry[]>(entries));
});

/** 하객이 남깁니다 — 비로그인 허용 */
app.post('/api/invitations/:id/guestbook', async (c) => {
  const db = firestore(c.env);
  const id = c.req.param('id');

  const body = await readJson<{ name: string; msg: string }>(c.req);
  const name = (body.name ?? '').trim();
  const msg = (body.msg ?? '').trim();

  const fields: { path: string; message: string }[] = [];
  if (!name || name.length > 20) fields.push({ path: 'name', message: '이름은 1~20자입니다' });
  if (!msg || msg.length > 300) fields.push({ path: 'msg', message: '메시지는 1~300자입니다' });
  if (fields.length) {
    throw new HttpError({ code: 'validation_failed', message: '입력을 확인해주세요', fields });
  }

  // 존재하지 않는 청첩장 밑에 글이 쌓이는 것을 막습니다
  const invitation = await invitationsRepo.findInvitation(db, id);
  if (!invitation) {
    throw new HttpError({ code: 'not_found', message: '청첩장을 찾을 수 없습니다' });
  }

  const ipHash = await hashIp(c.env.APP_SECRET, clientIp(c));
  if (guestbookRepo.isFlooding(await guestbookRepo.countByIp(db, id, ipHash))) {
    throw new HttpError({
      code: 'rate_limited',
      message: '이미 여러 번 남겨주셨어요. 잠시 뒤에 다시 시도해주세요',
    });
  }

  const entry = await guestbookRepo.createEntry(db, id, { name, msg, ipHash });
  return c.json(ok<GuestbookEntry>(entry), 201);
});

app.patch('/api/invitations/:id/guestbook/:entryId', async (c) => {
  const db = firestore(c.env);
  const id = c.req.param('id');
  const invitation = await requireOwned(c, db, id);

  const { hidden } = await readJson<{ hidden: boolean }>(c.req);
  if (typeof hidden !== 'boolean') {
    throw new HttpError({ code: 'validation_failed', message: 'hidden 값이 필요합니다' });
  }

  const entry = await guestbookRepo.setHidden(db, id, c.req.param('entryId'), hidden);
  if (!entry) throw new HttpError({ code: 'not_found', message: '해당 글을 찾을 수 없습니다' });

  await audit(c, {
    name: hidden ? 'guestbook_hide' : 'guestbook_unhide',
    invitationId: id,
    ownerUid: invitation.ownerUid,
    detail: `entry=${entry.id}`,
  });
  return c.json(ok<GuestbookEntry>(entry));
});

app.delete('/api/invitations/:id/guestbook/:entryId', async (c) => {
  const db = firestore(c.env);
  const id = c.req.param('id');
  const invitation = await requireOwned(c, db, id);

  await guestbookRepo.removeEntry(db, id, c.req.param('entryId'));
  await audit(c, {
    name: 'guestbook_delete',
    invitationId: id,
    ownerUid: invitation.ownerUid,
    detail: `entry=${c.req.param('entryId')}`,
  });
  return c.json(ok({ id: c.req.param('entryId') }));
});

/**
 * 방명록 전체 초기화 — 하객 글을 **전부** 지웁니다.
 *
 * 한 건씩 지우는 것과 경로가 다릅니다(`/guestbook` vs `/guestbook/:entryId`) — 세그먼트
 * 수가 달라 라우팅이 겹치지 않습니다. 숨김과 달리 되돌릴 수 없어 화면에서 건수를
 * 보여주고 확인받은 뒤에만 부릅니다.
 */
app.delete('/api/invitations/:id/guestbook', async (c) => {
  const db = firestore(c.env);
  const id = c.req.param('id');
  const invitation = await requireOwned(c, db, id);

  const deleted = await guestbookRepo.clearGuestbook(db, id);
  await audit(c, {
    name: 'guestbook_clear',
    invitationId: id,
    ownerUid: invitation.ownerUid,
    detail: `deleted=${deleted}`,
  });
  return c.json(ok({ deleted }));
});

// ─────────────────────────── 랭킹 ───────────────────────────

app.get('/api/invitations/:id/rankings', async (c) => {
  const db = firestore(c.env);
  const entries = await rankingsRepo.listRankings(db, c.req.param('id'));
  return c.json(ok<RankEntry[]>(entries));
});

app.post('/api/invitations/:id/rankings', async (c) => {
  const db = firestore(c.env);
  const id = c.req.param('id');

  const body = await readJson<{ nick: string; score: number; caught: number }>(c.req);

  // score 는 생존 시간(초)이라 **소수**입니다. 정수 검사를 넣으면 정상 기록이 전부 거부됩니다.
  const score = Number(body.score);
  const caught = Number(body.caught);
  if (!(score >= 0 && score <= 600) || !(caught >= 0 && caught <= 2000)) {
    throw new HttpError({ code: 'validation_failed', message: '기록 값이 올바르지 않습니다' });
  }

  const invitation = await invitationsRepo.findInvitation(db, id);
  if (!invitation) {
    throw new HttpError({ code: 'not_found', message: '청첩장을 찾을 수 없습니다' });
  }

  const entry = await rankingsRepo.createRank(db, id, {
    nick: (body.nick ?? '').trim().slice(0, 20) || '익명 하객',
    score,
    caught,
    ipHash: await hashIp(c.env.APP_SECRET, clientIp(c)),
  });
  return c.json(ok<RankEntry>(entry), 201);
});

app.delete('/api/invitations/:id/rankings/:entryId', async (c) => {
  const db = firestore(c.env);
  const id = c.req.param('id');
  const invitation = await requireOwned(c, db, id);

  await rankingsRepo.removeRank(db, id, c.req.param('entryId'));
  await audit(c, {
    name: 'ranking_delete',
    invitationId: id,
    ownerUid: invitation.ownerUid,
    detail: `entry=${c.req.param('entryId')}`,
  });
  return c.json(ok({ id: c.req.param('entryId') }));
});

// ─────────────────────────── 에셋 ───────────────────────────

app.post('/api/assets/sign', async (c) => {
  const db = firestore(c.env);
  const body = await readJson<{
    invitationId: string;
    kind: string;
    contentType: string;
    size: number;
  }>(c.req);

  const uid = requireUid(c);
  const invitationId = body.invitationId ?? '';
  // 남의 청첩장 경로에 업로드 토큰을 받아가지 못하게 소유권을 먼저 확인합니다
  await requireOwned(c, db, invitationId);

  const size = Number(body.size);
  if (!(size > 0 && size <= MAX_UPLOAD_BYTES)) {
    throw new HttpError({
      code: 'validation_failed',
      message: '파일이 너무 큽니다. 브라우저에서 변환 후 6MB 이하여야 합니다',
    });
  }

  const contentType = body.contentType ?? '';
  const key = buildAssetKey({ invitationId, kind: body.kind ?? '', contentType });

  // 토큰이 키·타입·크기·사용자에 묶여 있어, 새더라도 다른 경로에 다른 파일을 올릴 수 없습니다
  const token = await signUploadToken(c.env.APP_SECRET, { key, contentType, size, uid });
  const origin = new URL(c.req.url).origin;

  const result: SignUploadResult = {
    uploadUrl: `${origin}/api/assets/upload?key=${encodeURIComponent(key)}&token=${encodeURIComponent(token)}`,
    key,
    expiresAt: new Date(Number(token.slice(0, token.indexOf('.')))).toISOString(),
  };
  return c.json(ok(result));
});

app.put('/api/assets/upload', async (c) => {
  const uid = requireUid(c);

  const key = c.req.query('key') ?? '';
  const token = c.req.query('token') ?? '';
  const contentType = c.req.header('Content-Type') ?? '';
  const declared = Number(c.req.header('Content-Length'));

  // 길이를 모르면 크기 제한을 걸 수 없습니다 (chunked 업로드 거부)
  if (!Number.isFinite(declared) || declared <= 0 || declared > MAX_UPLOAD_BYTES) {
    throw new HttpError({ code: 'validation_failed', message: '파일 크기를 확인할 수 없습니다' });
  }
  if (!isAllowedContentType(contentType)) {
    throw new HttpError({ code: 'validation_failed', message: '지원하지 않는 파일 형식입니다' });
  }

  const valid = await verifyUploadToken(c.env.APP_SECRET, token, {
    key,
    contentType,
    size: declared,
    uid,
  });
  if (!valid) {
    throw new HttpError({
      code: 'forbidden',
      message: '업로드 권한이 만료되었습니다. 다시 시도해주세요',
    });
  }

  const body = c.req.raw.body;
  if (!body) throw new HttpError({ code: 'validation_failed', message: '보낼 파일이 없습니다' });

  await c.env.LUVI_ASSETS.put(key, body, {
    httpMetadata: { contentType, cacheControl: IMMUTABLE_CACHE },
    customMetadata: { invitationId: invitationIdFromKey(key) ?? '', uploadedBy: uid },
  });

  return c.json(ok({ key }), 201);
});

/**
 * 에셋 서빙 폴백.
 *
 * ⚠️ **운영에서는 `CDN_BASE` 를 R2 커스텀 도메인으로 붙이세요.** 이 경로로 이미지를 서빙하면
 *    사진 한 장마다 Worker 요청이 하나씩 잡혀 무료 한도(하루 100,000 요청)를 빠르게 태웁니다.
 *    R2 커스텀 도메인은 요청·전송량이 무료입니다. 이 라우트는 도메인 연결 전 개발용입니다.
 */
app.get('/api/assets/*', async (c) => {
  const key = decodeURIComponent(c.req.path.slice('/api/assets/'.length));
  if (!key || key.includes('..')) {
    throw new HttpError({ code: 'not_found', message: '없는 파일입니다' });
  }

  const object = await c.env.LUVI_ASSETS.get(key);
  if (!object) throw new HttpError({ code: 'not_found', message: '없는 파일입니다' });

  return new Response(object.body, {
    headers: {
      'Content-Type': object.httpMetadata?.contentType ?? 'application/octet-stream',
      'Cache-Control': object.httpMetadata?.cacheControl ?? IMMUTABLE_CACHE,
      ETag: object.httpEtag,
      // 🔴 업로드된 청첩장 사진은 HTML 이 아니라 `<meta name="robots">` 를 넣을 자리가 없다.
      //    헤더로 색인을 막는다 — 없으면 사진이 이미지 검색에 걸리는 통로가 열려 있다.
      //    뷰어 HTML 의 noindex 는 페이지만 막지, 사진 URL 이 따로 알려지는 경로는 못 막는다.
      //    ⚠️ robots.txt 로 이 경로를 Disallow 하면 크롤러가 이 헤더를 못 읽으니 하지 말 것.
      'X-Robots-Tag': 'noindex, noimageindex, noarchive',
    },
  });
});

// ─────────────────────────── 인계 (클레임) ───────────────────────────

const CLAIM_PATTERN = /^LUVI-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

/**
 * 코드로 청첩장을 찾고 유효성을 검사합니다.
 *
 * 실패 횟수 제한은 Worker 안에서 세지 않습니다 — KV 쓰기 한도를 먼저 태웁니다.
 * 코드 공간이 36^8(약 2.8조)이라 무차별 대입은 비현실적이고, 필요하면
 * Cloudflare 속도 제한 규칙(무료 요금제에 1개 포함)으로 막는 편이 맞습니다.
 */
async function resolveClaim(db: Firestore, rawCode: string) {
  const code = rawCode.trim().toUpperCase();
  if (!CLAIM_PATTERN.test(code)) {
    throw new HttpError({ code: 'claim_invalid', message: '코드 형식이 올바르지 않습니다' });
  }

  const invitation = await invitationsRepo.findByClaimCode(db, code);
  if (!invitation?.claim) {
    throw new HttpError({ code: 'claim_invalid', message: '사용할 수 없는 코드입니다' });
  }
  if (invitation.claim.usedAt) {
    throw new HttpError({ code: 'claim_used', message: '이미 사용된 코드입니다' });
  }
  if (invitation.claim.expiresAt && invitation.claim.expiresAt < new Date().toISOString()) {
    throw new HttpError({ code: 'claim_expired', message: '유효기간이 지난 코드입니다' });
  }
  return invitation;
}

app.post('/api/claim/preview', async (c) => {
  requireUid(c);
  const db = firestore(c.env);
  const { code } = await readJson<{ code: string }>(c.req);

  const invitation = await resolveClaim(db, code ?? '');
  const summary = invitationsRepo.toSummary(invitation);

  // 코드가 맞더라도 바로 넘기지 않습니다 — 어떤 청첩장인지 보여주고 확인받습니다
  const preview: ClaimPreview = {
    invitationId: invitation.id,
    coupleLabel: summary.coupleLabel,
    weddingAt: summary.weddingAt,
    thumbKey: summary.thumbKey,
  };
  return c.json(ok(preview));
});

app.post('/api/claim', async (c) => {
  const uid = requireUid(c);
  const db = firestore(c.env);
  const { code } = await readJson<{ code: string }>(c.req);

  const invitation = await resolveClaim(db, code ?? '');

  try {
    // 읽은 시점 이후 문서가 바뀌었으면 실패합니다 — 같은 코드로 동시에 두 명이 인계받는 것을 막습니다
    await invitationsRepo.transferOwnership(db, invitation, uid);
  } catch (e) {
    if (isPreconditionFailure(e)) {
      throw new HttpError({ code: 'claim_used', message: '이미 처리된 코드입니다' });
    }
    throw e;
  }

  return c.json(ok({ invitationId: invitation.id }));
});

// ─────────────────────────── 인증 ───────────────────────────

/**
 * 로그인 관련 라우트 — 모두 `/api/auth/:provider` 하나로 받습니다.
 *
 * Hono 라우터가 이 경로 그룹에서 정적 라우트(`/api/auth/session`)에 우선권을 주지 않아,
 * 따로 등록해도 `:provider` 가 먼저 가로챕니다(가로채면 404). 그래서 갈래를 이 핸들러
 * 안에서 직접 나눕니다:
 *  - `session` : 구글·이메일 로그인 후 사용자 문서 생성·갱신 (인증은 Firebase 가 직접)
 *  - `kakao`·`naver` : Firebase 기본 제공자가 아니라 커스텀 토큰으로 브릿지
 */
app.post('/api/auth/:provider', async (c) => {
  const provider = c.req.param('provider');

  // 구글·이메일: 클라이언트가 Firebase 로 로그인한 뒤 사용자 문서만 동기화합니다
  if (provider === 'session') {
    const uid = requireUid(c);
    const body = await readJson<{
      email: string | null;
      displayName: string | null;
      photoURL: string | null;
      provider: string;
    }>(c.req);

    const db = firestore(c.env);
    await usersRepo.upsertUser(db, {
      uid,
      email: body.email ?? null,
      displayName: body.displayName ?? null,
      photoURL: body.photoURL ?? null,
      provider: body.provider ?? 'password',
    });

    // 권한과 동의 상태를 함께 돌려줍니다 — 화면이 '운영자' 메뉴를 보여줄지, 재동의 모달을
    // 띄울지 판단할 근거가 여기 말고 없습니다.
    // (토큰 클레임으로 내려보내면 커스텀 토큰을 만드는 우리 코드가 권한 부여 지점이 됩니다)
    return c.json(
      ok<SessionResult>({
        uid,
        role: await usersRepo.readRole(db, uid),
        consent: toConsentStatus(await usersRepo.readConsentVersions(db, uid)),
      }),
    );
  }

  if (provider !== 'kakao' && provider !== 'naver') {
    throw new HttpError({ code: 'not_found', message: '지원하지 않는 로그인 방식입니다' });
  }

  const { code, redirectUri, state } = await readJson<SocialAuthBody>(c.req);
  if (!code || !redirectUri) {
    throw new HttpError({ code: 'validation_failed', message: '인가 정보가 없습니다' });
  }

  const sa = serviceAccount(c.env);

  let result: SocialAuthResult;
  try {
    const profile = await resolveSocialProfile({
      provider,
      code,
      redirectUri,
      state,
      credentials: socialCredentials(c.env),
    });

    // ─── 어느 계정으로 들어갈지 정합니다 ─────────────────────────────
    //
    // 같은 사람이 카카오·네이버·구글로 계정을 따로 만들지 않도록, **연결해 둔 수단이면
    // 기존 계정의 uid 로** 커스텀 토큰을 서명합니다. 커스텀 토큰은 uid 를 우리가 정하므로
    // 이것만으로 "카카오로 로그인했는데 구글 계정으로 들어오는" 동작이 됩니다.
    //
    // 🔴 연결은 **계정 설정에서만** 만들어집니다(`POST /api/account/link/:provider`).
    //    이메일이 같다고 여기서 자동으로 합치면, 남의 이메일로 소셜 계정을 만들어 그 계정에
    //    올라타는 경로가 됩니다. 자세한 이유는 repo/identities.ts 주석에 있습니다.
    const db = firestore(c.env);
    const linked = await identitiesRepo.findByKey(db, profile.uid);

    let targetUid = linked?.uid ?? null;
    let firstTime = false;

    if (!targetUid) {
      // 연결 기능이 생기기 전에 이 소셜로 직접 가입한 사람은 소셜 uid 자체가 계정입니다
      firstTime = (await db.get(`users/${profile.uid}`)) === null;
      targetUid = profile.uid;

      // 🔴 커스텀 토큰을 만들기 **전에** 중복 가입을 막습니다. 토큰을 먼저 내주면
      //    클라이언트가 이미 로그인해버린 뒤라 되돌릴 방법이 없습니다.
      if (firstTime) await assertNoExistingAccount(db, profile);
    }

    const customToken = await createCustomToken({
      clientEmail: sa.clientEmail,
      privateKeyPem: sa.privateKeyPem,
      uid: targetUid,
      claims: { provider: profile.provider },
    });

    result = {
      customToken,
      profile: {
        provider: profile.provider,
        email: profile.email,
        displayName: profile.displayName,
        photoURL: profile.photoURL,
      },
    };

    // 프로필 저장은 실패해도 로그인을 막지 않습니다 — 다음 로그인에 다시 시도됩니다.
    // 전화번호는 더 이상 받지도 저장하지도 않습니다 (2026-09-12, 사유는 lib/social.ts 주석)
    try {
      await usersRepo.upsertUser(db, {
        uid: targetUid,
        email: profile.email,
        displayName: profile.displayName,
        photoURL: profile.photoURL,
        provider: profile.provider,
        // 연결된 보조 수단으로 들어온 경우입니다. 본계정 이름·사진을 덮지 않습니다 —
        // 덮으면 로그인 수단에 따라 표시 이름이 왔다 갔다 합니다.
        preserveProfile: targetUid !== profile.uid,
      });

      // 신규 가입도 자기 자신을 가리키는 줄을 남깁니다. 그래야 앞으로는 이 표 하나만
      // 보면 되고, `users/{소셜uid}` 존재 여부에 기대는 분기가 늘어나지 않습니다.
      if (firstTime) {
        await identitiesRepo.link(db, {
          key: profile.uid,
          provider: profile.provider,
          uid: targetUid,
        });
      }
    } catch (e) {
      console.error('[api] 사용자 문서 저장 실패', e);
    }
  } catch (e) {
    if (e instanceof HttpError) throw e;
    // 제공자 응답을 그대로 노출하면 키·내부 정보가 새어나갈 수 있어 로그만 남깁니다
    console.error('[api] 소셜 로그인 실패', provider, e);
    throw new HttpError({
      code: 'unauthorized',
      message: '로그인에 실패했습니다. 다시 시도해주세요',
    });
  }

  return c.json(ok(result));
});

/**
 * 중복 가입 차단 — 같은 이메일의 계정이 이미 있으면 **기존 수단으로 로그인하도록 안내**합니다.
 *
 * 🔴 **자동으로 병합하지 않습니다.** 남의 이메일로 새 수단을 붙여 그 계정에 올라타는
 *    탈취 경로가 되기 때문입니다. 실제 계정 연결은 *기존 계정으로 로그인한 상태에서*
 *    계정 설정 화면을 통해서만 이루어져야 합니다.
 *
 * **호출부가 신규 uid 일 때만 부릅니다.** 재방문자·연결된 수단은 이 검사를 지나지 않습니다
 * (`POST /api/auth/:provider` 에서 identities · users 를 먼저 봅니다).
 *
 * ⚠️ **적용 범위는 카카오·네이버뿐입니다.** 구글·이메일 로그인은 클라이언트가 Firebase 로
 *    직접 인증해 이 라우트를 지나지 않습니다. 그쪽은 Firebase 콘솔의
 *    **"이메일 주소당 계정 하나"(One account per email address)** 설정으로 막아야 합니다.
 *
 * ⚠️ 알려진 한계: 공격자가 피해자의 이메일로 먼저 계정을 만들어 두면, 피해자의 소셜
 *    로그인이 이 검사에 막힙니다(계정 탈취는 아니고 가입 방해). 복구 경로는 문의 창구이며,
 *    안내 문구에 그 주소를 함께 노출합니다.
 */
async function assertNoExistingAccount(
  db: Firestore,
  profile: { uid: string; email: string | null },
): Promise<void> {
  if (!profile.email) return; // 매칭할 키가 없으면 판단하지 않습니다

  const existing = await usersRepo.findByEmail(db, profile.email, profile.uid);
  if (!existing) return;

  const hint: ExistingAccountHint = {
    maskedEmail: maskEmail(profile.email),
    providers: existing.providers,
  };
  throw new HttpError({
    code: 'account_exists',
    message:
      `${hint.maskedEmail} 로 이미 가입된 계정이 있습니다. ` +
      `${describeProviders(existing.providers)}(으)로 로그인해 주세요. ` +
      '본인 계정이 아니라면 help@luv-ai.co.kr 로 문의해 주세요',
    fields: [{ path: 'email', message: JSON.stringify(hint) }],
  });
}

const PROVIDER_LABELS: Record<string, string> = {
  kakao: '카카오',
  naver: '네이버',
  'google.com': '구글',
  password: '이메일',
};

function describeProviders(providers: string[]): string {
  const labels = providers.map((p) => PROVIDER_LABELS[p] ?? p);
  return labels.length > 0 ? labels.join('·') : '기존 로그인 수단';
}

// `maskEmail` 은 `@luvi/schema` 로 옮겼습니다 — 문의 스레드도 같은 규칙으로 가려야 하고,
// 가리는 규칙이 화면마다 다르면 어느 쪽이 안전한지 판단할 수 없게 됩니다.

// ─────────────────────────── 계정 · 동의 ───────────────────────────

/**
 * 재동의 게이트 — **편집·발행을 막고, 열람은 막지 않습니다.**
 *
 * 🔴 이미 발행된 청첩장의 하객 경로(`/api/public/i/:slug`)에는 **절대 걸지 마세요.**
 *    소유자가 약관에 재동의하지 않았다는 이유로 하객이 청첩장을 못 보게 되면, 예식을
 *    앞둔 사람에게는 서비스 장애와 같습니다. 막을 것은 *새로 쓰는 행위*뿐입니다.
 *
 * 비용: 문서 읽기 1회가 늘어납니다. 자동저장(PATCH)마다 발생하지만 현재 규모에서는
 * 무시할 수준이고, 토큰 클레임에 넣어 아끼는 방식은 **권한 부여 지점이 커스텀 토큰을
 * 만드는 우리 코드가 되어버려** `repo/users.ts` 의 `role` 과 같은 이유로 쓰지 않습니다.
 */
async function requireConsent(env: Env, db: Firestore, uid: string): Promise<void> {
  /**
   * 🔴 **동의 화면이 배포되기 전까지 이 게이트는 꺼져 있어야 합니다.**
   *
   * 게이트만 먼저 올리면 기존 회원 전원이 `consentVersions` 가 없어 403 을 받는데,
   * 동의할 화면이 없으니 **빠져나올 방법이 없습니다.** 청첩장을 고칠 수도 발행할 수도
   * 없게 되고, 예식을 앞둔 사람에게는 그대로 서비스 장애입니다.
   *
   * 그래서 기본값이 꺼짐입니다. **3단계(동의 화면·재동의 모달)가 배포된 뒤**
   * `wrangler.toml` 의 `CONSENT_ENFORCED` 를 `"true"` 로 바꾸고 재배포하세요.
   * 그 전까지 동의 기록(`POST /api/consents`)은 정상 동작하므로, 화면이 올라오면
   * 신규 가입자부터 자연스럽게 채워집니다.
   */
  if (env.CONSENT_ENFORCED !== 'true') return;

  const status = toConsentStatus(await usersRepo.readConsentVersions(db, uid));
  if (status.satisfied) return;

  throw new HttpError({
    code: 'consent_required',
    message: '개정된 약관에 동의하면 계속 이용하실 수 있습니다',
    fields: status.missing.map((docType) => ({ path: docType, message: '동의가 필요합니다' })),
  });
}

app.get('/api/consents', async (c) => {
  const uid = requireUid(c);
  return c.json(ok<ConsentRecord[]>(await consentsRepo.listConsents(firestore(c.env), uid)));
});

/**
 * 동의 기록. 신규 가입·재동의·설정 변경이 모두 여기를 지납니다.
 *
 * 철회(선택 항목)도 같은 경로로 들어오고, 기존 레코드를 고치지 않고 **새 레코드**로 남습니다.
 */
app.post('/api/consents', async (c) => {
  const uid = requireUid(c);
  const body = await readJson<SubmitConsentsBody>(c.req);

  const method = body.method;
  if (method !== 'signup' && method !== 'reconsent' && method !== 'settings') {
    throw new HttpError({ code: 'validation_failed', message: '잘못된 동의 경로입니다' });
  }

  const items = Array.isArray(body.items) ? body.items : [];
  if (items.length === 0) {
    throw new HttpError({ code: 'validation_failed', message: '동의 항목이 없습니다' });
  }

  const known = new Set(Object.keys(DOC_VERSIONS));
  for (const item of items) {
    if (!item || !known.has(item.docType) || typeof item.agreed !== 'boolean') {
      throw new HttpError({ code: 'validation_failed', message: '알 수 없는 동의 항목입니다' });
    }
    // 필수 항목을 체크 해제한 채로 보내는 건 화면 버그이거나 우회 시도입니다.
    // 통과시키면 "동의하지 않은 회원" 이 생깁니다 (repo/consents.ts 주석 참고).
    if (!item.agreed && isRequiredConsent(item.docType)) {
      throw new HttpError({
        code: 'validation_failed',
        message: '필수 항목은 동의해야 서비스를 이용하실 수 있습니다',
        fields: [{ path: item.docType, message: '필수 항목입니다' }],
      });
    }
  }

  const db = firestore(c.env);
  const records = await consentsRepo.recordConsents(db, {
    uid,
    items,
    method,
    ipHash: await hashIp(c.env.APP_SECRET, clientIp(c)).catch(() => null),
    userAgent: (c.req.header('User-Agent') ?? '').slice(0, 300) || null,
  });

  await audit(c, {
    name: 'consent_record',
    detail: `method=${method} ${records.map((r) => `${r.docType}=${r.agreed ? 'Y' : 'N'}@${r.docVersion}`).join(' ')}`,
  });

  return c.json(ok<ConsentRecord[]>(records), 201);
});

/**
 * 계정 정보 + 연결된 로그인 수단.
 *
 * 둘이 다른 곳(`users` · `identities`)에 있어 여기서 합칩니다. 사용자 문서 저장소가
 * 로그인 수단 표까지 알 필요는 없어서 `readAccount` 는 일부러 모릅니다.
 */
async function accountProfile(db: Firestore, uid: string): Promise<AccountProfile> {
  const [profile, links] = await Promise.all([
    usersRepo.readAccount(db, uid),
    identitiesRepo.listByUid(db, uid),
  ]);
  if (!profile) {
    throw new HttpError({ code: 'not_found', message: '계정 정보를 찾을 수 없습니다' });
  }

  const linkedProviders: LinkedIdentity[] = links
    .filter((l) => isSocialProvider(l.provider))
    .map((l) => ({ provider: l.provider as SocialProvider, linkedAt: l.linkedAt }))
    .sort((a, b) => a.provider.localeCompare(b.provider));

  return { ...profile, linkedProviders };
}

const isSocialProvider = (v: string): v is SocialProvider => v === 'kakao' || v === 'naver';

/** 소셜 라우트 셋이 같은 자격 증명을 씁니다 */
const socialCredentials = (env: Env) => ({
  kakaoRestKey: env.KAKAO_REST_KEY,
  kakaoClientSecret: env.KAKAO_CLIENT_SECRET,
  naverClientId: env.NAVER_CLIENT_ID,
  naverClientSecret: env.NAVER_CLIENT_SECRET,
});

function requireSocialProvider(raw: string | undefined): SocialProvider {
  if (raw === 'kakao' || raw === 'naver') return raw;
  throw new HttpError({ code: 'not_found', message: '지원하지 않는 로그인 방식입니다' });
}

app.get('/api/account', async (c) => {
  const uid = requireUid(c);
  return c.json(ok<AccountProfile>(await accountProfile(firestore(c.env), uid)));
});

app.patch('/api/account', async (c) => {
  const uid = requireUid(c);
  const body = await readJson<UpdateAccountBody>(c.req);

  const patch: { displayName?: string; clearPhoto?: boolean } = {};

  if (body.displayName !== undefined) {
    const name = trimmed(body.displayName, 40);
    if (!name) {
      throw new HttpError({
        code: 'validation_failed',
        message: '표시 이름을 입력해주세요',
        fields: [{ path: 'displayName', message: '비워둘 수 없습니다' }],
      });
    }
    patch.displayName = name;
  }
  if (body.clearPhoto === true) patch.clearPhoto = true;

  const db = firestore(c.env);
  await usersRepo.updateAccount(db, uid, patch);

  return c.json(ok<AccountProfile>(await accountProfile(db, uid)));
});

// ─────────────────────── 로그인 수단 연결 · 해제 ───────────────────────

/**
 * 이 계정에 소셜 로그인 수단을 붙입니다.
 *
 * 🔴 **로그인한 상태에서만 가능합니다. 그게 이 설계의 전부입니다.**
 *    "이메일이 같으면 합쳐주기" 는 남의 이메일로 소셜 계정을 만들어 그 계정에 올라타는
 *    경로가 됩니다. 본인 계정에 이미 들어와 있는 사람만 붙일 수 있게 하면 그 구멍이 없습니다.
 *
 * 예전에 같은 소셜로 **따로 가입한 계정**이 있으면 비어 있을 때만 흡수합니다. 청첩장이
 * 하나라도 있으면 거절합니다 — 합치는 과정에서 남의 청첩장을 조용히 지울 수는 없습니다.
 */
app.post('/api/account/link/:provider', async (c) => {
  const uid = requireUid(c);
  const provider = requireSocialProvider(c.req.param('provider'));
  const { code, redirectUri, state } = await readJson<LinkAccountBody>(c.req);
  if (!code || !redirectUri) {
    throw new HttpError({ code: 'validation_failed', message: '인가 정보가 없습니다' });
  }

  const db = firestore(c.env);

  let profile;
  try {
    profile = await resolveSocialProfile({
      provider,
      code,
      redirectUri,
      state,
      credentials: socialCredentials(c.env),
    });
  } catch (e) {
    console.error('[api] 연결용 소셜 인증 실패', provider, e);
    throw new HttpError({ code: 'unauthorized', message: '연결에 실패했습니다. 다시 시도해주세요' });
  }

  const key = profile.uid; // 'kakao:12345'
  const label = PROVIDER_LABELS[provider] ?? provider;

  const existing = await identitiesRepo.findByKey(db, key);
  if (existing) {
    // 이미 내 계정에 붙어 있으면 성공으로 봅니다 (같은 요청을 두 번 보내도 안전해야 합니다)
    if (existing.uid === uid) {
      return c.json(ok<LinkAccountResult>({
        linkedProviders: (await accountProfile(db, uid)).linkedProviders,
        absorbedUid: null,
      }));
    }
    throw new HttpError({
      code: 'link_conflict',
      message:
        `이 ${label} 계정은 이미 다른 러비 계정에 연결되어 있습니다. ` +
        '본인 계정이 아니라면 help@luv-ai.co.kr 로 문의해 주세요',
    });
  }

  // 예전에 이 소셜로 따로 가입한 계정이 있는지 (연결 기능 이전 가입자)
  let absorbedUid: string | null = null;
  if (key !== uid && (await db.get(`users/${key}`))) {
    const owned = await invitationsRepo.listByOwner(db, key);
    if (owned.length > 0) {
      throw new HttpError({
        code: 'link_conflict',
        message:
          `이 ${label} 계정으로 만든 청첩장이 ${owned.length}개 있습니다. ` +
          `${label}(으)로 로그인해 청첩장을 정리한 뒤 다시 연결해 주세요`,
      });
    }
    absorbedUid = key;
  }

  // 🔴 순서: 연결을 **먼저** 씁니다. 예전 계정을 먼저 지우면 연결 쓰기가 실패했을 때
  //    그 소셜로는 어디로도 들어갈 수 없게 됩니다. 반대로 두면 최악의 경우 빈 계정이
  //    남을 뿐이고 로그인은 이미 본계정으로 이어집니다.
  try {
    await identitiesRepo.link(db, { key, provider, uid });
  } catch (e) {
    // exists:false 전제 위반 = 그 사이 누군가 같은 수단을 연결했습니다
    if (isPreconditionFailure(e)) {
      throw new HttpError({
        code: 'link_conflict',
        message: `이 ${label} 계정은 방금 다른 계정에 연결되었습니다`,
      });
    }
    throw e;
  }

  if (absorbedUid) {
    await consentsRepo.deleteAllForUser(db, absorbedUid);
    await usersRepo.deleteUser(db, absorbedUid);
    await deleteAuthAccount(serviceAccount(c.env), c.env.FIREBASE_PROJECT_ID, absorbedUid);
  }

  await usersRepo.upsertUser(db, {
    uid,
    email: null,
    displayName: null,
    photoURL: null,
    provider,
    // 연결했다고 본계정 이름·사진을 소셜 것으로 바꾸지 않습니다
    preserveProfile: true,
  });

  await audit(c, {
    name: 'account_link',
    detail: `provider=${provider}${absorbedUid ? ` absorbed=${absorbedUid}` : ''}`,
  });

  return c.json(ok<LinkAccountResult>({
    linkedProviders: (await accountProfile(db, uid)).linkedProviders,
    absorbedUid,
  }));
});

/**
 * 연결을 끊습니다.
 *
 * 🔴 **마지막 로그인 수단은 끊지 못합니다.** 끊는 순간 아무 방법으로도 들어올 수 없는
 *    계정이 되고, 그 안의 청첩장까지 같이 잠깁니다. 구글·이메일은 Firebase 가 직접
 *    인증하므로 그 수단이 있으면 소셜을 전부 끊어도 안전합니다.
 */
app.delete('/api/account/link/:provider', async (c) => {
  const uid = requireUid(c);
  const provider = requireSocialProvider(c.req.param('provider'));
  const db = firestore(c.env);

  const links = await identitiesRepo.listByUid(db, uid);
  const targets = links.filter((l) => l.provider === provider);
  if (targets.length === 0) {
    throw new HttpError({ code: 'not_found', message: '연결되지 않은 로그인 수단입니다' });
  }

  const profile = await usersRepo.readAccount(db, uid);
  const hasNative = (profile?.providers ?? []).some((p) => p === 'google.com' || p === 'password');
  if (!hasNative && links.length - targets.length === 0) {
    throw new HttpError({
      code: 'validation_failed',
      message:
        '마지막 남은 로그인 수단이라 해제할 수 없습니다. ' +
        '다른 수단을 먼저 연결한 뒤에 해제해 주세요',
    });
  }

  for (const t of targets) await identitiesRepo.unlink(db, t.key);
  await usersRepo.removeProvider(db, uid, provider);

  await audit(c, { name: 'account_unlink', detail: `provider=${provider}` });

  return c.json(ok<LinkAccountResult>({
    linkedProviders: (await accountProfile(db, uid)).linkedProviders,
    absorbedUid: null,
  }));
});

/**
 * 회원 탈퇴 — **되돌릴 수 없습니다.**
 *
 * ─── 순서가 중요한 이유 ────────────────────────────────────────
 *
 * Auth 계정을 **맨 마지막에** 지웁니다. 먼저 지우면 중간에 실패했을 때 남은 데이터에
 * 접근할 주체가 사라져 고아 데이터를 치울 방법이 없어집니다. 반대로 마지막에 두면
 * 실패해도 그 사람은 아직 로그인할 수 있으므로 **다시 호출해 이어붙일 수 있습니다.**
 *
 * 그래서 각 단계는 "이미 없으면 성공" 이어야 합니다(멱등). 청첩장 루프는 남은 것만
 * 다시 가져오고, `deleteUser` 는 없는 문서를 지워도 통과하며, `deleteAuthAccount` 는
 * `USER_NOT_FOUND` 를 성공으로 처리합니다.
 *
 * 청첩장 한 건의 삭제 순서(KV → R2 → Firestore)는 `DELETE /api/invitations/:id` 와
 * 같습니다 — 하객 화면을 가장 먼저 내려 유령 청첩장이 서빙되는 구간을 없앱니다.
 */
app.delete('/api/account', async (c) => {
  const uid = requireUid(c);
  const db = firestore(c.env);

  let deletedInvitations = 0;

  // listByOwner 에 상한(50)이 있어 한 번으로는 다 못 가져올 수 있습니다.
  // 지운 만큼 다음 조회에서 빠지므로, 빌 때까지 돌면 됩니다.
  for (;;) {
    const batch = await invitationsRepo.listByOwner(db, uid);
    if (batch.length === 0) break;

    for (const inv of batch) {
      await removeSnapshot(c.env.LUVI_KV, inv.id, inv.slug || null, inv.pinnedHost);
      await deleteAssets(c.env.LUVI_ASSETS, `inv/${inv.id}/`);
      await invitationsRepo.deleteInvitation(db, inv);
      deletedInvitations += 1;
    }
  }

  const deletedConsents = await consentsRepo.deleteAllForUser(db, uid);
  // 연결해 둔 로그인 수단도 지웁니다. 남겨두면 그 소셜로 로그인했을 때 사라진 계정을
  // 가리키는 줄을 따라가 빈 화면이 뜹니다.
  const deletedIdentities = await identitiesRepo.deleteAllForUser(db, uid);
  await usersRepo.deleteUser(db, uid);

  // 감사 로그는 Auth 계정을 지우기 **전에** 남깁니다 — 뒤에 두면 계정 삭제가
  // 성공하고 로그만 실패했을 때 탈퇴 사실이 어디에도 남지 않습니다.
  await audit(c, {
    name: 'account_delete',
    detail: `invitations=${deletedInvitations} consents=${deletedConsents} identities=${deletedIdentities}`,
  });

  await deleteAuthAccount(serviceAccount(c.env), c.env.FIREBASE_PROJECT_ID, uid);

  return c.json(ok<DeleteAccountResult>({ deletedInvitations }));
});

// ─────────────────────────── 예약 · 문의 ───────────────────────────

function trimmed(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

/**
 * 고객에게 돌려줄 스레드로 바꿉니다.
 *
 * 🔴 `adminNote · ipHash · userAgent · accessTokenHash` 는 **필드 자체를 만들지 않습니다.**
 *    "화면에서 숨긴다" 가 아니라 "내려보내지 않는다" 입니다. 연락처는 가려서 보냅니다 —
 *    링크를 주운 사람에게 본인 확인용 정보를 그대로 보여줄 이유가 없습니다.
 */
async function toThread(db: Firestore, inquiry: inquiriesRepo.StoredInquiry): Promise<InquiryThread> {
  return {
    id: inquiry.id,
    number: inquiry.number,
    status: inquiry.status,
    category: inquiry.category,
    subject: inquiry.subject,
    name: inquiry.name,
    emailMasked: maskEmail(inquiry.email),
    phoneMasked: maskPhone(inquiry.phone),
    createdAt: inquiry.createdAt,
    messages: await inquiriesRepo.listMessages(db, inquiry.id),
  };
}

/** 목록용 — 메시지를 읽지 않습니다 */
function toThreadSummary(inquiry: inquiriesRepo.StoredInquiry): Omit<InquiryThread, 'messages'> {
  return {
    id: inquiry.id,
    number: inquiry.number,
    status: inquiry.status,
    category: inquiry.category,
    subject: inquiry.subject,
    name: inquiry.name,
    emailMasked: maskEmail(inquiry.email),
    phoneMasked: maskPhone(inquiry.phone),
    createdAt: inquiry.createdAt,
  };
}

/**
 * 문의 접수. **비로그인도 보냅니다.**
 *
 * 스팸을 네 겹으로 막습니다: 허니팟 → Turnstile → D1 속도 제한 → Cloudflare 규칙.
 * 앞의 셋이 여기 있고, 넷째는 대시보드 설정입니다.
 *
 * 🔴 **메일 발송을 기다리지 않습니다.** Resend 가 죽어도 접수는 성공해야 합니다 —
 *    문의는 이미 Firestore 에 있고 메일은 알림일 뿐입니다.
 */
app.post('/api/inquiries', async (c) => {
  const body = await readJson<CreateInquiryBody>(c.req);
  const uid = c.get('uid');
  const ip = clientIp(c);
  const ipHash = await hashIp(c.env.APP_SECRET, ip).catch(() => '');

  // ① 허니팟 — 사람에게 보이지 않는 칸입니다. 차 있으면 봇입니다.
  //    조용히 성공한 척합니다. 실패를 알려주면 봇이 우회를 학습합니다.
  if (trimmed(body.company, 100)) {
    console.warn('[api] 문의 허니팟에 걸렸습니다');
    return c.json(ok({ id: 'spam', number: 'L-000000-0000', token: '', uploadToken: '' }), 201);
  }

  const category = (INQUIRY_CATEGORIES.find((x) => x.value === body.category)?.value ??
    'etc') as InquiryCategory;
  const message = trimmed(body.message, INQUIRY_LIMITS.message);
  if (!message) {
    throw new HttpError({ code: 'validation_failed', message: '문의 내용을 입력해주세요' });
  }

  // 회원은 계정 값으로 채웁니다 — 화면이 보낸 이름·이메일을 믿지 않습니다.
  let name = trimmed(body.name, INQUIRY_LIMITS.name);
  let email = trimmed(body.email, INQUIRY_LIMITS.email);

  if (uid) {
    const profile = await usersRepo.readAccount(firestore(c.env), uid);
    name = profile?.displayName || name || '회원';
    email = profile?.email || email;
  } else {
    // ② 비회원은 이메일이 유일한 답변 도달 경로입니다 (방침 1.1.0 제2조 ⑤).
    if (!name) {
      throw new HttpError({ code: 'validation_failed', message: '이름을 입력해주세요' });
    }
    if (!email || !email.includes('@')) {
      throw new HttpError({
        code: 'validation_failed',
        message: '답변을 받을 이메일 주소를 정확히 입력해주세요',
      });
    }
    if (body.privacyAgreed !== true) {
      throw new HttpError({
        code: 'validation_failed',
        message: '개인정보 수집·이용에 동의해주세요',
      });
    }
    if (!(await verifyTurnstile(c.env, body.turnstileToken, ip))) {
      throw new HttpError({
        code: 'validation_failed',
        message: '자동 입력 방지 확인에 실패했습니다. 새로고침 후 다시 시도해주세요',
      });
    }
  }

  // ③ 속도 제한 — 10분에 3건까지. 진짜 고객이 연달아 3건을 쓰는 일은 드뭅니다.
  const recent = await eventsRepo.countRecent(c.env.LUVI_LOGS, {
    name: 'inquiry_submit',
    ipHash,
    withinMinutes: 10,
  });
  if (recent >= 3) {
    throw new HttpError({
      code: 'rate_limited',
      message: '문의가 너무 잦습니다. 잠시 후 다시 시도해주세요',
    });
  }

  const token = randomAccessToken();

  /**
   * 🔴 자동수집 맥락은 **방침 1.1.0 이 시행 중일 때만** 저장합니다.
   *    화면에서 숨기는 것만으로는 부족합니다 — 요청을 직접 보내면 그대로 들어옵니다.
   *    보내온 값을 여기서 버립니다 (`INQUIRY_EXTRAS_ENABLED` 주석 참고).
   */
  const context: InquiryContext = INQUIRY_EXTRAS_ENABLED
    ? {
        entry: (body.context?.entry ?? 'support') as InquiryContext['entry'],
        path: trimmed(body.context?.path, 200),
        invitationId: trimmed(body.context?.invitationId, 60),
        slug: trimmed(body.context?.slug, 60),
        sessionId: trimmed(body.context?.sessionId, 60),
      }
    : { entry: 'support', path: '', invitationId: '', slug: '', sessionId: '' };

  const number = inquiriesRepo.makeNumber();
  const id = await inquiriesRepo.createInquiry(firestore(c.env), {
    number,
    category,
    subject: deriveSubject(message),
    message,
    name,
    email,
    /**
     * 🔴 문의에서는 전화번호를 받지 않습니다. 보내와도 버립니다.
     *
     * 비회원은 이메일로, 회원은 서비스 안에서 답변을 받으므로 두 경로 모두 전화번호가
     * 필요 없습니다. **쓰지 않을 개인정보를 "선택" 이라는 이름으로 받아두지 않습니다.**
     * 화면에서 칸을 지우는 것만으로는 부족합니다 — 요청을 직접 보내는 경로가 남습니다.
     *
     * (`POST /api/bookings` 는 그대로 받습니다. 그쪽은 상담 예약이라 통화가 목적입니다)
     */
    phone: '',
    uid,
    weddingDate: trimmed(body.weddingDate, 30),
    services: trimmed(body.services, 200),
    context,
    accessTokenHash: await hashAccessToken(token),
    tokenExpiresAt: new Date(
      Date.now() + inquiriesRepo.TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString(),
    ipHash,
    // 브라우저 정보도 1.1.0 에서 추가한 항목입니다
    userAgent: INQUIRY_EXTRAS_ENABLED ? (c.req.header('User-Agent') ?? '').slice(0, 200) : '',
  });

  // 접수 자체를 이벤트로 남깁니다 — 속도 제한이 이 기록을 셉니다(추가 쓰기 없음).
  await audit(c, { name: 'inquiry_submit', detail: `${number} ${category} ${uid ? 'member' : 'guest'}` });

  const categoryLabel = inquiryCategoryLabel(category);
  const mailInput = { number, category: categoryLabel, name, message, token };

  // 🔴 기다리지 않습니다. 메일 실패가 접수 실패가 되면 안 됩니다.
  c.executionCtx.waitUntil(
    (async () => {
      if (email) {
        await sendMail(c.env, { ...receiptMail(c.env, mailInput), to: email });
      }
      await sendMail(
        c.env,
        adminAlertMail(c.env, {
          ...mailInput,
          id,
          email,
          // 문의에서는 전화번호를 받지 않습니다 (위 `phone: ''` 주석 참고)
          phone: '',
          entry: context.entry,
          invitationId: context.invitationId || null,
          sessionId: context.sessionId || null,
        }),
      );
    })(),
  );

  const uploadToken = await signInquiryUpload(c.env.APP_SECRET, id).catch(() => '');

  return c.json(ok<CreateInquiryResult>({ id, number, token, uploadToken }), 201);
});

/**
 * 문의 첨부 업로드. **글이 먼저, 사진이 뒤입니다.**
 *
 * 먼저 올리고 나중에 제출하면 고아 파일이 R2 에 남습니다. 티켓을 먼저 만들면
 * 업로드가 실패해도 문의 본문은 살아 있습니다.
 *
 * 🔴 SVG·HTML 은 허용하지 않습니다 — 우리 도메인에서 서빙되면 그 안의 `<script>` 가
 *    우리 오리진 권한으로 실행됩니다 (저장형 XSS). `lib/assets.ts` 와 같은 원칙입니다.
 */
app.put('/api/inquiries/:id/attachments', async (c) => {
  // 🔴 방침 1.1.0 시행 전에는 첨부를 받지 않습니다. 수집 항목에 없는 것을 받으면
  //    고지 없이 수집한 상태가 됩니다.
  if (!INQUIRY_EXTRAS_ENABLED) {
    throw new HttpError({
      code: 'validation_failed',
      message: '사진 첨부는 2026년 9월 23일부터 이용하실 수 있습니다',
    });
  }

  const id = c.req.param('id');
  const index = Number(c.req.query('index') ?? '0');
  const token = c.req.query('token') ?? '';
  const contentType = c.req.header('Content-Type') ?? '';
  const size = Number(c.req.header('Content-Length') ?? '0');

  if (!Number.isInteger(index) || index < 0 || index >= INQUIRY_LIMITS.attachments) {
    throw new HttpError({ code: 'validation_failed', message: '첨부 위치가 올바르지 않습니다' });
  }
  if (!(INQUIRY_ATTACHMENT_TYPES as readonly string[]).includes(contentType)) {
    throw new HttpError({
      code: 'validation_failed',
      message: 'JPG · PNG · WEBP 이미지만 첨부할 수 있습니다',
    });
  }
  if (!size || size > INQUIRY_LIMITS.attachmentBytes) {
    throw new HttpError({ code: 'validation_failed', message: '이미지 한 장은 5MB 까지입니다' });
  }

  // 토큰은 티켓·위치·타입·크기에 묶여 있습니다 — 하나라도 다르면 통과하지 못합니다.
  if (!(await verifyInquiryUpload(c.env.APP_SECRET, token, id))) {
    throw new HttpError({ code: 'forbidden', message: '업로드 권한이 없거나 만료됐습니다' });
  }

  const db = firestore(c.env);
  const inquiry = await inquiriesRepo.findInquiry(db, id);
  if (!inquiry) throw new HttpError({ code: 'not_found', message: '없는 문의입니다' });

  const ext = contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : 'jpg';
  const key = `inquiries/${id}/${index}-${crypto.randomUUID().slice(0, 8)}.${ext}`;

  await c.env.LUVI_ASSETS.put(key, c.req.raw.body, {
    httpMetadata: { contentType },
  });

  const next = [...inquiry.attachments];
  next[index] = { name: key, size, contentType };
  await inquiriesRepo.setAttachments(db, id, next.filter(Boolean));

  return c.json(ok({ index }), 201);
});

/**
 * 첨부 내려받기 — **권한을 확인한 뒤** 스트리밍합니다.
 *
 * 🔴 공개 에셋 경로(`/api/assets/*`)를 재사용하지 않는 이유: 문의 첨부에는 스크린샷 속
 *    이름·연락처·청첩장 내용 같은 개인정보가 섞입니다. 추측 불가능한 키에 기대는 방식은
 *    개인정보에 쓰지 않습니다.
 */
app.get('/api/inquiries/:id/attachments/:index', async (c) => {
  const id = c.req.param('id');
  const index = Number(c.req.param('index'));
  const token = c.req.query('token') ?? '';

  const db = firestore(c.env);
  const inquiry = await inquiriesRepo.findInquiry(db, id);
  if (!inquiry) throw new HttpError({ code: 'not_found', message: '없는 문의입니다' });

  const uid = c.get('uid');
  // 토큰은 해시로만 대조합니다 (원문을 저장하지 않으므로). 이 티켓의 토큰이 맞는지까지 봅니다 —
  // 남의 티켓 토큰으로 이 티켓의 첨부를 여는 일이 없어야 합니다.
  const byToken = token
    ? (await inquiriesRepo.findByTokenHash(db, await hashAccessToken(token)))?.id === id
    : false;
  const byOwner = Boolean(uid && inquiry.uid === uid);
  const byAdmin = Boolean(uid && (await usersRepo.isAdmin(db, uid)));
  if (!byToken && !byOwner && !byAdmin) {
    throw new HttpError({ code: 'forbidden', message: '이 첨부를 볼 권한이 없습니다' });
  }

  const attachment = inquiry.attachments[index];
  if (!attachment) throw new HttpError({ code: 'not_found', message: '없는 첨부입니다' });

  const object = await c.env.LUVI_ASSETS.get(attachment.name);
  if (!object) throw new HttpError({ code: 'not_found', message: '파일을 찾을 수 없습니다' });

  return new Response(object.body, {
    headers: {
      'Content-Type': attachment.contentType,
      // 🔴 개인정보이므로 캐시하지 않습니다. 공유 캐시에 남으면 권한 검사가 무의미해집니다.
      'Cache-Control': 'private, no-store',
    },
  });
});

/**
 * 조회 링크로 스레드 보기 (비회원).
 *
 * ⚠️ 이 라우트는 `/api/inquiries/:id/...` 보다 **먼저** 선언해야 합니다 —
 *    뒤에 두면 `t` 가 `:id` 로 먹힙니다 (`/api/admin/invitations` 에서 같은 함정을 겪었습니다).
 */
app.get('/api/inquiries/t/:token', async (c) => {
  const db = firestore(c.env);
  const inquiry = await inquiriesRepo.findByTokenHash(
    db,
    await hashAccessToken(c.req.param('token')),
  );
  if (!inquiry) {
    throw new HttpError({ code: 'not_found', message: '문의를 찾을 수 없습니다' });
  }
  return c.json(ok(await toThread(db, inquiry)));
});

/** 내 문의 (회원) */
app.get('/api/inquiries/mine', async (c) => {
  const uid = requireUid(c);
  const db = firestore(c.env);
  const items = await inquiriesRepo.listForUser(db, uid);
  return c.json(ok(items.map(toThreadSummary)));
});

app.get('/api/admin/inquiries', async (c) => {
  const uid = requireUid(c);
  const db = firestore(c.env);
  if (!(await usersRepo.isAdmin(db, uid))) {
    throw new HttpError({ code: 'forbidden', message: '운영자만 볼 수 있습니다' });
  }

  const status = c.req.query('status') as InquiryStatus | undefined;
  const items = await inquiriesRepo.listForAdmin(db, {
    ...(status && ['new', 'open', 'answered', 'closed'].includes(status) ? { status } : {}),
  });

  const counts: Record<InquiryStatus, number> = { new: 0, open: 0, answered: 0, closed: 0 };
  // 필터를 걸었을 때도 배지가 맞아야 하므로 전체를 한 번 더 훑습니다.
  // 건수가 적어(수백) 비용이 문제되지 않습니다.
  for (const row of status ? await inquiriesRepo.listForAdmin(db, {}) : items) {
    counts[row.status] += 1;
  }

  return c.json(ok<AdminInquiryList>({ items, counts }));
});

app.post('/api/bookings', async (c) => {
  const body = await readJson<Record<string, unknown>>(c.req);
  const name = trimmed(body.name, 40);
  const phone = trimmed(body.phone, 30);

  if (!name || !phone) {
    throw new HttpError({ code: 'validation_failed', message: '이름과 연락처를 입력해주세요' });
  }

  const id = await createFormEntry(
    firestore(c.env),
    'bookings',
    {
      name,
      phone,
      email: trimmed(body.email, 120),
      weddingDate: trimmed(body.weddingDate, 30),
      services: trimmed(body.services, 200),
      preferred: trimmed(body.preferred, 100),
      message: trimmed(body.message, 2000),
    },
    await hashIp(c.env.APP_SECRET, clientIp(c)),
  );
  return c.json(ok({ id }), 201);
});

// ─────────────────────────── 뷰어 (공개) ───────────────────────────

/**
 * 발행본 조회.
 *
 * KV 스냅샷을 먼저 봅니다 — **하객 페이지뷰당 Firestore 읽기가 0회**여야 합니다.
 * 스냅샷이 없을 때만 Firestore 로 내려갑니다 (발행 직후 전파 지연·개발 환경).
 */
app.get('/api/public/i/:slug', async (c) => {
  const slug = c.req.param('slug').toLowerCase();

  const snapshot = await readSnapshot(c.env.LUVI_KV, slug);
  if (snapshot) return c.json(ok<PublicInvitation>(snapshot));

  const db = firestore(c.env);
  const invitation = await invitationsRepo.findBySlug(db, slug);

  // 없는 슬러그에 샘플을 돌려주면 배포가 깨졌는데도 정상처럼 보입니다
  if (!invitation?.published) {
    throw new HttpError({ code: 'not_found', message: '청첩장을 찾을 수 없습니다' });
  }

  return c.json(
    ok<PublicInvitation>({
      slug: invitation.slug,
      invitationId: invitation.id,
      themeId: invitation.themeId,
      sections: invitation.sections,
      features: invitation.features,
      content: invitation.published,
      cdnBase: c.env.CDN_BASE,
    }),
  );
});

/** 기존에 공유된 URL(핀 걸린 호스트)로 들어온 요청을 슬러그로 바꿔줍니다 */
app.get('/api/public/host/:hostname', async (c) => {
  const slug = await readHostSlug(c.env.LUVI_KV, c.req.param('hostname'));
  if (!slug) throw new HttpError({ code: 'not_found', message: '연결된 청첩장이 없습니다' });
  return c.json(ok({ slug }));
});

/**
 * 매일 03:17 UTC (한국 12:17) — 보관 기간(14일)이 지난 이벤트 로그를 지웁니다.
 *
 * 로그를 영구 보관하면 언젠가 개인정보 문제가 되고 용량도 계속 늡니다. 지우는 일을
 * 사람 손에 맡기면 안 지워집니다 — Cron 이 하게 둡니다. (`wrangler.toml` 의 [triggers])
 */
async function scheduled(_event: ScheduledController, env: Env): Promise<void> {
  await eventsRepo.purgeOld(env.LUVI_LOGS);
}

export default { fetch: app.fetch, scheduled };
