/**
 * 탈퇴 창구까지 **클릭만으로 도달할 수 있는지** 확인합니다.
 *
 * `consent.mjs` 는 `/app/account` 로 주소를 직접 열어서 화면을 봤습니다. 그건 화면이 그려지는
 * 것만 증명하지, **사용자가 찾아갈 수 있다는 것은 증명하지 않습니다.** 개인정보처리방침 제8조 ②가
 * *"서비스 내 [계정 설정] 화면"* 을 권리 행사 경로로 적고 있어서, 도달 불가능하면 방침이 거짓이
 * 됩니다. 그래서 주소를 치지 않고 **눌러서만** 갑니다.
 *
 * 모바일·데스크톱을 모두 봅니다 — 입구가 `md:block` / `md:hidden` 으로 갈려 있어서
 * 한쪽만 확인하면 다른 쪽이 비어 있어도 통과해 버립니다.
 *
 * 🔴 일회용 계정으로 돌고 끝에 탈퇴로 정리합니다. 실계정은 건드리지 않습니다.
 *
 * 실행 (Docker — 이 머신에 브라우저가 없습니다):
 *   docker run --rm -v "$PWD/e2e:/work" -w /work \
 *     -e LUVI_WEB_API_KEY="..." -e SITE="https://luv-ai.co.kr" \
 *     mcr.microsoft.com/playwright:v1.47.0-jammy \
 *     bash -c "npm i -s playwright@1.47.0 && node account-reachable.mjs"
 */
import { chromium } from 'playwright';

const SITE = (process.env.SITE ?? 'https://luv-ai.co.kr').replace(/\/$/, '');
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
const email = `e2e-reach-${stamp}@luvi-test.invalid`;
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
console.log(`일회용 계정 uid=${signUp.localId}`);

const browser = await chromium.launch();

/**
 * 로그인 → (필요하면) 동의까지 마치고 `/app` 에 세워 둡니다.
 *
 * 🔴 **동의 화면이 떴는지를 화면으로 판단하면 안 됩니다.** `RequireAuth` 는 동의 여부를
 *    아직 모르는 동안(`consent === null`) 일부러 통과시킵니다 — 이미 동의한 사람에게
 *    로그인할 때마다 화면이 깜빡이지 않도록 한 설계입니다. 그래서 로그인 직후 잠깐은
 *    게이트가 없다가 세션 응답이 오면 나타납니다.
 *
 *    그 찰나에 "게이트 없음" 으로 판단하면 **동의를 통째로 건너뛰고**, 뒤늦게 뜬 게이트가
 *    다음 화면을 덮습니다. 그걸 "탈퇴 버튼이 없다" 는 제품 버그로 오진하게 됩니다
 *    (실제로 두 번 오진했습니다). 그래서 **세션 응답을 기다린 뒤** 판단합니다.
 */
async function signIn(page) {
  await page.goto(`${SITE}/login`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /이메일로 계속하기/ }).click();
  await page.getByPlaceholder('이메일').fill(email);
  await page.getByPlaceholder(/^비밀번호/).fill(password);

  // 클릭보다 먼저 걸어둡니다 — 클릭 후에 걸면 응답을 놓칠 수 있습니다
  const session = page.waitForResponse(
    (r) => r.url().includes('/api/auth/session') && r.request().method() === 'POST',
    { timeout: 30000 },
  );
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/app/, { timeout: 30000 });

  const body = await (await session).json();
  const needsConsent = body?.data?.consent?.satisfied === false;
  console.log(`  (세션 응답: 동의 필요=${needsConsent})`);

  const gate = page.getByText('시작하기 전에 동의가 필요해요');
  if (needsConsent) {
    await gate.waitFor({ state: 'visible', timeout: 20000 });
    // 필수 항목을 개별로 켭니다 — '전체 동의' 는 텍스트 클릭이 빗나가도 티가 안 납니다
    const boxes = page.locator('input[type="checkbox"]');
    for (let i = 0; i < (await boxes.count()); i += 1) await boxes.nth(i).check();

    const next = page.getByRole('button', { name: /동의하고 계속하기/ });
    if (await next.isDisabled()) throw new Error('체크했는데도 동의 버튼이 비활성입니다');
    await next.click();
    await gate.waitFor({ state: 'detached', timeout: 20000 });
  }

  await page.waitForTimeout(1500);
  if (await gate.isVisible().catch(() => false)) throw new Error('동의 화면이 다시 떴습니다');
}

