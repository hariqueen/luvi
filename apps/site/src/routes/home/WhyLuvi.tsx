/**
 * Why Luvi — 다른 곳과 갈리는 두 가지.
 *
 * 왼쪽(미니게임)은 눈길을 끄는 이유, 오른쪽(발행 후 수정)은 실제로 결제하는 이유입니다.
 * 오른쪽 카드의 "다른 곳 vs Luvi" 두 줄이 이 섹션에서 가장 중요한 부분이라
 * 비교표로 키우지 않고 두 줄로 압축했습니다 — 길어지면 아무도 안 읽습니다.
 */
const HATCH_DARK = 'repeating-linear-gradient(135deg,#2A2825 0 8px,#232120 8px 16px)';

export function WhyLuvi() {
  return (
    <section
      id="why"
      data-reveal
      className="mx-auto max-w-page px-[clamp(16px,3vw,28px)] pt-[clamp(64px,8vw,110px)]"
    >
      <div className="mb-12 text-center">
        <span className="font-script text-2xl leading-none text-gold-deep">Why Luvi</span>
        <h2 className="mt-3.5 text-[clamp(30px,3.4vw,44px)] font-extrabold leading-[1.15] tracking-[-.04em]">
          다른 곳에는 없는 두 가지
        </h2>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-[18px]">
        <article className="relative flex min-h-[340px] flex-col overflow-hidden rounded-[22px] bg-ink p-[clamp(28px,3.4vw,44px)] text-paper">
          <div
            aria-hidden
            className="absolute -right-[60px] -top-[60px] h-[240px] w-[240px] rounded-full bg-gold/[.12]"
          />
          <span className="text-[11.5px] tracking-[.14em] text-gold">첫인상</span>
          <h3 className="mb-3 mt-4 text-[clamp(24px,2.6vw,32px)] font-extrabold leading-[1.25] tracking-[-.04em]">
            우리 얼굴과 반려동물이
            <br />
            게임 캐릭터가 됩니다
          </h3>
          <p className="m-0 max-w-[400px] text-sm leading-[1.85] text-[#A8A399]">
            하객이 그냥 스크롤하고 나가지 않습니다. 떨어지는 우리 강아지를 받는 미니게임과 실시간
            랭킹 TOP 7.
          </p>
          <div className="mt-auto flex gap-2 pt-7">
            {['GAME CAPTURE', 'RANKING'].map((label) => (
              <div
                key={label}
                className="flex h-[74px] flex-1 items-center justify-center rounded-xl font-mono text-[9px] leading-none tracking-[.1em] text-[#6B665C]"
                style={{ background: HATCH_DARK }}
              >
                {label}
              </div>
            ))}
          </div>
        </article>

        <article className="flex min-h-[340px] flex-col rounded-[22px] border border-line bg-white p-[clamp(28px,3.4vw,44px)]">
          <span className="text-[11.5px] tracking-[.14em] text-gold-deep">구매 이유</span>
          <h3 className="mb-3 mt-4 text-[clamp(24px,2.6vw,32px)] font-extrabold leading-[1.25] tracking-[-.04em]">
            발행한 뒤에도
            <br />
            직접 고칠 수 있습니다
          </h3>
          <p className="m-0 max-w-[400px] text-sm leading-[1.85] text-muted">
            홀 번호가 바뀌어도, 오타를 발견해도 업체에 연락할 필요가 없습니다. 이미 공유한 링크는
            그대로 두고 내용만 30초 만에 바꾸세요.
          </p>
          <div className="mt-auto flex flex-col gap-2 pt-7">
            <div className="flex items-center gap-2.5 rounded-xl bg-surface-sunken px-4 py-[13px]">
              <span className="w-16 flex-none text-xs text-muted">다른 곳</span>
              <span className="text-[13px] text-ink-soft">수정 요청 → 대기 → 확인 (1~3일)</span>
            </div>
            <div className="flex items-center gap-2.5 rounded-xl border border-[#EEDFC7] bg-cream px-4 py-[13px]">
              <span className="w-16 flex-none text-xs text-gold-deep">Luvi</span>
              <span className="text-[13px] text-ink">직접 수정 → 발행 (30초)</span>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
