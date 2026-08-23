/**
 * 마무리 — 마지막 사진 위에 감사 인사와 공유 버튼.
 *
 * 공유 동작(카카오 → OS 공유 시트 → 링크 복사)은 테마가 함께 쓰는 `useShare()` 에 있습니다.
 * 이 파일은 classic1 의 **모양**만 담당합니다.
 */
import { useShare } from '@/hooks/useShare';
import { useInvitation } from '@/lib/invitationContext';
import { SectionText } from '../ui';

export function Footer() {
  const { footer, groom, bride, share, sectionText } = useInvitation();
  const text = sectionText.footer;
  const {
    kakaoAvailable,
    sharing,
    shareNote,
    linkCopied,
    shareToKakao,
    copyLink,
  } = useShare();

  return (
    <section className="relative overflow-hidden bg-[#b9a596] px-7 pb-[70px] pt-[60px] text-center">
      <div
        className="absolute inset-0 bg-cover"
        style={{ backgroundImage: `url("${footer.image}")`, backgroundPosition: 'center 30%' }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg,rgba(40,30,26,.34),rgba(40,30,26,.66))',
        }}
      />

      <div className="relative z-[2] text-white">
        <SectionText
          section="footer"
          zone="head"
          blocks={text.head}
          override={{
            eyebrow: 'font-myeongjo text-xs tracking-[0.34em] text-white/80',
            title: 'font-cormorant text-2xl italic tracking-[0.02em] opacity-90',
            note: 'text-[12px] leading-relaxed text-white/90',
          }}
        />
        <div className="my-3.5 mb-1.5 font-myeongjo text-[15px] leading-[1.9]">
          {groom.firstName} ♥ {bride.firstName}
        </div>
        <div className="text-[13px] tracking-[0.08em] opacity-90">{share.date}</div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {kakaoAvailable && (
            <button
              onClick={shareToKakao}
              disabled={sharing}
              className="cursor-pointer rounded-full bg-[#FEE500] px-6 py-[11px] text-[13px] font-semibold text-[#3A2929] disabled:opacity-70"
            >
              💬 {sharing ? '여는 중…' : '카카오톡으로 공유'}
            </button>
          )}
          <button
            onClick={copyLink}
            className="cursor-pointer rounded-full border border-white/60 bg-white/10 px-6 py-[11px] text-[13px] font-semibold text-white backdrop-blur-[4px]"
          >
            🔗 {linkCopied ? '링크 복사됨!' : '청첩장 링크 복사'}
          </button>
        </div>

        {shareNote && (
          <p className="mt-3 text-[12px] leading-relaxed text-white/90">{shareNote}</p>
        )}
        <SectionText
          section="footer"
          zone="foot"
          blocks={text.foot}
          className="mt-4"
          override={{
            eyebrow: 'font-myeongjo text-xs tracking-[0.34em] text-white/80',
            title: 'font-cormorant text-2xl italic tracking-[0.02em] opacity-90',
            note: 'text-[12px] leading-relaxed text-white/90',
          }}
        />
      </div>
    </section>
  );
}
