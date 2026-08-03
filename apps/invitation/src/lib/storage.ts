/**
 * localStorage 안전 래퍼.
 * Firebase가 없거나 실패했을 때의 폴백 저장소로 사용됩니다.
 */

export function loadArray<T>(key: string, fallback: T[]): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const value = JSON.parse(raw);
    return Array.isArray(value) ? (value as T[]) : fallback;
  } catch {
    return fallback;
  }
}

export function saveArray<T>(key: string, value: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* 용량 초과·프라이빗 모드 등은 조용히 무시 */
  }
}

/** 저장소 키 (원본과 동일하게 유지해 기존 방문자 데이터 호환) */
export const STORAGE_KEYS = {
  leaderboard: 'wed_mini_lb_v1',
  guestbook: 'wed_gb_v1',
} as const;
