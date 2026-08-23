/**
 * 서비스 이름이 흐르는 띠 — 어두운 구간과 프로세스 사이의 쉼표.
 *
 * 같은 목록을 두 번 그려 이어붙이고 절반만큼 밀어(`translateX(-50%)`) 끊김 없이 반복합니다.
 * 두 번째 벌은 시각 장식이므로 `aria-hidden` 입니다.
 * 애니메이션을 꺼둔 사용자에게는 흐름을 멈춥니다 — 계속 움직이는 큰 글자는 읽기를 방해합니다.
 */
const ITEMS = ['모바일 청첩장', '종이 청첩장', 'AI 식전영상'] as const;

function Row({ ariaHidden }: { ariaHidden?: boolean }) {
  return (
    <div className="flex items-center gap-11 pr-11" aria-hidden={ariaHidden || undefined}>
      {ITEMS.map((label) => (
        <span key={label} className="flex items-center gap-11">
          <span className="whitespace-nowrap text-3xl font-extrabold tracking-[-.04em] text-paper">
            {label}
          </span>
          <span className="text-base text-gold">●</span>
        </span>
      ))}
      <span className="whitespace-nowrap font-script text-4xl leading-none text-[#8A8175]">
        Love + AI
      </span>
      <span className="text-base text-gold">●</span>
    </div>
  );
}

export function Marquee() {
  return (
    <div className="mt-[110px] overflow-hidden border-t border-[#2A2825] bg-ink py-[22px]">
      <div className="flex w-max animate-marquee [animation-duration:26s] motion-reduce:animate-none">
        <Row />
        <Row ariaHidden />
      </div>
    </div>
  );
}
