import { useInvitation } from '@/lib/invitationContext';
import { Field } from '@/components/common/Editable';
import { SectionText } from '../ui';

export function Greeting() {
  const invitation = useInvitation();
  const { greeting, groom, bride, sectionText } = invitation;
  const text = sectionText.greeting;
  // 미리보기에서 고칠 때 어느 사람의 값인지 알아야 해서 경로 조각을 함께 듭니다
  const parents = [
    { p: groom, key: 'groom' },
    { p: bride, key: 'bride' },
  ] as const;

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
            <Field
              path="core.greeting.bubbleText"
              value={greeting.dogBubble}
              placeholder="말풍선 문구"
            />
          </div>
        </div>
      )}

      <SectionText section="greeting" zone="head" blocks={text.head} className="mb-6" />

      <p className="m-0 whitespace-pre-line font-myeongjo text-[15.5px] leading-[2.15] text-ink">
        <Field path="core.greeting.message" value={greeting.message} placeholder="인사말" />
      </p>

      {/* 발자국 구분선 */}
      <div className="mx-auto my-[34px] flex items-center justify-center gap-[9px] text-rose">
        🐾<span className="h-px w-[26px] bg-gold" />🐾
        <span className="h-px w-[26px] bg-gold" />🐾
      </div>

      <div className="text-sm leading-[2] text-ink-soft">
        {/* 혼주 — 배열이 아니라 신랑/신부 두 사람이므로 경로를 그때그때 만듭니다 */}
        {parents.map(({ p, key }) => (
          <div key={key}>
            <Field path={`core.couple.${key}.father`} value={p.father} /> ·{' '}
            <Field path={`core.couple.${key}.mother`} value={p.mother} />{' '}
            <span className="font-semibold text-ink">
              의 <Field path={`core.couple.${key}.relation`} value={p.relation} />
            </span>{' '}
            <Field path={`core.couple.${key}.firstName`} value={p.firstName} />
          </div>
        ))}
      </div>

      <SectionText section="greeting" zone="foot" blocks={text.foot} className="mt-7" />
    </section>
  );
}
