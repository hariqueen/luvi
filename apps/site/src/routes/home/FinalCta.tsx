/**
 * 마지막 CTA — 무료 베타.
 *
 * "카드 등록 없습니다" 를 뺄 수 없는 문장으로 봅니다. 무료라고만 적으면 결제 화면을 예상하고
 * 이탈하는 사람이 생깁니다.
 */
import { Link } from 'react-router-dom';

export function FinalCta() {
  return (
    <section
      id="start"
      data-reveal
      className="mx-auto max-w-page px-[clamp(16px,3vw,28px)] pb-[clamp(72px,9vw,120px)] pt-[clamp(64px,8vw,110px)]"
    >
      <div className="rounded-3xl border border-line bg-white px-[clamp(24px,4vw,70px)] py-[clamp(40px,5.6vw,70px)] text-center">
        <span className="font-script text-2xl leading-none text-gold-deep">One day, one link</span>
        <h2 className="my-4 text-[clamp(32px,3.6vw,48px)] font-extrabold tracking-[-.045em]">
          지금은 무료 베타입니다
        </h2>
        <p className="mb-[30px] mt-0 text-[15px] text-muted">
          가입하고 청첩장 1개를 끝까지 만들어 보세요. 카드 등록 없습니다.
        </p>
        <Link
          to="/app/new"
          className="inline-block rounded-full bg-ink px-[38px] py-4 text-[15px] text-paper-soft"
        >
          무료로 시작하기
        </Link>
      </div>
    </section>
  );
}
