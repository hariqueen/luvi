/**
 * ContentDoc 안의 값을 **점 경로**('core.greeting.message')로 읽고 씁니다.
 *
 * 에디터의 모든 필드는 매니페스트의 `field.path` 로 자기 값을 가리킵니다 (FieldRenderer).
 * 여기서는 그 경로 하나로 읽기(getPath)와 불변 쓰기(setPath)를 처리해,
 * 화면 컴포넌트가 중첩 구조를 직접 파고들지 않게 합니다.
 *
 * 🔴 **배열 인덱스 경로는 지원하지 않습니다** (`core.gallery.0`). 서버가 배열을 통째로만
 *    받으므로(patch.ts), 배열은 항상 전체를 setPath('core.gallery', nextArray) 로 교체합니다.
 */

/** 점 경로로 중첩 값을 읽습니다. 없으면 undefined. */
export function getPath(root: unknown, path: string): unknown {
  let cursor: unknown = root;
  for (const seg of path.split('.')) {
    if (cursor === null || typeof cursor !== 'object') return undefined;
    cursor = (cursor as Record<string, unknown>)[seg];
  }
  return cursor;
}

/**
 * 점 경로에 값을 넣은 **새 객체**를 돌려줍니다 (원본 불변).
 * 경로를 따라가며 지나는 객체만 얕게 복제하므로, 바뀌지 않은 가지는 참조가 유지됩니다.
 */
export function setPath<T>(root: T, path: string, value: unknown): T {
  const segments = path.split('.');
  const clone = (obj: unknown): Record<string, unknown> =>
    obj && typeof obj === 'object' && !Array.isArray(obj)
      ? { ...(obj as Record<string, unknown>) }
      : {};

  const next = clone(root);
  let cursor = next;
  for (let i = 0; i < segments.length - 1; i += 1) {
    const seg = segments[i] as string;
    cursor[seg] = clone(cursor[seg]);
    cursor = cursor[seg] as Record<string, unknown>;
  }
  cursor[segments[segments.length - 1] as string] = value;
  return next as T;
}

/**
 * 여러 경로를 한 번에 씁니다. 자동저장이 모아둔 변경분을 한 문서에 반영할 때 씁니다.
 */
export function setPaths<T>(root: T, patch: Record<string, unknown>): T {
  let out = root;
  for (const [path, value] of Object.entries(patch)) {
    out = setPath(out, path, value);
  }
  return out;
}
