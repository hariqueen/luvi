/**
 * 마무리 (classic2) — 사진 대신 아이보리 여백에 감사 인사.
 *
 * 원본 디자인의 마무리 화면은 사진이 없습니다. 대신 마무리 사진(`footer.image`)이
 * 있으면 **아주 옅게 배경으로** 깔아 줍니다 — 올린 사진이 아무 데도 안 쓰이면
 * "왜 안 보이지" 가 됩니다.
 *
 * 공유 동작은 classic1 과 같은 `useShare()` 입니다 (카카오 → OS 공유 시트 → 링크 복사).
 */
import { useShare } from '@/hooks/useShare';
import { Ornament } from '../ui';
import { useInvitation } from '@/lib/invitationContext';

export function Footer() {
  const { footer, groom, bride, share } = useInvitation();
  const { kakaoAvailable, sharing, shareNote, linkCopied, shareToKakao, copyLink } = useShare();

  return (
    <section className="relative overflow-hidden bg-c2-ivory px-[30px] pb-[74px] pt-[66px] text-center">
      {footer.image && (
        <>
          <div
            className="absolute inset-0 bg-cover opacity-[.12]"
            style={{ backgroundImage: `url("${footer.image}")`, backgroundPosition: 'center 30%' }}
          />
          {/* 사진 무늬 위에서도 활자가 읽히도록 아이보리를 한 겹 덮습니다 */}
          <div className="absolute inset-0 bg-c2-ivory/55" />
        </>
      )}
      <div
        className="pointer-events-none absolute -right-[60px] -top-10 h-[200px] w-[200px] rounded-full"
        style={{ background: 'radial-gradient(circle,rgba(142,156,132,.16),transparent 70%)' }}
      />
      <div
        className="pointer-events-none absolute -bottom-[50px] -left-[60px] h-[200px] w-[200px] rounded-full"
        style={{ background: 'radial-gradient(circle,rgba(180,154,99,.14),transparent 70%)' }}
      />

      <div className="relative z-[2]">
        <div className="font-pinyon text-[46px] leading-none text-c2-sage-deep">Thank You</div>
        <div className="mb-1.5 mt-[18px] font-myeongjo text-sm leading-[1.9] text-c2-ink">
          {groom.firstName} · {bride.firstName}
        </div>
        <div className="text-[12.5px] tracking-[0.08em] text-c2-ink-soft">{share.date}</div>

        <Ornament className="mt-7" />

        <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
          {kakaoAvailable && (
            <button
              onClick={shareToKakao}
              disabled={sharing}
              className="cursor-pointer rounded-full border border-c2-sage bg-white px-6 py-[11px] text-[12.5px] text-c2-sage-deep disabled:opacity-70"
            >
              {sharing ? '여는 중…' : '카카오톡으로 공유'}
            </button>
          )}
          <button
            onClick={copyLink}
            className="cursor-pointer rounded-full border border-c2-line bg-white px-6 py-[11px] text-[12.5px] text-c2-ink"
          >
            {linkCopied ? '링크 복사됨' : '청첩장 링크 복사'}
          </button>
        </div>

        {shareNote && (
          <p className="mt-3 text-[12px] leading-relaxed text-c2-ink-soft">{shareNote}</p>
        )}
      </div>
    </section>
  );
}
