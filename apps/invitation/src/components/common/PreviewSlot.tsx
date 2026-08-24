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

/**
 * 클릭한 지점을 부모(에디터)에게 알립니다.
 *
 * **글자를 눌렀으면 그 글자**(`data-preview-block`), 아니면 그 섹션(`data-preview-section`).
 * 글자를 우선하는 이유: 문구는 섹션 안에 있으므로 섹션만 알리면 "이 글자를 고치고 싶어서
 * 눌렀는데 카드 편집만 열린다" 가 됩니다. 블록까지 알려주면 에디터가 그 줄에 커서를 둡니다.
 */
export function notifySectionClick(e: MouseEvent) {
  const target = e.target as HTMLElement;
  const post = (message: Record<string, unknown>) =>
    window.parent?.postMessage(message, window.location.origin);

  const block = target.closest('[data-preview-block]')?.getAttribute('data-preview-block');
  if (block) {
    // 'section:zone:id' — 문자열 하나로 보냅니다 (구조를 맞추다 어긋나면 원인 찾기가 어렵습니다)
    const [section, zone, ...rest] = block.split(':');
    if (section && zone && rest.length > 0) {
      post({ __luviBlockClick: { section, zone, id: rest.join(':') } });
      return;
    }
  }

  const key = target.closest('[data-preview-section]')?.getAttribute('data-preview-section');
  if (key) post({ __luviSectionClick: key });
}

/**
 * 미리보기에서 **그 자리에서 고친 글자**를 부모(에디터)에게 보냅니다.
 *
 * 에디터가 이 값을 초안에 반영하면 초안이 다시 미리보기로 내려옵니다 — 그래서 편집 중인
 * 글자를 다시 덮어쓰지 않도록, 받는 쪽(`CardText`)이 **포커스된 요소의 DOM 은 건드리지
 * 않습니다.** 안 그러면 한 글자 칠 때마다 커서가 맨 앞으로 튑니다.
 */
export function notifyBlockEdit(
  section: string,
  zone: string,
  id: string,
  text: string,
  /**
   * 편집을 **마쳤는지**(포커스가 빠졌는지). 에디터는 이때만 "다 지운 텍스트 상자를
   * 없앤다" 를 판단합니다 — 타이핑 도중에 없애면 전부 선택해 새로 쓰려던 사람의 커서가
   * 사라집니다 (`Editable.tsx` 의 `final`).
   */
  final: boolean,
) {
  window.parent?.postMessage(
    { __luviBlockEdit: { section, zone, id, text, final } },
    window.location.origin,
  );
}

/**
 * 미리보기에서 고친 **초안 값**을 부모(에디터)에게 보냅니다.
 *
 * `path` 는 폼의 입력칸이 쓰는 것과 같은 점 경로입니다 — 그래서 미리보기에서 고쳐도
 * 폼에서 고친 것과 완전히 같은 저장 경로를 지납니다(검증·이력·자동저장 전부 그대로).
 */
export function notifyFieldEdit(path: string, value: string) {
  window.parent?.postMessage({ __luviFieldEdit: { path, value } }, window.location.origin);
}
