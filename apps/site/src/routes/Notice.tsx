/**
 * `/notice` · `/notice/:id` — 공지사항.
 *
 * **왜 있는가:** 개인정보처리방침 제14조 ② 가 "변경 사항의 시행일 7일 전부터 **서비스 내
 * 공지사항을 통하여** 고지한다" 고 약속합니다. 그 약속을 이행할 자리입니다. 약속해 놓고
 * 고지할 곳이 없으면 방침을 고칠 방법 자체가 없습니다.
 *
 * 원문은 `lib/notices.ts` 상수이고, 렌더는 법률 문서와 같은 파서·뷰를 씁니다 —
 * 공지 하나 때문에 마크다운 라이브러리를 번들에 넣지 않습니다.
 */
import { useMemo } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { LegalDocView } from '@/components/LegalDocView';
import { parseLegalDoc } from '@/lib/legalDoc';
import { findNotice, formatNoticeDate, sortedNotices } from '@/lib/notices';

function Detail({ id }: { id: string }) {
  const notice = findNotice(id);
  // 없는 공지를 요청하면 목록으로 — 404 보다 덜 당황스럽습니다
  const blocks = useMemo(() => parseLegalDoc(notice?.body ?? ''), [notice?.body]);

  if (!notice) return <Navigate to="/notice" replace />;

  return (
    <>
      <div className="mb-8">
        <h1 className="text-[22px] font-semibold leading-snug text-ink">{notice.title}</h1>
        <p className="mt-2 text-[12px] text-muted">{formatNoticeDate(notice.date)}</p>
      </div>

      <LegalDocView blocks={blocks} />

      <p className="mt-12 border-t border-line pt-5 text-[12.5px]">
        <Link to="/notice" className="text-gold underline underline-offset-2">
          공지사항 목록
        </Link>
      </p>
    </>
  );
}

function List() {
  const items = sortedNotices();

  return (
    <>
      <h1 className="mb-8 text-[24px] font-semibold text-ink">공지사항</h1>

      {items.length === 0 ? (
        <p className="text-[13px] text-muted">아직 등록된 공지가 없습니다.</p>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {items.map((n) => (
            <li key={n.id}>
              <Link to={`/notice/${n.id}`} className="block py-4 hover:bg-surface-sunken">
                <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  {n.pinned && (
                    <span className="rounded bg-cream px-1.5 py-0.5 text-[11px] font-medium text-gold-deep">
                      중요
                    </span>
                  )}
                  <span className="text-[14px] font-medium leading-snug text-ink">{n.title}</span>
                </span>
                <span className="mt-1 block text-[12px] text-muted">
                  {formatNoticeDate(n.date)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export default function Notice() {
  const { id } = useParams();

  return (
    // ⚠️ `<main>` 을 쓰지 않습니다 — `SiteLayout` 이 이미 `<main>` 안에서 Outlet 을 그립니다.
    <article className="mx-auto w-full max-w-[760px] px-[clamp(16px,4vw,28px)] py-[clamp(32px,6vw,64px)]">
      <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted">Notice</p>
      {id ? <Detail id={id} /> : <List />}
    </article>
  );
}
