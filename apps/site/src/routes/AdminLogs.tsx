/**
 * 운영자 — 이벤트 로그.
 *
 * "카카오톡 공유가 안 돼요" 같은 문의를 받았을 때 **여기부터 봅니다.** 하객 화면에서 일어난
 * 일은 서버 로그에 안 남기 때문에(카카오 SDK 는 브라우저에서 카카오 서버로 직접 갑니다),
 * 화면이 보내준 이 기록이 유일한 단서입니다.
 *
 * 보관은 14일입니다 — 매일 Cron 이 그보다 오래된 것을 지웁니다. 오래된 문의는 추적이 안 되니,
 * 급한 건 화면을 캡처해 두세요.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import type { EventLogRow } from '@luvi/schema';

type Load =
  | { state: 'loading' }
  | { state: 'error'; message: string; forbidden: boolean }
  | { state: 'ready'; rows: EventLogRow[] };

/** 지점 이름 → 사람이 읽는 말 */
const NAME_LABEL: Record<string, string> = {
  kakao_share: '카카오톡 공유',
  copy_link: '링크 복사',
  invitation_open: '청첩장 열림',
  draft_save: '초안 저장',
  publish: '발행',
};

interface Filter {
  label: string;
  name?: string;
  failedOnly?: boolean;
}

const FILTERS: Filter[] = [
  { label: '전체' },
  { label: '실패만', failedOnly: true },
  { label: '카카오 공유', name: 'kakao_share' },
  { label: '청첩장 열림', name: 'invitation_open' },
  { label: '초안 저장', name: 'draft_save' },
  { label: '발행', name: 'publish' },
];

const pad = (n: number) => String(n).padStart(2, '0');

/** UTC ISO → 한국 시간 표시 (서버는 UTC 로 저장합니다) */
function when(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const today = new Date();
  const sameDay =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  return sameDay ? `오늘 ${time}` : `${d.getMonth() + 1}. ${d.getDate()} ${time}`;
}

/** UA 문자열에서 기기·브라우저만 뽑습니다 (전문을 보여줄 자리가 없습니다) */
function device(ua: string | null): string {
  if (!ua) return '—';
  const os = /iPhone|iPad/.test(ua)
    ? 'iOS'
    : /Android/.test(ua)
      ? 'Android'
      : /Macintosh/.test(ua)
        ? 'Mac'
        : /Windows/.test(ua)
          ? 'Windows'
          : '기타';
  const browser = /KAKAOTALK/i.test(ua)
    ? '카카오톡'
    : /CriOS|Chrome/.test(ua)
      ? 'Chrome'
      : /Safari/.test(ua)
        ? 'Safari'
        : /SamsungBrowser/.test(ua)
          ? '삼성'
          : '';
  return browser ? `${os} · ${browser}` : os;
}

export default function AdminLogs() {
  const [load, setLoad] = useState<Load>({ state: 'loading' });
  const [filter, setFilter] = useState(0);

  const fetchRows = useCallback(async (index: number) => {
    setLoad({ state: 'loading' });
    const f: Filter = FILTERS[index] ?? { label: '전체' };
    const res = await api.admin.events({ limit: 300, name: f.name, failedOnly: f.failedOnly });
    if (res.ok) setLoad({ state: 'ready', rows: res.data });
    else
      setLoad({
        state: 'error',
        message: res.error.message,
        forbidden: res.error.code === 'forbidden',
      });
  }, []);

  useEffect(() => {
    void fetchRows(filter);
  }, [fetchRows, filter]);

  const failedCount = useMemo(
    () => (load.state === 'ready' ? load.rows.filter((r) => r.ok === 0).length : 0),
    [load],
  );

  return (
    <section>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[clamp(24px,4vw,34px)] font-semibold leading-tight tracking-[-.03em]">
            이벤트 로그
          </h1>
          <p className="mt-2 text-[13px] text-muted">
            하객·사용자 화면에서 무엇을 눌러 무엇이 막혔는지 남습니다. <b>보관 14일</b> — 그보다
            오래된 기록은 매일 자동으로 지워집니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/app/admin"
            className="rounded-full border border-line-strong px-3.5 py-2 text-[12.5px] text-muted"
          >
            ← 전체 청첩장
          </Link>
          <button
            type="button"
            onClick={() => void fetchRows(filter)}
            className="rounded-full border border-line-strong px-3.5 py-2 text-[12.5px] text-muted"
          >
            새로고침
          </button>
        </div>
      </header>

      <div className="no-scrollbar mt-6 flex gap-1.5 overflow-x-auto">
        {FILTERS.map((f, i) => (
          <button
            key={f.label}
            type="button"
            onClick={() => setFilter(i)}
            className={`flex-none rounded-full px-3.5 py-2 text-[12.5px] ${
              filter === i ? 'bg-ink text-paper' : 'border border-line text-muted'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {load.state === 'loading' && (
          <div className="flex flex-col gap-1.5">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="h-[52px] animate-pulse rounded-xl bg-surface-sunken" />
            ))}
          </div>
        )}

        {load.state === 'error' && (
          <div className="rounded-2xl border border-line-strong bg-surface px-5 py-10 text-center">
            <p className="text-[14px] font-medium text-ink">
              {load.forbidden ? '운영자 계정만 볼 수 있어요' : '로그를 불러오지 못했어요'}
            </p>
            <p className="mt-2 text-[13px] text-muted">{load.message}</p>
          </div>
        )}

        {load.state === 'ready' && (
          <>
            <p className="mb-3 text-[12px] text-muted-faint">
              {load.rows.length}건{failedCount > 0 && ` · 실패 ${failedCount}건`}
            </p>

            {load.rows.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-line-strong bg-surface px-6 py-12 text-center text-[13px] text-muted">
                기록이 없습니다. 로그는 새 버전이 배포된 뒤부터 쌓입니다.
              </div>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {load.rows.map((r, i) => (
                  <li
                    key={`${r.at}-${i}`}
                    className={`rounded-xl border bg-surface px-3.5 py-2.5 ${
                      r.ok === 0 ? 'border-gold-deep/40 bg-cream/40' : 'border-line'
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-mono text-[11.5px] text-muted-faint">{when(r.at)}</span>
                      <span className="text-[13px] font-semibold text-ink">
                        {NAME_LABEL[r.name] ?? r.name}
                      </span>
                      {r.ok === 0 && (
                        <span className="rounded-full bg-gold-deep px-2 py-0.5 text-[10.5px] font-semibold text-white">
                          실패
                        </span>
                      )}
                      {r.ok === 1 && <span className="text-[11px] text-success">성공</span>}
                      <span className="ml-auto text-[11px] text-muted-faint">{device(r.ua)}</span>
                    </div>

                    {r.detail && (
                      <p className="mt-1 break-all text-[12px] text-ink-soft">{r.detail}</p>
                    )}

                    <p className="mt-1 truncate text-[11px] text-muted-faint">
                      {r.slug ? `/i/${r.slug}` : (r.invitationId ?? '—')}
                      {r.session && ` · 세션 ${r.session}`}
                      {r.uid && ` · 로그인 ${r.uid.slice(0, 12)}…`}
                      {r.path && ` · ${r.path}`}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </section>
  );
}
