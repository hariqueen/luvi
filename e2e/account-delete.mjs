/**
 * 탈퇴(`DELETE /api/account`) 잔존물 검증.
 *
 * **왜 이 테스트가 따로 있나:** 탈퇴에서 가장 위험한 실패는 "터지는 것" 이 아니라
 * **조용히 일부만 지워지는 것**입니다. 사진 한 장, 방명록 한 줄, 슬러그 예약 하나가 남아도
 * 개인정보처리방침 제7조("탈퇴 시 함께 삭제되며 복구할 수 없습니다")가 허위가 됩니다.
 * 그래서 기능이 도는지가 아니라 **아무것도 안 남았는지**를 검사합니다.
 *
 * 브라우저가 필요 없어 Docker 없이 그냥 node 로 돕니다 (viewer/editor 와 다른 점).
 *
 * 🔴 **일회용 계정을 스스로 만들고 스스로 지웁니다.** 실계정·라이브 청첩장은 건드리지
 *    않습니다. 중간에 실패해도 finally 에서 정리를 시도합니다.
 *
 * 사용:
 *   SA=../luvi/wedding-f328e-firebase-adminsdk-fbsvc-....json \
 *   LUVI_WEB_API_KEY=... \
 *   API=https://luvi-api.<계정>.workers.dev \
 *   node account-delete.mjs
 */
import { createSign } from 'node:crypto';
import { readFileSync } from 'node:fs';

const SA_PATH = process.env.SA;
const WEB_KEY = process.env.LUVI_WEB_API_KEY;
const API = (process.env.API ?? '').replace(/\/$/, '');

if (!SA_PATH || !WEB_KEY || !API) {
  console.error('환경변수 SA · LUVI_WEB_API_KEY · API 가 모두 필요합니다 (파일 상단 주석 참고)');
  process.exit(2);
}

const sa = JSON.parse(readFileSync(SA_PATH, 'utf8'));
const PROJECT = sa.project_id;

// ─────────────────────────── 공통 ───────────────────────────

const b64url = (s) => Buffer.from(s).toString('base64url');
const results = [];

function check(label, passed, detail = '') {
  results.push({ label, passed, detail });
  console.log(`  ${passed ? '✅' : '🔴'} ${label}${detail ? ` — ${detail}` : ''}`);
}

