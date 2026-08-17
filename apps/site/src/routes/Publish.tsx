/**
 * C5 발행 · 공유.
 *
 * 발행은 **되돌리기 어려운** 동작입니다 (하객에게 링크가 나갑니다). 그래서 누르기 전에
 * 세 가지를 보여줍니다: (1) 주소가 비어 있지 않고 중복이 아닌지, (2) 초안↔발행본 변경 요약,
 * (3) 아직 비어 있는 필수 항목. 필수 항목이 하나라도 남으면 발행 버튼을 잠급니다 —
 * 서버도 같은 검사를 하지만, 하객이 빈칸을 보기 전에 화면에서 먼저 막는 편이 친절합니다.
 *
 * 발행 후 공유 경로가 2개입니다 — SDK 공유로 보낸 메시지에만 버튼이 붙고, URL 을 복사해
 * 붙여넣으면 OG 미리보기(버튼 없음)가 나옵니다. 카카오 정책이라 두 경로를 그대로 보여줍니다.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toDataURL } from 'qrcode';
import type { DraftDiff, Invitation, PublishResult, SlugAvailability } from '@luvi/schema';
import { api } from '@/lib/api';
import { assetUrl, env } from '@/lib/env';

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/;
const RESERVED = new Set([
  'api', 'app', 'admin', 'i', 'assets', 'cdn', 'www', 'login', 'new', 'health', 'static', 'public',
]);

/** 서버와 같은 형식 규칙 — 화면에서 먼저 걸러 왕복을 줄입니다 */
function slugError(s: string): string | null {
  if (!s) return null;
  if (RESERVED.has(s)) return '이미 예약된 주소예요';
  if (!SLUG_RE.test(s)) return '영문 소문자·숫자·하이픈만, 3~40자';
  return null;
}

/** 영문 이름에서 기본 주소를 제안합니다 (한글은 슬러그에 못 들어갑니다) */
function suggestSlug(inv: Invitation): string {
  const g = inv.draft.core.couple.groom.nameEn.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const b = inv.draft.core.couple.bride.nameEn.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const joined = [g, b].filter(Boolean).join('-');
  return SLUG_RE.test(joined) ? joined : '';
}

type Load =
  | { state: 'loading' }
  | { state: 'error'; message: string }
  | { state: 'ready'; inv: Invitation };

