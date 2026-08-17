/**
 * 에디터·발행 실브라우저 E2E.
 *
 * 일회용 테스트 계정 + 테스트 청첩장을 **스스로 만들고 끝나면 지웁니다**(finally).
 * 라이브 청첩장은 건드리지 않습니다.
 *
 * 필요한 것: /tmp/sa.json (서비스 계정 키 마운트), LUVI_WEB_API_KEY.
 * 실행법은 e2e/README.md 참고.
 */
import { chromium } from 'playwright';
import admin from 'firebase-admin';
import { readFileSync } from 'node:fs';

const ORIGIN = process.env.LUVI_ORIGIN ?? 'https://luv-ai.co.kr';
const API = process.env.LUVI_API ?? 'https://luvi-api.hariqueen985813.workers.dev/api';
const API_KEY = (process.env.LUVI_WEB_API_KEY ?? '').trim();
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

if (!API_KEY) {
  console.log('❌ LUVI_WEB_API_KEY 가 필요합니다 (VITE_FIREBASE_API_KEY 값)');
  process.exit(1);
}

const results = [];
const ok = (n, d = '') => { results.push({ pass: true, n }); console.log(`  ✅ ${n}${d ? ` — ${d}` : ''}`); };
const bad = (n, d = '') => { results.push({ pass: false, n }); console.log(`  ❌ ${n}${d ? ` — ${d}` : ''}`); };

admin.initializeApp({ credential: admin.credential.cert(JSON.parse(readFileSync('/tmp/sa.json', 'utf8'))) });

const stamp = Date.now().toString().slice(-8);
const email = `e2e-${stamp}@luvi-e2e.test`;
const password = `E2e-${stamp}-pw!`;
let uid = '';
let invitationId = '';
let idToken = '';
let publishedSlug = '';
let browser;

const signIn = async () => {
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'User-Agent': UA },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  }).then((x) => x.json());
  return r.idToken;
};
const H = () => ({ 'content-type': 'application/json', Authorization: `Bearer ${idToken}`, 'User-Agent': UA });

