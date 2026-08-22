/**
 * 최근 사용한 색 — 색 고르기 컨트롤들이 함께 보는 짧은 목록.
 *
 * 왜 필요한가: 청첩장 하나에서 색을 고르는 곳이 여러 곳입니다 (커버 문구 여러 개,
 * 섹션마다의 배경색). 같은 색을 맞추려면 매번 HEX 를 다시 치거나 색상표에서 눈대중으로
 * 찾아야 했습니다. 방금 쓴 색 몇 개를 그대로 다시 누를 수 있으면 그게 사라집니다.
 *
 * 브라우저(localStorage)에만 둡니다 — 청첩장 문서에 저장할 값이 아니고(하객 화면과 무관),
 * 저장 버튼을 누르지 않아도 남아 있어야 합니다.
 *
 * 🔴 **기록은 미룹니다(디바운스).** 색상표를 끌면 `input[type=color]` 가 중간 색을
 *    수십 번 흘려보내는데, 그걸 그대로 쌓으면 목록 3칸이 드래그 잔여물로 채워집니다.
 *    마지막 값만 남기려고 `REMEMBER_DELAY` 만큼 기다립니다.
 */
import { useEffect, useState } from 'react';
import { normalizeHexColor } from '@luvi/schema';

/** 보여줄 개수. 늘리면 컨트롤 한 줄이 길어져 좁은 화면에서 접힙니다 */
export const RECENT_COLOR_MAX = 3;

const STORAGE_KEY = 'luvi:recentColors';
const REMEMBER_DELAY = 700;

let cache: string[] | null = null;
const listeners = new Set<(colors: string[]) => void>();
let timer: ReturnType<typeof setTimeout> | null = null;

function read(): string[] {
  if (cache) return cache;
  try {
    const raw = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]') as unknown;
    const list = Array.isArray(raw) ? raw : [];
    cache = list
      .filter((c): c is string => typeof c === 'string')
      .map((c) => normalizeHexColor(c))
      .filter((c): c is string => c !== null)
      .slice(0, RECENT_COLOR_MAX);
  } catch {
    // 저장 값이 깨져 있어도 색 고르기는 계속 동작해야 합니다
    cache = [];
  }
  return cache;
}

function write(colors: string[]): void {
  cache = colors;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(colors));
  } catch {
    // 사파리 비공개 모드처럼 저장이 막힌 환경 — 이번 세션 동안만 기억합니다
  }
  listeners.forEach((fn) => fn(colors));
}

/** 지금 목록. 컴포넌트 밖(이벤트 핸들러)에서 읽을 때 씁니다 */
export function recentColors(): string[] {
  return read();
}

/**
 * 이 색을 최근 목록 맨 앞으로. 같은 색은 위로 올라오고, 넘치는 꼬리는 잘립니다.
 * 실제 기록은 `REMEMBER_DELAY` 뒤에 한 번만 일어납니다 (드래그 중간값 버리기).
 */
export function rememberColorSoon(color: string): void {
  const normalized = normalizeHexColor(color);
  if (!normalized) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    const next = [normalized, ...read().filter((c) => c !== normalized)].slice(
      0,
      RECENT_COLOR_MAX,
    );
    write(next);
  }, REMEMBER_DELAY);
}

/** 최근 목록을 구독합니다 — 한 곳에서 색을 고르면 열려 있는 다른 컨트롤도 같이 갱신됩니다 */
export function useRecentColors(): string[] {
  const [colors, setColors] = useState<string[]>(read);
  useEffect(() => {
    listeners.add(setColors);
    // 구독 사이에 바뀐 값이 있을 수 있습니다 (다른 컨트롤이 방금 기록한 경우)
    setColors(read());
    return () => {
      listeners.delete(setColors);
    };
  }, []);
  return colors;
}
