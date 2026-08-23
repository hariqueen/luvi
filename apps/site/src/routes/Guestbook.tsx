/**
 * C6 방명록 관리.
 *
 * 🔴 **숨김을 기본 수단으로 둡니다.** 하객이 남긴 축하 메시지이고 삭제는 되돌릴 수 없습니다.
 * 그래서 숨기기는 한 번 누르면 되고(다시 누르면 복구), 삭제·초기화는 확인을 받습니다.
 * 숨긴 글은 하객 화면에서 서버가 걸러내고(`listGuestbook` 의 includeHidden), 이 화면에서만 보입니다.
 *
 * 목록 요청에 소유자 토큰이 실리면 숨긴 글까지 내려옵니다 — 같은 엔드포인트인데
 * 하객이 부르면 안 보이고 내가 부르면 보이는 이유입니다.
 *
 * ─── 왜 청첩장 전환을 여기 두는가 (2026-08-22) ────────────────────────────
 *
 * 예전에는 URL 의 청첩장 하나만 보여줬습니다. 그래서 **글이 있는 청첩장이 아닌 다른
 * 청첩장**(예: 만들다 만 초안)에서 이 화면을 열면 "0건" 만 보이고, 사용자는 방명록이
 * 연동되지 않았다고 읽습니다 — 실제로 그 신고를 받았습니다. 계정마다 청첩장이 여럿일 수
 * 있고(운영자는 남의 것도 봅니다) 하객 글은 **발행된 청첩장**에만 쌓이므로, 이 화면은
 * 접근할 수 있는 청첩장을 **모두 나열하고 건수를 함께** 보여줍니다. 0건일 때
 * "다른 청첩장에 N건이 있다" 고 말해주는 것이 이 화면의 핵심입니다.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { GuestbookEntry, InvitationSummary } from '@luvi/schema';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

/** 관리 화면은 넉넉히 봐야 합니다 (서버 상한 100) */
const LIMIT = 100;

/**
 * 한 화면에서 건수를 세어볼 청첩장 수 상한.
 *
 * 청첩장마다 목록 요청이 한 번씩 나갑니다. 운영자 계정은 모든 청첩장을 보므로 상한이
 * 없으면 요청이 계속 늘어납니다. 넘치면 **잘랐다고 화면에 적습니다** — 조용히 자르면
 * "내 청첩장이 목록에 없다" 가 됩니다.
 */
const MAX_BOARDS = 12;

interface Target {
  id: string;
  label: string;
  slug: string;
  published: boolean;
  /** 운영자가 남의 청첩장을 볼 때만 — 누구 것인지 */
  ownerLabel?: string;
}

interface Board {
  entries: GuestbookEntry[];
  error?: string;
}

type Load = { state: 'loading' } | { state: 'error'; message: string } | { state: 'ready' };

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

const toTarget = (inv: InvitationSummary): Target => ({
  id: inv.id,
  label: inv.coupleLabel || '제목 없음',
  slug: inv.slug,
  published: inv.status === 'published',
});

