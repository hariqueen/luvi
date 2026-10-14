import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchRankings, postRank, startGameSession } from '@/lib/guestApi';
import { logEvent } from '@/lib/log';
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

  /**
   * 이번 판의 등록 자격. 게임을 **시작할 때** 받아둡니다 — 서버가 발급 시각을 기준으로
   * "정말 그 시간을 버텼는지" 를 보기 때문에, 끝난 뒤에 받으면 경과가 0초라 거부됩니다.
   * state 가 아니라 ref 인 이유: 값이 바뀌어도 다시 그릴 일이 없습니다.
   */
  const sessionRef = useRef<string | null>(null);

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

  /** 한 판 시작 — 등록 자격을 미리 받아둡니다 (실패해도 게임은 그대로 진행됩니다) */
  const beginGame = useCallback(() => {
    sessionRef.current = null;
    if (!invitationId) return;
    void startGameSession(invitationId).then((token) => {
      sessionRef.current = token;
    });
  }, [invitationId]);

  /**
   * 기록을 올립니다. **서버에 올라갔는지를 돌려줍니다** — 호출부가 하객에게 알려줘야 합니다.
   *
   * 🔴 예전에는 결과를 버렸습니다. 그래서 2026-10-12 배포 사고로 등록이 거부되는 동안에도
   *    하객 화면은 아무 일 없다는 듯 순위를 보여줬고, **하객 본인은 올라간 줄 알았습니다.**
   *    "기록이 누락됐다" 는 항의가 반복된 이유입니다. 실패는 보이게 합니다.
   */
  const register = useCallback(
    async (nick: string, score: number, caught: number): Promise<boolean> => {
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
      //
      // 토큰은 한 판에 한 번만 씁니다. 다 쓴 뒤 비우는 것은 등록 버튼을 두 번 눌렀을 때
      // 같은 기록이 두 줄로 올라가는 것을 막기 위해서입니다 (서버도 따로 막습니다).
      // 미리보기·옛 스냅샷(invitationId 없음)은 로컬 전용이라 성공으로 봅니다
      const token = sessionRef.current;
      sessionRef.current = null;
      if (!invitationId) return true;

      /**
       * 등록 시도는 **성공이든 실패든** 남깁니다. 기록이 거부돼도 로그의 점수·획득·시각으로
       * 되살릴 수 있어야 합니다 — 2026-10-14 에 "기록이 누락됐다" 는 항의를 받고도 서버에
       * 아무 흔적이 없어 복구할 방법이 없었습니다.
       *
       * 닉네임도 함께 남깁니다 — 되살릴 때 "누구의 기록인가" 가 없으면 점수만 보고 본인을
       * 찾아가 확인받아야 합니다. 하객이 랭킹판에 공개로 올리려고 적은 값이라 남겨 둡니다
       * (`lib/log.ts` 의 예외 항목). 방명록의 이름·본문은 여전히 넣지 않습니다.
       */
      const saved = token ? await postRank(invitationId, name, score, caught, token) : false;
      logEvent({
        kind: saved ? 'click' : 'error',
        name: 'rank_register',
        ok: saved,
        detail: `${name} ${score}s/${caught}${token ? '' : ' 토큰없음'}`,
      });
      return saved;
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

  return {
    rows,
    hasBoard: board.length > 0,
    beginGame,
    register,
    myRank,
    resetNewTs: () => setNewTs(0),
  };
}
