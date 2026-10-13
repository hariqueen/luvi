/**
 * C7 게임순위 관리.
 *
 * 방명록 관리(`Guestbook.tsx`)와 같은 자리의 화면입니다 — 하객이 남긴 것을 주인이 치울 수
 * 있어야 한다는 점에서 성격이 같습니다. 다만 **숨김이 없습니다.** 방명록은 축하 메시지라
 * 지우기 전에 감출 여지를 두지만, 랭킹은 순위표라 "보이지 않는 1등" 이라는 상태가 성립하지
 * 않습니다 (가려도 등수가 밀린 채로 남습니다). 그래서 삭제 하나만 둡니다.
 *
 * 🔴 **이 화면이 생긴 이유 (2026-10-12):** 기록 등록 경로에 자격 검증이 없어, API 로 본문만
 *    지어 보낸 기록이 실제 운영 청첩장의 1등에 올랐습니다. 서버 쪽은 막았지만
 *    (`workers/api/src/index.ts` 의 랭킹 등록 주석), **이미 올라간 기록을 주인이 스스로
 *    치울 방법이 없어** 운영자가 대신 지워야 했습니다. 그 일을 주인에게 돌려주는 화면입니다.
 *
 * 방명록 화면과 달리 청첩장 전환 탭이 없습니다. 이 화면은 목록 카드의 '게임순위' 로만
 * 들어오고, 그 링크는 **미니게임이 담긴 청첩장에만** 보이기 때문입니다 (`hasMinigame`).
 */
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { RankEntry } from '@luvi/schema';
import { api } from '@/lib/api';

type Load = { state: 'loading' } | { state: 'error'; message: string } | { state: 'ready' };

const medalFor = (i: number): string => ['🥇', '🥈', '🥉'][i] ?? `${i + 1}`;

const fmt = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('ko-KR', {
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function Rankings() {
  const { id = '' } = useParams<{ id: string }>();

  const [load, setLoad] = useState<Load>({ state: 'loading' });
  const [entries, setEntries] = useState<RankEntry[]>([]);
  const [label, setLabel] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);

  const fetchBoard = useCallback(async () => {
    const res = await api.rankings.list(id);
    if (res.ok) setEntries(res.data);
    return res;
  }, [id]);

  useEffect(() => {
    let alive = true;
    void (async () => {
      /**
       * 청첩장 정보와 기록을 함께 받습니다. 제목은 확인 문구("○○ 기록을 지울까요")에
       * 쓰는데, 제목을 못 받았다고 화면을 막을 이유는 없으므로 실패해도 넘어갑니다.
       */
      const [board, invitation] = await Promise.all([fetchBoard(), api.invitations.get(id)]);
      if (!alive) return;

      if (invitation.ok) {
        const core = invitation.data.draft.core;
        setLabel(
          [core.couple.groom.name, core.couple.bride.name].filter(Boolean).join(' ♥ ') ||
            '제목 없음',
        );
      }
      setLoad(board.ok ? { state: 'ready' } : { state: 'error', message: board.error.message });
    })();
    return () => {
      alive = false;
    };
  }, [fetchBoard, id]);

  /** 한 건 삭제 — 되돌릴 수 없으므로 누구의 어떤 기록인지 보여주고 확인받습니다 */
  const remove = async (entry: RankEntry) => {
    const ok = window.confirm(
      `${entry.nick}님의 기록을 삭제할까요?\n\n` +
        `${entry.score.toFixed(1)}초 · ${entry.caught}개\n\n` +
        '삭제는 되돌릴 수 없습니다.',
    );
    if (!ok) return;

    setBusyId(entry.id);
    const res = await api.rankings.remove(id, entry.id);
    setBusyId(null);
    if (res.ok) await fetchBoard();
    else window.alert(res.error.message);
  };

  /** 전체 초기화 — 되돌릴 수 없으므로 **건수를 보여주고** 확인받습니다 */
  const clearAll = async () => {
    if (entries.length === 0) return;
    const ok = window.confirm(
      `"${label || '이 청첩장'}" 게임 기록 ${entries.length}건을 모두 삭제할까요?\n\n` +
        '되돌릴 수 없습니다. 하객이 세운 기록이 전부 사라집니다.',
    );
    if (!ok) return;

    setClearing(true);
    const res = await api.rankings.clear(id);
    setClearing(false);
    if (res.ok) {
      await fetchBoard();
      window.alert(`${res.data.deleted}건을 삭제했습니다.`);
    } else {
      window.alert(res.error.message);
    }
  };

  return (
    <section className="mx-auto max-w-[760px]">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link to="/app" className="text-[13px] text-muted hover:underline">
            ← 내 청첩장
          </Link>
          <h1 className="mt-2 text-[clamp(24px,4vw,34px)] font-semibold leading-tight tracking-[-.03em]">
            게임순위 관리
          </h1>
          <p className="mt-2 text-[13px] text-muted">
            하객이 미니게임에서 세운 기록입니다. 지우면 하객 화면의 순위표에서도 사라집니다.
          </p>
        </div>

        {load.state === 'ready' && (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[12.5px] text-muted">
              전체 <b className="font-semibold text-ink">{entries.length}</b>
            </span>
            <button
              type="button"
              disabled={clearing || entries.length === 0}
              onClick={() => void clearAll()}
              className="rounded-full border border-line-strong bg-white px-3 py-1.5 text-[12px] text-gold-deep disabled:opacity-40"
            >
              {clearing ? '초기화 중…' : '전체 초기화'}
            </button>
          </div>
        )}
      </header>

      {load.state === 'loading' && (
        <p className="mt-10 text-[13px] text-muted">기록을 불러오는 중…</p>
      )}

      {load.state === 'error' && (
        <p className="mt-10 rounded-xl border border-line bg-white px-4 py-3 text-[13px] text-gold-deep">
          {load.message}
        </p>
      )}

      {load.state === 'ready' && entries.length === 0 && (
        <p className="mt-10 rounded-xl border border-line bg-white px-4 py-6 text-center text-[13px] text-muted">
          아직 세워진 기록이 없습니다. 하객이 미니게임을 하면 여기에 쌓입니다.
        </p>
      )}

      {load.state === 'ready' && entries.length > 0 && (
        <ul className="mt-6 overflow-hidden rounded-xl border border-line bg-white">
          {entries.map((entry, i) => (
            <li
              key={entry.id}
              className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-b-0"
            >
              <span className="w-7 shrink-0 text-center text-[15px]">{medalFor(i)}</span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-medium text-ink">{entry.nick}</p>
                <p className="mt-0.5 text-[12px] text-muted">
                  {/* 생존 시간은 소수 1자리입니다 — 정수로 반올림하면 동점이 무더기로 생깁니다 */}
                  {entry.score.toFixed(1)}초 · {entry.caught}개 받음
                  {entry.createdAt && (
                    <span className="text-muted-faint"> · {fmt(entry.createdAt)}</span>
                  )}
                </p>
              </div>

              <button
                type="button"
                disabled={busyId === entry.id}
                onClick={() => void remove(entry)}
                className="shrink-0 text-[12.5px] text-muted-faint hover:text-gold-deep disabled:opacity-40"
              >
                {busyId === entry.id ? '삭제 중…' : '삭제'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
