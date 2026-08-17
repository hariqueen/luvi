/**
 * C6 방명록 관리.
 *
 * 🔴 **숨김을 기본 수단으로 둡니다.** 하객이 남긴 축하 메시지이고 삭제는 되돌릴 수 없습니다.
 * 그래서 숨기기는 한 번 누르면 되고(다시 누르면 복구), 삭제는 확인을 받습니다.
 * 숨긴 글은 하객 화면에서 서버가 걸러내고(`listGuestbook` 의 includeHidden), 이 화면에서만 보입니다.
 *
 * 목록 요청에 소유자 토큰이 실리면 숨긴 글까지 내려옵니다 — 같은 엔드포인트인데
 * 하객이 부르면 안 보이고 내가 부르면 보이는 이유입니다.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { GuestbookEntry } from '@luvi/schema';
import { api } from '@/lib/api';

/** 관리 화면은 넉넉히 봐야 합니다 (서버 상한 100) */
const LIMIT = 100;

type Load =
  | { state: 'loading' }
  | { state: 'error'; message: string }
  | { state: 'ready'; entries: GuestbookEntry[] };

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

export default function Guestbook() {
  const { id = '' } = useParams<{ id: string }>();
  const [load, setLoad] = useState<Load>({ state: 'loading' });
  const [onlyHidden, setOnlyHidden] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchList = useCallback(async () => {
    const res = await api.guestbook.list(id, LIMIT);
    if (res.ok) setLoad({ state: 'ready', entries: res.data });
    else setLoad({ state: 'error', message: res.error.message });
  }, [id]);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  const entries = load.state === 'ready' ? load.entries : [];
  const hiddenCount = useMemo(() => entries.filter((e) => e.hidden).length, [entries]);
  const shown = useMemo(
    () => (onlyHidden ? entries.filter((e) => e.hidden) : entries),
    [entries, onlyHidden],
  );

  /** 낙관적으로 먼저 바꾸고, 실패하면 되돌립니다 */
  const toggleHidden = async (entry: GuestbookEntry) => {
    const next = !entry.hidden;
    setBusyId(entry.id);
    setLoad((prev) =>
      prev.state === 'ready'
        ? {
            ...prev,
            entries: prev.entries.map((e) => (e.id === entry.id ? { ...e, hidden: next } : e)),
          }
        : prev,
    );
    const res = await api.guestbook.setHidden(id, entry.id, next);
    setBusyId(null);
    if (!res.ok) {
      setLoad((prev) =>
        prev.state === 'ready'
          ? {
              ...prev,
              entries: prev.entries.map((e) =>
                e.id === entry.id ? { ...e, hidden: entry.hidden } : e,
              ),
            }
          : prev,
      );
      window.alert(res.error.message);
    }
  };

  const remove = async (entry: GuestbookEntry) => {
    const ok = window.confirm(
      `${entry.name}님이 남긴 글을 삭제할까요?\n\n"${entry.msg.slice(0, 60)}${entry.msg.length > 60 ? '…' : ''}"\n\n삭제는 되돌릴 수 없습니다. 하객 화면에서만 감추려면 '숨기기'를 쓰세요.`,
    );
    if (!ok) return;
    setBusyId(entry.id);
    const res = await api.guestbook.remove(id, entry.id);
    setBusyId(null);
    if (res.ok) await fetchList();
    else window.alert(res.error.message);
  };

  return (
    <section>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link to="/app" className="text-[13px] text-muted hover:underline">
              ← 내 청첩장
            </Link>
          </div>
          <h1 className="mt-2 text-[clamp(24px,4vw,34px)] font-semibold leading-tight tracking-[-.03em]">
            방명록 관리
          </h1>
          <p className="mt-2 text-[13px] text-muted">
            하객이 남긴 축하 메시지입니다. 숨기면 하객 화면에서만 사라지고 여기에는 남습니다.
          </p>
        </div>

        {load.state === 'ready' && (
          <div className="flex items-center gap-3">
            <span className="text-[12.5px] text-muted">
              전체 <b className="font-semibold text-ink">{entries.length}</b>
              {hiddenCount > 0 && <> · 숨김 {hiddenCount}</>}
            </span>
            <button
              type="button"
              onClick={() => setOnlyHidden((v) => !v)}
              className={`rounded-full border px-3 py-1.5 text-[12px] ${
                onlyHidden
                  ? 'border-gold bg-cream font-semibold text-gold-deep'
                  : 'border-line-strong bg-white text-muted'
              }`}
            >
              숨긴 것만 보기
            </button>
          </div>
        )}
      </header>

      {/* 축하 메시지는 읽는 글이라 줄 길이를 제한합니다 — 넓은 화면에서 한 줄이 너무 길어집니다 */}
      <div className="mt-8 max-w-[760px]">
        {load.state === 'loading' && (
          <div className="flex flex-col gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-[92px] animate-pulse rounded-2xl bg-surface-sunken" />
            ))}
          </div>
        )}

        {load.state === 'error' && (
          <div className="rounded-2xl border border-line bg-surface px-5 py-8 text-center">
            <p className="text-[14px] text-ink">{load.message}</p>
            <button
              type="button"
              onClick={() => void fetchList()}
              className="mt-3 rounded-full border border-line-strong px-4 py-2 text-[12.5px] text-muted"
            >
              다시 시도
            </button>
          </div>
        )}

        {load.state === 'ready' && shown.length === 0 && (
          <div className="rounded-2xl border border-line bg-surface px-5 py-12 text-center">
            <p className="text-[15px] font-medium text-ink">
              {onlyHidden ? '숨긴 글이 없어요' : '아직 남겨진 축하 메시지가 없어요'}
            </p>
            {!onlyHidden && (
              <p className="mt-2 text-[13px] text-muted">
                청첩장을 공유하면 하객이 남긴 글이 여기에 모입니다.
              </p>
            )}
          </div>
        )}

        {load.state === 'ready' && shown.length > 0 && (
          <ul className="flex flex-col gap-3">
            {shown.map((e) => (
              <li
                key={e.id}
                className={`rounded-2xl border px-4 py-3.5 ${
                  e.hidden ? 'border-line bg-surface-sunken' : 'border-line bg-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[13.5px] font-semibold text-ink">{e.name}</span>
                  {e.hidden && (
                    <span className="rounded-full border border-line-strong bg-surface px-2 py-0.5 text-[10.5px] font-medium text-muted">
                      숨김
                    </span>
                  )}
                  <span className="ml-auto flex-none text-[11px] text-muted-faint">
                    {fmt(e.createdAt)}
                  </span>
                </div>

                <p
                  className={`mt-1.5 whitespace-pre-line text-[13.5px] leading-[1.6] ${
                    e.hidden ? 'text-muted' : 'text-ink'
                  }`}
                >
                  {e.msg}
                </p>

                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    disabled={busyId === e.id}
                    onClick={() => void toggleHidden(e)}
                    className="rounded-lg border border-line-strong bg-white px-3 py-1.5 text-[12px] text-ink disabled:opacity-50"
                  >
                    {e.hidden ? '다시 보이기' : '숨기기'}
                  </button>
                  <button
                    type="button"
                    disabled={busyId === e.id}
                    onClick={() => void remove(e)}
                    className="rounded-lg px-3 py-1.5 text-[12px] text-muted-faint underline disabled:opacity-50"
                  >
                    삭제
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
