/**
 * 자동저장 상태 표시.
 *
 * **실패가 조용히 지나가면 사용자의 작업이 날아갑니다.** 저장됨은 작게, 실패는 눈에 띄게
 * 그리고 재시도 수단과 함께 보여줍니다.
 */
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

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
