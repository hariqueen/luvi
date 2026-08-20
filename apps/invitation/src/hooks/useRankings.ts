import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchRankings, postRank } from '@/lib/guestApi';
import { useInvitation } from '@/lib/invitationContext';
import { loadArray, saveArray, STORAGE_KEYS } from '@/lib/storage';
import type { RankEntry } from '@/lib/types';

export interface RankRow extends RankEntry {
  rank: number;
  medal: string;
  /** 방금 등록한 행 강조용 */
  isMine: boolean;
}

const medalFor = (i: number): string => ['🥇', '🥈', '🥉'][i] ?? ('0' + (i + 1)).slice(-2);

/**
 * 미니게임 랭킹: localStorage 즉시 렌더 → 서버 데이터로 대체.
 * register()로 등록하며, 방금 등록한 기록(newTs)과 내 순위(myRank)를 함께 제공.
 *
 * `invitationId` 가 비어 있으면(미리보기·옛 스냅샷) 서버를 부르지 않고 로컬로만 동작합니다.
 *
 * @param size 랭킹판에 보여줄 순위 개수 (편집 화면의 '몇 등까지'). 로컬 보관은 이보다
 *             넉넉히 잡습니다 — 목록을 몇 등까지 보여줄지는 화면의 문제이고, 기록을
 *             몇 개 갖고 있을지는 저장의 문제입니다. 같은 값으로 자르면 순위를 줄였다
 *             늘렸을 때 사라진 기록이 돌아오지 않습니다.
 */
export function useRankings(size: number) {
  const { invitationId } = useInvitation();
  const keep = Math.max(10, size);

  const [board, setBoard] = useState<RankEntry[]>(() =>
    loadArray<RankEntry>(STORAGE_KEYS.leaderboard, []),
  );
  const [newTs, setNewTs] = useState(0);

  useEffect(() => {
    if (!invitationId) return;
    let alive = true;
    void fetchRankings(invitationId).then((remote) => {
      if (alive && remote) setBoard(remote);
    });
    return () => {
      alive = false;
    };
  }, [invitationId]);

  const register = useCallback(
    (nick: string, score: number, caught: number) => {
      const name = nick.trim() || '익명 하객';
      const ts = Date.now();

      setBoard((prev) => {
        const next = [...prev, { nick: name, score, caught, ts }]
          .sort((a, b) => b.score - a.score)
          .slice(0, keep);
        saveArray(STORAGE_KEYS.leaderboard, next);
        return next;
      });
      setNewTs(ts);

      // 서버 목록으로 덮어쓰지 않습니다 — isMine 강조가 ts 로 판별되는데
      // 서버가 돌려준 createdAt 은 ts 와 달라 방금 세운 기록 강조가 풀립니다.
      if (invitationId) void postRank(invitationId, name, score, caught);
    },
    [invitationId, keep],
  );

  /** 화면 표기용 상위 `size` 개 (메달·순위·강조 포함) */
  const rows: RankRow[] = useMemo(
    () =>
      board.slice(0, size).map((b, i) => ({
        ...b,
        rank: i + 1,
        medal: medalFor(i),
        isMine: b.ts === newTs,
      })),
    [board, newTs, size],
  );

  const myRank = useMemo(() => {
    const i = board.findIndex((b) => b.ts === newTs);
    return i < 0 ? 0 : i + 1;
  }, [board, newTs]);

  return { rows, hasBoard: board.length > 0, register, myRank, resetNewTs: () => setNewTs(0) };
}
