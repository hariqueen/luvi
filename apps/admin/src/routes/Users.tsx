/**
 * A1 · 회원 목록.
 *
 * 🔴 **이 화면은 남의 개인정보를 열람하는 화면입니다.** 기능보다 이 제약이 먼저입니다.
 *
 *  - 이메일은 **마스킹된 채로 서버에서 옵니다.** 화면에서 가리는 게 아닙니다 —
 *    원문은 응답에 들어 있지도 않습니다. 개발자 도구를 열어도 없습니다.
 *  - 원문은 행의 "보기" 를 눌렀을 때만, 한 명씩, **기록을 남기고** 옵니다
 *    (`MaskedValue` 주석 참고).
 *
 * 검색은 서버로 보내지 않습니다. Firestore 에 부분일치 질의가 없고, 회원이 수백 단위인
 * 동안은 상한(500)까지 받아 화면에서 거르는 편이 낫습니다. 상한에 걸리면 서버가
 * `truncated` 로 알려주고, 그때는 **검색 결과가 전부가 아닐 수 있다**고 화면이 말해야
 * 합니다. 조용히 일부만 보여주면 "그 회원은 없다" 고 잘못 판단하게 됩니다.
 *
 * 🔴 마스킹된 이메일도 검색됩니다(`har***@naver.com`). 원문으로는 검색되지 않습니다 —
 *    원문이 화면에 없으니 당연하지만, 운영자가 "전체 주소로 찾으면 되겠지" 하고
 *    헤매지 않도록 검색창 아래에 적어 두었습니다.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { AdminUserList, AdminUserSummary } from '@luvi/schema';
import { api } from '@/lib/api';
import { formatDay, formatTouched, providerLabels } from '@/lib/format';
import { MaskedValue } from '@/components/MaskedValue';

type Load =
  | { state: 'loading' }
  | { state: 'error'; message: string; forbidden: boolean }
  | { state: 'ready'; data: AdminUserList };

function ConsentBadge({ user }: { user: AdminUserSummary }) {
  if (user.consent.satisfied) {
    return <span className="text-[11.5px] text-success">완료</span>;
  }
  // 동의 이력이 하나도 없으면 신규, 일부만 낡았으면 개정에 따른 재동의 대기입니다.
  const none = Object.keys(user.consent.versions).length === 0;
  return (
    <span className="text-[11.5px] text-gold-deep" title={user.consent.missing.join(' · ')}>
      {none ? '없음' : `재동의 ${user.consent.missing.length}건`}
    </span>
  );
}

export default function Users() {
  const [load, setLoad] = useState<Load>({ state: 'loading' });
  const [q, setQ] = useState('');

  const fetchList = useCallback(async () => {
    setLoad({ state: 'loading' });
    const res = await api.admin.users();
    if (res.ok) setLoad({ state: 'ready', data: res.data });
    else
      setLoad({
        state: 'error',
        message: res.error.message,
        forbidden: res.error.code === 'forbidden',
      });
  }, []);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  const items = useMemo(() => {
    if (load.state !== 'ready') return [];
    const needle = q.trim().toLowerCase();
    if (!needle) return load.data.items;
    return load.data.items.filter((u) =>
      [u.displayName, u.emailMasked, u.uid]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle)),
    );
  }, [load, q]);

  return (
    <section>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-semibold leading-tight tracking-[-.03em]">회원</h1>
          <p className="mt-1.5 text-[12.5px] text-muted">
            이메일은 가려져 있습니다. 원문을 보면 그 순간이 기록에 남습니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="이름 · 가려진 이메일 · uid 검색"
            className="w-[min(280px,60vw)] rounded-full border border-line-strong bg-white px-4 py-2 text-[12.5px] outline-none focus:border-gold"
          />
          <button
            type="button"
            onClick={() => void fetchList()}
            className="flex-none rounded-full border border-line-strong px-3.5 py-2 text-[12.5px] text-muted"
          >
            새로고침
          </button>
        </div>
      </header>

      <div className="mt-6">
        {load.state === 'loading' && (
          <div className="flex flex-col gap-1.5">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="h-[44px] animate-pulse rounded-lg bg-surface-sunken" />
            ))}
          </div>
        )}

        {load.state === 'error' && (
          <div className="rounded-2xl border border-line-strong bg-surface px-5 py-10 text-center">
            <p className="text-[14px] font-medium text-ink">
              {load.forbidden ? '운영자 계정만 볼 수 있어요' : '목록을 불러오지 못했어요'}
            </p>
            <p className="mt-2 text-[13px] text-muted">{load.message}</p>
            {!load.forbidden && (
              <button
                type="button"
                onClick={() => void fetchList()}
                className="mt-4 rounded-full border border-line-strong px-4 py-2 text-[12.5px] text-muted"
              >
                다시 시도
              </button>
            )}
          </div>
        )}

        {load.state === 'ready' && (
          <>
            <p className="mb-3 text-[12px] text-muted-faint">
              전체 {load.data.items.length}명{q.trim() && ` · 검색 결과 ${items.length}명`}
              {' · 검색은 받아온 목록 안에서만 합니다 (가려진 형태로 찾으세요)'}
            </p>

            {load.data.truncated && (
              <p className="mb-3 rounded-lg border border-gold-soft bg-cream px-3.5 py-2.5 text-[12px] text-gold-deep">
                회원이 500명을 넘어 일부만 받아왔습니다. 검색 결과가 전부가 아닐 수 있습니다.
                이 표시가 계속 보이면 검색 방식을 다시 논의해야 합니다.
              </p>
            )}

            {items.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-line-strong bg-surface px-6 py-12 text-center text-[13px] text-muted">
                {q.trim() ? '검색 결과가 없어요' : '아직 가입한 회원이 없어요'}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
                <table className="w-full min-w-[860px] border-collapse text-[12.5px]">
                  <thead>
                    <tr className="border-b border-line text-left text-[11.5px] text-muted-faint">
                      <th className="px-4 py-2.5 font-medium">이름</th>
                      <th className="px-4 py-2.5 font-medium">이메일</th>
                      <th className="px-4 py-2.5 font-medium">로그인 수단</th>
                      <th className="px-4 py-2.5 font-medium">청첩장</th>
                      <th className="px-4 py-2.5 font-medium">가입</th>
                      <th className="px-4 py-2.5 font-medium">최종 로그인</th>
                      <th className="px-4 py-2.5 font-medium">동의</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((u) => (
                      <tr key={u.uid} className="border-b border-line-soft last:border-0">
                        <td className="px-4 py-2.5">
                          <Link
                            to={`/users/${u.uid}`}
                            className="font-medium text-ink hover:underline"
                          >
                            {u.displayName ?? '이름 없음'}
                          </Link>
                          {u.role === 'admin' && (
                            <span className="ml-1.5 rounded-full bg-sand px-1.5 py-px text-[10.5px] text-gold-deep">
                              운영자
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          <MaskedValue
                            masked={u.emailMasked}
                            emptyLabel="이메일 없음"
                            onReveal={async () => {
                              const res = await api.admin.revealUser(u.uid);
                              if (!res.ok) throw new Error(res.error.message);
                              return res.data.email;
                            }}
                          />
                        </td>
                        <td className="px-4 py-2.5 text-muted">
                          {providerLabels(u.providers) || '-'}
                        </td>
                        <td className="px-4 py-2.5 text-muted">{u.invitationCount}</td>
                        <td className="px-4 py-2.5 text-muted-faint">{formatDay(u.createdAt)}</td>
                        <td className="px-4 py-2.5 text-muted-faint">
                          {formatTouched(u.lastLoginAt)}
                        </td>
                        <td className="px-4 py-2.5">
                          <ConsentBadge user={u} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
