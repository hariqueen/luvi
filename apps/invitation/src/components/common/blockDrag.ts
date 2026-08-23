/**
 * 미리보기에서 **문구를 집어 옮기기** — PPT 에서 텍스트 상자를 끄는 감각.
 *
 * 왜 여기(에디터 패널이 아니라 미리보기)인가: 순서를 바꾸는 일은 **보면서** 하는 일입니다.
 * 왼쪽 목록의 ▲▼ 버튼으로 옮기면 눈은 오른쪽 미리보기를 보고 손은 왼쪽을 누르게 되고,
 * 한 번 누를 때마다 어디로 갔는지 다시 확인해야 합니다. 옮길 대상을 직접 집는 게 자연스럽습니다.
 *
 * 왜 자유 좌표(x·y)가 아닌가: 카드의 높이는 콘텐츠(달력·지도·방명록 목록)에 따라 변하고
 * 하객의 폰 폭도 다릅니다. 좌표로 저장하면 **다른 폰에서 글자가 달력 위에 겹칩니다.**
 * 그래서 "어느 자리(카드 위/콘텐츠 아래)의 몇 번째" 로 떨어뜨립니다 — 끄는 감각은 같고,
 * 결과는 어떤 화면에서도 깨지지 않습니다. (커버는 배경이 고정 비율이라 좌표를 씁니다)
 *
 * 🔴 React 상태를 쓰지 않고 DOM 을 직접 다룹니다. 삽입선 하나를 그리려고 섹션마다 흩어진
 *    `CardText` 들이 상태를 공유하게 만들면 배선이 훨씬 커집니다. 드래그는 편집 화면에서만
 *    잠깐 사는 UI 라 이쪽이 단순합니다.
 */
const ZONES = ['head', 'foot'] as const;

interface Spot {
  zone: string;
  index: number;
  /** 삽입선을 그릴 화면 y */
  y: number;
  left: number;
  width: number;
}

interface Session {
  section: string;
  zone: string;
  id: string;
  line: HTMLElement;
  spot: Spot | null;
  onMove: (e: PointerEvent) => void;
  onUp: () => void;
}

let session: Session | null = null;

/** 떨어뜨릴 수 있는 자리들 — 블록 사이사이 + 빈 자리 */
function spots(section: string): Spot[] {
  const out: Spot[] = [];
  for (const zone of ZONES) {
    const zoneEl = document.querySelector<HTMLElement>(`[data-preview-zone="${section}:${zone}"]`);
    if (!zoneEl) continue;
    const zr = zoneEl.getBoundingClientRect();
    const blocks = Array.from(zoneEl.querySelectorAll<HTMLElement>('[data-preview-block]'));

    // 빈 자리 — 여기로도 옮길 수 있어야 합니다 (문구가 없는 자리에 처음 넣는 경우)
    if (blocks.length === 0) {
      out.push({ zone, index: 0, y: zr.top + zr.height / 2, left: zr.left, width: zr.width });
      continue;
    }
    blocks.forEach((b, i) => {
      const r = b.getBoundingClientRect();
      out.push({ zone, index: i, y: r.top, left: zr.left, width: zr.width });
      if (i === blocks.length - 1) {
        out.push({ zone, index: i + 1, y: r.bottom, left: zr.left, width: zr.width });
      }
    });
  }
  return out;
}

function paint(line: HTMLElement, spot: Spot) {
  line.style.top = `${spot.y - 1}px`;
  line.style.left = `${spot.left}px`;
  line.style.width = `${spot.width}px`;
  line.style.opacity = '1';
}

function end() {
  if (!session) return;
  const { line, onMove, onUp, section, zone, id, spot } = session;
  window.removeEventListener('pointermove', onMove);
  window.removeEventListener('pointerup', onUp);
  window.removeEventListener('pointercancel', onUp);
  line.remove();
  delete document.body.dataset.luviDragging;
  session = null;

  if (!spot) return;
  // 제자리인지 판단은 에디터가 합니다 (지금 목록의 진짜 순서는 초안이 알고 있습니다)
  window.parent?.postMessage(
    {
      __luviBlockMove: { section, fromZone: zone, id, toZone: spot.zone, toIndex: spot.index },
    },
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
  if (session) end();

  const line = document.createElement('div');
  line.setAttribute('data-luvi-drop-line', '');
  line.style.cssText =
    'position:fixed;height:2px;background:#C9A063;box-shadow:0 0 0 1px rgba(201,160,99,.35);' +
    'z-index:120;pointer-events:none;opacity:0;transition:opacity .1s;border-radius:2px';
  document.body.appendChild(line);
  document.body.dataset.luviDragging = '1';

  const onMove = (ev: PointerEvent) => {
    if (!session) return;
    const list = spots(target.section);
    let best: Spot | null = null;
    let bestGap = Infinity;
    for (const s of list) {
      const gap = Math.abs(s.y - ev.clientY);
      if (gap < bestGap) {
        bestGap = gap;
        best = s;
      }
    }
    session.spot = best;
    if (best) paint(line, best);
  };
  const onUp = () => end();

  session = { ...target, line, spot: null, onMove, onUp };
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
  onMove(e);
}
