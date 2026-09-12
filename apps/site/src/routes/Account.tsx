/**
 * 계정 설정 — 내 정보 · 동의 내역 · 탈퇴.
 *
 * 개인정보처리방침 제8조 ②가 "권리 행사는 서비스 내 [계정 설정] 화면을 통하거나…" 라고
 * 적고 있습니다. **이 화면이 그 문장의 근거입니다.** 없으면 방침이 허위 기재가 됩니다.
 *
 * 열람(제8조 ①1) · 정정(①2) · 삭제(①3) · 동의 철회가 여기서 전부 가능해야 합니다.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CONSENT_LABELS,
  OPTIONAL_CONSENTS,
  isRequiredConsent,
  type AccountProfile,
  type ConsentRecord,
} from '@luvi/schema';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const PROVIDER_LABELS: Record<string, string> = {
  kakao: '카카오',
  naver: '네이버',
  'google.com': '구글',
  password: '이메일',
  custom: '소셜 로그인',
};

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }) : '-';

export default function Account() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [history, setHistory] = useState<ConsentRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [p, h] = await Promise.all([api.account.get(), api.consents.list()]);
    if (p.ok) setProfile(p.data);
    else setError(p.error.message);
    if (h.ok) setHistory(h.data);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (error) {
    return <p className="px-1 py-10 text-[13px] text-red-700">{error}</p>;
  }
  if (!profile) {
    return <p className="px-1 py-10 text-[13px] text-muted">불러오는 중…</p>;
  }

  return (
    <div className="mx-auto w-full max-w-[620px] pb-24">
      <h1 className="mb-1 text-[20px] font-semibold text-ink">계정 설정</h1>
      <p className="mb-8 text-[12.5px] text-muted">
        저장된 정보를 확인하고 수정하거나, 동의 내역을 관리할 수 있어요.
      </p>

      {notice && (
        <p className="mb-6 rounded-lg border border-gold/40 bg-gold/5 px-3.5 py-2.5 text-[12.5px] text-ink">
          {notice}
        </p>
      )}

      <ProfileSection profile={profile} onSaved={load} onNotice={setNotice} />
      <ConsentSection profile={profile} history={history} onChanged={load} onNotice={setNotice} />
      <DangerSection
        onDone={async () => {
          await signOut();
          navigate('/', { replace: true });
        }}
      />
    </div>
  );
}

// ─────────────────────────── 내 정보 ───────────────────────────

function ProfileSection({
  profile,
  onSaved,
  onNotice,
}: {
  profile: AccountProfile;
  onSaved: () => Promise<void>;
  onNotice: (m: string) => void;
}) {
  const [name, setName] = useState(profile.displayName ?? '');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const dirty = name.trim() !== (profile.displayName ?? '');

  async function save() {
    if (!dirty || saving) return;
    setSaving(true);
    setErr(null);
    const res = await api.account.update({ displayName: name.trim() });
    setSaving(false);
    if (!res.ok) return setErr(res.error.message);
    await onSaved();
    onNotice('표시 이름을 바꿨어요.');
  }

  async function clearPhoto() {
    const res = await api.account.update({ clearPhoto: true });
    if (!res.ok) return setErr(res.error.message);
    await onSaved();
    onNotice(
      '프로필 사진을 해제했어요. 다음에 소셜 로그인하면 다시 저장될 수 있어요. ' +
        '완전히 원치 않으시면 해당 서비스의 동의 항목에서 프로필 사진을 빼주세요.',
    );
  }

  return (
    <section className="mb-10">
      <h2 className="mb-3 text-[14px] font-semibold text-ink">내 정보</h2>

      <dl className="divide-y divide-line rounded-xl border border-line">
        <Row label="이메일">{profile.email ?? '제공받지 않음'}</Row>
        <Row label="가입 경로">
          {profile.providers.length
            ? profile.providers.map((p) => PROVIDER_LABELS[p] ?? p).join(' · ')
            : '-'}
        </Row>
        <Row label="가입일">{fmt(profile.createdAt)}</Row>
        <Row label="최종 로그인">{fmt(profile.lastLoginAt)}</Row>
        <Row label="프로필 사진">
          {profile.photoURL ? (
            <span className="flex items-center gap-2">
              <img
                src={profile.photoURL}
                alt=""
                className="h-7 w-7 rounded-full object-cover"
                referrerPolicy="no-referrer"
              />
              <button
                type="button"
                onClick={clearPhoto}
                className="text-[12px] text-muted underline underline-offset-2 hover:text-ink"
              >
                해제
              </button>
            </span>
          ) : (
            '없음'
          )}
        </Row>
      </dl>

      <label className="mt-5 block">
        <span className="mb-1.5 block text-[12.5px] text-muted">표시 이름</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
          className="h-11 w-full rounded-xl border border-line bg-white px-3.5 text-[14px] text-ink outline-none focus:border-gold"
        />
      </label>

      {err && <p className="mt-2 text-[12.5px] text-red-700">{err}</p>}

      <button
        type="button"
        onClick={save}
        disabled={!dirty || saving}
        className="mt-3 h-10 rounded-lg bg-ink px-5 text-[13px] font-semibold text-white disabled:opacity-35"
      >
        {saving ? '저장 중…' : '저장'}
      </button>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 px-4 py-3">
      <dt className="w-[84px] shrink-0 text-[12.5px] text-muted">{label}</dt>
      <dd className="flex-1 break-all text-[13px] text-ink">{children}</dd>
    </div>
  );
}

// ─────────────────────────── 동의 내역 ───────────────────────────

function ConsentSection({
  profile,
  history,
  onChanged,
  onNotice,
}: {
  profile: AccountProfile;
  history: ConsentRecord[];
  onChanged: () => Promise<void>;
  onNotice: (m: string) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);

  /** 선택 항목 철회·재동의. 필수 항목은 여기서 끄지 못합니다(탈퇴가 그 경로입니다) */
  async function setOptional(docType: (typeof OPTIONAL_CONSENTS)[number], agreed: boolean) {
    setBusy(docType);
    const res = await api.consents.submit({
      method: 'settings',
      items: [{ docType, agreed }],
    });
    setBusy(null);
    if (!res.ok) return;
    await onChanged();
    onNotice(agreed ? '수신 동의를 저장했어요.' : '수신 동의를 철회했어요.');
  }

  return (
    <section className="mb-10">
      <h2 className="mb-3 text-[14px] font-semibold text-ink">동의 내역</h2>

      <div className="space-y-2">
        {OPTIONAL_CONSENTS.map((t) => {
          const agreed = Boolean(profile.consent.versions[t]);
          return (
            <div
              key={t}
              className="flex items-center gap-3 rounded-xl border border-line px-4 py-3.5"
            >
              <div className="flex-1">
                <p className="text-[13.5px] text-ink">
                  <span className="text-muted">[선택]</span> {CONSENT_LABELS[t]}
                </p>
                <p className="mt-0.5 text-[11.5px] text-muted">
                  {agreed ? '동의함 (언제든 철회할 수 있어요)' : '동의하지 않음'}
                </p>
              </div>
              <button
                type="button"
                disabled={busy === t}
                onClick={() => setOptional(t, !agreed)}
                className="shrink-0 rounded-lg border border-line px-3.5 py-2 text-[12.5px] text-ink disabled:opacity-40"
              >
                {busy === t ? '…' : agreed ? '철회' : '동의'}
              </button>
            </div>
          );
        })}
      </div>

      <h3 className="mb-2 mt-6 text-[12.5px] font-semibold text-ink">기록</h3>
      {history.length === 0 ? (
        <p className="text-[12.5px] text-muted">기록이 없습니다.</p>
      ) : (
        <ul className="divide-y divide-line rounded-xl border border-line text-[12.5px]">
          {history.map((r) => (
            <li key={r.id} className="flex items-baseline gap-3 px-4 py-2.5">
              <span className="flex-1 text-ink">
                {CONSENT_LABELS[r.docType]}
                <span className="ml-1.5 text-muted">v{r.docVersion}</span>
                {isRequiredConsent(r.docType) ? null : (
                  <span className={`ml-1.5 ${r.agreed ? 'text-gold' : 'text-muted'}`}>
                    {r.agreed ? '동의' : '철회'}
                  </span>
                )}
              </span>
              <span className="shrink-0 text-muted">{fmt(r.agreedAt)}</span>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 text-[11.5px] text-muted">
        전문:{' '}
        <Link to="/terms" className="underline underline-offset-2 hover:text-ink">
          이용약관
        </Link>{' '}
        ·{' '}
        <Link to="/privacy" className="underline underline-offset-2 hover:text-ink">
          개인정보처리방침
        </Link>
      </p>
    </section>
  );
}

// ─────────────────────────── 탈퇴 ───────────────────────────

/**
 * 🔴 되돌릴 수 없는 동작이라 **문구를 직접 입력**받습니다.
 *
 * 확인 버튼 한 번으로 끝내면 잘못 누르는 일이 실제로 생깁니다. 청첩장·사진·방명록이
 * 한꺼번에 사라지고 복구 수단이 없으므로, 손이 한 번 더 가게 만드는 쪽이 맞습니다.
 */
const CONFIRM_PHRASE = '탈퇴합니다';

function DangerSection({ onDone }: { onDone: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [phrase, setPhrase] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function remove() {
    if (phrase.trim() !== CONFIRM_PHRASE || busy) return;
    setBusy(true);
    setErr(null);
    const res = await api.account.remove();
    if (!res.ok) {
      setBusy(false);
      return setErr(res.error.message);
    }
    await onDone();
  }

  return (
    <section className="rounded-xl border border-red-200 bg-red-50/40 p-5">
      <h2 className="text-[14px] font-semibold text-red-800">회원 탈퇴</h2>
      <p className="mt-2 text-[12.5px] leading-relaxed text-red-900/80">
        탈퇴하면 <strong className="font-semibold">제작한 청첩장, 업로드한 사진과 음원, 그
        청첩장에 남은 방명록이 모두 삭제되며 복구할 수 없습니다.</strong> 발행된 주소도 즉시
        열리지 않습니다. 필요한 내용은 미리 따로 보관해 주세요.
      </p>

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-4 h-10 rounded-lg border border-red-300 bg-white px-4 text-[13px] font-semibold text-red-700"
        >
          탈퇴하기
        </button>
      ) : (
        <div className="mt-4">
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] text-red-900/80">
              계속하려면 <strong className="font-semibold">{CONFIRM_PHRASE}</strong> 를 입력해
              주세요
            </span>
            <input
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              className="h-11 w-full rounded-xl border border-red-300 bg-white px-3.5 text-[14px] outline-none focus:border-red-500"
              placeholder={CONFIRM_PHRASE}
            />
          </label>

          {err && <p className="mt-2 text-[12.5px] text-red-700">{err}</p>}

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={remove}
              disabled={phrase.trim() !== CONFIRM_PHRASE || busy}
              className="h-10 rounded-lg bg-red-600 px-4 text-[13px] font-semibold text-white disabled:opacity-35"
            >
              {busy ? '삭제하는 중…' : '영구 삭제'}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setPhrase('');
                setErr(null);
              }}
              className="h-10 rounded-lg border border-line bg-white px-4 text-[13px] text-ink"
            >
              취소
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
