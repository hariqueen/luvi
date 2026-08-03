/**
 * Luvi REST API — Cloudflare Workers + Hono.
 *
 * 현재 상태: **라우트와 응답 형태만 잡아둔 스텁**입니다.
 * 데이터는 `mock.ts` 에서 옵니다. 프론트를 먼저 완성할 수 있게 계약을 고정하는 것이 목적입니다.
 *
 * 실제 구현으로 바꿀 때 손댈 곳은 각 핸들러 안쪽뿐입니다 (`@luvi/schema` 의 타입은 그대로).
 * 구현 순서는 `docs/06-next-steps.md` 참고.
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
} from '@luvi/schema';
import { DEFAULT_SECTIONS } from '@luvi/schema';
import {
  mockDiff,
  mockGuestbook,
  mockInvitation,
  mockRankings,
  mockSummaries,
  sampleContent,
} from './mock';

import { createCustomToken } from './lib/customToken';
import { resolveSocialProfile } from './lib/social';

export interface Env {
  /** 발행 스냅샷 · 호스트/슬러그 매핑 */
  LUVI_KV: KVNamespace;
  /** 업로드된 이미지·오디오 */
  LUVI_ASSETS: R2Bucket;
  /** 에셋 서빙 베이스 */
  CDN_BASE: string;
  /** 정식 도메인 */
  SITE_ORIGIN: string;
  /** Firebase 프로젝트 ID */
  FIREBASE_PROJECT_ID: string;
  /** 카카오 REST API 키 (Secret) */
  KAKAO_REST_KEY?: string;
  /** 카카오 콘솔에서 "Client Secret 사용"을 켠 경우에만 (Secret) */
  KAKAO_CLIENT_SECRET?: string;
  /** 네이버 애플리케이션 Client ID / Secret */
  NAVER_CLIENT_ID?: string;
  NAVER_CLIENT_SECRET?: string;
  /** Firebase 서비스 계정 — 커스텀 토큰 서명용 (Secret) */
  FIREBASE_PRIVATE_KEY?: string;
  FIREBASE_CLIENT_EMAIL?: string;
}

type Vars = { uid: string | null };

const app = new Hono<{ Bindings: Env; Variables: Vars }>();

// ─────────────────────────── 공통 ───────────────────────────

app.use('*', cors({ origin: (o) => o, credentials: true }));

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

/**
 * Bearer 토큰에서 uid 를 얻는다.
 *
 * TODO(실구현): Firebase ID 토큰을 검증한다. Admin SDK 는 Workers 에서 동작하지 않으므로
 * Google 공개키(https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com)
 * 를 받아 Web Crypto 로 RS256 서명을 직접 검증한다. 공개키는 KV 에 캐시한다.
 */
app.use('/api/*', async (c, next) => {
  const auth = c.req.header('Authorization');
  c.set('uid', auth?.startsWith('Bearer ') ? 'dev-uid' : null);
  await next();
});

/** 로그인 필수 라우트에서 쓴다 */
function requireUid(c: { get: (k: 'uid') => string | null }): string {
  const uid = c.get('uid');
  if (!uid) throw new HttpError({ code: 'unauthorized', message: '로그인이 필요합니다' });
  return uid;
}

class HttpError extends Error {
  constructor(public readonly detail: ApiError) {
    super(detail.message);
  }
}

app.onError((err, c) => {
  if (err instanceof HttpError) {
    return c.json(fail(err.detail), STATUS[err.detail.code]);
  }
  console.error('[api] 처리되지 않은 오류', err);
  return c.json(fail({ code: 'internal', message: '알 수 없는 오류가 발생했습니다' }), 500);
});

app.notFound((c) => c.json(fail({ code: 'not_found', message: '없는 경로입니다' }), 404));

app.get('/', (c) => c.json(ok({ service: 'Luvi API', version: '0.1.0' })));

// ─────────────────────────── 청첩장 ───────────────────────────

app.get('/api/invitations', (c) => {
  requireUid(c);
  return c.json(ok<InvitationSummary[]>(mockSummaries()));
});

app.get('/api/invitations/:id', (c) => {
  requireUid(c);
  return c.json(ok<Invitation>(mockInvitation(c.req.param('id'))));
});

app.post('/api/invitations', async (c) => {
  const uid = requireUid(c);
  const body = await c.req.json<CreateInvitationBody>();

  // 빈 폼이 아니라 샘플로 채운 초안을 준다 — 완성된 화면을 먼저 보여주는 쪽이 이탈이 훨씬 적다
  const inv = mockInvitation('new');
  inv.ownerUid = uid;
  inv.themeId = body.themeId;
  inv.draft = sampleContent();
  return c.json(ok(inv), 201);
});

app.patch('/api/invitations/:id', async (c) => {
  requireUid(c);
  await c.req.json();
  // TODO(실구현): Firestore 의 draft 필드만 부분 업데이트.
  // KV 에는 절대 쓰지 않는다 — 쓰기 무료 한도가 1,000/일이라 편집 몇 시간에 소진된다.
  return c.json(ok({ updatedAt: new Date().toISOString() }));
});

