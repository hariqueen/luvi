/**
 * 에디터 상태를 폼 트리 전체에 나눠줍니다.
 *
 * FieldRenderer 는 SectionManager·바텀시트·데스크톱 폼 열 등 **여러 곳에서 깊게 중첩**되어
 * 렌더됩니다. 값/변경/업로드를 props 로 내려주면 전부 통과 배선이 되므로 컨텍스트로 둡니다.
 *
 * 실제 doc 상태와 자동저장 스케줄은 Editor 가 소유하고, 여기에는 그 접근자만 실립니다.
 */
import { createContext, useContext } from 'react';
import type { AssetRef, ContentDoc } from '@luvi/schema';

export interface EditorContextValue {
  invitationId: string;
  doc: ContentDoc;
  /** 점 경로로 값을 읽습니다 (없으면 undefined). */
  get: (path: string) => unknown;
  /** 점 경로에 값을 쓰고 자동저장을 예약합니다. 배열은 통째로 넘깁니다. */
  set: (path: string, value: unknown) => void;
  /** 이미지 파일을 업로드하고 AssetRef 를 돌려줍니다. 저장은 호출부가 set 으로 합니다. */
  uploadImage: (path: string, file: File, alt?: string) => Promise<AssetRef>;
  /** MP3 음원 업로드 → AssetRef. */
  uploadAudio: (file: File) => Promise<AssetRef>;
}

const EditorContext = createContext<EditorContextValue | null>(null);

export const EditorProvider = EditorContext.Provider;

export function useEditor(): EditorContextValue {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error('useEditor 는 EditorProvider 안에서만 쓸 수 있습니다');
  return ctx;
}
