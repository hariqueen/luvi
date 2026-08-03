# 모바일 청첩장 — classic1

Vite + React + TypeScript + Tailwind CSS 기반의 모바일 청첩장입니다.
모든 콘텐츠(신랑·신부 정보, 일정, 계좌, 갤러리 등)를 설정 파일 하나로 관리하며,
Cloudflare Pages 배포를 전제로 구성했습니다.

## 기술 스택

- **Vite 5** · **React 18** · **TypeScript**
- **Tailwind CSS 3** — 디자인 토큰(`tailwind.config.ts`) 기반 스타일
- **Firebase Firestore** — 방명록·랭킹 저장 (미설정 시 localStorage 폴백)

## 주요 기능

- 커버 · 인사말 · 캘린더(D-day 카운트다운) · 갤러리(라이트박스)
- 캔버스 미니게임 + 실시간 랭킹
- 오시는 길(지도·길찾기) · 마음 전하기(계좌 아코디언) · 방명록
- 배경음악, 꽃잎 애니메이션, 링크 공유(OG 메타)

## 프로젝트 구조

```
classic1/
├── index.html                     # 진입점 (title·og 태그는 빌드 시 주입됨)
├── public/
│   ├── _headers                   # Cloudflare Pages 캐시 규칙
│   └── assets/                    # 이미지·오디오·폰트(woff2 서브셋)
├── src/
│   ├── main.tsx · App.tsx         # 앱 진입 · 페이지 조립
│   ├── index.css                  # Tailwind 지시문 · 전역 스타일 · 키프레임
│   ├── config/
│   │   └── invitation.config.ts   # 모든 청첩장 데이터 (단일 소스)
│   ├── components/
│   │   ├── sections/              # Cover · Greeting · Calendar · Gallery · MiniGame
│   │   │                          #   Location · Account · Guestbook · Footer
│   │   └── common/                # Petals · MusicToggle · Lightbox · SectionHeading · icons
│   ├── hooks/                     # useCountdown · useBgm · useCopy · useGuestbook · useRankings
│   ├── lib/                       # firebase · storage · types
│   ├── game/catchGame.ts          # 캔버스 미니게임 엔진 (프레임워크 독립)
│   └── styles/fonts.css           # @font-face (Pretendard · Cormorant · Nanum Myeongjo)
├── firebase.json · .firebaserc    # Firestore 규칙 배포 설정
├── firestore.rules                # 방명록·랭킹 보안 규칙 (형상 관리 대상)
├── Dockerfile · docker-compose.yml · nginx.conf
└── vite.config.ts · tsconfig.json · tailwind.config.ts · postcss.config.js
```

## 데이터 설정

청첩장 내용은 전부 [`src/config/invitation.config.ts`](src/config/invitation.config.ts) 한 곳에 있습니다.
이 파일의 값(신랑·신부, `weddingAt`, 갤러리, 계좌, 지도, 미니게임 등)만 바꾸면 다른 청첩장으로 재사용할 수 있습니다.
이미지·오디오는 `public/assets/`에 두고 `/assets/...` 절대경로로 참조합니다.

Firebase는 `VITE_FIREBASE_*` 환경변수로 설정하며, 값이 없으면 localStorage로만 동작합니다.

## Firestore 보안 규칙

규칙은 [`firestore.rules`](firestore.rules)에 두고 형상 관리합니다.
콘솔에서 직접 고치면 이 파일과 어긋나므로, **콘솔 대신 이 파일을 고쳐서 배포**하세요.

```bash
npx firebase-tools login                 # 최초 1회
npx firebase-tools deploy --only firestore:rules
```

콘솔 규칙을 내려받는 CLI 명령은 없습니다. 누군가 콘솔에서 직접 고쳤을까 의심되면
Firebase 콘솔 → Firestore Database → 규칙 탭 내용을 이 파일과 눈으로 비교하세요.

규칙 요약 — 로그인이 없는 청첩장이므로:

| 컬렉션 | 읽기 | 생성 | 수정·삭제 |
| --- | --- | --- | --- |
| `guestbook` | 누구나 | 누구나 (`name` 1~20자 · `msg` 1~300자 · 서버시각) | 불가 |
| `rankings` | 누구나 | 누구나 (`nick` 1~20자 · `score` 0~600 · `caught` 0~2000 · 서버시각) | 불가 |
| 그 외 전부 | 불가 | 불가 | 불가 |

`createdAt == request.time` 조건이 `serverTimestamp()`를 강제하므로 클라이언트가 시각을 위조할 수 없습니다.
필드 화이트리스트(`hasOnly`) 때문에 **클라이언트가 보내는 필드를 늘리면 규칙도 같이 고쳐야** 쓰기가 통과합니다.

랭킹 상한은 게임 물리에서 역산했습니다. 체력 100 / 초당 소모 `2 + 경과×0.18` / 최소 낙하 간격 360ms(hard ÷1.3) /
포획 시 +8 이므로 **완벽하게 플레이해도 약 150초가 천장**입니다. 상한 600은 그 4배라 정상 기록은 막지 않으면서
`score: 999999999` 같은 콘솔 조작만 걸러냅니다. 게임 난이도·회복량을 바꾸면 이 상한도 다시 계산하세요.
`score`는 `+elapsed.toFixed(1)`이라 **소수**입니다 — 정수 검사를 넣으면 정상 기록이 전부 막힙니다.

