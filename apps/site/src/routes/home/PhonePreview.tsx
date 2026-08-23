/**
 * 히어로 오른쪽의 청첩장 미리보기 목업.
 *
 * 실제 뷰어(`/samples`)를 iframe 으로 끼우지 않고 목업으로 그립니다 — 히어로에서 뷰어 번들과
 * 폰트·이미지를 받게 하면 첫 화면이 느려지고, 정작 보여줄 것은 "스크롤되는 한 장" 뿐입니다.
 *
 * 🔴 여기 들어가는 이름·예식장은 **예시**입니다. 실제 고객 정보를 쓰지 마세요.
 */
const PETALS = [
  { left: '14%', duration: '9s', delay: '0s', size: 7, color: '#EBD9BE' },
  { left: '52%', duration: '11s', delay: '2s', size: 6, color: '#F0E3CE' },
  { left: '78%', duration: '13s', delay: '4s', size: 8, color: '#E6D2B2' },
] as const;

/** 사진이 들어갈 자리 — 대각선 줄무늬로 "여기 이미지" 임을 알립니다 */
const HATCH =
  'repeating-linear-gradient(135deg,#EFE9DF 0 9px,#E7E0D3 9px 18px)';

export function PhonePreview() {
  return (
    <div className="relative flex items-end justify-center pb-[76px]">
      {/* 폰 뒤의 웜 글로우 */}
      <div
        aria-hidden
        className="absolute top-5 h-[400px] w-[400px] rounded-full"
        style={{
          background:
            'radial-gradient(circle,#F4E7D3 0%,rgba(244,231,211,0) 68%)',
        }}
      />

      <div className="relative h-[610px] w-[min(300px,86vw)] animate-float rounded-phone-outer bg-ink p-[9px] shadow-[0_40px_80px_-30px_rgba(40,32,20,.42)] [animation-duration:7s]">
        {/* 노치 */}
        <div className="absolute left-1/2 top-5 z-30 h-[22px] w-[78px] -translate-x-1/2 rounded-full bg-ink" />

        <div className="relative h-full w-full overflow-hidden rounded-phone bg-surface">
          <div aria-hidden className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
            {PETALS.map((p) => (
              <span
                key={p.left}
                className="absolute top-0 animate-petal rounded-[60%_20%_60%_20%]"
                style={{
                  left: p.left,
                  width: p.size,
                  height: p.size,
                  background: p.color,
                  animationDuration: p.duration,
                  animationDelay: p.delay,
                }}
              />
            ))}
          </div>

          {/* 커버 → 인사말로 천천히 오르내립니다. 스크롤을 흉내내는 것이 이 목업의 요점 */}
          <div className="[animation:luviScroll_16s_ease-in-out_infinite]">
            <div
              className="relative flex h-[430px] flex-col items-center justify-end pb-10"
              style={{ background: HATCH }}
            >
              <span className="absolute inset-x-0 top-3.5 text-center font-mono text-[9px] leading-none tracking-[.14em] text-muted-soft">
                COVER PHOTO
              </span>
              <span className="font-script text-[15px] tracking-[.18em] text-[#6E655A]">
                The Wedding of
              </span>
              <span className="mt-1.5 font-script text-4xl text-ink">Groom &amp; Bride</span>
              <span className="my-3.5 h-px w-[26px] bg-gold" />
              <span className="text-[11.5px] tracking-[.1em] text-ink-soft">
                2026. 10. 17. SAT 2:00 PM
              </span>
              <span className="mt-[5px] text-[11px] text-muted">○○컨벤션 6F 그랜드홀</span>
            </div>

            <div className="px-[26px] py-9 text-center">
              <div className="font-script text-[13px] tracking-[.2em] text-gold-deep">
                invitation
              </div>
              <p className="mt-4 text-[13px] leading-[2.05] text-[#3D3A35]">
                서로가 마주보며 다져온 사랑을
                <br />
                이제 함께 한 곳을 바라보며
                <br />
                걸어갈 수 있는 큰 사랑으로
                <br />
                키우고자 합니다.
              </p>
              <div className="my-[26px] h-px bg-line-soft" />
              <div className="grid grid-cols-2 gap-3.5 text-left text-[11.5px] text-ink-soft">
                <div>
                  아버지 · 어머니 <span className="text-muted-soft">의 장남</span>
                  <br />
                  <strong className="font-semibold">신랑</strong>
                </div>
                <div>
                  아버지 · 어머니 <span className="text-muted-soft">의 차녀</span>
                  <br />
                  <strong className="font-semibold">신부</strong>
                </div>
              </div>
              <div className="mt-[30px] grid grid-cols-3 gap-1.5">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="aspect-square" style={{ background: HATCH }} />
                ))}
              </div>
            </div>
          </div>

          {/* 배경음악 토글 — 뷰어에 실제로 있는 컨트롤이라 목업에도 남깁니다 */}
          <div className="absolute right-3.5 top-[52px] z-30 flex h-[30px] w-[30px] items-center justify-center rounded-full bg-white/80 text-xs text-[#6E655A]">
            ♪
          </div>
        </div>
      </div>

      <div className="absolute bottom-9 left-1/2 flex -translate-x-1/2 items-center gap-[7px] whitespace-nowrap rounded-full border border-line bg-white px-3.5 py-2 shadow-[0_8px_24px_-12px_rgba(40,32,20,.3)]">
        <span className="h-[5px] w-[5px] rounded-full bg-success" />
        <span className="text-[11.5px] text-ink-soft">지금 보는 화면이 하객이 보는 화면입니다</span>
      </div>
    </div>
  );
}
