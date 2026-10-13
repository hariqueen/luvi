/**
 * 미니게임 기록의 **물리적 상한**.
 *
 * 랭킹 등록은 비로그인 경로라 서버가 "이 값이 가능한 값인가" 를 스스로 따져야 합니다.
 * 예전에는 `score <= 600 && caught <= 2000` 처럼 **넉넉한 상자**만 쳐뒀는데, 그 상자 안에는
 * 게임으로는 절대 나올 수 없는 값이 얼마든지 들어갑니다 (600초 생존 · 2000개 획득).
 *
 * 그래서 엔진이 실제로 만들어낼 수 있는 최대치를 계산해 그것과 비교합니다.
 *
 * 🔴 **여기 상수는 `apps/invitation/src/game/catchGame.ts` 의 값과 같아야 합니다.**
 *    엔진 난이도를 바꾸면 이 파일도 함께 바꾸세요 — 안 그러면 더 어려워진 게임의
 *    정상 기록이 거부되거나(값을 낮게 두면), 조작이 통과합니다(높게 두면).
 *
 * 계산 근거 (엔진 루프와 1:1로 대응합니다):
 *
 *  · 생성 간격   `max(360, 880 - 경과*9) / 난이도계수` ms
 *  · 받을 수 있는 것은 생성된 것의 80% (나머지는 피해야 하는 벌)
 *  · 체력        100 에서 시작, 초당 `2 + 경과*0.18` 씩 줄고, 하나 받을 때마다 +8
 *
 * 체력이 0 이 되면 끝나므로 **생존 시간에는 천장이 있습니다.** 완벽하게 플레이해도
 * 획득으로 버는 체력(초당 `8 × 0.8 × 생성속도`)이 소모를 못 따라가는 순간부터는
 * 남은 체력 100 을 까먹으며 버티는 것뿐이고, 그 시간까지 더한 값이 이론상 최대입니다.
 * (normal 기준 약 121초 — 실제 리더보드 상위권이 118~122초에 몰려 있는 것과 맞습니다.)
 */

export type GameSpeed = 'easy' | 'normal' | 'hard';

/** 엔진 `speedFactor()` 와 같은 값 */
const SPEED_FACTOR: Record<GameSpeed, number> = { easy: 0.8, normal: 1, hard: 1.3 };

/** 생성 간격(초) — 엔진은 ms 로 두지만 여기서는 적분하려고 초로 둡니다 */
const SPAWN_BASE = 0.88;
const SPAWN_DECAY = 0.009;
const SPAWN_MIN = 0.36;

/** 받아야 하는 것의 비율 (`Math.random() < 0.8`) */
const GOOD_RATIO = 0.8;

const HP_MAX = 100;
const HP_GAIN = 8;
const DRAIN_BASE = 2;
const DRAIN_RAMP = 0.18;

/** 생성 간격이 최소값에 닿는 시각 */
const KNEE = (SPAWN_BASE - SPAWN_MIN) / SPAWN_DECAY;

/**
 * 판정에 쓰는 여유분.
 *
 * 계산은 연속 모델이고 엔진은 프레임 단위라 둘이 몇 %는 어긋납니다. 좁게 잡아 **정상 기록을
 * 거부하는 쪽이** 넓게 잡아 조작 하나를 놓치는 쪽보다 나쁩니다 — 하객이 방금 세운 기록이
 * 사라지면 그건 우리 서비스의 고장으로 보입니다. 조작은 세션 토큰이 따로 막습니다.
 */
const MARGIN = 1.2;

export function speedFactor(speed: string | undefined): number {
  return SPEED_FACTOR[(speed ?? '') as GameSpeed] ?? SPEED_FACTOR.normal;
}

/**
 * `seconds` 동안 생성될 수 있는 최대 개수.
 *
 * 간격이 시간에 따라 줄어드는 구간(0~KNEE)은 적분이 로그로 떨어지고, 그 뒤는 일정합니다.
 */
export function maxSpawns(seconds: number, sf: number): number {
  if (!(seconds > 0)) return 0;

  const ramp = Math.min(seconds, KNEE);
  let n = (sf / SPAWN_DECAY) * Math.log(SPAWN_BASE / (SPAWN_BASE - SPAWN_DECAY * ramp));
  if (seconds > KNEE) n += (sf * (seconds - KNEE)) / SPAWN_MIN;
  return n;
}

/**
 * 이론상 최대 생존 시간(초).
 *
 * 체력이 늘지 않기 시작하는 시각 = `8 × 0.8 × (최대 생성속도)` 와 소모가 같아지는 때이고,
 * 그 뒤로는 적자가 `0.09 × (경과)²` 로 쌓여 100 을 넘기면 끝납니다.
 */
export function maxSurvivalSeconds(sf: number): number {
  const peakGain = (HP_GAIN * GOOD_RATIO * sf) / SPAWN_MIN;
  const breakEven = Math.max(0, (peakGain - DRAIN_BASE) / DRAIN_RAMP);
  return breakEven + Math.sqrt(HP_MAX / (DRAIN_RAMP / 2));
}

export interface PlausibilityInput {
  score: number;
  caught: number;
  /**
   * 난이도 후보들. 발행본과 초안을 **둘 다** 넘기고 가장 너그러운 쪽으로 판정합니다 —
   * 하객이 게임을 하는 도중에 주인이 난이도를 낮춰 발행하면, 방금 정직하게 세운 기록이
   * 거부됩니다. 2026-10-13 저녁에 실제로 발행이 5번 일어났고 그 사이 난이도가 바뀌었습니다.
   */
  speeds: (string | undefined)[];
}

/** 기록이 **이 게임으로 나올 수 있는 값인지**. 통과하면 `null`, 아니면 거부 사유. */
export function implausibleReason(input: PlausibilityInput): string | null {
  const sf = Math.max(...input.speeds.map(speedFactor));

  const scoreCap = maxSurvivalSeconds(sf) * MARGIN;
  if (input.score > scoreCap) {
    return `생존 시간이 이 게임에서 나올 수 있는 최대치를 넘습니다`;
  }

  /**
   * 받은 개수는 "그 시간 동안 떨어진 **좋은** 것" 을 넘을 수 없습니다.
   *
   * 🔴 `GOOD_RATIO` 를 빼먹지 마세요. 떨어지는 것의 20% 는 피해야 하는 벌이고, 벌은
   *    받아도 `caught` 가 오르지 않습니다(체력만 깎입니다). 전체 생성 개수와 비교하면
   *    상한이 25% 헐거워져, 물리적으로 불가능한 기록이 그대로 통과합니다.
   */
  const caughtCap = maxSpawns(input.score, sf) * GOOD_RATIO * MARGIN;
  if (input.caught > caughtCap) {
    return `받은 개수가 그 시간 동안 떨어진 개수보다 많습니다`;
  }

  return null;
}
