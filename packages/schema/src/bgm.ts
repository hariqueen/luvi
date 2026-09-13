/**
 * 배경음악 목록.
 *
 * 🔴 이 파일이 BGM 의 단일 소스입니다. 곡을 추가할 때는 아래 `BGM_TRACKS` 에
 *    항목을 넣고 R2 `shared/bgm/` 에 파일을 올리면 끝입니다.
 *    에디터의 곡 선택 UI 와 발행 스냅샷이 모두 여기서 파생됩니다.
 *
 * ## 왜 외부 음원 API 를 쓰지 않는가
 *
 * 무료 음원 API(Jamendo 등)는 무료 티어가 **비상업 용도 한정**이라 유료 서비스인
 * 러비가 쓸 수 없습니다. 더 큰 문제는 수명입니다. 청첩장은 발행 후 1년 넘게 살아있는
 * 배포물인데, 외부 CDN 을 핫링크하면 아티스트가 곡을 내리는 순간
 * **이미 하객에게 퍼진 청첩장의 음악이 죽습니다.** 링크는 회수할 수 없습니다.
 *
 * 그래서 음원은 R2 에 직접 올려 서빙합니다. R2 는 egress 과금이 없어서
 * 하객 트래픽이 아무리 늘어도 비용은 스토리지뿐입니다 (공용 1벌, 약 15MB).
 *
 * ## 🔴 곡을 삭제하지 마세요
 *
 * 카탈로그에서 항목을 지우면 **그 곡을 쓴 기존 발행본이 깨집니다.** 목록에서 빼고
 * 싶을 때는 `deprecated: true` 만 세우세요. 에디터 목록에서는 사라지지만
 * 파일은 R2 에 남아 이미 발행된 청첩장은 계속 재생됩니다.
 *
 * ## 라이선스
 *
 * 전 곡 Pixabay Content License 입니다. 상업적 이용이 허용되고 출처 표기 의무가
 * 없어서, 러비의 수익모델이 무엇으로 바뀌든(유료 플랜·광고·장기보관 과금)
 * 음원을 다시 검토할 필요가 없습니다. CC-NC 나 Jamendo 를 피한 이유가 이것입니다.
 *
 * 금지되는 것은 **Standalone 배포** 하나뿐입니다. 청첩장 안에 BGM 으로 넣는 것은
 * 정상 사용이지만, 음원 자체를 내려받게 하는 기능은 만들면 안 됩니다.
 * 곡별 출처와 다운로드 일자는 `docs/legal/bgm-licenses.md` 에 있습니다.
 */

/** 곡 분위기 — 에디터의 필터 칩 기준 */
export type BgmMood = 'warm' | 'bright' | 'calm';

export interface BgmTrack {
  /** 카탈로그 식별자. 발행 스냅샷이 참조하므로 **한 번 정하면 바꾸지 않습니다** */
  id: string;
  /** R2 키. 파일명의 해시 6자리는 콘텐츠 해시로, `immutable` 캐시를 걸기 위한 것입니다 */
  key: string;
  /** 사용자에게 보이는 이름. 원제가 전부 "Wedding" 이라 구분되도록 새로 지었습니다 */
  label: string;
  /** Pixabay 업로더명. 표기 의무는 없지만 증빙 대조용으로 남깁니다 */
  artist: string;
  /** 출처 추적용 Pixabay 트랙 ID (`https://pixabay.com/music/id-{sourceId}/`) */
  sourceId: number;
  mood: BgmMood;
  /** 가공 후 길이(초). 미리듣기 UI 와 총 재생시간 표시에 씁니다 */
  durationSec: number;
  /**
   * YouTube·Meta 의 Content ID 에 등록된 곡입니다. 청첩장 웹페이지 재생에는
   * 아무 영향이 없지만, **식전영상(v2)에 얹어 커플이 유튜브·인스타에 올리면
   * 자동 매칭 클레임이 뜰 수 있습니다.** 이의제기로 풀리긴 해도 커플이 겪을 일은
   * 아니므로, 영상용 음원은 이 플래그가 false 인 곡에서만 고르세요.
   */
  contentIdRegistered: boolean;
  /** Pixabay 에서 AI 생성으로 표시된 곡. 라이선스는 동일하게 적용됩니다 */
  aiGenerated: boolean;
  /** 목록에서만 숨깁니다. 파일과 기존 발행본은 그대로 둡니다 */
  deprecated?: boolean;
}

