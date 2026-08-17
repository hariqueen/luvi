# E2E (실브라우저 검증)

프로덕션을 실제 Chromium 으로 띄워 확인합니다. API·번들 레벨 검증으로는
"화면이 정말 맞는지" 를 알 수 없어서 추가했습니다.

이 머신엔 node 가 없으므로 **Docker 로 실행**합니다 (Playwright 공식 이미지에 브라우저 포함).

## 1. 하객 뷰어 — `viewer.mjs`

로그인 불필요. 기본은 **읽기 전용**이라 아무 때나 돌려도 안전합니다.

```bash
docker run --rm -v "$PWD/e2e:/work" -w /work \
  mcr.microsoft.com/playwright:v1.47.0-jammy \
  bash -c "npm i -s playwright@1.47.0 && node viewer.mjs"
```

검증 항목: 탭 제목·신랑신부 이름·**말풍선 폴백**(옛 스냅샷엔 `showBubble` 키가 없어
`!== false` 로 읽어야 보인다)·방명록이 **워커 API** 로 그려지는지·**Firestore 직접 호출 0건**
(Firebase SDK 제거 확인)·이미지 로드·콘솔 에러.

방명록 쓰기까지 보려면 `--write` 를 붙입니다. 글이 실제로 하나 생기므로
출력 끝의 `CLEANUP_NAME=` 이름으로 지워야 합니다 (콘솔 또는 Admin SDK).

```bash
… bash -c "npm i -s playwright@1.47.0 && node viewer.mjs --write"
```

## 2. 에디터·발행 — `editor.mjs`

**일회용 테스트 계정 + 테스트 청첩장을 스스로 만들고, 끝나면 지웁니다**
(`try/finally` 라 중간에 실패해도 정리됩니다). 라이브 청첩장은 건드리지 않습니다.

서비스 계정 키와 웹 apiKey 가 필요합니다 — 경로·값은 `운영노트.md` 참고.

```bash
KEY="../luvi/wedding-f328e-firebase-adminsdk-fbsvc-1bbbd6072b.json"   # 실제 경로로
docker run --rm -v "$PWD/e2e:/work" -w /work \
  -v "$(cd "$(dirname "$KEY")" && pwd)/$(basename "$KEY"):/tmp/sa.json:ro" \
  -e LUVI_WEB_API_KEY="$(grep -E '^VITE_FIREBASE_API_KEY=' ../.env | cut -d= -f2-)" \
  mcr.microsoft.com/playwright:v1.47.0-jammy \
  bash -c "npm i -s playwright@1.47.0 firebase-admin && node editor.mjs"
```

검증 항목: 이메일 로그인 → 대시보드 → 에디터 진입 → **우측 미리보기 iframe 에 초안 렌더**
→ **미리보기 섹션 클릭 시 해당 폼 열림** → 편집 → **자동저장(✓)** → **미리보기 실시간 반영**
→ 슬러그 중복확인 → **발행** → 발행된 하객 URL 확인 → **slug 변경 가드**(경고·버튼 잠김·
체크 후 활성·되돌리기).

> ⚠️ 발행 단계에서 `e2e-…` 슬러그로 공개 청첩장이 1~2분 존재하다가 삭제됩니다.
> 어디에도 링크되지 않습니다.

## 알아둘 것

- 이름 input 은 `maxLength={10}` 입니다. 그보다 긴 값을 넣고 원문으로 단정하면
  "저장은 됐는데 화면에 없다" 는 오탐이 납니다 (실제로 한 번 겪음).
- 로그인 화면의 `로그인` 은 모드 탭에도 있어 이름으로 찾으면 2개가 잡힙니다.
  `form button[type="submit"]` 으로 특정하세요.
- 샘플 초안은 커버 사진이 비어 있어 그대로는 발행이 잠깁니다. `editor.mjs` 가
  업로드(sign → PUT → 초안 패치)까지 해서 채웁니다 — 업로드 경로도 같이 검증됩니다.
- 업로드 PUT 은 URL 토큰 **말고도** `Authorization: Bearer` 가 필요합니다(uid 를 헤더에서 읽음).
