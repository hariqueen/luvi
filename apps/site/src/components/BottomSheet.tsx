/**
 * 3단 스냅 바텀시트 — 모바일 에디터의 핵심 컴포넌트.
 *
 * peek(핸들만) / half(입력 2~3개) / full(섹션 전체) 로 드래그 전환합니다.
 *
 * 주의할 점 두 가지 (여기서 막히면 모바일 편집이 사실상 불가능해집니다):
 *  1. **가상 키보드** — 입력에 포커스가 가면 키보드가 시트를 밀어올립니다.
 *     `visualViewport` 를 관찰해 시트 높이를 보정하지 않으면 활성 필드가 키보드에 가립니다.
 *  2. **`100vh` 금지** — iOS Safari 의 하단 크롬 때문에 잘립니다. `100dvh` 를 씁니다.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';

export type SheetSnap = 'peek' | 'half' | 'full';

const HEIGHT: Record<SheetSnap, string> = {
  peek: '76px',
  half: '46dvh',
  full: 'calc(100dvh - 96px)',
};

interface Props {
  title: string;
  snap: SheetSnap;
  onSnapChange: (snap: SheetSnap) => void;
  onDone?: () => void;
  children: ReactNode;
}

export function BottomSheet({ title, snap, onSnapChange, onDone, children }: Props) {
  const [keyboardInset, setKeyboardInset] = useState(0);
  const dragStart = useRef<number | null>(null);

  /** 가상 키보드가 가리는 높이를 구한다 (visualViewport 미지원 브라우저는 0) */
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      const hidden = window.innerHeight - vv.height - vv.offsetTop;
      setKeyboardInset(Math.max(0, Math.round(hidden)));
    };
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);

  const order: SheetSnap[] = ['peek', 'half', 'full'];

  /** 드래그 방향으로 한 단계 이동. 세밀한 추적보다 스냅이 손에 잘 맞는다. */
  const handlePointerUp = (e: React.PointerEvent) => {
    if (dragStart.current === null) return;
    const dy = e.clientY - dragStart.current;
    dragStart.current = null;
    if (Math.abs(dy) < 24) return;

    const i = order.indexOf(snap);
    const next = dy < 0 ? order[Math.min(i + 1, 2)] : order[Math.max(i - 1, 0)];
    if (next && next !== snap) onSnapChange(next);
  };

  return (
    <div
      className="absolute inset-x-0 bottom-0 z-20 flex flex-col overflow-hidden rounded-t-[20px] bg-surface text-ink shadow-[0_-12px_40px_-16px_rgba(0,0,0,.35)] transition-[height] duration-200"
      style={{ height: HEIGHT[snap], paddingBottom: keyboardInset }}
    >
      {/* 핸들 — 터치 타깃을 넉넉히 준다 */}
      <div
        role="button"
        tabIndex={0}
        aria-label="패널 크기 조절"
        onPointerDown={(e) => (dragStart.current = e.clientY)}
        onPointerUp={handlePointerUp}
        onClick={() => onSnapChange(snap === 'full' ? 'half' : 'full')}
        className="flex flex-none cursor-grab touch-none justify-center py-2.5"
      >
        <span className="h-1 w-9 rounded-full bg-line-strong" />
      </div>

      <div className="flex flex-none items-center gap-2.5 px-4 pb-2.5">
        <h2 className="flex-1 truncate text-[14.5px] font-extrabold tracking-[-.03em]">{title}</h2>
        {onDone && (
          <button
            type="button"
            onClick={onDone}
            className="flex-none rounded-lg bg-ink px-4 py-2 text-[12.5px] text-paper-soft"
          >
            완료
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">{children}</div>
    </div>
  );
}
