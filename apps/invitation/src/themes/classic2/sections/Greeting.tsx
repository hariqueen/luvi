/**
 * 인사말 (classic2) — 흰 바탕에 명조 본문, 아래에 혼주 정보.
 *
 * 반려동물 말풍선은 classic2 원본 디자인에는 없지만 **데이터에는 있습니다**
 * (에디터에서 켜고 끌 수 있는 항목). 켠 사람에게 아무것도 안 보이면 고장으로 읽히므로,
 * 이 디자인 톤(크림 원 + 세이지 글자)으로 함께 그립니다.
 */
import { Heading, Ornament } from '../ui';
import { useInvitation } from '@/lib/invitationContext';

export function Greeting() {
  const { greeting, groom, bride } = useInvitation();
  const parents = [groom, bride];

  return (
    <section className="bg-white px-[34px] py-16 text-center">
      <Heading script="Invitation" label="초대합니다" />

      {greeting.dogBubbleVisible && (
        <div className="mt-7 flex items-center justify-center gap-2.5">
          <div className="flex size-[46px] flex-none items-center justify-center overflow-hidden rounded-full bg-c2-cream">
            <img src={greeting.dogImage} alt="반려동물" className="w-[52px]" />
          </div>
          <div className="whitespace-pre-line border border-c2-line bg-c2-ivory px-4 py-2.5 text-left font-myeongjo text-[12.5px] leading-[1.6] text-c2-sage-deep">
            {greeting.dogBubble}
          </div>
        </div>
      )}

      <p className="m-0 mt-[30px] whitespace-pre-line font-myeongjo text-[15px] leading-[2.2] text-c2-ink">
        {greeting.message}
      </p>

      <Ornament className="mt-9" />

      <div className="mt-[26px] font-myeongjo text-sm leading-[2.1] text-c2-ink-soft">
        {parents.map((p, i) => (
          <div key={i}>
            {p.father} · {p.mother} <span className="text-c2-ink">의 {p.relation}</span>{' '}
            {p.firstName}
          </div>
        ))}
      </div>
    </section>
  );
}