try {
  // ── 픽스처: 계정 · 청첩장 · 커버 사진 ──
  uid = (await admin.auth().createUser({ email, password, displayName: 'E2E' })).uid;
  idToken = await signIn();
  if (!idToken) throw new Error('테스트 계정 로그인 실패');

  const created = await fetch(`${API}/invitations`, {
    method: 'POST', headers: H(), body: JSON.stringify({ themeId: 'classic1' }),
  }).then((r) => r.json());
  if (!created.ok) throw new Error(`청첩장 생성 실패: ${JSON.stringify(created).slice(0, 200)}`);
  invitationId = created.data.id;

  // 샘플 초안은 커버가 비어 발행이 잠깁니다 → 업로드 경로(sign→PUT→패치)로 채웁니다
  const jpeg = Buffer.from(
    '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwcJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPDs0NDP/wAALCAAyADIBAREA/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/9oACAEBAAA/APn+iiigD//Z',
    'base64',
  );
  const sign = await fetch(`${API}/assets/sign`, {
    method: 'POST', headers: H(),
    body: JSON.stringify({ invitationId, kind: 'cover', contentType: 'image/jpeg', size: jpeg.length }),
  }).then((r) => r.json());
  if (!sign.ok) throw new Error(`sign 실패: ${JSON.stringify(sign).slice(0, 200)}`);

  // ⚠️ 업로드는 URL 토큰 말고도 Bearer 가 필요합니다 (uid 를 헤더에서 읽음)
  const put = await fetch(sign.data.uploadUrl, {
    method: 'PUT',
    headers: { 'content-type': 'image/jpeg', 'content-length': String(jpeg.length), Authorization: `Bearer ${idToken}`, 'User-Agent': UA },
    body: jpeg,
  });
  put.ok ? ok('커버 사진 업로드 (sign → PUT → R2)') : bad('커버 업로드 실패', String(put.status));

  await fetch(`${API}/invitations/${invitationId}`, {
    method: 'PATCH', headers: H(),
    body: JSON.stringify({ patch: { 'core.cover.image': { key: sign.data.key, w: 50, h: 50 } } }),
  });

  // ── 브라우저 ──
  browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 950 }, locale: 'ko-KR' });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 160)); });
  // 자동저장이 없어 에디터가 '저장 안 된 채 나가기' 를 막습니다. Playwright 의 기본 동작은
  // 다이얼로그 취소라서 그대로 두면 goto 가 그 자리에 멈춥니다 → 이동을 허용합니다.
  // (테스트는 이동 전에 저장을 누르므로, 이 핸들러가 삼키는 건 잔여 경고뿐입니다)
  page.on('dialog', (d) => void d.accept().catch(() => {}));

  // 1. 이메일 로그인 ('로그인' 은 모드 탭에도 있어 submit 으로 특정)
  await page.goto(`${ORIGIN}/login`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.getByText(/이메일로 계속하기/).click();
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL(/\/app/, { timeout: 45000 });
  ok('이메일 로그인 → /app');

  // 2. 에디터
  await page.goto(`${ORIGIN}/app/i/${invitationId}/edit`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(4000);
  const frame = page.frameLocator('iframe[data-luvi-preview]');
  (await page.locator('iframe[data-luvi-preview]').count()) > 0 ? ok('미리보기 iframe 존재') : bad('미리보기 iframe 없음');

  try {
    await frame.locator('text=INVITATION').first().waitFor({ timeout: 25000 });
    ok('미리보기에 초안 렌더 (postMessage)');
  } catch { bad('미리보기가 비어 있음'); }

  // 3. 미리보기 섹션 클릭 → 폼 열림
  try {
    await frame.locator('[data-preview-section="greeting"]').click({ timeout: 15000 });
    await page.waitForTimeout(2500);
    (await page.locator('body').innerText()).includes('인사말')
      ? ok('섹션 클릭 → 해당 편집 폼 열림')
      : bad('섹션 클릭했지만 폼이 안 열림');
  } catch (e) { bad('섹션 클릭 실패', String(e).slice(0, 100)); }

  // 4. 편집 → 미리보기 실시간 반영 → **저장을 눌러야** 저장 (자동저장 없음)
  const marker = `E2E편집${Date.now().toString().slice(-5)}`;
  await page.locator('textarea').first().fill(`${marker}\n저장 검증`);
  await page.waitForTimeout(2000);

  // 저장하지 않은 상태 표시
  (await page.locator('body').innerText()).includes('저장 안 됨')
    ? ok("편집 직후 '저장 안 됨' 표시")
    : bad("편집했는데 '저장 안 됨' 표시가 없음 — 자동저장이 살아있나?");

  try {
    await frame.locator(`text=${marker}`).first().waitFor({ timeout: 15000 });
    ok('편집 내용이 미리보기에 실시간 반영 (저장 전)');
  } catch { bad('미리보기에 편집 내용 없음'); }

  const saveBtn = page.getByRole('button', { name: /^저장$/ }).first();
  if ((await saveBtn.count()) === 0) {
    bad('저장 버튼이 없음');
  } else {
    await saveBtn.click();
    await page.waitForTimeout(4000);
    /✓/.test(await page.locator('body').innerText()) ? ok('저장 완료(✓)') : bad('저장 표시 없음');
  }

  // 4-b. 연출 — 낙하 양 슬라이더 + 떨어지는 이미지 필드
  try {
    await page.goto(`${ORIGIN}/app/i/${invitationId}/edit`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(3500);
    // '연출' 폼 열기 (섹션 목록에 없는 코어 폼)
    await page.getByText(/^연출$/).first().click();
    await page.waitForTimeout(2000);

    // 폼은 모바일 시트와 데스크톱 패널에 각각 렌더돼 DOM 에 2개 존재합니다 → 보이는 것만
    const slider = page.locator('input[type="range"]:visible').first();
    if ((await page.locator('input[type="range"]').count()) === 0) {
      bad('연출에 낙하 양 슬라이더가 없음');
    } else {
      ok('연출 폼에 낙하 양 슬라이더 있음');
      const body = await page.locator('body').innerText();
      body.includes('떨어지는 이미지') ? ok('떨어지는 이미지 필드 있음') : bad('떨어지는 이미지 필드 없음');

      // 슬라이더를 옮기면 미리보기의 낙하 개수가 실제로 바뀌는지
      const countAt = async () =>
        (await frame.locator('img, span').evaluateAll(
          (els) => els.filter((el) => /petalFall/.test((el).style?.animation ?? '')).length,
        ).catch(() => -1));

      await slider.fill('0');
      await page.waitForTimeout(2500);
      const zero = await countAt();
      await slider.fill('24');
      await page.waitForTimeout(2500);
      const many = await countAt();

      zero === 0
        ? ok('낙하 양 0 → 미리보기에서 사라짐')
        : bad('0 으로 줬는데도 떨어짐', `개수=${zero}`);
      many > zero
        ? ok('낙하 양 늘리면 미리보기 개수도 늘어남', `${zero} → ${many}`)
        : bad('슬라이더가 미리보기에 반영 안 됨', `${zero} → ${many}`);

      // 라이브 기본값과 같은 9로 돌려놓고 발행합니다
      await slider.fill('9');
      await page.waitForTimeout(2500);

      // 자동저장이 없으므로 여기서 저장해야 발행에 반영됩니다
      const saveEffects = page.getByRole('button', { name: /^저장$/ }).first();
      if (await saveEffects.isEnabled()) {
        await saveEffects.click();
        await page.waitForTimeout(3500);
      }
    }
  } catch (e) {
    bad('연출 폼 검증 실패', String(e).slice(0, 140));
  }

  // 5. 발행
  publishedSlug = `e2e-${stamp}`;
  await page.goto(`${ORIGIN}/app/i/${invitationId}/publish`, { waitUntil: 'networkidle', timeout: 60000 });
  const slugInput = page.locator('input[placeholder="our-wedding"]');
  await slugInput.waitFor({ timeout: 15000 });
  await slugInput.fill(publishedSlug);
  await page.waitForTimeout(4500);

  const pubBtn = page.getByRole('button', { name: /발행하기|변경사항 발행/ }).first();
  if (await pubBtn.isDisabled()) {
    bad('발행 버튼 잠김', (await page.locator('body').innerText()).match(/비어 있는 필수 항목[\s\S]{0,120}/)?.[0]?.replace(/\s+/g, ' ') ?? '');
  } else {
    await pubBtn.click();
    await page.waitForTimeout(9000);
    (await page.locator('body').innerText()).includes('발행되었습니다') ? ok('발행 성공') : bad('발행 결과 화면 없음');

    const viewer = await context.newPage();
    const resp = await viewer.goto(`${ORIGIN}/i/${publishedSlug}`, { waitUntil: 'networkidle', timeout: 60000 });
    resp?.status() === 200 && (await viewer.locator('body').innerText()).includes(marker)
      ? ok('발행된 하객 URL 이 열리고 편집 내용 반영', `/i/${publishedSlug}`)
      : bad('발행된 URL 확인 실패', `status=${resp?.status()}`);
    await viewer.close();
  }

  // 6. 🔴 slug 변경 가드
  await page.goto(`${ORIGIN}/app/i/${invitationId}/publish`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(3500);
  const slug2 = page.locator('input[placeholder="our-wedding"]');
  await slug2.fill(`${publishedSlug}-changed`);
  await page.waitForTimeout(4500);

  (await page.locator('body').innerText()).includes('이미 하객에게 나간 주소를 바꾸려고 해요')
    ? ok('slug 변경 경고 표시')
    : bad('slug 변경 경고 없음');

  const pubBtn2 = page.getByRole('button', { name: /변경사항 발행|발행하기/ }).first();
  (await pubBtn2.isDisabled()) ? ok('체크 전 발행 버튼 잠김') : bad('경고 상태인데 발행 활성 — 가드 무력');
  await page.locator('input[type="checkbox"]').last().check();
  await page.waitForTimeout(1200);
  (await pubBtn2.isDisabled()) ? bad('체크 후에도 잠김') : ok('체크 후 발행 활성화');

  await page.getByRole('button', { name: /원래 주소로 되돌리기/ }).click();
  await page.waitForTimeout(3500);
  (await slug2.inputValue()) === publishedSlug ? ok("'원래 주소로 되돌리기' 복원") : bad('되돌리기 실패');

  await page.screenshot({ path: 'shot-slug-guard.png' });

  // 7. 방명록 관리 — 하객 글 2건을 심어놓고 숨김/삭제를 눌러본다
  try {
    for (const [name, msg] of [['하객가', '축하합니다 1'], ['하객나', '축하합니다 2']]) {
      await fetch(`${API}/invitations/${invitationId}/guestbook`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'User-Agent': UA },
        body: JSON.stringify({ name, msg }),
      });
    }
    await page.goto(`${ORIGIN}/app/i/${invitationId}/guestbook`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(3500);

    let body = await page.locator('body').innerText();
    body.includes('방명록 관리') && !body.includes('디자인 옮기기')
      ? ok('방명록 관리 화면 렌더 (placeholder 아님)')
      : bad('아직 placeholder 이거나 안 열림', body.slice(0, 140));
    body.includes('하객가') && body.includes('하객나') ? ok('방명록 글 목록 표시') : bad('글 목록이 안 보임');

    // 숨기기
    await page.getByRole('button', { name: /^숨기기$/ }).first().click();
    await page.waitForTimeout(3000);
    body = await page.locator('body').innerText();
    body.includes('숨김') && body.includes('다시 보이기')
      ? ok('숨기기 동작 (숨김 배지 + 다시 보이기 버튼)')
      : bad('숨기기 반영 안 됨', body.slice(0, 160));

    // 하객 화면에서 실제로 걸러지는지 — 숨김의 존재 이유
    const guest = await fetch(`${API}/invitations/${invitationId}/guestbook`, { headers: { 'User-Agent': UA } }).then((r) => r.json());
    const names = (guest.data ?? []).map((e) => e.name);
    names.length === 1
      ? ok('숨긴 글이 하객 응답에서 제외됨', `하객에게 보이는 글: ${names.join(', ')}`)
      : bad('숨겼는데 하객에게 그대로 보임', JSON.stringify(names));

    // '숨긴 것만 보기' 필터
    await page.getByRole('button', { name: /숨긴 것만 보기/ }).click();
    await page.waitForTimeout(1500);
    const filtered = await page.locator('li').count();
    filtered === 1 ? ok("'숨긴 것만 보기' 필터 동작") : bad('필터 결과가 이상함', `${filtered}건`);

    await page.screenshot({ path: 'shot-guestbook-admin.png' });
  } catch (e) {
    bad('방명록 관리 검증 실패', String(e).slice(0, 140));
  }

  consoleErrors.length === 0 ? ok('콘솔 에러 0건') : bad(`콘솔 에러 ${consoleErrors.length}건`, consoleErrors.slice(0, 2).join(' | '));
} catch (e) {
  bad('예외로 중단', String(e).slice(0, 250));
} finally {
  if (browser) await browser.close().catch(() => {});
  // ── 뒷정리: 실패해도 반드시 지웁니다 ──
  try {
    if (invitationId) {
      if (!idToken) idToken = await signIn();
      const del = await fetch(`${API}/invitations/${invitationId}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${idToken}`, 'User-Agent': UA },
      }).then((r) => r.json());
      console.log(`\n뒷정리 · 청첩장 삭제: ${del?.ok ? 'OK' : JSON.stringify(del).slice(0, 120)}`);
    }
    if (uid) {
      await admin.auth().deleteUser(uid);
      console.log(`뒷정리 · 테스트 계정 삭제: ${email}`);
    }
  } catch (e) {
    console.log(`⚠️ 뒷정리 실패 — 수동 확인 필요: invitationId=${invitationId} uid=${uid}\n   ${String(e).slice(0, 160)}`);
  }
}

const failed = results.filter((r) => !r.pass).length;
console.log(`\n합계 ${results.length}건 중 통과 ${results.length - failed} / 실패 ${failed}`);
process.exit(failed > 0 ? 1 : 0);
