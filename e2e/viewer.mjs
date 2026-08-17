/**
 * 하객 뷰어 실브라우저 E2E.
 *
 * 기본은 읽기 전용이라 프로덕션에 아무 때나 돌려도 안전합니다.
 * `--write` 를 주면 방명록 등록까지 해보고, 지워야 할 이름을 마지막에 출력합니다.
 *
 * 실행법은 e2e/README.md 참고 (이 머신엔 node 가 없어 Docker 로 돌립니다).
 */
import { chromium, devices } from 'playwright';

const ORIGIN = process.env.LUVI_ORIGIN ?? 'https://luv-ai.co.kr';
const SLUG = process.env.LUVI_SLUG ?? 'hoseok-songhee';
const DO_WRITE = process.argv.includes('--write');

const results = [];
const ok = (n, d = '') => { results.push({ pass: true, n, d }); console.log(`  ✅ ${n}${d ? `\n        ${d}` : ''}`); };
const bad = (n, d = '') => { results.push({ pass: false, n, d }); console.log(`  ❌ ${n}${d ? `\n        ${d}` : ''}`); };

const browser = await chromium.launch();
const context = await browser.newContext({ ...devices['iPhone 13'], locale: 'ko-KR' });
const page = await context.newPage();

const consoleErrors = [];
const failedRequests = [];
const apiCalls = [];
const firestoreCalls = [];

page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200)); });
page.on('requestfailed', (r) => failedRequests.push(`${r.method()} ${r.url().slice(0, 110)} — ${r.failure()?.errorText}`));
page.on('request', (r) => {
  const u = r.url();
  if (u.includes('/api/invitations/') || u.includes('/api/public/')) {
    apiCalls.push(`${r.method()} ${u.replace(/^https:\/\/[^/]+/, '')}`);
  }
  // Firebase SDK 를 제거했으므로 여기 걸리면 회귀입니다
  if (u.includes('firestore.googleapis.com') || u.includes('identitytoolkit')) firestoreCalls.push(u.slice(0, 110));
});

let wroteName = '';
try {
  await page.goto(`${ORIGIN}/i/${SLUG}`, { waitUntil: 'networkidle', timeout: 60000 });

  const title = await page.title();
  title && title !== '모바일 청첩장' ? ok('탭 제목이 청첩장 값으로 교체됨', title) : bad('탭 제목', title);

  const body = await page.locator('body').innerText();

  // 🔴 옛 스냅샷엔 showBubble 키가 없습니다. 어댑터가 `!== false` 로 읽어야 보입니다.
  body.includes('놀러 와주실 거죠')
    ? ok('말풍선 보임 (showBubble 없는 옛 스냅샷 폴백)')
    : bad('말풍선이 사라졌다 — adapter 의 showBubble !== false 확인');

  // 방명록이 새 API 경로로 그려지는지
  const gbCall = apiCalls.find((c) => c.includes('/guestbook'));
  gbCall ? ok('방명록을 워커 API 로 호출', gbCall) : bad('방명록 API 호출 없음', JSON.stringify(apiCalls));

  firestoreCalls.length === 0
    ? ok('Firestore 직접 호출 0건 (Firebase SDK 제거 유지)')
    : bad('Firestore 를 직접 호출함 — 회귀', firestoreCalls.join(' | '));

  const imgs = await page.evaluate(() =>
    Array.from(document.images).map((i) => ({ src: i.currentSrc || i.src, loaded: i.complete && i.naturalWidth > 0 })),
  );
  const broken = imgs.filter((i) => !i.loaded && i.src);
  broken.length === 0
    ? ok(`이미지 전부 로드 (${imgs.length}개)`)
    : bad(`깨진 이미지 ${broken.length}개`, broken.map((b) => b.src.slice(-55)).join(', '));

  if (DO_WRITE) {
    // ⚠️ 이름 input 은 maxLength=10 — 넘기면 잘려 저장돼 오탐이 납니다
    const stamp = `E2E${Date.now().toString().slice(-6)}`;
    await page.locator('input[type="text"], input:not([type])').first().fill(stamp);
    await page.locator('textarea').first().fill('E2E 검증용 — 지워주세요');
    const before = apiCalls.filter((c) => c.startsWith('POST')).length;
    await page.getByRole('button', { name: /남기기|등록|작성|저장/ }).first().click();
    await page.waitForTimeout(4000);
    apiCalls.filter((c) => c.startsWith('POST')).length > before
      ? (ok('방명록 POST 전송'), (wroteName = stamp))
      : bad('방명록 POST 안 나감');
    (await page.locator('body').innerText()).includes(stamp)
      ? ok('등록한 글이 화면에 반영')
      : bad('등록했지만 화면에 없음');
  }

  consoleErrors.length === 0 ? ok('콘솔 에러 0건') : bad(`콘솔 에러 ${consoleErrors.length}건`, consoleErrors.join(' | '));
  failedRequests.length === 0 ? ok('실패 요청 0건') : bad(`실패 요청 ${failedRequests.length}건`, failedRequests.join(' | '));

  await page.screenshot({ path: 'shot-viewer.png', fullPage: false });
} catch (e) {
  bad('예외로 중단', String(e).slice(0, 250));
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.pass).length;
console.log(`\n합계 ${results.length}건 중 통과 ${results.length - failed} / 실패 ${failed}`);
if (wroteName) console.log(`CLEANUP_NAME=${wroteName}  ← 이 이름의 방명록 글을 지워주세요`);
process.exit(failed > 0 ? 1 : 0);
