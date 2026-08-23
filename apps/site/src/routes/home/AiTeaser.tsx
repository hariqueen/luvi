/**
 * AI 식전영상 티저 — 아직 없는 기능입니다.
 *
 * 디자인 산출물은 이 블록을 `sc-if showAiTeaser` 로 감싸 껐다 켤 수 있게 뒀습니다.
 * 같은 스위치를 props 로 남깁니다 — 기능이 실제로 나오면 이 블록을 지우는 게 아니라
 * 소개 화면(B3)으로 옮기고 여기서는 끄게 됩니다.
 *
 * 오른쪽 진행률 카드는 "생성 중" 상태를 미리 보여주는 목업입니다. 실제 값이 아니라
 * 기다림의 형태를 알려주는 그림입니다.
 */
import { Link } from 'react-router-dom';

const HATCH = 'repeating-linear-gradient(135deg,#EFE9DF 0 9px,#E7E0D3 9px 18px)';

export function AiTeaser({ show = true }: { show?: boolean }) {
  if (!show) return null;

  return (
    <section id="ai" data-reveal className="mx-auto mt-[110px] max-w-page px-[clamp(16px,3vw,28px)]">
      <div
        className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] items-center gap-[clamp(28px,3.4vw,48px)] rounded-3xl border border-[#EEE2CE] px-[clamp(24px,4vw,56px)] py-[clamp(34px,4.4vw,64px)]"
        style={{ background: 'linear-gradient(150deg,#FCF8F1 0%,#F6EFE3 100%)' }}
      >
        <div>
          <div className="mb-5 inline-flex items-center gap-[7px] rounded-full border border-[#E7D8BE] bg-white px-[11px] py-[5px]">
            <span className="h-[5px] w-[5px] animate-pulseSoft rounded-full bg-gold [animation-duration:2s]" />
            <span className="text-[11px] tracking-[.08em] text-[#8A7355]">COMING SOON</span>
          </div>
          <h2 className="mb-3.5 mt-0 text-[clamp(28px,3vw,40px)] font-extrabold leading-[1.2] tracking-[-.04em]">
            프롬프트 한 줄이면
            <br />
            식전영상이 완성됩니다
          </h2>
          <p className="mb-[26px] mt-0 max-w-[420px] text-[14.5px] leading-[1.85] text-muted">
            Luvi는 Love + AI 입니다. 사진을 올리고 원하는 분위기를 적으면, 예식장 규격에 맞는
            영상이 만들어집니다.
          </p>
          <div className="flex flex-wrap gap-2.5">
            <Link
              to="/film"
              className="rounded-full bg-ink px-6 py-[13px] text-[13.5px] text-paper-soft"
            >
              출시 알림 받기
            </Link>
            <Link
              to="/film"
              className="rounded-full border border-[#DFD3BC] bg-white px-[22px] py-[13px] text-[13.5px]"
            >
              지금은 수동 제작 문의
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-[#EBE2D2] bg-white p-5">
          <div className="mb-2.5 text-[11px] tracking-[.06em] text-[#A09A8E]">PROMPT</div>
          <div className="rounded-[10px] border border-[#EDE7DC] bg-[#FAF8F3] px-3.5 py-[13px] text-[13.5px] leading-[1.7] text-[#3D3A35]">
            가을 저녁 햇살, 잔잔한 피아노, 우리 둘의 여행 사진으로 3분짜리 영상
          </div>
          <div
            className="mt-3.5 flex h-[130px] items-center justify-center rounded-[10px] font-mono text-[9.5px] leading-none tracking-[.12em] text-muted-soft"
            style={{ background: HATCH }}
          >
            GENERATED FILM 16:9
          </div>
          <div className="mt-3 h-1 overflow-hidden rounded-full bg-[#EDE7DC]">
            <div className="h-full w-[62%] bg-gold" />
          </div>
          <div className="mt-[7px] text-[11px] text-[#A09A8E]">
            생성 중 (약 2분 남음) 창을 닫아도 계속됩니다
          </div>
        </div>
      </div>
    </section>
  );
}
