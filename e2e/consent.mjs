/**
 * 3단계 화면 검증 — 법률 문서 페이지 · 동의 화면 · 계정 설정.
 *
 * 빌드가 성공하고 청크가 배포에 있다는 것은 **화면이 제대로 그려진다는 뜻이 아닙니다.**
 * 마크다운 변환이 깨지거나, 게이트가 안 뜨거나, 반대로 이미 동의한 사람에게 계속 뜨는
 * 것은 전부 런타임에만 드러납니다. 그래서 실제 브라우저로 확인합니다.
 *
 * 🔴 **일회용 계정으로 돌고 끝에 탈퇴로 정리합니다.** 실계정·라이브 청첩장은 건드리지
 *    않습니다. 계정 설정 화면의 탈퇴 버튼이 정리 수단이기도 해서, 그 자체가 검증입니다.
 *
 * 실행 (Docker — 이 머신에 브라우저가 없습니다):
 *   docker run --rm -v "$PWD/e2e:/work" -w /work \
 *     -e LUVI_WEB_API_KEY="..." -e SITE="https://luv-ai.co.kr" \
 *     mcr.microsoft.com/playwright:v1.47.0-jammy \
 *     bash -c "npm i -s playwright@1.47.0 && node consent.mjs"
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
const email = `e2e-consent-${stamp}@luvi-test.invalid`;
const password = `Pw!${stamp}aA`;

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 430, height: 900 } });
const page = await ctx.newPage();

const consoleErrors = [];
page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(m.text());
});

try {
  // ── 1. 법률 문서 페이지 ──────────────────────────────────────
  console.log('\n[1] /privacy · /terms 렌더링');

  await page.goto(`${SITE}/privacy`, { waitUntil: 'networkidle' });
  const privacyH1 = await page.locator('h1').first().innerText();
  check('개인정보처리방침 제목', privacyH1.includes('개인정보처리방침'), privacyH1);
  check('시행일 표시', (await page.getByText('시행일 2026년 10월 2일').count()) > 0);
  // 마크다운 표가 <table> 로 변환됐는지 — 문단으로 새면 `|` 가 본문에 보입니다
  const tables = await page.locator('table').count();
  check('표가 table 로 렌더링됨', tables >= 10, `${tables}개`);
  const bodyText = await page.locator('article').innerText();
  check('본문에 파이프(|) 유출 없음', !bodyText.includes('| ---'), '');
  check('국외이전 내용 포함', bodyText.includes('아시아·태평양'));
  check('문의 주소 노출', bodyText.includes('help@luv-ai.co.kr'));

  await page.goto(`${SITE}/terms`, { waitUntil: 'networkidle' });
  const termsText = await page.locator('article').innerText();
  check('이용약관 사업자 정보', termsText.includes('653-03-03869'));

  // ── 2. 푸터 ────────────────────────────────────────────────
  console.log('\n[2] 푸터 법정 표기');
  const footer = page.locator('footer');
  check('사업자등록번호', (await footer.innerText()).includes('653-03-03869'));
  const privacyLink = footer.getByRole('link', { name: '개인정보처리방침' });
  check('개인정보처리방침 링크 존재', (await privacyLink.count()) > 0);
  // 법정 권고 — 다른 항목과 구분되게 굵게
  const weight = await privacyLink.first().evaluate((el) => getComputedStyle(el).fontWeight);
  check('개인정보처리방침이 굵게 표시됨', Number(weight) >= 600, `font-weight=${weight}`);

  // ── 3. 신규 가입 → 동의 화면 ─────────────────────────────────
  console.log('\n[3] 신규 계정 → 동의 화면');
  const signUp = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${WEB_KEY}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  ).then((r) => r.json());
  if (!signUp.idToken) throw new Error(`계정 생성 실패: ${JSON.stringify(signUp.error)}`);
  console.log(`  uid=${signUp.localId}`);

  await page.goto(`${SITE}/login`, { waitUntil: 'networkidle' });
  check('로그인 화면에 약관 링크', (await page.getByRole('link', { name: '이용약관' }).count()) > 0);

  await page.getByPlaceholder(/이메일|email/i).first().fill(email);
  await page.getByPlaceholder(/비밀번호|password/i).first().fill(password);
  await page.getByRole('button', { name: /로그인|계속/ }).first().click();

  await page.waitForURL(/\/app/, { timeout: 20000 });
  await page.waitForSelector('text=동의', { timeout: 20000 });

  check('동의 화면이 떴다', (await page.getByText('시작하기 전에 동의가 필요해요').count()) > 0);

  const nextBtn = page.getByRole('button', { name: /동의하고 계속하기/ });
  check('필수 미체크 상태에서 다음 버튼 비활성', await nextBtn.isDisabled());

  // 전체 동의가 선택 항목까지 포함하는지 (포함하되 화면에 보여야 함)
  await page.getByText('전체 동의').click();
  const boxes = page.locator('input[type="checkbox"]');
  const total = await boxes.count();
  let checkedCount = 0;
  for (let i = 0; i < total; i += 1) if (await boxes.nth(i).isChecked()) checkedCount += 1;
  check('전체 동의로 모두 체크됨', checkedCount === total, `${checkedCount}/${total}`);
  check('전체 동의 후 다음 버튼 활성', !(await nextBtn.isDisabled()));

  // 선택 항목만 해제해도 진행 가능해야 합니다
  const marketing = page.locator('label', { hasText: '광고성 정보 수신' }).locator('input');
  await marketing.uncheck();
  check('선택 항목 해제해도 진행 가능', !(await nextBtn.isDisabled()));

  check('전문 보기 링크', (await page.getByRole('link', { name: '전문 보기' }).count()) >= 2);

  await nextBtn.click();
  await page.waitForSelector('text=동의', { state: 'detached', timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(1500);
  check('동의 후 화면 통과', !page.url().includes('/login'), page.url());
  check('동의 화면이 사라짐', (await page.getByText('시작하기 전에 동의가 필요해요').count()) === 0);

  // ── 4. 재방문 시 동의 화면이 다시 뜨지 않아야 ────────────────
  console.log('\n[4] 재방문 — 동의 화면이 다시 뜨지 않아야 함');
  await page.goto(`${SITE}/app`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  check(
    '재방문에 동의 화면 없음',
    (await page.getByText('시작하기 전에 동의가 필요해요').count()) === 0,
  );

  // ── 5. 계정 설정 ───────────────────────────────────────────
  console.log('\n[5] 계정 설정 화면');
  await page.goto(`${SITE}/app/account`, { waitUntil: 'networkidle' });
  await page.waitForSelector('text=계정 설정', { timeout: 20000 });

  const acc = await page.locator('body').innerText();
  check('내 이메일 표시', acc.includes(email));
  check('가입 경로 표시', acc.includes('이메일'));
  check('동의 내역 기록 있음', acc.includes('v1.0.0'));
  check('마케팅 철회 상태 표시', acc.includes('동의하지 않음'));
  check('탈퇴 경고 문구', acc.includes('복구할 수 없습니다'));

  // 선택 동의 켜기 → 기록이 늘어야 합니다 (append-only)
  await page.getByRole('button', { name: '동의' }).first().click();
  await page.waitForTimeout(2500);
  check(
    '마케팅 동의 후 상태 반영',
    (await page.locator('body').innerText()).includes('언제든 철회할 수 있어요'),
  );

  // ── 6. 탈퇴 (정리 겸 검증) ──────────────────────────────────
  console.log('\n[6] 탈퇴');
  await page.getByRole('button', { name: '탈퇴하기' }).click();
  const phrase = page.getByPlaceholder('탈퇴합니다');
  const deleteBtn = page.getByRole('button', { name: '영구 삭제' });
  check('문구 입력 전 삭제 버튼 비활성', await deleteBtn.isDisabled());

  await phrase.fill('탈퇴합니다');
  check('문구 입력 후 활성', !(await deleteBtn.isDisabled()));
  await deleteBtn.click();

  await page.waitForURL((u) => !u.pathname.startsWith('/app'), { timeout: 30000 });
  check('탈퇴 후 홈으로 이동', !page.url().includes('/app'), page.url());

  // ── 콘솔 에러 ──────────────────────────────────────────────
  console.log('\n[7] 콘솔');
  const real = consoleErrors.filter((e) => !/favicon|404|net::ERR_/.test(e));
  check('콘솔 에러 없음', real.length === 0, real.slice(0, 2).join(' | '));
} catch (e) {
  console.error(`\n🔴 중단: ${e.message}`);
  results.push({ label: `예외: ${e.message}`, passed: false });
  await page.screenshot({ path: 'consent-failure.png', fullPage: true }).catch(() => {});
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.passed);
console.log(`\n${'─'.repeat(58)}`);
console.log(`검사 ${results.length}건 중 통과 ${results.length - failed.length}건`);
if (failed.length) {
  console.log('\n실패:');
  for (const f of failed) console.log(`  🔴 ${f.label}`);
  console.log(`\n⚠️ 계정이 남았을 수 있습니다: ${email}`);
}
process.exit(failed.length ? 1 : 0);