/**
 * 전 곡 2026-09-13 Pixabay 에서 내려받아 다음 가공을 거쳤습니다.
 * 페이드 인 2초 / 아웃 3초, 음량 -16 LUFS 정규화, MP3 128kbps 스테레오.
 *
 * 원본은 음량이 -11.4 ~ -24.5 LUFS 로 13dB 이나 벌어져 있어서, 정규화 없이는
 * 미리듣기로 곡을 넘길 때마다 음량이 튑니다. 가공 후 편차는 1.8dB 입니다.
 */
export const BGM_TRACKS: BgmTrack[] = [
  {
    id: 'garden-glow',
    key: 'shared/bgm/garden-glow-811612.mp3',
    label: '가든 세레모니',
    artist: 'alex-morgan',
    sourceId: 578500,
    mood: 'warm',
    durationSec: 179,
    contentIdRegistered: false,
    aiGenerated: true,
  },
  {
    id: 'warm-guitar',
    key: 'shared/bgm/warm-guitar-205e7c.mp3',
    label: '따스한 기타',
    artist: 'andriig',
    sourceId: 568195,
    mood: 'warm',
    durationSec: 131,
    contentIdRegistered: false,
    aiGenerated: false,
  },
  {
    id: 'green-fields',
    key: 'shared/bgm/green-fields-4bce8f.mp3',
    label: '그린 필즈',
    artist: 'leberch',
    sourceId: 594956,
    mood: 'calm',
    durationSec: 188,
    contentIdRegistered: true,
    aiGenerated: false,
  },
  {
    id: 'hopeful-vow',
    key: 'shared/bgm/hopeful-vow-3dbda7.mp3',
    label: '설렘',
    artist: 'leberch',
    sourceId: 583086,
    mood: 'bright',
    durationSec: 132,
    contentIdRegistered: true,
    aiGenerated: false,
  },
  {
    id: 'dreamy-brief',
    key: 'shared/bgm/dreamy-brief-72edbd.mp3',
    label: '꿈결',
    artist: 'leberch',
    sourceId: 584474,
    mood: 'bright',
    durationSec: 59,
    contentIdRegistered: false,
    aiGenerated: false,
  },
  {
    id: 'dreamy-glow',
    key: 'shared/bgm/dreamy-glow-e1660c.mp3',
    label: '빛나는 순간',
    artist: 'leberch',
    sourceId: 584479,
    mood: 'bright',
    durationSec: 164,
    contentIdRegistered: true,
    aiGenerated: true,
  },
  {
    id: 'soft-romance',
    key: 'shared/bgm/soft-romance-313f78.mp3',
    label: '노을',
    artist: 'PaulYudin',
    sourceId: 574002,
    mood: 'bright',
    durationSec: 103,
    contentIdRegistered: true,
    aiGenerated: false,
  },
];

/** 에디터 목록용 — `deprecated` 를 걸러냅니다 */
export const activeBgmTracks = (): BgmTrack[] => BGM_TRACKS.filter((t) => !t.deprecated);

/**
 * `deprecated` 곡도 찾습니다. 기존 발행본이 참조하는 곡이라 걸러내면 안 됩니다.
 * 못 찾으면 `undefined` — 호출 측에서 "음악 없음" 으로 처리하세요.
 */
export const findBgmTrack = (id: string): BgmTrack | undefined =>
  BGM_TRACKS.find((t) => t.id === id);

/**
 * R2 키로 프리셋을 찾습니다. `core.bgm` 은 프리셋이든 직접 업로드든 같은 `AssetRef` 라서,
 * 에디터가 "지금 고른 것이 프리셋인가" 를 판단할 때 이걸로 되짚습니다.
 * `deprecated` 곡도 찾습니다 — 이미 그 곡을 고른 청첩장의 편집 화면이 빈칸이 되면 안 됩니다.
 */
export const findBgmTrackByKey = (key: string | undefined | null): BgmTrack | undefined =>
  key ? BGM_TRACKS.find((t) => t.key === key) : undefined;

/** 프리셋 음원의 R2 키 접두사. 직접 업로드는 `inv/{id}/audio/` 로 들어갑니다 */
export const BGM_PRESET_PREFIX = 'shared/bgm/';

/** 영상(v2)에 얹어도 Content ID 클레임 위험이 없는 곡 */
export const videoSafeBgmTracks = (): BgmTrack[] =>
  activeBgmTracks().filter((t) => !t.contentIdRegistered);

export const BGM_MOOD_LABELS: Record<BgmMood, string> = {
  warm: '따뜻한',
  bright: '밝은',
  calm: '차분한',
};