export default function Guestbook() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  // 운영자만 전체 목록을 받을 수 있습니다 — 아니면 그 요청을 아예 하지 않습니다 (아래 주석)
  const { isAdmin } = useAuth();

  const [load, setLoad] = useState<Load>({ state: 'loading' });
  const [targets, setTargets] = useState<Target[]>([]);
  const [boards, setBoards] = useState<Record<string, Board>>({});
  const [truncated, setTruncated] = useState(0);
  const [onlyHidden, setOnlyHidden] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);

  /** 한 청첩장의 방명록만 다시 받아옵니다 (숨김·삭제 후) */
  const fetchBoard = useCallback(async (invitationId: string) => {
    const res = await api.guestbook.list(invitationId, LIMIT);
    setBoards((prev) => ({
      ...prev,
      [invitationId]: res.ok
        ? { entries: res.data }
        : { entries: prev[invitationId]?.entries ?? [], error: res.error.message },
    }));
    return res.ok;
  }, []);

  /**
   * 볼 수 있는 청첩장을 모읍니다.
   *
   * 내 것(`/invitations`) + 운영자라면 전체(`/admin/invitations`). 운영자는 남의 청첩장을
   * 대신 손봐주는 입장이라, 여기서도 그 청첩장의 방명록을 봐야 합니다.
   * URL 의 청첩장이 목록에 없어도(막 인계받은 경우 등) **빠뜨리지 않고** 넣습니다 —
   * 링크를 타고 들어왔는데 아무것도 안 보이면 고장으로 읽힙니다.
   *
   * 🔴 예전에는 운영자 여부와 무관하게 `/admin/invitations` 를 **항상** 불렀습니다. 서버가
   *    403 을 주고 코드는 그것을 무시했지만, 브라우저는 4xx 를 콘솔에 그대로 찍습니다 —
   *    앱이 잡을 수 없는 로그라 **모든 사용자의 콘솔에 403 이 한 건 남았고**, 진짜 오류를
   *    찾을 때 매번 이것부터 걸러내야 했습니다(E2E 의 '콘솔 에러 0건' 도 항상 실패).
   *    권한 판단의 근거는 여전히 서버입니다. 여기서는 **부를 필요가 없는 요청을 부르지 않을
   *    뿐**입니다.
   *
   * `isAdmin` 은 로그인 직후 `auth.session()` 응답으로 확정되므로, 처음 한 번은 false 로
   * 들어올 수 있습니다. 그래서 의존성에 넣어 확정된 뒤 다시 모읍니다 — 운영자에게만
   * 목록 조회가 한 번 더 일어납니다(일반 사용자는 그대로 한 번).
   */
  useEffect(() => {
    let alive = true;
    void (async () => {
      const [mine, all] = await Promise.all([
        api.invitations.list(),
        isAdmin ? api.admin.invitations() : null,
      ]);
      if (!alive) return;

      if (!mine.ok && !all?.ok) {
        setLoad({ state: 'error', message: mine.error.message });
        return;
      }

      const map = new Map<string, Target>();
      if (mine.ok) for (const inv of mine.data) map.set(inv.id, toTarget(inv));
      if (all?.ok) {
        for (const inv of all.data) {
          if (map.has(inv.id)) continue;
          map.set(inv.id, {
            ...toTarget(inv),
            ownerLabel: inv.ownerEmail ?? inv.ownerName ?? inv.ownerUid ?? '다른 계정',
          });
        }
      }
      if (id && !map.has(id)) {
        map.set(id, { id, label: '이 청첩장', slug: '', published: false });
      }

      // 발행된 것부터 — 하객 글은 발행된 청첩장에만 쌓입니다
      const list = [...map.values()].sort(
        (a, b) => Number(b.published) - Number(a.published) || a.label.localeCompare(b.label),
      );
      const shown = list.slice(0, MAX_BOARDS);
      setTargets(shown);
      setTruncated(list.length - shown.length);
      setLoad({ state: 'ready' });

      await Promise.all(shown.map((t) => fetchBoard(t.id)));
    })();
    return () => {
      alive = false;
    };
  }, [id, fetchBoard, isAdmin]);

  const current = targets.find((t) => t.id === id) ?? targets[0];
  const board = current ? boards[current.id] : undefined;
  const entries = board?.entries ?? [];
  const hiddenCount = useMemo(() => entries.filter((e) => e.hidden).length, [entries]);
  const shown = useMemo(
    () => (onlyHidden ? entries.filter((e) => e.hidden) : entries),
    [entries, onlyHidden],
  );

  /** 다른 청첩장에 쌓여 있는 글 — 0건 화면에서 "연동 안 됨" 오해를 막는 정보 */
  const elsewhere = useMemo(
    () =>
      targets
        .filter((t) => t.id !== current?.id && (boards[t.id]?.entries.length ?? 0) > 0)
        .map((t) => ({ target: t, count: boards[t.id]?.entries.length ?? 0 })),
    [targets, boards, current?.id],
  );

  /** 낙관적으로 먼저 바꾸고, 실패하면 되돌립니다 */
  const toggleHidden = async (entry: GuestbookEntry) => {
    if (!current) return;
    const next = !entry.hidden;
    setBusyId(entry.id);
    const patch = (hidden: boolean) =>
      setBoards((prev) => {
        const b = prev[current.id];
        if (!b) return prev;
        return {
          ...prev,
          [current.id]: {
            ...b,
            entries: b.entries.map((e) => (e.id === entry.id ? { ...e, hidden } : e)),
          },
        };
      });

    patch(next);
    const res = await api.guestbook.setHidden(current.id, entry.id, next);
    setBusyId(null);
    if (!res.ok) {
      patch(entry.hidden);
      window.alert(res.error.message);
    }
  };

  const remove = async (entry: GuestbookEntry) => {
    if (!current) return;
    const ok = window.confirm(
      `${entry.name}님이 남긴 글을 삭제할까요?\n\n"${entry.msg.slice(0, 60)}${entry.msg.length > 60 ? '…' : ''}"\n\n삭제는 되돌릴 수 없습니다. 하객 화면에서만 감추려면 '숨기기'를 쓰세요.`,
    );
    if (!ok) return;
    setBusyId(entry.id);
    const res = await api.guestbook.remove(current.id, entry.id);
    setBusyId(null);
    if (res.ok) await fetchBoard(current.id);
    else window.alert(res.error.message);
  };

  /**
   * 전체 초기화. 되돌릴 수 없으므로 **건수를 보여주고** 확인받습니다.
   * 하객이 남긴 글이 하나도 없을 때는 아예 물어보지 않습니다.
   */
  const clearAll = async () => {
    if (!current || entries.length === 0) return;
    const ok = window.confirm(
      `"${current.label}" 방명록 ${entries.length}건을 모두 삭제할까요?` +
        `${hiddenCount > 0 ? ` (숨긴 글 ${hiddenCount}건 포함)` : ''}\n\n` +
        '되돌릴 수 없습니다. 하객이 남긴 축하 메시지가 전부 사라집니다.',
    );
    if (!ok) return;
    setClearing(true);
    const res = await api.guestbook.clear(current.id);
    setClearing(false);
    if (res.ok) {
      await fetchBoard(current.id);
      window.alert(`${res.data.deleted}건을 삭제했습니다.`);
    } else {
      window.alert(res.error.message);
    }
  };

  return (
    /* 축하 메시지는 읽는 글이라 줄 길이를 제한합니다 — 넓은 화면에서 한 줄이 너무 길어집니다.
       헤더·탭·목록을 한 컬럼으로 묶어 가운데 두면 왼쪽으로 쏠려 보이지 않습니다. */
    <section className="mx-auto max-w-[760px]">
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

        {load.state === 'ready' && current && (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[12.5px] text-muted">
              전체 <b className="font-semibold text-ink">{entries.length}</b>
              {hiddenCount > 0 && (
                <>
                  {' '}
                  · 숨김 <b className="font-semibold text-gold-deep">{hiddenCount}</b>
                </>
              )}
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

      {/* ── 어느 청첩장의 방명록인지 ── */}
      {load.state === 'ready' && targets.length > 1 && (
        <div className="mt-6 flex flex-wrap gap-1.5">
          {targets.map((t) => {
            const count = boards[t.id]?.entries.length ?? 0;
            const on = t.id === current?.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => navigate(`/app/i/${t.id}/guestbook`)}
                className={`rounded-full border px-3 py-1.5 text-[12px] ${
                  on
                    ? 'border-gold bg-cream font-semibold text-gold-deep'
                    : 'border-line-strong bg-white text-ink-soft'
                }`}
                title={t.ownerLabel ? `${t.ownerLabel} 의 청첩장` : undefined}
              >
                {t.label}
                {!t.published && <span className="ml-1 text-muted-faint">(초안)</span>}
                <span className={`ml-1.5 ${count > 0 ? 'text-ink' : 'text-muted-faint'}`}>
                  {count}
                </span>
              </button>
            );
          })}
          {truncated > 0 && (
            <span className="self-center text-[11.5px] text-muted-faint">
              외 {truncated}개는 목록에서 생략했어요
            </span>
          )}
        </div>
      )}

      <div className="mt-6">
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
              onClick={() => window.location.reload()}
              className="mt-3 rounded-full border border-line-strong px-4 py-2 text-[12.5px] text-muted"
            >
              다시 시도
            </button>
          </div>
        )}

        {load.state === 'ready' && board?.error && (
          <div className="mb-3 rounded-2xl border border-line bg-surface px-4 py-3 text-[12.5px] text-gold-deep">
            {board.error}
            <button
              type="button"
              onClick={() => current && void fetchBoard(current.id)}
              className="ml-2 underline"
            >
              다시 시도
            </button>
          </div>
        )}

        {load.state === 'ready' && current && shown.length === 0 && (
          <div className="rounded-2xl border border-line bg-surface px-5 py-12 text-center">
            <p className="text-[15px] font-medium text-ink">
              {onlyHidden ? '숨긴 글이 없어요' : '아직 남겨진 축하 메시지가 없어요'}
            </p>
            {!onlyHidden && (
              <>
                <p className="mt-2 text-[13px] text-muted">
                  {current.published ? (
                    <>
                      <b className="font-medium text-ink">{current.label}</b> 청첩장에 남겨진 글이
                      없습니다. 청첩장을 공유하면 하객이 남긴 글이 여기에 모입니다.
                    </>
                  ) : (
                    <>
                      이 청첩장은 아직 <b className="font-medium text-ink">발행 전(초안)</b>이라
                      하객이 글을 남길 수 없습니다.
                    </>
                  )}
                </p>
                {/* 여기가 "방명록이 연동 안 됐다" 는 오해를 끊는 지점입니다 */}
                {elsewhere.length > 0 && (
                  <p className="mt-3 text-[13px] text-muted">
                    다른 청첩장에 글이 있어요 —{' '}
                    {elsewhere.map((e, i) => (
                      <span key={e.target.id}>
                        {i > 0 && ', '}
                        <button
                          type="button"
                          onClick={() => navigate(`/app/i/${e.target.id}/guestbook`)}
                          className="font-medium text-gold-deep underline"
                        >
                          {e.target.label} {e.count}건
                        </button>
                      </span>
                    ))}
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {load.state === 'ready' && shown.length > 0 && (
          <ul className="flex flex-col gap-3">
            {shown.map((e) => (
              <li
                key={e.id}
                className={`rounded-2xl border px-4 py-3.5 ${
                  e.hidden ? 'border-gold-soft bg-cream' : 'border-line bg-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[13.5px] font-semibold text-ink">{e.name}</span>
                  {e.hidden && (
                    <span className="rounded-full border border-gold-soft bg-white px-2 py-0.5 text-[10.5px] font-medium text-gold-deep">
                      숨김 · 하객에게 안 보임
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
                    className={`rounded-lg border px-3 py-1.5 text-[12px] disabled:opacity-50 ${
                      e.hidden
                        ? 'border-gold bg-white font-semibold text-gold-deep'
                        : 'border-line-strong bg-white text-ink'
                    }`}
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

        {load.state === 'ready' && current?.published && current.slug && (
          <p className="mt-4 text-[12px] text-muted-faint">
            하객 화면:{' '}
            <a
              href={`/i/${current.slug}`}
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-muted"
            >
              /i/{current.slug} ↗
            </a>
          </p>
        )}
      </div>
    </section>
  );
}
