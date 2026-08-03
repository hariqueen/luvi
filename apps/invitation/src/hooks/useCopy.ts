import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * 클립보드 복사 + "복사됨" 상태 관리.
 * 여러 버튼(계좌·주소·링크)을 key로 구분하며, 복사 후 일정 시간 뒤 초기화됩니다.
 */
export function useCopy(resetMs = 1500) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const timer = useRef<number>();

  const copy = useCallback(
    (text: string, key: string) => {
      try {
        void navigator.clipboard.writeText(text);
      } catch {
        /* 구형 브라우저: 조용히 무시 */
      }
      setCopiedKey(key);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopiedKey(null), resetMs);
    },
    [resetMs],
  );

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const isCopied = useCallback((key: string) => copiedKey === key, [copiedKey]);

  return { copy, isCopied, copiedKey };
}
