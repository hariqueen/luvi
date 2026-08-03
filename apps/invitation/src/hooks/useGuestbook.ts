import { useCallback, useEffect, useState } from 'react';
import { addGuestbook, loadGuestbook } from '@/lib/firebase';
import { loadArray, saveArray, STORAGE_KEYS } from '@/lib/storage';
import type { GuestbookEntry } from '@/lib/types';

/**
 * 방명록: 최초엔 localStorage로 즉시 렌더 → Firebase 데이터가 오면 대체.
 * 등록 시 로컬을 낙관적으로 갱신하고 Firebase에도 기록.
 */
export function useGuestbook() {
  const [entries, setEntries] = useState<GuestbookEntry[]>(() =>
    loadArray<GuestbookEntry>(STORAGE_KEYS.guestbook, []),
  );

  useEffect(() => {
    let alive = true;
    loadGuestbook().then((remote) => {
      if (alive && remote) setEntries(remote);
    });
    return () => {
      alive = false;
    };
  }, []);

  const submit = useCallback((name: string, msg: string): boolean => {
    const n = name.trim();
    const m = msg.trim();
    if (!n || !m) return false;

    setEntries((prev) => {
      const next = [{ name: n, msg: m, ts: Date.now() }, ...prev].slice(0, 50);
      saveArray(STORAGE_KEYS.guestbook, next);
      return next;
    });
    void addGuestbook(n, m);
    return true;
  }, []);

  return { entries, submit };
}
