/**
 * How it works — 큰 선언 한 덩어리 + 4단계.
 *
 * 단계는 카드가 아니라 세로 구분선으로 나눕니다. 카드로 만들면 넷이 각각 무게를 가져가는데,
 * 여기서 전하려는 것은 "네 단계뿐" 이라는 가벼움입니다.
 */
const STEPS = [
  {
    no: '01',
    title: '템플릿 선택',
    body: '마음에 드는 디자인을 고르면 샘플 내용이 채워진 채로 시작합니다.',
  },
  {
    no: '02',
    title: '내용 채우기',
    body: '이름·날짜·사진을 폼에 입력하면 옆에서 바로 반영됩니다. 자동 저장.',
  },
  { no: '03', title: '발행', body: '청첩장 주소를 정하고 발행하면 내 링크가 생깁니다.' },
  {
    no: '04',
    title: '공유하고, 계속 고치기',
    body: '카톡 공유·QR. 예식 당일까지 언제든 수정.',
  },
] as const;

export function Process() {
  return (
    <>
      <section
        id="how"
        data-reveal
        className="mx-auto max-w-page px-[clamp(16px,3vw,28px)] pt-[clamp(64px,8vw,110px)]"
      >
        <div className="max-w-[1040px]">
          <div className="mb-[26px] font-script text-[28px] leading-none text-gold-deep">
            How it works
          </div>
          <p className="m-0 text-[clamp(28px,3.6vw,54px)] font-extrabold leading-[1.16] tracking-[-.045em] [text-wrap:pretty]">
            청첩장은 한 번 만들고
            <br />
            끝나는 물건이 아닙니다.
            <br />
            <span className="text-muted-faint">예식 당일 아침까지, 계속 바뀝니다.</span>
          </p>
        </div>
      </section>

      <section
        id="steps"
        data-reveal
        className="mx-auto max-w-page px-[clamp(16px,3vw,28px)] pt-[clamp(64px,8vw,110px)]"
      >
        {/*
          구분선은 항목마다 **위쪽**에 둡니다. 4열로 펼쳐지면 선이 이어져 디자인의 가로선 한 줄이
          되고, 1열로 쌓여도 목록 구분선으로 자연스럽습니다.
          🔴 세로선을 `[&:not(:last-child)]:border-r` 로 주면 1열에서 마지막 칸만 빼고 오른쪽에
             허공에 걸린 선이 남습니다. 그래서 열 수가 확정되는 lg 이상에서만 세로선을 켭니다.
        */}
        <ol className="grid grid-cols-[repeat(auto-fit,minmax(224px,1fr))]">
          {STEPS.map((s) => (
            <li
              key={s.no}
              className="min-w-0 border-t border-line-strong px-[26px] pt-8 lg:border-r lg:[&:nth-child(4n)]:border-r-0"
            >
              <span className="text-[34px] font-extrabold tracking-[-.04em] text-[#D5CCBD]">
                {s.no}
              </span>
              <h4 className="my-2 text-base font-semibold">{s.title}</h4>
              <p className="mb-8 mt-0 text-[13px] leading-[1.75] text-muted">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
