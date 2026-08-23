import { Eyebrow } from '@/components/common/SectionHeading';
import { useInvitation } from '@/lib/invitationContext';

export function Greeting() {
  const invitation = useInvitation();
  const { greeting, groom, bride, sectionText } = invitation;
  const text = sectionText.greeting;
  const parents = [groom, bride];

  return (
    <section className="relative bg-white px-8 py-[60px] text-center">
      {/* 반려견 말풍선 — 에디터에서 끌 수 있음 */}
      {greeting.dogBubbleVisible && (
        <div className="mb-[30px] flex items-center justify-center gap-2.5">
          <div className="flex h-[50px] w-[50px] flex-none animate-wobble items-center justify-center overflow-hidden rounded-full bg-cream">
            {greeting.dogImage ? (
              <img src={greeting.dogImage} alt="반려견" className="w-14" />
            ) : (
              <span role="img" aria-label="반려견" className="text-[26px] leading-none">
                🐶
              </span>
            )}
          </div>
          <div className="whitespace-pre-line rounded-[6px_16px_16px_16px] bg-cream px-[15px] py-[11px] text-left text-[13px] font-semibold leading-[1.5] text-ink">
            {greeting.dogBubble}
          </div>
        </div>
      )}

      <Eyebrow className="mb-6">{text.eyebrow}</Eyebrow>

      <p className="m-0 whitespace-pre-line font-myeongjo text-[15.5px] leading-[2.15] text-ink">
        {greeting.message}
      </p>

      {/* 발자국 구분선 */}
      <div className="mx-auto my-[34px] flex items-center justify-center gap-[9px] text-rose">
        🐾<span className="h-px w-[26px] bg-gold" />🐾
        <span className="h-px w-[26px] bg-gold" />🐾
      </div>

      <div className="text-sm leading-[2] text-ink-soft">
        {parents.map((p, i) => (
          <div key={i}>
            {p.father} · {p.mother}{' '}
            <span className="font-semibold text-ink">의 {p.relation}</span> {p.firstName}
          </div>
        ))}
      </div>
    </section>
  );
}
