# Luvi

내 손으로 만들고, 보낸 뒤에도 고칠 수 있는 청첩장.

- 브랜드: **Luvi (러비)** = Love + AI
- 도메인: **luv-ai.co.kr**
- 기획 문서: `../docs/` (`README.md` → `06-next-steps.md` 순으로 보세요)

---

## 스택

하나로 통일했습니다 — **TypeScript + React + Vite + Tailwind**, API도 같은 언어입니다.

| 계층 | 선택 | 이유 |
|------|------|------|
| 프론트 | Vite 5 + React 18 + TS + Tailwind 3 | classic1이 이미 이 구성이라 빌드 체계가 하나로 유지된다 |
| API | **Cloudflare Workers + Hono** (REST) | 프론트와 같은 TS. Python 백엔드를 없애 언어를 통일 |
| DB | Firebase Firestore | 배포된 청첩장의 방명록 실데이터가 이미 있고, 보안 규칙으로 백엔드 없이 클라이언트 접근이 된다 |
| 인증 | Firebase Auth (이메일·구글·카카오) | 카카오는 Worker에서 커스텀 토큰 브릿지 필요 |
| 에셋 | Cloudflare R2 | egress 무료. 이미지 변환은 브라우저에서 (Cloudflare Images는 유료) |
| 캐시 | Workers KV | 발행 스냅샷. **하객 페이지뷰당 Firestore 읽기 0회** |

무료 티어 안에서 운영하는 것이 전제입니다 (`../docs/02-architecture.md §7`).

---

## 구조

```
luvi/
├─ apps/
│  ├─ site/           메인 사이트 — 브랜드 + 대시보드 + 에디터
│  └─ invitation/     청첩장 뷰어 (classic1 테마) ← 하객이 보는 화면
├─ packages/
│  ├─ schema/         콘텐츠 스키마 · 테마 매니페스트 · REST API 계약
│  ├─ api-client/     REST 클라이언트
│  └─ ui/             디자인 토큰 · Tailwind 프리셋
└─ workers/
   └─ api/            REST API (Hono)
```

`site` 와 `invitation` 을 분리한 이유: 뷰어는 하객 트래픽 전부를 받으므로 번들이 최소여야 합니다.
에디터·인증 코드가 섞이면 하객이 쓰지 않는 수백 KB를 다운받게 됩니다.

---

## 시작하기

> ⚠️ **Google Drive 경로에서는 `npm ci` 가 EBADF로 깨집니다.**
> exit code는 0으로 나오지만 `node_modules/.bin` 이 생성되지 않아 `tsc`·`vite` 실행 파일이 없습니다.
> **개발은 로컬 디스크에서 하세요.** 이 폴더를 GitHub에 올리고 로컬 디스크로 clone 하는 것이
> 장기적으로 가장 깔끔합니다 (Drive 동기화 + node_modules 조합도 좋지 않습니다).

```bash
npm install

npm run dev              # 메인 사이트  → http://localhost:5173
npm run dev:invitation   # 청첩장 뷰어  → http://localhost:5174
npm run dev:api          # REST API     → http://localhost:8787

npm run typecheck        # 전체 타입 검사
npm run build            # 전체 빌드
```

### Node 버전

**Node 20 이상이 필요합니다.** 현재 이 PC의 Node는 `v18.16.0` 이라 `npm install` 시
engine 경고가 납니다 (설치·빌드는 됩니다). Node 18은 지원 종료된 버전이니 20 LTS로 올리는 편이 좋습니다.

`wrangler` 는 검증된 3.x로 고정해 뒀습니다. 4.x로 올리려면 Node 20+ 가 먼저 필요합니다.

사이트 개발 서버는 `/api` 를 `localhost:8787` 로 프록시하므로 CORS 설정 없이 바로 붙습니다.

모노레포 루트에 `.env` 를 두고 값을 채우세요. 필요한 키는 `apps/site/src/lib/firebase.ts`·
`workers/api/wrangler.toml` 의 주석에 어느 콘솔에서 받는 값인지 적혀 있습니다.
(예시 파일 `.env.example` 은 두지 않습니다 — 1인 저장소라 실제 `.env` 가 곧 원본이고,
템플릿을 따로 두면 키가 추가될 때 한쪽이 뒤처집니다. 배포용 비밀값은 저장소 밖
`../.secrets/` 에 있습니다.)