app.get('/api/invitations/:id/diff', (c) => {
  requireUid(c);
  return c.json(ok<DraftDiff>(mockDiff()));
});

app.post('/api/invitations/:id/publish', async (c) => {
  requireUid(c);
  const { slug } = await c.req.json<{ slug: string }>();

  // TODO(실구현) 순서:
  //  1. 소유권·필수항목 검증
  //  2. slugs/{slug} 트랜잭션 예약 (중복 원천 차단)
  //  3. Firestore draft → published 복사
  //  4. KV SNAP:{id} 갱신  ← 하객 화면이 여기서 바뀐다
  //  5. 핀이 있으면 KV HOST_MAP 갱신
  const result: PublishResult = {
    slug,
    url: `${c.env.SITE_ORIGIN}/i/${slug}`,
    publishedAt: new Date().toISOString(),
  };
  return c.json(ok(result));
});

app.delete('/api/invitations/:id', (c) => {
  requireUid(c);
  // TODO(실구현): R2 의 inv/{id}/ 프리픽스도 함께 정리
  return c.json(ok({ id: c.req.param('id') }));
});

// ─────────────────────────── 슬러그 ───────────────────────────

const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/;
const RESERVED = new Set(['api', 'app', 'admin', 'i', 'assets', 'cdn', 'www', 'login', 'new']);

app.get('/api/slugs/:slug/available', (c) => {
  const slug = c.req.param('slug').toLowerCase();

  if (!SLUG_PATTERN.test(slug)) {
    throw new HttpError({
      code: 'validation_failed',
      message: '영문 소문자·숫자·하이픈만 쓸 수 있고 3~40자여야 합니다',
      fields: [{ path: 'slug', message: '형식이 올바르지 않습니다' }],
    });
  }

  const taken = RESERVED.has(slug);
  const result: SlugAvailability = {
    slug,
    available: !taken,
    ...(taken ? { suggestions: [`${slug}-wedding`, `${slug}-2026`] } : {}),
  };
  return c.json(ok(result));
});

// ─────────────────────────── 방명록 ───────────────────────────

app.get('/api/invitations/:id/guestbook', (c) =>
  c.json(ok<GuestbookEntry[]>(mockGuestbook())),
);

/** 하객이 남긴다 — 비로그인 허용 */
app.post('/api/invitations/:id/guestbook', async (c) => {
  const body = await c.req.json<{ name?: string; msg?: string }>();
  const name = (body.name ?? '').trim();
  const msg = (body.msg ?? '').trim();

  const fields: { path: string; message: string }[] = [];
  if (!name || name.length > 20) fields.push({ path: 'name', message: '이름은 1~20자입니다' });
  if (!msg || msg.length > 300) fields.push({ path: 'msg', message: '메시지는 1~300자입니다' });
  if (fields.length) {
    throw new HttpError({ code: 'validation_failed', message: '입력을 확인해주세요', fields });
  }

  // TODO(실구현): IP 해시 기준 속도 제한. Firestore 규칙만으로는 rate limit 이 불가능하다
  const entry: GuestbookEntry = {
    id: crypto.randomUUID(),
    name,
    msg,
    hidden: false,
    createdAt: new Date().toISOString(),
  };
  return c.json(ok(entry), 201);
});

app.patch('/api/invitations/:id/guestbook/:entryId', async (c) => {
  requireUid(c);
  const { hidden } = await c.req.json<{ hidden: boolean }>();
  const entry = mockGuestbook()[0]!;
  return c.json(ok<GuestbookEntry>({ ...entry, id: c.req.param('entryId'), hidden }));
});

app.delete('/api/invitations/:id/guestbook/:entryId', (c) => {
  requireUid(c);
  return c.json(ok({ id: c.req.param('entryId') }));
});

// ─────────────────────────── 랭킹 ───────────────────────────

app.get('/api/invitations/:id/rankings', (c) => c.json(ok<RankEntry[]>(mockRankings())));

app.post('/api/invitations/:id/rankings', async (c) => {
  const body = await c.req.json<{ nick?: string; score?: number; caught?: number }>();

  // score 는 생존 시간(초)이라 **소수**다. 정수 검사를 넣으면 정상 기록이 전부 거부된다.
  const score = Number(body.score);
  const caught = Number(body.caught);
  if (!(score >= 0 && score <= 600) || !(caught >= 0 && caught <= 2000)) {
    throw new HttpError({ code: 'validation_failed', message: '기록 값이 올바르지 않습니다' });
  }

  const entry: RankEntry = {
    id: crypto.randomUUID(),
    nick: (body.nick ?? '').trim().slice(0, 20) || '익명 하객',
    score,
    caught,
    createdAt: new Date().toISOString(),
  };
  return c.json(ok(entry), 201);
});

app.delete('/api/invitations/:id/rankings/:entryId', (c) => {
  requireUid(c);
  return c.json(ok({ id: c.req.param('entryId') }));
});

// ─────────────────────────── 에셋 ───────────────────────────

const MAX_UPLOAD = 6 * 1024 * 1024;

