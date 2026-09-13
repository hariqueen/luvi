/**
 * 로그인 수단 연결 API 검증.
 *
 * 🔴 **실제 연결까지는 자동으로 검증할 수 없습니다.** 카카오·네이버 인가 화면을 사람이
 *    눌러야 인가 코드가 나옵니다. 그래서 여기서는 **인가 코드가 필요 없는 부분**만 봅니다.
 *    연결 성공 경로는 배포 후 사람이 한 번 눌러 확인해야 합니다(README 아래 절차).
 *
 * 그래도 이 검사가 잡아주는 것:
 *   - 라우트가 붙어 있고 인증을 요구하는가 (비로그인 401)
 *   - 연결 안 된 수단을 해제하면 404 인가 (조용히 성공하면 화면이 거짓말을 합니다)
 *   - 엉터리 인가 코드에 500 이 아니라 401 을 주는가 (제공자 응답이 새지 않는가)
 *   - 지원하지 않는 제공자를 404 로 막는가
 *   - GET /api/account 가 linkedProviders 를 내려주는가 (화면이 이 값으로 그립니다)
 *
 * 일회용 계정으로 돌고 끝에 탈퇴로 정리합니다. 실계정은 건드리지 않습니다.
 *
 * 실행:
 *   cd luvi && LUVI_WEB_API_KEY="..." node e2e/account-link.mjs
 */
const API = (process.env.LUVI_API ?? 'https://luvi-api.hariqueen985813.workers.dev').replace(/\/$/, '');
const WEB_KEY = process.env.LUVI_WEB_API_KEY;
if (!WEB_KEY) {
  console.error('LUVI_WEB_API_KEY 가 필요합니다');
  process.exit(2);
}

const results = [];
const check = (label, passed, detail = '') => {
  results.push({ label, passed });
  console.log(`  ${passed ? '✅' : '🔴'} ${label}${detail ? ` — ${detail}` : ''}`);
};

const stamp = Date.now();
const email = `e2e-link-${stamp}@luvi-test.invalid`;
const password = `Pw!${stamp}aA`;

const signUp = await fetch(
  `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${WEB_KEY}`,
  {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  },
).then((r) => r.json());
if (!signUp.idToken) {
  console.error(`계정 생성 실패: ${JSON.stringify(signUp.error)}`);
  process.exit(2);
}
const TOKEN = signUp.idToken;
console.log(`일회용 계정 uid=${signUp.localId}\n`);

const call = (method, path, body, auth = true) =>
  fetch(`${API}${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(auth ? { authorization: `Bearer ${TOKEN}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

try {
  // 계정 문서를 만들고 동의까지 마칩니다 (게이트에 걸리지 않게)
  await call('POST', '/api/auth/session', {
    email,
    displayName: null,
    photoURL: null,
    provider: 'password',
  });
  await call('POST', '/api/consents', {
    method: 'signup',
    items: ['age14', 'terms', 'privacy'].map((docType) => ({ docType, agreed: true })),
  });

  console.log('[1] 인증 요구');
  const anon = await call('POST', '/api/account/link/kakao', { code: 'x', redirectUri: 'x' }, false);
  check('비로그인 연결 시도 401', anon.status === 401, `${anon.status}`);
  const anonDel = await call('DELETE', '/api/account/link/kakao', null, false);
  check('비로그인 해제 시도 401', anonDel.status === 401, `${anonDel.status}`);

  console.log('\n[2] 제공자 검증');
  const bogus = await call('POST', '/api/account/link/google', { code: 'x', redirectUri: 'x' });
  check('지원하지 않는 제공자 404', bogus.status === 404, `${bogus.status}`);

  console.log('\n[3] 연결 안 된 수단 해제');
  for (const p of ['kakao', 'naver']) {
    const res = await call('DELETE', `/api/account/link/${p}`);
    const body = await res.json().catch(() => ({}));
    check(
      `${p} 해제 404 (조용히 성공하면 안 됨)`,
      res.status === 404 && body?.error?.code === 'not_found',
      `${res.status} ${body?.error?.code ?? ''}`,
    );
  }

  console.log('\n[4] 엉터리 인가 코드');
  const bad = await call('POST', '/api/account/link/kakao', {
    code: 'definitely-not-a-real-code',
    redirectUri: 'https://luv-ai.co.kr/login/callback/kakao',
  });
  const badBody = await bad.json().catch(() => ({}));
  check('401 로 막힘 (500 아님)', bad.status === 401, `${bad.status} ${badBody?.error?.code ?? ''}`);
  check(
    '제공자 응답이 새지 않음',
    !JSON.stringify(badBody).match(/kauth|kapi|client_secret|KOE\d/),
    badBody?.error?.message ?? '',
  );

  const missing = await call('POST', '/api/account/link/kakao', {});
  check('인가 정보 없으면 400', missing.status === 400, `${missing.status}`);

  console.log('\n[5] 계정 응답 모양');
  const acc = await call('GET', '/api/account');
  const accBody = await acc.json();
  check('GET /api/account 200', acc.status === 200, `${acc.status}`);
  check(
    'linkedProviders 가 배열로 내려옴',
    Array.isArray(accBody?.data?.linkedProviders),
    JSON.stringify(accBody?.data?.linkedProviders),
  );
  check(
    '아직 연결한 것이 없으므로 빈 배열',
    accBody?.data?.linkedProviders?.length === 0,
    `${accBody?.data?.linkedProviders?.length}`,
  );
  check(
    'providers 에는 이메일 로그인이 있음',
    (accBody?.data?.providers ?? []).includes('password'),
    JSON.stringify(accBody?.data?.providers),
  );
} catch (e) {
  console.error(`\n🔴 중단: ${e.message}`);
  results.push({ label: `예외: ${e.message}`, passed: false });
} finally {
  // 🔴 정상 탈퇴 경로를 먼저 부릅니다. Auth 계정만 지우면 users 문서가 고아로 남습니다
  const del = await call('DELETE', '/api/account').catch(() => null);
  if (del?.ok) {
    console.log('\n정리: 탈퇴 완료');
  } else {
    await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${WEB_KEY}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ idToken: TOKEN }),
    }).catch(() => {});
    console.log(
      `\n🔴 탈퇴 API 가 ${del?.status ?? '응답 없음'} 이라 Auth 만 지웠습니다.` +
        `\n   users/${signUp.localId} 가 고아로 남았을 수 있습니다.`,
    );
  }
}

const failed = results.filter((r) => !r.passed);
console.log(`\n${'─'.repeat(58)}`);
console.log(`검사 ${results.length}건 중 통과 ${results.length - failed.length}건`);
for (const f of failed) console.log(`  🔴 ${f.label}`);
console.log(
  '\n※ 연결 성공 경로는 사람이 눌러야 확인됩니다:' +
    '\n   구글로 로그인 → /app/account → 카카오 "연결하기" → 카카오 인증' +
    '\n   → 돌아와서 "연결됨" 표시 + 로그아웃 후 카카오로 로그인해 같은 계정인지 확인',
);
process.exit(failed.length ? 1 : 0);
