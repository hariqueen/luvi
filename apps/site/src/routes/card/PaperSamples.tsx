/**
 * 종이 청첩장 규격 견본 4종.
 *
 * 실물 인쇄 결과가 아니라 **조판 구성**을 보여주는 목업입니다. 비율(`aspect-ratio`)만 실제
 * 규격을 따릅니다 — 128×182mm 세로형, 175×120mm 가로형.
 *
 * 🔴 이름·예식장·주소는 전부 **예시**입니다. 디자인 산출물에는 실제 고객 정보가 들어 있었으니
 *    거기서 문구를 다시 옮겨올 때 그대로 복사하지 마세요.
 */
const PHOTO_LIGHT = 'repeating-linear-gradient(135deg,#E6E0D6 0 10px,#DCD5C8 10px 20px)';
const PHOTO_DARK = 'repeating-linear-gradient(135deg,#3A3630 0 10px,#302C27 10px 20px)';

/** 목업 아래 캡션 — 규격과 무엇이 다른지 */
function Caption({ title, spec }: { title: string; spec: string }) {
  return (
    <div>
      <div className="text-[14.5px] font-bold tracking-[-.02em]">{title}</div>
      <div className="mt-1 text-[12.5px] text-muted">{spec}</div>
    </div>
  );
}

function Frame({
  bg,
  children,
  center,
}: {
  bg: string;
  children: React.ReactNode;
  center?: boolean;
}) {
  return (
    <div
      className={`flex justify-center rounded-[14px] p-[clamp(20px,3vw,40px)] ${
        center ? 'items-center' : ''
      }`}
      style={{ background: bg }}
    >
      {children}
    </div>
  );
}

/** 1. 사진 위 / 이름·QR 아래 (세로형) */
function PhotoQr() {
  return (
    <div className="flex flex-col gap-3.5">
      <Frame bg="#F1EEE8">
        <div className="flex aspect-[128/182] w-[min(270px,72vw)] flex-col overflow-hidden bg-surface shadow-[0_18px_40px_-22px_rgba(40,32,20,.5)]">
          <div className="relative flex-1">
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ background: PHOTO_LIGHT }}
            >
              <span className="font-mono text-[9px] leading-none tracking-[.14em] text-muted-soft">
                WEDDING PHOTO
              </span>
            </div>
          </div>
          <div className="flex items-end justify-between gap-3 bg-surface px-[18px] pb-[18px] pt-4">
            <div>
              <div className="text-[13px] font-bold leading-[1.35] tracking-[.04em]">
                GROOM
                <br />
                BRIDE
              </div>
              <div className="mt-1.5 text-[9.5px] text-muted">신랑 &amp; 신부</div>
              <div className="mt-[9px] text-[8.5px] leading-[1.5] text-muted-soft">
                2026. 10. 17. SAT 2 PM
                <br />
                ○○컨벤션 6F 그랜드홀
              </div>
            </div>
            {/* 모바일 청첩장 QR 자리 */}
            <div
              className="h-11 w-11 flex-none"
              style={{
                background: 'repeating-linear-gradient(45deg,#1A1917 0 3px,#FCFAF6 3px 6px)',
              }}
            />
          </div>
        </div>
      </Frame>
      <Caption
        title="포토 & QR (세로형)"
        spec="128 × 182 mm / 사진 상단, 하단에 이름과 모바일 청첩장 QR"
      />
    </div>
  );
}

/** 2. 사진 위에 필기체를 얹은 풀블리드 (세로형) */
function FullBleed() {
  return (
    <div className="flex flex-col gap-3.5">
      <Frame bg="#E9E5DE">
        <div className="relative aspect-[128/182] w-[min(270px,72vw)] overflow-hidden bg-[#2A2724] shadow-[0_18px_40px_-22px_rgba(40,32,20,.5)]">
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: PHOTO_DARK }}
          >
            <span className="font-mono text-[9px] leading-none tracking-[.14em] text-[#6B665C]">
              FULL-BLEED PHOTO
            </span>
          </div>
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(180deg,rgba(20,18,16,.42) 0%,rgba(20,18,16,.05) 45%,rgba(20,18,16,.62) 100%)',
            }}
          />
          <div className="absolute inset-x-0 top-[30px] text-center">
            <div className="font-script text-[44px] leading-none text-surface">Love</div>
            <div className="mt-3 flex items-center justify-center gap-2.5">
              <span className="text-[10px] tracking-[.06em] text-[#F0EBE2]">신랑</span>
              <span className="h-px w-[26px] bg-surface/60" />
              <span className="text-[10px] tracking-[.06em] text-[#F0EBE2]">신부</span>
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-[26px] text-center">
            <div className="font-script text-[19px] leading-none text-[#E6DCC9]">Our wedding</div>
            <div className="mt-[7px] text-[9px] tracking-[.16em] text-surface/75">2026. 10. 17</div>
          </div>
        </div>
      </Frame>
      <Caption
        title="풀블리드 오버레이 (세로형)"
        spec="128 × 182 mm / 사진 위 필기체 레터링, 사방 3mm 재단 여백 포함"
      />
    </div>
  );
}