app.post('/api/assets/sign', async (c) => {
  requireUid(c);
  const body = await c.req.json<{ invitationId: string; kind: string; size: number }>();

  if (body.size > MAX_UPLOAD) {
    throw new HttpError({
      code: 'validation_failed',
      message: '파일이 너무 큽니다. 브라우저에서 변환 후 6MB 이하여야 합니다',
    });
  }

  // TODO(실구현): R2 presigned PUT URL 발급. 지금은 경로 규칙만 확정한다.
  const key = `inv/${body.invitationId}/${body.kind}/${crypto.randomUUID()}.webp`;
  const result: SignUploadResult = { uploadUrl: `${c.env.CDN_BASE}/__upload/${key}`, key };
  return c.json(ok(result));
});

// ─────────────────────────── 인계 (클레임) ───────────────────────────

app.post('/api/claim/preview', async (c) => {
  requireUid(c);
  const { code } = await c.req.json<{ code: string }>();
  if (!/^LUVI-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)) {
    throw new HttpError({ code: 'claim_invalid', message: '코드 형식이 올바르지 않습니다' });
  }

  // 코드가 맞더라도 바로 넘기지 않는다 — 어떤 청첩장인지 보여주고 확인받는다
  const preview: ClaimPreview = {
    invitationId: 'inv_hoseok_songhee',
    coupleLabel: '호석 ♥ 송희',
    weddingAt: '2026-10-24T13:00:00',
    thumbKey: null,
  };
  return c.json(ok(preview));
});

app.post('/api/claim', async (c) => {
  requireUid(c);
  await c.req.json();
  // TODO(실구현): 트랜잭션으로 코드 유효·미사용·미만료 확인 → ownerUid 이전 → usedAt 기록.
  // 실패 5회면 코드 폐기.
  return c.json(ok({ invitationId: 'inv_hoseok_songhee' }));
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

  const { code, redirectUri, state } = await c.req.json<SocialAuthBody>();
  if (!code || !redirectUri) {
    throw new HttpError({ code: 'validation_failed', message: '인가 정보가 없습니다' });
  }

  if (!c.env.FIREBASE_PRIVATE_KEY || !c.env.FIREBASE_CLIENT_EMAIL) {
    throw new HttpError({
      code: 'internal',
      message: '로그인 설정이 완료되지 않았습니다',
    });
  }

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
      clientEmail: c.env.FIREBASE_CLIENT_EMAIL,
      privateKeyPem: c.env.FIREBASE_PRIVATE_KEY,
      uid: profile.uid,
      claims: { provider: profile.provider },
    });

    // TODO(실구현): users/{uid} 문서를 upsert 한다 (providers 배열에 추가, lastLoginAt 갱신).
    return c.json(
      ok<SocialAuthResult>({
        customToken,
        profile: {
          provider: profile.provider,
          email: profile.email,
          displayName: profile.displayName,
          photoURL: profile.photoURL,
        },
      }),
    );
  } catch (e) {
    // 제공자 응답을 그대로 노출하면 키·내부 정보가 새어나갈 수 있어 로그만 남깁니다
    console.error('[api] 소셜 로그인 실패', provider, e);
    throw new HttpError({
      code: 'unauthorized',
      message: '로그인에 실패했습니다. 다시 시도해주세요',
    });
  }
});

// ─────────────────────────── 예약 · 문의 ───────────────────────────

app.post('/api/inquiries', async (c) => {
  const body = await c.req.json<{ name?: string; message?: string }>();
  if (!body.name?.trim() || !body.message?.trim()) {
    throw new HttpError({ code: 'validation_failed', message: '이름과 문의 내용을 입력해주세요' });
  }
  return c.json(ok({ id: crypto.randomUUID() }), 201);
});

app.post('/api/bookings', async (c) => {
  const body = await c.req.json<{ name?: string; phone?: string }>();
  if (!body.name?.trim() || !body.phone?.trim()) {
    throw new HttpError({ code: 'validation_failed', message: '이름과 연락처를 입력해주세요' });
  }
  return c.json(ok({ id: crypto.randomUUID() }), 201);
});

// ─────────────────────────── 뷰어 (공개) ───────────────────────────

/**
 * 에디터 프리뷰·개발용. 실제 하객 트래픽은 이 경로를 타지 않는다 —
 * 엣지 미들웨어가 KV 스냅샷을 읽어 HTML 에 인라인하므로 페이지뷰당 API 호출이 0이다.
 */
app.get('/api/public/i/:slug', async (c) => {
  const slug = c.req.param('slug');
  const snapshot = await c.env.LUVI_KV?.get(`SNAP:${slug}`);

  if (snapshot) return c.json(ok<PublicInvitation>(JSON.parse(snapshot)));

  const result: PublicInvitation = {
    slug,
    themeId: 'classic1',
    sections: [...DEFAULT_SECTIONS],
    features: { bgm: true, petals: true },
    content: sampleContent(),
    cdnBase: c.env.CDN_BASE,
  };
  return c.json(ok(result));
});

export default app;
