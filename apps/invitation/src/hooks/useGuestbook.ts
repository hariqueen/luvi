import { useCallback, useEffect, useState } from 'react';
import { fetchGuestbook, postGuestbook } from '@/lib/guestApi';
import { useInvitation } from '@/lib/invitationContext';
import { loadArray, saveArray, STORAGE_KEYS } from '@/lib/storage';
import type { GuestbookEntry } from '@/lib/types';

/**
 * 방명록: 최초엔 localStorage로 즉시 렌더 → 서버 데이터가 오면 대체.
 * 등록 시 로컬을 낙관적으로 갱신하고 서버에도 기록합니다.
 *
 * `invitationId` 가 비어 있으면(미리보기·옛 스냅샷) 서버를 부르지 않고 로컬로만 동작합니다.
 */
export function useGuestbook() {
  const { invitationId } = useInvitation();

  const [entries, setEntries] = useState<GuestbookEntry[]>(() =>
    loadArray<GuestbookEntry>(STORAGE_KEYS.guestbook, []),
  );

  useEffect(() => {
    if (!invitationId) return;
    let alive = true;
    void fetchGuestbook(invitationId).then((remote) => {
      if (alive && remote) setEntries(remote);
    });
    return () => {
      alive = false;
    };
  }, [invitationId]);

  const submit = useCallback(
    (name: string, msg: string): boolean => {
      const n = name.trim();
      const m = msg.trim();
      if (!n || !m) return false;

      setEntries((prev) => {
        const next = [{ name: n, msg: m, ts: Date.now() }, ...prev].slice(0, 50);
        saveArray(STORAGE_KEYS.guestbook, next);
        return next;
      });

      if (invitationId) {
        // 서버가 도배를 막거나 실패해도 화면은 그대로 둡니다 — 축하 메시지를 쓴 직후
        // 글이 사라지는 것이 더 나쁩니다. 다음 방문에서 서버 목록으로 정리됩니다.
        void postGuestbook(invitationId, n, m).then((saved) => {
          if (saved) void fetchGuestbook(invitationId).then((r) => r && setEntries(r));
        });
      }
      return true;
    },
    [invitationId],
  );

  return { entries, submit };
}
