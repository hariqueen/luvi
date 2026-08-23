/**
 * ART 브랜드 필름 — 서비스 3종을 카피 한 줄씩으로 보여주는 어두운 구간.
 *
 * 패널이 sticky 로 겹쳐 쌓이며 넘어갑니다. 배경 패럴랙스는 `data-art` / `data-art-bg` 표시를
 * 보고 lib/reveal.ts 의 useArtParallax() 가 붙입니다 (홈에서 한 번 호출).
 *
 * 여기는 스크롤 3화면을 소비하는 구간이라 정보를 넣지 않습니다 — 읽을 것은 아래 카드에 있고,
 * 이 구간의 역할은 톤을 바꿔 다음 섹션을 다르게 읽히게 만드는 것뿐입니다.
 */
const PANELS = [
  {
    eyebrow: 'Mobile invitation',
    title: ['한 장의 링크가', '하루를 담습니다'],
    body: '하객이 여는 순간부터 예식이 끝난 뒤까지, 두 사람의 하루가 살아 있는 화면으로 남습니다.',
    panelBg: '#141312',
    stripe: 'repeating-linear-gradient(135deg,#1B1917 0 14px,#141312 14px 28px)',
  },
  {
    eyebrow: 'Paper',
    title: ['손에 쥐는 무게도', '남깁니다'],
    body: '같은 내용을 128 × 182mm 종이 위로 옮깁니다. 재단선까지 맞춘 인쇄용 PDF로.',
    panelBg: '#17140F',
    stripe: 'repeating-linear-gradient(135deg,#211C15 0 14px,#17140F 14px 28px)',
  },
  {
    eyebrow: 'AI film',
    title: ['문장 하나로', '영상이 됩니다'],
    body: 'Love + AI. 원하는 분위기를 적으면 예식장 규격에 맞는 식전영상이 만들어집니다.',
    panelBg: '#100F0E',
    stripe: 'repeating-linear-gradient(135deg,#1A1613 0 14px,#100F0E 14px 28px)',
  },
] as const;

const SCRIM =
  'linear-gradient(180deg,rgba(17,16,16,.55) 0%,rgba(17,16,16,.15) 40%,rgba(17,16,16,.75) 100%)';

export function BrandFilm() {
  return (
    <section id="art" className="bg-[#111010]">
      <div className="relative">
        {PANELS.map((p) => (
          <div
            key={p.eyebrow}
            data-art
            className="sticky top-0 flex h-dvh min-h-[600px] items-center justify-center overflow-hidden"
            style={{ background: p.panelBg }}
          >
            <div
              data-art-bg
              aria-hidden
              className="absolute inset-x-0 -inset-y-[8%] will-change-transform"
              style={{ background: p.stripe }}
            />
            <div aria-hidden className="absolute inset-0" style={{ background: SCRIM }} />

            <div className="relative max-w-[900px] px-7 text-center">
              <div className="mb-5 font-script text-[30px] leading-none text-gold">
                {p.eyebrow}
              </div>
              <h2 className="m-0 text-[clamp(38px,5.4vw,80px)] font-extrabold leading-[1.08] tracking-[-.05em] text-paper [text-wrap:pretty]">
                {p.title[0]}
                <br />
                {p.title[1]}
              </h2>
              <p className="mx-auto mt-6 max-w-[460px] text-[15px] leading-[1.9] text-paper/60">
                {p.body}
              </p>
            </div>

            {/* 아래로 더 있다는 신호 */}
            <span
              aria-hidden
              className="absolute bottom-[34px] left-1/2 h-11 w-px -translate-x-1/2"
              style={{
                background: 'linear-gradient(180deg,rgba(201,160,99,0),#C9A063)',
              }}
            />
          </div>
        ))}
      </div>

      <div className="border-t border-[#23211E] px-[clamp(16px,3vw,28px)] py-[clamp(48px,6vw,70px)] text-center">
        <div className="mb-[18px] font-script text-[26px] leading-none text-[#8A8175]">
          Love + AI
        </div>
        <p className="mx-auto max-w-[660px] text-[clamp(20px,2vw,28px)] font-bold leading-[1.5] tracking-[-.03em] text-paper [text-wrap:pretty]">
          감성은 브랜드가, 명료함은 도구가 맡습니다.
        </p>
      </div>
    </section>
  );
}
