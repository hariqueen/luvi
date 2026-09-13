/**
 * 가려둔 값 + "보기".
 *
 * 🔴 **이 컴포넌트의 목적은 편의가 아니라 기록입니다.**
 *
 * 원문을 처음부터 보여주면, 목록을 스크롤한 것만으로 회원 전원의 연락처를 본 것이
 * 됩니다. 그건 열람 기록으로 남길 수도 없고 남길 의미도 없습니다. 그래서
 * **눌러야 펼쳐지고, 누른 순간이 서버에 남습니다** (`admin_user_reveal`).
 *
 * 그래서 규칙이 둘 있습니다:
 *  ① `onReveal` 을 화면 그릴 때 미리 부르지 마세요. 누를 때만 부릅니다.
 *  ② 한 번 펼친 값을 다른 화면으로 넘겨 재사용하지 마세요. 기록이 사실과 어긋납니다.
 *
 * 펼친 뒤에는 다시 접을 수 있게 두었습니다. 화면 공유·어깨너머를 생각하면
 * 원문이 계속 떠 있을 이유가 없습니다. 접어도 기록은 남은 채입니다.
 */
import { useState } from 'react';

interface MaskedValueProps {
  /** 마스킹된 표시값. 값 자체가 없으면 null */
  masked: string | null;
  /** 누르면 원문을 가져옵니다. 이 호출이 서버에 기록을 남깁니다 */
  onReveal: () => Promise<string | null>;
  /** 값이 없을 때 보여줄 문구 */
  emptyLabel?: string;
}

type State =
  | { kind: 'masked' }
  | { kind: 'loading' }
  | { kind: 'revealed'; value: string | null }
  | { kind: 'error'; message: string };

export function MaskedValue({ masked, onReveal, emptyLabel = '없음' }: MaskedValueProps) {
  const [state, setState] = useState<State>({ kind: 'masked' });

  if (!masked) return <span className="text-muted-faint">{emptyLabel}</span>;

  async function reveal() {
    setState({ kind: 'loading' });
    try {
      setState({ kind: 'revealed', value: await onReveal() });
    } catch (e) {
      setState({ kind: 'error', message: e instanceof Error ? e.message : '가져오지 못했어요' });
    }
  }

  if (state.kind === 'revealed') {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className="select-all">{state.value ?? emptyLabel}</span>
        <button
          type="button"
          onClick={() => setState({ kind: 'masked' })}
          className="text-[11px] text-muted-faint hover:text-muted"
        >
          접기
        </button>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-muted">{masked}</span>
      <button
        type="button"
        disabled={state.kind === 'loading'}
        onClick={() => void reveal()}
        title="누르면 원문이 보이고, 본 기록이 남습니다"
        className="rounded border border-line-strong px-1.5 py-px text-[11px] text-muted hover:border-gold hover:text-gold-deep disabled:opacity-50"
      >
        {state.kind === 'loading' ? '…' : '보기'}
      </button>
      {state.kind === 'error' && (
        <span className="text-[11px] text-gold-deep">{state.message}</span>
      )}
    </span>
  );
}
