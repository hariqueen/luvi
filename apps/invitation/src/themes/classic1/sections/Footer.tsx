/**
 * 마무리 — 마지막 사진 위에 감사 인사와 공유 버튼.
 *
 * 공유 동작(카카오 → OS 공유 시트 → 링크 복사)은 테마가 함께 쓰는 `useShare()` 에 있습니다.
 * 이 파일은 classic1 의 **모양**만 담당합니다.
 */
import { useShare } from '@/hooks/useShare';
import { resolveCoupleLine } from '@luvi/schema';
import { useInvitation } from '@/lib/invitationContext';
import { SectionText } from '../ui';
import { Field } from '@/components/common/Editable';
import { Derived } from '@/components/common/PreviewSlot';

export function Footer() {
  const { footer, groom, bride, coupleLine, share, sectionText, labels } = useInvitation();
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
        {/*
          🔴 **한 덩어리입니다.** 예전에는 이름 두 칸 사이에 ♥ 가 화면에 박혀 있어서,
             `길동 & 영희` 처럼 가운데 글자를 바꾸는 것이 아예 불가능했습니다.
             혼주 줄과 같은 규칙입니다 (`resolveCoupleLine`).
        */}
        <div className="my-3.5 mb-1.5 font-myeongjo text-[15px] leading-[1.9]">
          <Field
            path="core.couple.line"
            value={resolveCoupleLine({ groom, bride, line: coupleLine }, '♥')}
            placeholder="두 사람 이름"
          />
        </div>
        <div className="text-[13px] tracking-[0.08em] opacity-90">
          <Derived form="ceremony" hint="예식 일시에서 계산됩니다 — 눌러서 일시를 고치세요">
            {share.date}
          </Derived>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {kakaoAvailable && (
            <button
              onClick={shareToKakao}
              disabled={sharing}
              className="cursor-pointer rounded-full bg-[#FEE500] px-6 py-[11px] text-[13px] font-semibold text-[#3A2929] disabled:opacity-70"
            >
              {sharing ? labels.shareKakaoBusy : labels.shareKakao}
            </button>
          )}
          <button
            onClick={copyLink}
            className="cursor-pointer rounded-full border border-white/60 bg-white/10 px-6 py-[11px] text-[13px] font-semibold text-white backdrop-blur-[4px]"
          >
            {linkCopied ? labels.shareCopied : labels.shareCopy}
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
