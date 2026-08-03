import { useCallback, useEffect, useMemo, useState } from 'react';
import { addRank, loadBoard } from '@/lib/firebase';
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
 * 미니게임 랭킹: localStorage 즉시 렌더 → Firebase 데이터로 대체.
 * register()로 등록하며, 방금 등록한 기록(newTs)과 내 순위(myRank)를 함께 제공.
 */
export function useRankings() {
  const [board, setBoard] = useState<RankEntry[]>(() =>
    loadArray<RankEntry>(STORAGE_KEYS.leaderboard, []),
  );
  const [newTs, setNewTs] = useState(0);

  useEffect(() => {
    let alive = true;
    loadBoard().then((remote) => {
      if (alive && remote) setBoard(remote);
    });
    return () => {
      alive = false;
    };
  }, []);

  const register = useCallback((nick: string, score: number, caught: number) => {
    const name = nick.trim() || '익명 하객';
    const ts = Date.now();
    setBoard((prev) => {
      const next = [...prev, { nick: name, score, caught, ts }]
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);
      saveArray(STORAGE_KEYS.leaderboard, next);
      return next;
    });
    setNewTs(ts);
    void addRank(name, score, caught);
  }, []);

  /** 화면 표기용 TOP 7 (메달·순위·강조 포함) */
  const rows: RankRow[] = useMemo(
    () =>
      board.slice(0, 7).map((b, i) => ({
        ...b,
        rank: i + 1,
        medal: medalFor(i),
        isMine: b.ts === newTs,
      })),
    [board, newTs],
  );

  const myRank = useMemo(() => {
    const i = board.findIndex((b) => b.ts === newTs);
    return i < 0 ? 0 : i + 1;
  }, [board, newTs]);

  return { rows, hasBoard: board.length > 0, register, myRank, resetNewTs: () => setNewTs(0) };
}