/** 주소를 치지 않고 **눌러서만** 계정 설정까지 갑니다 */
async function reachByClick(page, label, entry) {
  check(`[${label}] 입구가 보인다`, await entry.isVisible(), await entry.innerText().catch(() => ''));
  await entry.click();
  await page.waitForURL(/\/app\/account/, { timeout: 20000 });
  check(`[${label}] 클릭으로 계정 설정 도달`, page.url().includes('/app/account'), page.url());

  const withdraw = page.getByRole('button', { name: '탈퇴하기' });
  await withdraw.waitFor({ timeout: 20000 });
  check(`[${label}] 탈퇴 버튼이 화면에 있다`, await withdraw.isVisible());

  // 뷰포트 밖으로 잘려 나가 있지 않은지 — 보이기는 하나 누를 수 없는 경우를 거릅니다
  const box = await withdraw.boundingBox();
  const vw = page.viewportSize();
  check(
    `[${label}] 탈퇴 버튼이 화면 폭 안에 있다`,
    !!box && box.x >= 0 && box.x + box.width <= vw.width + 1,
    box ? `x=${Math.round(box.x)} w=${Math.round(box.width)} / vw=${vw.width}` : 'boundingBox 없음',
  );
}

try {
  // ── 모바일 (430px) — `계정` 알약 버튼이 입구 ──────────────────
  console.log('\n[1] 모바일 430px');
  const mobile = await browser.newContext({ viewport: { width: 430, height: 900 } });
  const mPage = await mobile.newPage();
  await signIn(mPage);
  await reachByClick(mPage, '모바일', mPage.getByRole('link', { name: '계정 설정' }));
  await mobile.close();

  // ── 데스크톱 (1280px) — 이름 자체가 입구 ─────────────────────
  console.log('\n[2] 데스크톱 1280px');
  const desktop = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const dPage = await desktop.newPage();
  await signIn(dPage);
  // 헤더의 계정 링크. 모바일용 알약은 md:hidden 이라 이 폭에서는 잡히지 않아야 합니다
  const pill = dPage.getByRole('link', { name: '계정 설정' });
  check('[데스크톱] 모바일용 알약은 숨겨짐', !(await pill.isVisible().catch(() => false)));
  await reachByClick(dPage, '데스크톱', dPage.locator('header a[href="/app/account"]').first());

  // ── 탈퇴로 정리 ──────────────────────────────────────────────
  console.log('\n[3] 탈퇴 (정리 겸 검증)');
  const page = dPage;
  await page.getByRole('button', { name: '탈퇴하기' }).click();
  await page.getByPlaceholder('탈퇴합니다').fill('탈퇴합니다');
  await page.getByRole('button', { name: '영구 삭제' }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/app'), { timeout: 30000 });
  check('탈퇴 완료', !page.url().includes('/app'), page.url());
  await desktop.close();
} catch (e) {
  console.error(`\n🔴 중단: ${e.message}`);
  results.push({ label: `예외: ${e.message}`, passed: false });
} finally {
  await browser.close();
}

// 탈퇴가 실패했으면 계정이 남습니다.
//
// 🔴 **Auth 계정만 지우면 안 됩니다.** 그러면 `users` 문서가 주인 없이 남아 고아가 됩니다 —
//    탈퇴 코드가 막으려던 실패를 정리 코드가 저지르는 꼴입니다 (실제로 두 번 겪었습니다).
//    반드시 **정상 탈퇴 API 를 먼저** 부르고, 그게 안 될 때만 Auth 를 지웁니다.
const stillThere = await fetch(
  `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${WEB_KEY}`,
  {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ idToken: signUp.idToken }),
  },
).then((r) => r.json()).catch(() => ({}));

if (stillThere.users?.length) {
  const API = process.env.LUVI_API ?? 'https://luvi-api.hariqueen985813.workers.dev';
  const res = await fetch(`${API}/api/account`, {
    method: 'DELETE',
    headers: { authorization: `Bearer ${signUp.idToken}` },
  }).catch(() => null);

  if (res?.ok) {
    console.log('\n정리: 정상 탈퇴 경로로 지웠습니다');
  } else {
    await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${WEB_KEY}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ idToken: signUp.idToken }),
    }).catch(() => {});
    console.log(
      `\n🔴 탈퇴 API 가 ${res?.status ?? '응답 없음'} 을 반환해 Auth 만 지웠습니다.` +
        `\n   users/${signUp.localId} 가 고아로 남았을 수 있습니다 — 직접 확인하세요.`,
    );
  }
}

const failed = results.filter((r) => !r.passed);
console.log(`\n${'─'.repeat(58)}`);
console.log(`검사 ${results.length}건 중 통과 ${results.length - failed.length}건`);
for (const f of failed) console.log(`  🔴 ${f.label}`);
process.exit(failed.length ? 1 : 0);