배포된 API 의 설정 누락은 `/health` 로 확인합니다 (값은 노출하지 않고 있음/없음만):

```bash
curl https://luvi-api.<계정>.workers.dev/health
```

---

## 현재 구현 상태

| 영역 | 상태 |
|------|------|
| 디자인 토큰 · Tailwind 프리셋 | ✅ 디자인 산출물에서 추출 완료 |
| 콘텐츠 스키마 · 테마 매니페스트 | ✅ 필드 정의까지 완료 |
| REST API 계약 (타입) | ✅ 확정 |
| **API 구현** | ✅ **Firestore · KV · R2 실연동 완료** — 목 데이터 제거. 소유권 검사·발행 스냅샷·업로드까지 |
| **로그인 4종** | ✅ **동작** — 이메일·구글은 Firebase Auth 직접, 카카오·네이버는 Worker 커스텀 토큰 브릿지. 키는 `.env` · `wrangler secret` 에 넣는다 |
| **커버 자유 배치** | ✅ 드래그·서식·전체화면 문구 편집 동작. 사진 업로더만 연결 필요 |
| **섹션 추가·제거·순서** | ✅ 동작 (필수 섹션은 제거 버튼 미노출) |
| 에디터 레이아웃 (3단 반응형 + 바텀시트) | ✅ 껍데기 완성 — 값 저장(자동저장)은 API 는 준비됨, 화면 연결 남음 |
| 클레임 (인계) | 🟡 API 완성. **코드 발급 관리자 화면이 없어** Firestore 콘솔에서 직접 넣어야 함 |
| 마케팅 화면 (B1~B5) | ✅ **전부 완성** — 홈(`routes/home/`), 모바일 청첩장, 식전영상, 초대장(`routes/card/`), 템플릿 갤러리. 자리표시자는 제거됐다 |
| 청첩장 뷰어 | ✅ 동작 (단, 콘텐츠가 아직 빌드타임 상수) |

### API 구조

```
workers/api/src/
├─ index.ts          라우트 · 검증 · 권한
├─ lib/
│  ├─ firestore.ts   Firestore REST 클라이언트 (Admin SDK 는 Workers 에서 못 씀)
│  ├─ googleAuth.ts  서비스 계정 → 액세스 토큰 (모듈 캐시)
│  ├─ idToken.ts     Firebase ID 토큰 검증 ← API 전체의 자물쇠
│  ├─ customToken.ts 카카오·네이버용 커스텀 토큰 서명
│  ├─ snapshot.ts    발행 스냅샷 (KV)
│  ├─ patch.ts       자동저장 경로 검증
│  ├─ diff.ts        초안↔발행본 비교 · 필수항목 검사
│  └─ secrets.ts     업로드 서명 · IP 해시
└─ repo/             Firestore 문서 ↔ 타입 변환
```

지켜야 하는 규칙 세 가지:

1. **청첩장을 건드리는 라우트는 전부 `requireOwned()` 를 통과합니다.** ID 만 알면 남의 청첩장을
   고칠 수 있는 상태가 되면 안 됩니다.
2. **Firestore PATCH 에는 항상 `updateMask` 를 붙입니다.** 마스크 없이 PATCH 하면 본문에 없는
   필드가 **삭제됩니다** — 인사말만 저장했는데 갤러리가 사라지는 사고가 이렇게 납니다.
3. **`weddingAt` 을 Firestore timestamp 로 저장하지 않습니다.** `'2026-10-24T13:00:00'` 은
   타임존 없는 한국 시간 표기라 timestamp 로 넣으면 UTC 로 해석되어 D-day 가 9시간 어긋납니다.

복합 색인이 필요한 쿼리는 쓰지 않았습니다 (색인 배포가 별도 작업이라). 소유자별 목록처럼
정렬이 함께 필요한 경우는 등호로만 가져와 Worker 에서 정렬합니다.

### 에디터 편집 모델

에디터에 두 가지 편집 방식이 한 화면에 있습니다.

| 대상 | 방식 |
|------|------|
| **커버** | 사진 위 텍스트를 **자유 배치** — 드래그·정렬·색·크기·글꼴. 탭하면 전체화면 문구 편집 |
| **나머지 섹션** | 매니페스트에서 생성되는 **폼** + 섹션 추가·제거·순서 변경 |

