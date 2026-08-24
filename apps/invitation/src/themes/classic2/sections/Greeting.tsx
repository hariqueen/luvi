/**
 * 인사말 (classic2) — 흰 바탕에 명조 본문, 아래에 혼주 정보.
 *
 * 반려동물 말풍선은 classic2 원본 디자인에는 없지만 **데이터에는 있습니다**
 * (에디터에서 켜고 끌 수 있는 항목). 켠 사람에게 아무것도 안 보이면 고장으로 읽히므로,
 * 이 디자인 톤(크림 원 + 세이지 글자)으로 함께 그립니다.
 */
import { Field } from '@/components/common/Editable';
import { Ornament, SectionText } from '../ui';
import { useInvitation } from '@/lib/invitationContext';

export function Greeting() {
  const { greeting, groom, bride, sectionText } = useInvitation();
  const text = sectionText.greeting;
  // 미리보기에서 고칠 때 어느 사람의 값인지 알아야 해서 경로 조각을 함께 듭니다
  const parents = [
    { p: groom, key: 'groom' },
    { p: bride, key: 'bride' },
  ] as const;

  return (
    <section className="bg-white px-[34px] py-16 text-center">
      <SectionText section="greeting" zone="head" blocks={text.head} />

      {greeting.dogBubbleVisible && (
        <div className="mt-7 flex items-center justify-center gap-2.5">
          <div className="flex size-[46px] flex-none items-center justify-center overflow-hidden rounded-full bg-c2-cream">
            {greeting.dogImage ? (
              <img src={greeting.dogImage} alt="반려동물" className="w-[52px]" />
            ) : (
              <span role="img" aria-label="반려동물" className="text-[24px] leading-none">
                🐶
              </span>
            )}
          </div>
          <div className="whitespace-pre-line border border-c2-line bg-c2-ivory px-4 py-2.5 text-left font-myeongjo text-[12.5px] leading-[1.6] text-c2-sage-deep">
            <Field
              path="core.greeting.bubbleText"
              value={greeting.dogBubble}
              placeholder="말풍선 문구"
            />
          </div>
        </div>
      )}

      <p className="m-0 mt-[30px] whitespace-pre-line font-myeongjo text-[15px] leading-[2.2] text-c2-ink">
        <Field path="core.greeting.message" value={greeting.message} placeholder="인사말" />
      </p>

      <Ornament className="mt-9" />

      <div className="mt-[26px] font-myeongjo text-sm leading-[2.1] text-c2-ink-soft">
        {/* 혼주 — **한 사람당 한 줄, 통째로** 고칩니다. 사이의 '·' 와 '의' 까지 값의
            일부입니다 (예전에는 네 칸으로 쪼개져 있어 그 사이 글자는 손댈 수 없었습니다).
            굵게는 값 안의 <b> 입니다 — ⌘/Ctrl+B */}
        {parents.map(({ p, key }) => (
          <div key={key}>
            <Field
              path={`core.couple.${key}.parentsLine`}
              value={p.parentsLine}
              placeholder="혼주"
            />
          </div>
        ))}
      </div>

      <SectionText section="greeting" zone="foot" blocks={text.foot} className="mt-8" />
    </section>
  );
}
