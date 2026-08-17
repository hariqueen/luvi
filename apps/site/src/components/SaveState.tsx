/**
 * 저장 상태 표시.
 *
 * **실패가 조용히 지나가면 사용자의 작업이 날아갑니다.** 저장됨은 작게, 실패는 눈에 띄게
 * 그리고 재시도 수단과 함께 보여줍니다.
 *
 * `dirty` 는 "고쳤지만 아직 서버에 안 보냈다" 는 뜻입니다 — 자동저장이 없으므로
 * 이 표시가 사용자에게 저장을 눌러야 한다고 알려주는 유일한 신호입니다.
 */
export type SaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

interface Props {
  status: SaveStatus;
  /** 마지막 저장 시각 (표시용) */
  savedAt?: string;
  onRetry?: () => void;
}

export function SaveState({ status, savedAt, onRetry }: Props) {
  if (status === 'error') {
    return (
      <button
        type="button"
        onClick={onRetry}
        className="flex-none rounded-md bg-gold-deep px-2.5 py-1 text-[11px] font-semibold text-white"
      >
        저장 실패 · 다시 시도
      </button>
    );
  }

  if (status === 'dirty') {
    return <span className="flex-none whitespace-nowrap text-[11px] text-gold">저장 안 됨</span>;
  }

  if (status === 'saving') {
    return <span className="flex-none text-[11px] text-muted">저장 중…</span>;
  }

  if (status === 'saved') {
    return (
      <span className="flex-none whitespace-nowrap text-[11px] text-success">
        ✓{savedAt ? ` ${savedAt}` : ''}
      </span>
    );
  }

  return null;
}
