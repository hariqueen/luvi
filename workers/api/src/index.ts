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
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type {
  ApiError,
  ClaimPreview,
  CreateInvitationBody,
  DraftDiff,
  GuestbookEntry,
  Invitation,
  InvitationSummary,
  PublicInvitation,
  PublishResult,
  RankEntry,
  SignUploadResult,
  SlugAvailability,
  SocialAuthBody,
  SocialAuthResult,
  UpdateDraftBody,
} from '@luvi/schema';

import { createCustomToken } from './lib/customToken';
import { resolveSocialProfile } from './lib/social';
import { verifyIdToken } from './lib/idToken';
import { Firestore, fsTimestamp, isPreconditionFailure } from './lib/firestore';
import { computeDiff } from './lib/diff';
import { PatchError, prepareDraftPatch } from './lib/patch';
import {
  readHostSlug,
  readSnapshot,
  removeSnapshot,
  writeSnapshot,
} from './lib/snapshot';
import { hashIp, signUploadToken, verifyUploadToken, SecretError } from './lib/secrets';
import {
  AssetError,
  IMMUTABLE_CACHE,
  MAX_UPLOAD_BYTES,
  buildAssetKey,
  invitationIdFromKey,
  isAllowedContentType,
} from './lib/assets';
import * as invitationsRepo from './repo/invitations';
import * as guestbookRepo from './repo/guestbook';
import * as rankingsRepo from './repo/rankings';
import * as usersRepo from './repo/users';
import { createFormEntry } from './repo/forms';
import { sampleContent } from './sample';

export interface Env {
  /** 발행 스냅샷 · 호스트/슬러그 매핑 */
  LUVI_KV: KVNamespace;
  /** 업로드된 이미지·오디오 */
  LUVI_ASSETS: R2Bucket;
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
      devAuthBypass: Boolean(c.env.DEV_FAKE_UID),
    }),
  ),
);

// ─────────────────────────── 청첩장 ───────────────────────────

app.get('/api/invitations', async (c) => {
  const uid = requireUid(c);
  const db = firestore(c.env);

  const invitations = await invitationsRepo.listByOwner(db, uid);
  return c.json(ok<InvitationSummary[]>(invitations.map(invitationsRepo.toSummary)));
});

app.get('/api/invitations/:id', async (c) => {
  const db = firestore(c.env);
  const invitation = await requireOwned(c, db, c.req.param('id'));
  return c.json(ok<Invitation>(invitationsRepo.toPublicShape(invitation)));
});

app.post('/api/invitations', async (c) => {
  const uid = requireUid(c);
  const db = firestore(c.env);
  const body = await readJson<CreateInvitationBody>(c.req);

  const themeId = body.themeId === 'classic2' ? 'classic2' : 'classic1';

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
  await requireOwned(c, db, id);

  const { hidden } = await readJson<{ hidden: boolean }>(c.req);
  if (typeof hidden !== 'boolean') {
    throw new HttpError({ code: 'validation_failed', message: 'hidden 값이 필요합니다' });
  }

  const entry = await guestbookRepo.setHidden(db, id, c.req.param('entryId'), hidden);
  if (!entry) throw new HttpError({ code: 'not_found', message: '해당 글을 찾을 수 없습니다' });

  return c.json(ok<GuestbookEntry>(entry));
});

app.delete('/api/invitations/:id/guestbook/:entryId', async (c) => {
  const db = firestore(c.env);
  const id = c.req.param('id');
  await requireOwned(c, db, id);

  await guestbookRepo.removeEntry(db, id, c.req.param('entryId'));
  return c.json(ok({ id: c.req.param('entryId') }));
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
  await requireOwned(c, db, id);

  await rankingsRepo.removeRank(db, id, c.req.param('entryId'));
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
 * 카카오·네이버 로그인. 둘 다 Firebase Auth 기본 제공자가 아니라 커스텀 토큰으로 처리합니다.
 * 흐름이 동일해서 라우트를 하나로 묶었습니다 — 제공자가 더 늘어도 이 핸들러는 그대로입니다.
 */
app.post('/api/auth/:provider', async (c) => {
  const provider = c.req.param('provider');
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
      credentials: {
        kakaoRestKey: c.env.KAKAO_REST_KEY,
        kakaoClientSecret: c.env.KAKAO_CLIENT_SECRET,
        naverClientId: c.env.NAVER_CLIENT_ID,
        naverClientSecret: c.env.NAVER_CLIENT_SECRET,
      },
    });

    const customToken = await createCustomToken({
      clientEmail: sa.clientEmail,
      privateKeyPem: sa.privateKeyPem,
      uid: profile.uid,
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

    // 프로필 저장은 실패해도 로그인을 막지 않습니다 — 다음 로그인에 다시 시도됩니다
    try {
      await usersRepo.upsertUser(firestore(c.env), {
        uid: profile.uid,
        email: profile.email,
        displayName: profile.displayName,
        photoURL: profile.photoURL,
        provider: profile.provider,
      });
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
 * 구글·이메일 로그인은 Firebase Auth 가 클라이언트에서 직접 처리하므로 브릿지가 필요 없습니다.
 * 대신 로그인 후 이 라우트를 한 번 호출해 사용자 문서를 만듭니다.
 */
app.post('/api/auth/session', async (c) => {
  const uid = requireUid(c);
  const body = await readJson<{
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    provider: string;
  }>(c.req);

  await usersRepo.upsertUser(firestore(c.env), {
    uid,
    email: body.email ?? null,
    displayName: body.displayName ?? null,
    photoURL: body.photoURL ?? null,
    provider: body.provider ?? 'password',
  });

  return c.json(ok({ uid }));
});

// ─────────────────────────── 예약 · 문의 ───────────────────────────

function trimmed(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

app.post('/api/inquiries', async (c) => {
  const body = await readJson<Record<string, unknown>>(c.req);
  const name = trimmed(body.name, 40);
  const message = trimmed(body.message, 2000);

  if (!name || !message) {
    throw new HttpError({ code: 'validation_failed', message: '이름과 문의 내용을 입력해주세요' });
  }

  const id = await createFormEntry(
    firestore(c.env),
    'inquiries',
    {
      name,
      message,
      phone: trimmed(body.phone, 30),
      email: trimmed(body.email, 120),
    },
    await hashIp(c.env.APP_SECRET, clientIp(c)),
  );
  return c.json(ok({ id }), 201);
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

export default app;