async function saToken(scope) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(
    JSON.stringify({
      iss: sa.client_email,
      scope,
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    }),
  );
  const signer = createSign('RSA-SHA256');
  signer.update(`${header}.${claims}`);
  const sig = signer.sign(sa.private_key, 'base64url');

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${header}.${claims}.${sig}`,
    }),
  });
  const json = await res.json();
  if (!json.access_token) throw new Error(`토큰 발급 실패: ${JSON.stringify(json)}`);
  return json.access_token;
}

const FS_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;
let fsToken;

async function fsGet(path) {
  const res = await fetch(`${FS_BASE}/${path}`, {
    headers: { Authorization: `Bearer ${fsToken}` },
  });
  if (res.status === 404) return null;
  const json = await res.json();
  return json.error ? null : json;
}

/** 컬렉션에서 uid 로 거른 문서 수 (runQuery) */
async function fsCountBy(collectionId, field, value) {
  const res = await fetch(`${FS_BASE}:runQuery`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${fsToken}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId }],
        where: {
          fieldFilter: {
            field: { fieldPath: field },
            op: 'EQUAL',
            value: { stringValue: value },
          },
        },
        limit: 100,
      },
    }),
  });
  const rows = await res.json();
  if (!Array.isArray(rows)) throw new Error(`쿼리 실패: ${JSON.stringify(rows)}`);
  return rows.filter((r) => r.document).length;
}

/** 서브컬렉션 문서 수 */
async function fsSubCount(parentPath, collectionId) {
  const res = await fetch(`${FS_BASE}/${parentPath}/${collectionId}?pageSize=100`, {
    headers: { Authorization: `Bearer ${fsToken}` },
  });
  const json = await res.json();
  return (json.documents ?? []).length;
}

async function api(method, path, { token, body, raw, headers } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...headers,
    },
    body: raw ?? (body ? JSON.stringify(body) : undefined),
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

function must(label, { status, json }, expected = 200) {
  if (status !== expected) {
    throw new Error(`${label} 실패 (${status}) ${JSON.stringify(json?.error ?? json)}`);
  }
  return json.data;
}

// ─────────────────────────── 본문 ───────────────────────────

const stamp = Date.now();
const email = `e2e-delete-${stamp}@luvi-test.invalid`;
const password = `Pw!${stamp}aA`;

let uid = null;
let idToken = null;
let invitationId = null;
let slug = null;
let assetKey = null;

try {
  fsToken = await saToken('https://www.googleapis.com/auth/datastore');

  console.log('\n[1] 일회용 계정 생성');
  {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${WEB_KEY}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      },
    );
    const json = await res.json();
    if (!json.idToken) throw new Error(`계정 생성 실패: ${JSON.stringify(json.error ?? json)}`);
    idToken = json.idToken;
    uid = json.localId;
    console.log(`  uid=${uid}`);
  }

  console.log('\n[2] 세션 동기화 + 약관 동의');
  must(
    '세션',
    await api('POST', '/api/auth/session', {
      token: idToken,
      body: { email, displayName: 'E2E 삭제검증', photoURL: null, provider: 'password' },
    }),
  );
  must(
    '동의',
    await api('POST', '/api/consents', {
      token: idToken,
      body: {
        method: 'signup',
        items: [
          { docType: 'age14', agreed: true },
          { docType: 'terms', agreed: true },
          { docType: 'privacy', agreed: true },
          { docType: 'marketing', agreed: true },
        ],
      },
    }),
    201,
  );

  console.log('\n[3] 청첩장 생성');
  invitationId = must(
    '청첩장 생성',
    await api('POST', '/api/invitations', { token: idToken, body: {} }),
    201,
  ).id;
  console.log(`  invitationId=${invitationId}`);

  console.log('\n[4] 사진 업로드');
  {
    // 1x1 투명 PNG
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64',
    );
    const signed = must(
      '업로드 서명',
      await api('POST', '/api/assets/sign', {
        token: idToken,
        body: { invitationId, kind: 'cover', contentType: 'image/png', size: png.byteLength },
      }),
    );
    assetKey = signed.key;
    const put = await fetch(signed.uploadUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'image/png',
        'Content-Length': String(png.byteLength),
      },
      body: png,
    });
    if (!put.ok) throw new Error(`업로드 실패 (${put.status})`);
    console.log(`  assetKey=${assetKey}`);
  }

  console.log('\n[5] 커버 지정 · 발행');
  // 커버 사진이 없으면 발행이 막힙니다 (하객이 빈칸을 보는 것보다 낫다는 판단).
  // 에디터와 같은 경로로 채웁니다 — 점 표기 패치.
  must(
    '커버 지정',
    await api('PATCH', `/api/invitations/${invitationId}`, {
      token: idToken,
      body: { patch: { 'core.cover.image': { key: assetKey, w: 1, h: 1, alt: 'e2e' } } },
    }),
  );
  slug = `e2e-del-${stamp.toString(36)}`;
  const published = must(
    '발행',
    await api('POST', `/api/invitations/${invitationId}/publish`, {
      token: idToken,
      body: { slug },
    }),
  );
  slug = published.slug;
  console.log(`  slug=${slug}`);

  console.log('\n[6] 방명록 남기기');
  must(
    '방명록',
    await api('POST', `/api/invitations/${invitationId}/guestbook`, {
      body: { name: 'E2E하객', msg: '탈퇴 검증용 글입니다' },
    }),
    201,
  );

  console.log('\n[7] 삭제 전 — 실제로 존재하는지 확인 (검사 자체가 맞는지 보는 대조군)');
  check('발행본이 공개 조회된다', (await api('GET', `/api/public/i/${slug}`)).status === 200);
  check('업로드 자산이 서빙된다', (await fetch(`${API}/api/assets/${assetKey}`)).status === 200);
  check('방명록이 1건 있다', (await fsSubCount(`invitations/${invitationId}`, 'guestbook')) === 1);
  check('동의 이력이 4건 있다', (await fsCountBy('consents', 'uid', uid)) === 4);

  console.log('\n[8] 🔴 탈퇴 실행');
  const result = must('탈퇴', await api('DELETE', '/api/account', { token: idToken }));
  console.log(`  삭제된 청첩장 ${result.deletedInvitations}건`);

  console.log('\n[9] 잔존물 검사 — 여기서 하나라도 🔴 면 방침 제7조가 허위가 됩니다');

  check('users/{uid} 문서 없음', (await fsGet(`users/${uid}`)) === null);
  check('invitations 소유 문서 0건', (await fsCountBy('invitations', 'ownerUid', uid)) === 0);
  check(`invitations/${invitationId} 문서 없음`, (await fsGet(`invitations/${invitationId}`)) === null);
  check(
    'guestbook 서브컬렉션 0건',
    (await fsSubCount(`invitations/${invitationId}`, 'guestbook')) === 0,
  );
  check(
    'rankings 서브컬렉션 0건',
    (await fsSubCount(`invitations/${invitationId}`, 'rankings')) === 0,
  );
  check(`slugs/${slug} 예약 없음`, (await fsGet(`slugs/${slug}`)) === null);
  check('consents 이력 0건', (await fsCountBy('consents', 'uid', uid)) === 0);

  {
    const r = await api('GET', `/api/public/i/${slug}`);
    check('KV 발행 스냅샷 제거됨 (공개 조회 404)', r.status === 404, `status=${r.status}`);
  }
  {
    const r = await fetch(`${API}/api/assets/${assetKey}`);
    check('R2 업로드 자산 제거됨 (404)', r.status === 404, `status=${r.status}`);
  }
  {
    const token = await saToken('https://www.googleapis.com/auth/identitytoolkit');
    const r = await fetch(
      `https://identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:lookup`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify({ localId: [uid] }),
      },
    );
    const json = await r.json();
    check('Firebase Auth 계정 삭제됨', !(json.users ?? []).length);
  }
} catch (e) {
  console.error(`\n🔴 중단: ${e.message}`);
  results.push({ label: `예외: ${e.message}`, passed: false });
} finally {
  /**
   * 테스트가 중간에 죽었을 때의 정리.
   *
   * 🔴 **Auth 계정만 지우면 안 됩니다.** 2026-09-12 에 그렇게 만들어 돌렸다가, 발행
   *    단계에서 실패하자 계정만 사라지고 **청첩장 문서가 고아로 남았습니다**
   *    (ownerUid 가 존재하지 않는 계정을 가리킴 — 아무도 지울 수 없는 상태).
   *
   * 그래서 정상 탈퇴 경로(`DELETE /api/account`)를 먼저 부릅니다. 그게 청첩장·자산·
   * 스냅샷·동의이력·Auth 계정을 순서대로 치웁니다. 실패했을 때만 Auth 계정을 직접
   * 지우고, 남은 것을 사람이 볼 수 있게 ID 를 출력합니다.
   */
  if (uid) {
    let cleaned = false;
    if (idToken) {
      const r = await api('DELETE', '/api/account', { token: idToken }).catch(() => null);
      cleaned = r?.status === 200;
    }
    if (!cleaned) {
      console.warn(
        `  ⚠️ 정상 탈퇴 경로로 정리하지 못했습니다. 아래를 직접 확인하세요:\n` +
          `     uid=${uid}\n` +
          `     invitationId=${invitationId ?? '없음'}\n` +
          `     slug=${slug ?? '없음'}  assetKey=${assetKey ?? '없음'}`,
      );
      try {
        const token = await saToken('https://www.googleapis.com/auth/identitytoolkit');
        await fetch(
          `https://identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:delete`,
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json' },
            body: JSON.stringify({ localId: uid }),
          },
        );
      } catch {
        console.warn(`  ⚠️ Auth 계정 삭제도 실패했습니다 — 콘솔에서 uid=${uid} 를 지우세요`);
      }
    }
  }
}

const failed = results.filter((r) => !r.passed);
console.log(`\n${'─'.repeat(60)}`);
console.log(`검사 ${results.length}건 중 통과 ${results.length - failed.length}건`);
if (failed.length) {
  console.log('\n실패:');
  for (const f of failed) console.log(`  🔴 ${f.label}`);
}
process.exit(failed.length ? 1 : 0);