/** 3. 문구 중심 레터링 (가로형) */
function Lettering() {
  return (
    <div className="flex flex-col gap-3.5">
      <Frame bg="#F1EEE8" center>
        <div className="relative aspect-[175/120] w-full max-w-[390px] overflow-hidden bg-[#2A2724] shadow-[0_18px_40px_-22px_rgba(40,32,20,.5)]">
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: PHOTO_DARK }}
          >
            <span className="font-mono text-[9px] leading-none tracking-[.14em] text-[#6B665C]">
              PHOTO (B&amp;W)
            </span>
          </div>
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(180deg,rgba(20,18,16,.3),rgba(20,18,16,.55))' }}
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center px-[26px] text-center">
            <div className="font-script text-[30px] leading-[1.25] text-[#E3B87E]">
              Come for the love,
              <br />
              stay for the marriage
            </div>
            <div className="mt-5 text-[9.5px] tracking-[.22em] text-surface/85">
              GROOM &amp; BRIDE
            </div>
            <div className="mt-[7px] text-[8.5px] tracking-[.06em] text-surface/60">
              2026. 10. 17. 토 오후 2시 / ○○컨벤션 6F
            </div>
          </div>
        </div>
      </Frame>
      <Caption
        title="레터링 카드 (가로형)"
        spec="175 × 120 mm / 필기체 문구 중심, 골드 잉크 인쇄 가능"
      />
    </div>
  );
}

/** 4. 인사말·혼주·약도가 들어가는 뒷면 (가로형) */
function BackSide() {
  return (
    <div className="flex flex-col gap-3.5">
      <Frame bg="#F1EEE8" center>
        <div className="relative flex aspect-[175/120] w-full max-w-[390px] overflow-hidden bg-surface shadow-[0_18px_40px_-22px_rgba(40,32,20,.5)]">
          <div className="flex flex-1 flex-col justify-center border-r border-[#EDE7DC] px-6 py-[26px] text-center">
            <div className="mb-3 font-script text-[20px] leading-none text-gold-deep">
              Invitation
            </div>
            <p className="m-0 text-[8.5px] leading-[2] text-[#3D3A35]">
              서로가 마주보며 다져온 사랑을
              <br />
              이제 함께 한 곳을 바라보며
              <br />
              걸어갈 수 있는 큰 사랑으로
              <br />
              키우고자 합니다.
            </p>
            <div className="my-3.5 h-px bg-[#EDE7DC]" />
            <div className="text-[8px] leading-[1.8] text-ink-soft">
              아버지 · 어머니 의 장남 <strong className="font-bold">신랑</strong>
              <br />
              아버지 · 어머니 의 차녀 <strong className="font-bold">신부</strong>
            </div>
          </div>
          <div className="flex w-[38%] flex-col">
            <div
              className="relative flex flex-1 items-center justify-center"
              style={{ background: 'repeating-linear-gradient(135deg,#E6E0D6 0 9px,#DCD5C8 9px 18px)' }}
            >
              <span className="font-mono text-[8px] leading-none tracking-[.12em] text-muted-soft">
                MAP
              </span>
            </div>
            <div className="bg-[#F6F2EA] px-3 py-[11px]">
              <div className="mb-1 text-[8.5px] font-bold">○○컨벤션 6F</div>
              <div className="text-[7.5px] leading-[1.7] text-muted">
                서울 ○○구 ○○동 00-0
                <br />○호선 ○○역 0번 출구
              </div>
            </div>
          </div>
        </div>
      </Frame>
      <Caption
        title="뒷면 조판 (가로형)"
        spec="175 × 120 mm / 인사말·혼주·약도. 앞뒷면 전환으로 함께 편집합니다"
      />
    </div>
  );
}

export function PaperSamples() {
  return (
    /*
      2열로 고정합니다. auto-fit 으로 4열까지 펼치면 세로형(128×182)과 가로형(175×120)이
      같은 행에 섞여 카드 높이가 크게 어긋납니다. 2열이면 세로형 둘, 가로형 둘이 짝을 맞춥니다.
    */
    <div className="grid grid-cols-1 gap-[26px] md:grid-cols-2">
      <PhotoQr />
      <FullBleed />
      <Lettering />
      <BackSide />
    </div>
  );
}
