/**
 * 에디터 미리보기에서 "섹션 클릭 → 그 섹션 편집 열기" 를 잇는 부분.
 *
 * 에디터는 이 뷰어를 iframe(`?preview=1`)으로 띄웁니다. 하객 화면(미리보기가 아닐 때)에는
 * 래퍼가 아예 붙지 않으므로 레이아웃·동작에 영향이 없습니다.
 *
 * 🔴 테마마다 이 배선을 다시 적지 않습니다 — 한쪽만 고치면 그 디자인에서는 섹션을 눌러도
 *    편집이 열리지 않는데, 화면상으론 멀쩡해 보여서 원인을 찾기 어렵습니다.
 */
import type { MouseEvent, ReactNode } from 'react';
import type { SectionKey } from '@luvi/schema';

export const IS_PREVIEW =
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).has('preview');

/** 미리보기일 때만 섹션을 클릭 대상으로 감쌉니다 */
export function Slot({ section, children }: { section: SectionKey; children: ReactNode }) {
  if (!IS_PREVIEW) return <>{children}</>;
  return (
    <div
      data-preview-section={section}
      className="relative cursor-pointer outline-offset-[-2px] transition-[outline-color] hover:outline hover:outline-2 hover:outline-gold"
    >
      {children}
    </div>
  );
}

/** 클릭한 지점의 섹션 키를 부모(에디터)에게 알립니다 */
export function notifySectionClick(e: MouseEvent) {
  const el = (e.target as HTMLElement).closest('[data-preview-section]');
  const key = el?.getAttribute('data-preview-section');
  if (key) window.parent?.postMessage({ __luviSectionClick: key }, window.location.origin);
}