🔴 **커버 좌표는 px 가 아니라 비율(0~1)로 저장합니다.** 에디터는 데스크톱 기기 프레임(≈390px 상당)
안에서 편집하지만 하객은 실제 폰 폭(320~430px)에서 봅니다. px 로 저장하면 **하객 화면에서 위치가
어긋납니다.** 폰트 크기도 캔버스 **폭** 대비 비율입니다. 계산은 `packages/schema/src/layers.ts`
한 곳에만 두고 에디터·뷰어가 공유합니다 — 한쪽만 바뀌면 두 화면이 달라집니다.

섹션 순서는 `sections: SectionKey[]` 배열 하나로 관리합니다 (배열에 있으면 포함, 순서가 곧 화면 순서).
boolean 맵으로는 순서를 표현할 수 없습니다. `features` 는 섹션이 아닌 전역 연출(BGM·꽃잎)만 담습니다.

순서 변경은 **드래그가 아니라 ↑↓ 버튼**입니다. 캔버스의 텍스트 드래그와 달리 리스트 정렬은
터치 스크롤과 충돌해 오작동이 잦습니다. 버튼은 느리지만 실패하지 않습니다.

### 디자인 옮기는 방법

`../docs/design/Luvi.dc.html` 이 클로드 디자인 산출물입니다.
각 섹션에 `data-screen-label="B1 홈"` 같은 표시가 있고, 자리표시자 화면에 같은 코드를 적어뒀습니다.
`src/routes/Home.tsx` 를 열면 어느 섹션을 보면 되는지 나옵니다.

색·폰트는 이미 `packages/ui/src/tokens.ts` 로 추출했으니 **인라인 스타일을 Tailwind 클래스로 바꾸면
됩니다** (예: `background:#F7F5F1` → `bg-bg`, `color:#C9A063` → `text-gold`).

---

## 다음 할 일

`../docs/06-next-steps.md` 가 실행 목록입니다. 이 프로젝트 기준으로 가장 시급한 것:

1. **키 넣고 Worker 배포** — `.env` 채우기 + `wrangler secret put`. 이게 없으면 아래가 다 막힌다
2. **뷰어를 런타임 데이터로** — `apps/invitation/src/config/invitation.config.ts` 의 상수를
   `@luvi/schema` 의 `ContentDoc` 으로 바꿔 props로 주입받게 한다. **이게 전체의 핵심 작업이다**
3. **전역 `guestbook`/`rankings` → 서브컬렉션 이관** — 두 번째 청첩장을 만들기 전에 끝내야 한다.
   API 는 이미 서브컬렉션을 읽으므로, 이관 전에는 배포된 청첩장의 방명록이 대시보드에 보이지 않는다
4. 에디터 자동저장 연결 (`PATCH /api/invitations/:id` 는 준비됨)
5. 사진 업로더 연결 (`api.assets.upload()` 한 번 호출하면 됨)
6. **공개용 샘플 청첩장 발행** — B5 갤러리에 라이브 데모를 걸려면 필요하다. 뷰어는 발행된
   청첩장(`/i/{slug}`)만 그리므로, 샘플 하나를 발행해 그 슬러그를 `routes/Samples.tsx` 에 건다
7. 클레임 코드 발급 관리자 화면

### 배포 전환 (주의)

지금 `https://luvi-wedding.pages.dev/` 는 **별도 레포(`hariqueen/Luvi-wedding`)에서 빌드되고 있고,
하객에게 이미 공유된 URL입니다.** 이 모노레포로 전환할 때:

- Cloudflare Pages의 빌드 루트를 `apps/invitation` 으로 바꿔야 합니다
- `*.pages.dev` 서브도메인은 프로젝트 간 이동이 불가하므로, 그 Pages 프로젝트를 그대로 두고
  빌드 소스만 갈아끼웁니다 (`../docs/02-architecture.md §3` 경우 B)
- 전환 직전 커밋을 태그로 고정해 롤백 경로를 확보하세요. **다운타임이 곧 사고입니다**

원본 `classic1/` 은 아직 지우지 않았습니다. 전환이 검증된 뒤에 정리하세요.
