# 배경음악 라이선스 증빙

러비가 제공하는 배경음악의 출처와 라이선스 기록입니다.
분쟁이 생겼을 때 "무료 사이트에서 받았다"는 주장만으로는 방어가 되지 않습니다.
**곡을 추가할 때마다 이 표에 한 줄을 추가하세요.**

곡 목록의 실제 단일 소스는 [`packages/schema/src/bgm.ts`](../../packages/schema/src/bgm.ts) 입니다.
이 문서는 법적 증빙이고, 저 파일은 코드가 읽는 카탈로그입니다. 둘은 함께 움직여야 합니다.

## 라이선스

전 곡 **Pixabay Content License** 입니다.

- 상업적 이용 **허용**. 러비가 유료 플랜·광고·장기보관 과금 중 무엇을 하든 재검토가 필요 없습니다
- 출처 표기 의무 **없음**. 청첩장 화면에 크레딧 UI 를 넣지 않아도 됩니다
- 저작권·실연권·음반제작권 세 권리가 한 번에 정리됩니다

### 🔴 금지 사항

- **Standalone 배포 금지.** 음원 자체를 팔거나 가공 없이 그대로 배포할 수 없습니다.
  청첩장 안에 BGM 으로 넣는 것은 정상 사용이지만, **"음원 다운로드" 기능은 만들면 안 됩니다.**
- 곡 목록을 독립된 음원 라이브러리처럼 노출하지 마세요. 청첩장 편집 화면의 일부여야 합니다
- Pixabay 와 경쟁하는 유사 서비스를 만드는 데 쓸 수 없습니다

전 곡에 트리밍·페이드·음량 정규화 가공을 거쳤습니다. 이는 음질 목적이기도 하지만,
"가공 없이 원본과 실질적으로 동일한 형태"가 아님을 보이는 근거이기도 합니다.

## 곡 목록

전 곡 **2026-09-13** 다운로드. 출처 URL 은 `https://pixabay.com/music/id-{ID}/` 형식입니다.

| 표시명 | `id` | 원제 | 업로더 | Pixabay ID | 출처 |
|---|---|---|---|---|---|
| 가든 세레모니 | `garden-glow` | Wedding Garden Ceremony Glow | alex-morgan | 578500 | [링크](https://pixabay.com/music/id-578500/) |
| 따스한 기타 | `warm-guitar` | Wedding - Wedding Music | andriig | 568195 | [링크](https://pixabay.com/music/id-568195/) |
| 그린 필즈 | `green-fields` | Green Fields (Wedding) | leberch | 594956 | [링크](https://pixabay.com/music/id-594956/) |
| 설렘 | `hopeful-vow` | Wedding | leberch | 583086 | [링크](https://pixabay.com/music/id-583086/) |
| 꿈결 | `dreamy-brief` | Wedding | leberch | 584474 | [링크](https://pixabay.com/music/id-584474/) |
| 빛나는 순간 | `dreamy-glow` | Wedding | leberch | 584479 | [링크](https://pixabay.com/music/id-584479/) |
| 노을 | `soft-romance` | Wedding - Wedding Music | PaulYudin | 574002 | [링크](https://pixabay.com/music/id-574002/) |

원제가 대부분 "Wedding" 이라 목록에서 구분이 안 되므로 표시명을 새로 지었습니다.

### 작곡가 정보

- `warm-guitar` 의 작곡가는 Andrii Hroza (BMI IPI: 1336772239) 로 명시되어 있습니다

### AI 생성 표시

`garden-glow`, `dreamy-glow` 는 Pixabay 에서 AI 생성으로 표시된 곡입니다.
Pixabay Content License 가 동일하게 적용되므로 사용에 문제는 없습니다.

### 🔴 Content ID 등록 곡

`green-fields`, `hopeful-vow`, `dreamy-glow`, `soft-romance` 는 **Content ID 에 등록**되어 있습니다.

청첩장 웹페이지 재생에는 아무 영향이 없습니다. Content ID 는 YouTube·Meta 플랫폼 안에서만
작동하고, 러비는 자체 도메인에서 서빙하기 때문입니다.

문제가 되는 곳은 **식전영상(v2)** 입니다. 이 곡을 얹은 영상을 커플이 유튜브나 인스타에
올리면 자동 매칭 클레임이 뜰 수 있습니다. 라이선스상 정당한 사용이라 이의제기하면
풀리지만, 커플이 겪을 일은 아닙니다.

**영상용 음원은 Content ID 미등록 곡에서만 고르세요.** 코드에서는
`videoSafeBgmTracks()` 가 이 필터를 겁니다. 현재 해당하는 곡은 `garden-glow`,
`warm-guitar`, `dreamy-brief` 셋뿐이라, 영상 라인업을 시작하기 전에 보강이 필요합니다.

## 가공 사양

```
페이드 인 2초 / 페이드 아웃 3초 (끝에서 3초 전부터)
음량 정규화 -16 LUFS, True Peak -1.5dB
MP3 128kbps 스테레오 44.1kHz
메타데이터 제거 (-map_metadata -1)
```

원본 음량이 -11.4 ~ -24.5 LUFS 로 **13dB 나 벌어져** 있었습니다. 정규화하지 않으면
미리듣기에서 곡을 넘길 때마다 음량이 튑니다. 가공 후 편차는 1.8dB 입니다.

원본 합계 30MB → 가공 후 15MB.

## 증빙 보관

원본 다운로드 파일(`wedding-music.zip`)은 프로젝트 루트에 보관 중입니다.
**가공본으로 덮어쓰지 마세요.** 원본이 라이선스 증빙의 일부입니다.
