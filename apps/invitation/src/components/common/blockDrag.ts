/**
 * 미리보기에서 **문구를 집어 원하는 자리에 놓기** — PPT 에서 텍스트 상자를 끄는 감각.
 *
 * 왜 여기(에디터 패널이 아니라 미리보기)인가: 위치는 **보면서** 정하는 일입니다. 왼쪽
 * 목록의 버튼으로 옮기면 눈은 오른쪽 미리보기를 보고 손은 왼쪽을 누르게 되고, 한 번
 * 누를 때마다 어디로 갔는지 다시 확인해야 합니다.
 *
 * 좌표는 **카드 박스 기준 비율**로 저장합니다(`data-preview-frame`). 하객의 폰 폭이
 * 미리보기 폭과 다르므로 px 로 저장하면 위치가 어긋납니다 — 커버 문구가 같은 이유로
 * 비율을 씁니다. `pos` 가 붙은 순간 그 문구는 흐름에서 빠져나와 절대 배치됩니다.
 *
 * ⚠️ 자유 배치는 카드 높이가 콘텐츠(달력·지도·방명록 목록)에 따라 달라지는 만큼, 폰
 *    크기가 다르면 글자가 콘텐츠 위에 겹칠 수 있습니다. 사용자가 그걸 알고 쓰는 기능이고,
 *    되돌리는 길(툴바의 '흐름으로')을 함께 둡니다.
 *
 * 🔴 끄는 동안에는 **DOM 을 직접 옮깁니다**(`transform`). 움직일 때마다 부모에게 좌표를
 *    보내 초안을 갱신하면, 매 프레임마다 미리보기 전체가 다시 그려져 끊깁니다. 손을
 *    떼는 순간에만 최종 좌표를 보냅니다.
 */
interface Session {
  section: string;
  zone: string;
  id: string;
  el: HTMLElement;
  frame: HTMLElement;
  startX: number;
  startY: number;
  moved: boolean;
  onMove: (e: PointerEvent) => void;
  onUp: (e: PointerEvent) => void;
}

let session: Session | null = null;

/** 이 문구가 속한 카드 박스 — 좌표의 기준 */
function frameOf(el: HTMLElement): HTMLElement | null {
  return el.closest<HTMLElement>('[data-preview-frame]');
}

function finish() {
  if (!session) return;
  const { el, frame, section, zone, id, moved, onMove, onUp } = session;
  window.removeEventListener('pointermove', onMove);
  window.removeEventListener('pointerup', onUp);
  window.removeEventListener('pointercancel', onUp);
  delete document.body.dataset.luviDragging;
  el.style.zIndex = '';
  session = null;

  if (!moved) {
    el.style.transform = '';
    return;
  }

  // 지금 화면에 보이는 자리를 그대로 좌표로 굳힙니다 (정렬 기준점에 맞춰)
  const r = el.getBoundingClientRect();
  const f = frame.getBoundingClientRect();
  const align = window.getComputedStyle(el).textAlign;
  const anchorX = align === 'left' ? r.left : align === 'right' ? r.right : r.left + r.width / 2;
  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  const x = clamp((anchorX - f.left) / Math.max(1, f.width));
  const y = clamp((r.top + r.height / 2 - f.top) / Math.max(1, f.height));

  // 초안이 갱신되면 그 좌표로 다시 그려지므로, 임시로 밀어둔 값은 지웁니다
  el.style.transform = '';
  window.parent?.postMessage(
    { __luviBlockPlace: { section, zone, id, x, y } },
    window.location.origin,
  );
}

/** 손잡이(⠿)를 눌렀을 때 — 문구 하나를 끌기 시작합니다 */
export function startBlockDrag(
  e: PointerEvent,
  target: { section: string; zone: string; id: string },
) {
  // 글자가 contentEditable 이라 그대로 두면 드래그가 '글자 선택' 이 됩니다
  e.preventDefault();
  e.stopPropagation();
  if (session) finish();

  const handle = e.currentTarget as HTMLElement | null;
  const el = handle?.closest<HTMLElement>('[data-preview-block]') ?? null;
  const frame = el ? frameOf(el) : null;
  if (!el || !frame) return;

  document.body.dataset.luviDragging = '1';
  el.style.zIndex = '10';

  const onMove = (ev: PointerEvent) => {
    if (!session) return;
    const dx = ev.clientX - session.startX;
    const dy = ev.clientY - session.startY;
    if (!session.moved && Math.abs(dx) + Math.abs(dy) < 3) return; // 손떨림은 무시
    session.moved = true;
    el.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
  };
  const onUp = () => finish();

  session = {
    ...target,
    el,
    frame,
    startX: e.clientX,
    startY: e.clientY,
    moved: false,
    onMove,
    onUp,
  };
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
}
