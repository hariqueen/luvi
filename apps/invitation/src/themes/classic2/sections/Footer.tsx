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
import { Ornament, SectionText } from '../ui';
import { resolveCoupleLine } from '@luvi/schema';
import { useInvitation } from '@/lib/invitationContext';
import { Field } from '@/components/common/Editable';
import { Derived } from '@/components/common/PreviewSlot';

export function Footer() {
  const { footer, groom, bride, coupleLine, share, sectionText, labels } = useInvitation();
  const text = sectionText.footer;
  const { kakaoAvailable, sharing, shareNote, linkCopied, shareToKakao, copyLink } = useShare();

  return (
    <section className="relative overflow-hidden bg-c2-ivory px-[30px] pb-[74px] pt-[66px] text-center">
      {footer.image && (
        <>
          <div
            className="absolute inset-0 bg-cover opacity-[.12]"
            style={{ backgroundImage: `url("${footer.image}")`, backgroundPosition: 'center 30%' }}
          />
          {/*
            사진 무늬 위에서도 활자가 읽히도록 한 겹 덮습니다.
            색을 아이보리로 못 박지 않고 `--section-bg`(SectionSkin 이 넘겨주는 그 섹션의
            배경색)를 씁니다 — 못 박으면 에디터에서 고른 배경색이 이 덮개 아래에서 흐려집니다.
          */}
          <div
            className="absolute inset-0 opacity-55"
            style={{ background: 'var(--section-bg, #FCFAF6)' }}
          />
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
        <SectionText
          section="footer"
          zone="head"
          blocks={text.head}
          override={{ title: 'font-pinyon text-[46px] leading-none text-c2-sage-deep' }}
        />
        {/* 한 덩어리입니다 — 가운데 글자까지 사용자의 값입니다 (classic1 과 같은 규칙) */}
        <div className="mb-1.5 mt-[18px] font-myeongjo text-sm leading-[1.9] text-c2-ink">
          <Field
            path="core.couple.line"
            value={resolveCoupleLine({ groom, bride, line: coupleLine }, '·')}
            placeholder="두 사람 이름"
          />
        </div>
        <div className="text-[12.5px] tracking-[0.08em] text-c2-ink-soft">
          <Derived form="ceremony" hint="예식 일시에서 계산됩니다 — 눌러서 일시를 고치세요">
            {share.date}
          </Derived>
        </div>

        <Ornament className="mt-7" />

        <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
          {kakaoAvailable && (
            <button
              onClick={shareToKakao}
              disabled={sharing}
              className="cursor-pointer rounded-full border border-c2-sage bg-white px-6 py-[11px] text-[12.5px] text-c2-sage-deep disabled:opacity-70"
            >
              {sharing ? labels.shareKakaoBusy : labels.shareKakao}
            </button>
          )}
          <button
            onClick={copyLink}
            className="cursor-pointer rounded-full border border-c2-line bg-white px-6 py-[11px] text-[12.5px] text-c2-ink"
          >
            {linkCopied ? labels.shareCopied : labels.shareCopy}
          </button>
        </div>

        {shareNote && (
          <p className="mt-3 text-[12px] leading-relaxed text-c2-ink-soft">{shareNote}</p>
        )}
        <SectionText section="footer" zone="foot" blocks={text.foot} className="mt-4" />
      </div>
    </section>
  );
}
