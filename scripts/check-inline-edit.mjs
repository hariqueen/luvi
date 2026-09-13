/**
 * **글자 하나를 받는 자리는 한 곳이어야 합니다.** 그걸 기계로 확인합니다.
 *
 * 뷰어가 그리는 글자는 미리보기에서 눌러 바로 고칩니다(`Editable` 의 `Field`). 그런 값을
 * 폼에도 두면 같은 일을 하는 자리가 두 곳이 되어, 어느 쪽이 원본인지 헷갈리고 왼쪽을
 * 고치면서 눈은 오른쪽을 봐야 합니다. 그래서 매니페스트에 `previewEdit: true` 를 붙여
 * 폼에서 뺍니다 (`FieldRenderer` 가 그 필드를 그리지 않습니다).
 *
 * 🔴 **이건 사람이 기억할 수 있는 종류의 일이 아닙니다.** 인라인 편집을 새로 붙이면서
 *    `previewEdit` 를 빠뜨리면 폼에 입력칸이 그대로 남고, 화면상으론 멀쩡해 보입니다.
 *    실제로 스크롤 안내·요일 머리글·남은 날짜 단위 등 9개가 그렇게 중복으로 남았습니다.
 *
 *    반대 실수는 더 나쁩니다: 인라인이 없는 값에 `previewEdit` 를 붙이면 폼에서도
 *    사라져 **고칠 길이 아예 없어집니다.** 두 방향을 모두 잡습니다.
 *
 * 쓰는 법: `npm run check:inline`
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST = path.join(ROOT, 'packages/schema/src/manifest.ts');
const VIEWER = path.join(ROOT, 'apps/invitation/src');

/** 매니페스트의 모든 필드 — repeat 안의 하위 필드까지 */
function manifestFields() {
  const src = fs.readFileSync(MANIFEST, 'utf8');
  const found = new Map();
  // 한 줄짜리 필드 리터럴
  for (const m of src.matchAll(/\{[^{}]*?path:\s*'([^']+)'[^{}]*?\}/gs)) {
    if (!found.has(m[1])) found.set(m[1], /previewEdit:\s*true/.test(m[0]));
  }
  /**
   * 여러 줄에 걸친 필드 리터럴.
   *
   * 🔴 **다음 `path:` 앞에서 끊습니다.** 그러지 않으면 `repeat` 컨테이너
   *    (`core.location.transport`) 의 창이 그 안의 하위 필드까지 삼켜서, 하위 필드의
   *    `previewEdit` 를 컨테이너의 것으로 잘못 읽습니다.
   */
  for (const m of src.matchAll(/path:\s*'([^']+)',\s*\n([\s\S]{0,600}?)(?=\n\s*\},|path:\s*')/g)) {
    if (!found.has(m[1])) found.set(m[1], /previewEdit:\s*true/.test(m[2]));
  }
  return [...found].map(([p, previewEdit]) => ({ path: p, previewEdit }));
}

/** 뷰어에서 인라인으로 고쳐지는 경로 (템플릿 리터럴은 `*` 로 둡니다) */
function inlinePaths() {
  const files = [];
  (function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const f = path.join(dir, e.name);
      if (e.isDirectory()) walk(f);
      else if (/\.tsx?$/.test(e.name)) files.push(f);
    }
  })(VIEWER);

  const out = new Set();
  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8');
    // <Field path="core.x" /> · path={`core.couple.${key}.parentsLine`}
    for (const m of src.matchAll(/path=\{?["'`]([^"'`]+)["'`]\}?/g)) {
      if (/^(core|theme)\./.test(m[1])) out.add(m[1].replace(/\$\{[^}]+\}/g, '*'));
    }
    // 값을 직접 올리는 자리 (요일 머리글처럼 합쳐 보내는 것)
    for (const m of src.matchAll(/notifyFieldEdit\(\s*\n?\s*['"`]([^'"`]+)['"`]/g)) out.add(m[1]);
    for (const m of src.matchAll(/_PATH\s*=\s*'([^']+)'/g)) out.add(m[1]);
  }
  return out;
}

const inline = inlinePaths();
const isInline = (p) => {
  if (inline.has(p)) return true;
  // repeat 안의 하위 필드는 상대 경로입니다 ('title') — 뷰어는 절대 경로로 그립니다
  // ('core.location.transport.*.title'). 끝 마디로 맞춥니다.
  if (!/^(core|theme)\./.test(p)) {
    for (const k of inline) if (k.endsWith('.' + p)) return true;
    return false;
  }
  for (const k of inline) {
    if (!k.includes('*')) continue;
    const re = new RegExp('^' + k.split('*').map((s) => s.replace(/[.]/g, '\\.')).join('[^.]+') + '$');
    if (re.test(p)) return true;
  }
  return false;
};

const fields = manifestFields();
const duplicated = fields.filter((f) => isInline(f.path) && !f.previewEdit);
const unreachable = fields.filter((f) => f.previewEdit && !isInline(f.path));

if (duplicated.length === 0 && unreachable.length === 0) {
  console.log(`✓ 필드 ${fields.length}개 — 글자를 받는 자리가 전부 한 곳입니다`);
  process.exit(0);
}

if (duplicated.length) {
  console.error('\n✗ 폼과 미리보기 양쪽에서 받는 값 — 매니페스트에 previewEdit: true 를 붙이세요');
  for (const f of duplicated) console.error(`    ${f.path}`);
}
if (unreachable.length) {
  console.error('\n✗ 폼에도 없고 미리보기에도 없는 값 — 고칠 길이 없습니다');
  console.error('  previewEdit 를 떼거나, 뷰어에서 그 값을 Field 로 그리세요');
  for (const f of unreachable) console.error(`    ${f.path}`);
}
console.error('');
process.exit(1);