### 방명록·랭킹 글 지우기

`allow update, delete: if false`라서 **웹에서는 지울 수 없습니다.** 욕설·광고가 달리면 이렇게 처리합니다.

1. [Firebase 콘솔](https://console.firebase.google.com/project/wedding-f328e/firestore) → Firestore Database → 데이터
2. `guestbook`(또는 `rankings`) 컬렉션에서 해당 문서 선택
3. 문서 오른쪽 ⋮ → **문서 삭제**

되돌릴 수 없으니 지우기 전에 `name`·`msg`를 따로 적어두세요.
신랑·신부에게 콘솔 계정을 넘기기 전까지는 **연락을 받아 대신 지워주는 절차**로 운영합니다.

## 공유 미리보기

공유 경로가 두 가지이고, 각각 다른 방식으로 표시됩니다.

| 공유 방식 | 표시 | 렌더링 주체 |
| --- | --- | --- |
| URL을 복사해 붙여넣기 | og 태그 미리보기 (버튼 없음) | 빌드 시 주입된 `og:*` |
| 청첩장 하단 **카카오톡으로 공유** 버튼 | 피드 템플릿 + `청첩장 보기`·`일정 등록` 버튼 | [`src/lib/kakao.ts`](src/lib/kakao.ts) |

카카오 정책상 **공유 API로 보낸 메시지에만 버튼이 붙습니다.**
받은 사람이 URL만 다시 복사해 전달하면 og 미리보기로 돌아가므로, 양쪽 다 맞춰 두어야 합니다.

**문구는 [`invitation.config.ts`](src/config/invitation.config.ts)의 `share` 한 곳에서만 고치세요.**
`index.html`에는 og 태그가 없습니다 — [`vite.config.ts`](vite.config.ts)의 `ogTags` 플러그인이
빌드 시 config를 읽어 `<title>`·`description`·`og:*`를 주입합니다.
두 경로가 같은 값을 쓰므로 카카오 공유와 URL 미리보기가 어긋날 수 없습니다.

`share.description`의 `\n`은 **카카오 피드에선 줄바꿈**, **og 태그에선 ` · `** 로 렌더됩니다.
한 문장을 두 형식으로 쓰기 위한 것이니 줄바꿈 위치만 신경 쓰면 됩니다.

`og:site_name`은 카카오가 제목 **위 작은 글씨**로 표시합니다. `share.title`과 같은 값을 넣으면
제목이 두 번 보이므로 브랜드명(`Luvi`)을 넣습니다.

`og:image`와 `og:url`은 **반드시 절대 URL**이어야 합니다. 상대경로면 카카오톡에서 이미지가 뜨지 않습니다.
플러그인이 `share.url`을 기준으로 `share.image`를 절대 URL로 바꿔주므로 config에는 `/assets/...`로 적으면 됩니다.
미리보기 카드는 가로형이라 세로 사진은 위아래가 잘립니다 (현재 `couple_c.jpg` 1000×667 사용).
다른 이미지로 바꾸면 `share.imageWidth`·`imageHeight`도 실제 크기로 같이 고치세요.

### 카카오 공유 설정

1. [카카오 디벨로퍼스](https://developers.kakao.com/console/app)에서 애플리케이션 추가
2. **앱 설정 > 플랫폼 > Web**에 사이트 도메인 등록 (`https://luvi-wedding.pages.dev`)
   — 등록하지 않으면 공유 호출이 실패합니다
3. **앱 키 > JavaScript 키**를 `VITE_KAKAO_JS_KEY`로 설정
   - 로컬: `.env`
   - 배포: Cloudflare Pages > Settings > Environment variables (Production·Preview 양쪽)
4. 배포 후 [카카오 공유 디버거](https://developers.kakao.com/tool/debugger/sharing)에서 URL 캐시 초기화

키가 비어 있으면 공유 버튼은 숨겨지고 나머지 기능은 정상 동작합니다.
`도메인 미등록` 오류가 나면 2번을, 미리보기가 예전 이미지로 뜨면 4번을 확인하세요.

### 링크 도메인 제한 (주의)

카카오는 **메시지에 들어가는 모든 링크의 도메인**을 등록된 웹 도메인과 대조하며,
이는 콘텐츠 링크뿐 아니라 **버튼 링크에도 적용**됩니다.
미등록 도메인은 사용할 수 없어 버튼이 동작하지 않습니다.

그래서 `일정 등록` 버튼은 구글 캘린더를 직접 가리키지 않고 **자기 도메인을 경유**합니다.

```
[일정 등록] → https://luvi-wedding.pages.dev/?calendar=1   (등록된 도메인)
                        ↓ main.tsx가 렌더 전에 감지
              calendar.google.com/calendar/render?...
```

경유 처리는 [`src/lib/calendar.ts`](src/lib/calendar.ts)의 `redirectToCalendarIfRequested()`에 있고
[`src/main.tsx`](src/main.tsx) 최상단에서 호출합니다.
**외부 서비스로 보내는 버튼을 추가할 때는 같은 방식으로 자기 도메인을 거치게 하세요.**