export default function Publish() {
  const { id = '' } = useParams<{ id: string }>();
  const [load, setLoad] = useState<Load>({ state: 'loading' });

  const [slug, setSlug] = useState('');
  const [avail, setAvail] = useState<SlugAvailability | null>(null);
  const [checking, setChecking] = useState(false);
  const [diff, setDiff] = useState<DraftDiff | null>(null);

  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [result, setResult] = useState<PublishResult | null>(null);
  const [qr, setQr] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const checkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── 로드 ──
  useEffect(() => {
    let alive = true;
    void (async () => {
      const res = await api.invitations.get(id);
      if (!alive) return;
      if (res.ok) {
        setLoad({ state: 'ready', inv: res.data });
        setSlug(res.data.slug || suggestSlug(res.data));
      } else {
        setLoad({ state: 'error', message: res.error.message });
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  const err = slugError(slug);

  // ── 슬러그 중복확인 + 변경/필수 검사 (디바운스) ──
  useEffect(() => {
    if (checkTimer.current) clearTimeout(checkTimer.current);
    if (!slug || err) {
      setAvail(null);
      return;
    }
    setChecking(true);
    checkTimer.current = setTimeout(() => {
      void (async () => {
        const [a, d] = await Promise.all([
          api.slugs.check(slug),
          api.invitations.diff(id, slug),
        ]);
        setAvail(a.ok ? a.data : null);
        setDiff(d.ok ? d.data : null);
        setChecking(false);
      })();
    }, 500);
    return () => {
      if (checkTimer.current) clearTimeout(checkTimer.current);
    };
  }, [slug, err, id]);

  const missing = diff?.missing ?? [];
  const changes = diff?.changes ?? [];
  const slugOk = !err && avail?.available === true;
  const canPublish = slugOk && missing.length === 0 && !checking && !publishing;

  const onPublish = async () => {
    setPublishing(true);
    setPublishError(null);
    const res = await api.invitations.publish(id, { slug });
    setPublishing(false);
    if (res.ok) {
      setResult(res.data);
      try {
        setQr(await toDataURL(res.data.url, { width: 240, margin: 1 }));
      } catch {
        /* QR 실패는 발행 성공을 막지 않습니다 */
      }
    } else {
      setPublishError(res.error.message);
    }
  };

  const copyLink = useCallback(async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setPublishError('링크 복사에 실패했습니다. 주소를 길게 눌러 복사해주세요');
    }
  }, []);

  const shareKakao = useCallback(
    async (r: PublishResult, inv: Invitation) => {
      if (!env.kakaoJsKey) {
        if (navigator.share) await navigator.share({ url: r.url, title: inv.draft.core.share.title });
        else await copyLink(r.url);
        return;
      }
      type KakaoSDK = {
        isInitialized: () => boolean;
        init: (k: string) => void;
        Share: { sendDefault: (o: unknown) => void };
      };
      const w = window as unknown as { Kakao?: KakaoSDK };
      if (!w.Kakao) {
        await new Promise<void>((resolve, reject) => {
          const s = document.createElement('script');
          s.src = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js';
          s.onload = () => resolve();
          s.onerror = () => reject(new Error('kakao sdk'));
          document.head.appendChild(s);
        }).catch(() => undefined);
      }
      const kakao = w.Kakao;
      if (!kakao) {
        await copyLink(r.url);
        return;
      }
      if (!kakao.isInitialized()) kakao.init(env.kakaoJsKey);
      const share = inv.draft.core.share;
      kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
          title: share.title,
          description: share.description,
          imageUrl: share.image ? assetUrl(share.image.key) : '',
          link: { mobileWebUrl: r.url, webUrl: r.url },
        },
        buttons: [{ title: '청첩장 보기', link: { mobileWebUrl: r.url, webUrl: r.url } }],
      });
    },
    [copyLink],
  );

  if (load.state !== 'ready') {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-bg text-center">
        {load.state === 'error' ? (
          <>
            <p className="text-[14px] text-ink-soft">{load.message}</p>
            <Link to="/app" className="rounded-full border border-line-strong px-4 py-2 text-[12.5px] text-muted">
              대시보드로
            </Link>
          </>
        ) : (
          <p className="text-[13px] text-muted">불러오는 중…</p>
        )}
      </div>
    );
  }

  const { inv } = load;
  const share = inv.draft.core.share;

  return (
    <div className="min-h-dvh bg-bg">
      <div className="mx-auto max-w-[560px] px-5 py-8">
        <div className="mb-6 flex items-center gap-2">
          <Link to={`/app/i/${id}/edit`} className="text-[13px] text-muted">
            ← 편집으로
          </Link>
          <h1 className="ml-1 text-[20px] font-bold tracking-[-.03em]">발행하고 공유하기</h1>
        </div>

        {/* ───────── 발행 후 ───────── */}
        {result ? (
          <div className="flex flex-col gap-5">
            <div className="rounded-2xl border border-gold/40 bg-cream px-5 py-6 text-center">
              <p className="text-[13px] font-semibold text-gold-deep">발행되었습니다 🎉</p>
              <a
                href={result.url}
                target="_blank"
                rel="noreferrer"
                className="mt-2 block break-all text-[15px] font-medium text-ink underline"
              >
                {result.url}
              </a>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void copyLink(result.url)}
                className="flex-1 rounded-xl bg-ink px-4 py-3 text-[13px] font-semibold text-paper"
              >
                {copied ? '복사됨 ✓' : '링크 복사'}
              </button>
              <button
                type="button"
                onClick={() => void shareKakao(result, inv)}
                className="flex-1 rounded-xl bg-[#FEE500] px-4 py-3 text-[13px] font-semibold text-[#3C1E1E]"
              >
                카카오톡 공유
              </button>
            </div>

            {qr && (
              <div className="flex flex-col items-center gap-2 rounded-2xl border border-line bg-surface px-5 py-6">
                <img src={qr} alt="청첩장 QR 코드" width={200} height={200} />
                <a
                  href={qr}
                  download={`luvi-${result.slug}-qr.png`}
                  className="text-[12.5px] text-gold-deep underline"
                >
                  QR 이미지 저장
                </a>
              </div>
            )}

            <Link to="/app" className="text-center text-[13px] text-muted underline">
              대시보드로 돌아가기
            </Link>
          </div>
        ) : (
          /* ───────── 발행 전 ───────── */
          <div className="flex flex-col gap-6">
            {/* 주소 */}
            <section>
              <h2 className="mb-2 text-[14px] font-semibold text-ink">청첩장 주소</h2>
              <div className="flex items-center overflow-hidden rounded-lg border border-line-strong bg-white focus-within:border-gold">
                <span className="flex-none pl-3.5 text-[12.5px] text-muted-faint">luv-ai.co.kr/i/</span>
                <input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().trim())}
                  placeholder="our-wedding"
                  spellCheck={false}
                  autoCapitalize="none"
                  className="min-w-0 flex-1 bg-transparent py-3 pl-0.5 pr-3.5 outline-none"
                />
              </div>
              <div className="mt-1.5 min-h-[18px] text-[11.5px]">
                {err && <span className="text-gold-deep">{err}</span>}
                {!err && checking && <span className="text-muted">확인 중…</span>}
                {!err && !checking && avail?.available && <span className="text-success">사용할 수 있는 주소예요 ✓</span>}
                {!err && !checking && avail && !avail.available && (
                  <span className="text-gold-deep">
                    이미 사용 중이에요
                    {avail.suggestions?.length ? ` — 예: ${avail.suggestions.join(', ')}` : ''}
                  </span>
                )}
              </div>
            </section>

            {/* 필수 항목 누락 */}
            {missing.length > 0 && (
              <section className="rounded-xl border border-gold/40 bg-cream px-4 py-3.5">
                <p className="text-[12.5px] font-semibold text-gold-deep">
                  아직 비어 있는 필수 항목이 있어요
                </p>
                <ul className="mt-2 flex flex-col gap-1 text-[12.5px] text-ink-soft">
                  {missing.map((m) => (
                    <li key={m.path}>· {m.label}</li>
                  ))}
                </ul>
                <Link to={`/app/i/${id}/edit`} className="mt-2 inline-block text-[12px] text-gold-deep underline">
                  편집으로 가서 채우기
                </Link>
              </section>
            )}

            {/* 변경 요약 */}
            <section>
              <h2 className="mb-2 text-[14px] font-semibold text-ink">
                {inv.status === 'published' ? '변경 사항' : '발행 내용'}
              </h2>
              {inv.status !== 'published' ? (
                <p className="text-[12.5px] text-muted">처음 발행하면 이 내용이 하객에게 공개됩니다.</p>
              ) : changes.length === 0 ? (
                <p className="text-[12.5px] text-muted">발행본과 달라진 내용이 없어요.</p>
              ) : (
                <ul className="flex flex-col gap-1 text-[12.5px] text-ink-soft">
                  {changes.map((c, i) => (
                    <li key={`${c.path}-${i}`}>· {c.label}</li>
                  ))}
                </ul>
              )}
            </section>

            {/* 공유 미리보기 */}
            <section>
              <h2 className="mb-2 text-[14px] font-semibold text-ink">공유 미리보기</h2>
              <div className="overflow-hidden rounded-xl border border-line bg-white">
                {share.image ? (
                  <img src={assetUrl(share.image.key)} alt="" className="aspect-[1.91/1] w-full object-cover" />
                ) : (
                  <div className="flex aspect-[1.91/1] w-full items-center justify-center bg-surface-sunken text-[12px] text-muted-faint">
                    공유 이미지를 설정하면 여기 미리보기가 보여요
                  </div>
                )}
                <div className="px-4 py-3">
                  <p className="text-[13px] font-semibold text-ink">{share.title || '제목 없음'}</p>
                  <p className="mt-0.5 line-clamp-2 text-[12px] text-muted">{share.description}</p>
                </div>
              </div>
            </section>

            {publishError && <p className="text-[12.5px] text-gold-deep">{publishError}</p>}

            <button
              type="button"
              disabled={!canPublish}
              onClick={() => void onPublish()}
              className="rounded-xl bg-ink px-4 py-3.5 text-[14px] font-semibold text-paper disabled:cursor-not-allowed disabled:opacity-40"
            >
              {publishing ? '발행 중…' : inv.status === 'published' ? '변경사항 발행' : '발행하기'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
