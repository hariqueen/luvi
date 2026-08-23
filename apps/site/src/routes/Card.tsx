/**
 * B4 초대장 & 종이 청첩장 소개.
 *
 * 아직 만들 수 없는 상품입니다. 그래서 이 화면의 목적은 판매가 아니라 **규격을 미리 보여주는 것**
 * 입니다 — 종이를 함께 준비하려는 사람이 "여기서도 되나" 를 확인하고 돌아갈 수 있게.
 *
 * 🔴 디자인 산출물에는 이메일 입력 + [알림 신청] 버튼이 있었지만 옮기지 않았습니다.
 *    받는 곳(엔드포인트)이 없어서, 지금 만들면 눌러도 아무 일이 없는 폼이 됩니다.
 *    사전 알림을 열 때 여기에 붙이고 아래 안내 문단을 지우세요.
 */
import { Link } from 'react-router-dom';
import { useReveal } from '@/lib/reveal';
import { ScreenHeading } from './_ScreenHeading';
import { PaperSamples } from './card/PaperSamples';

export default function Card() {
  useReveal();

  return (
    <section className="border-t border-line bg-white">
      <div
        data-reveal
        className="mx-auto max-w-page px-[clamp(16px,3vw,28px)] py-[clamp(56px,7vw,96px)]"
      >
        <ScreenHeading
          label="PAPER"
          title="초대장 & 종이 청첩장"
          desc="같은 엔진으로 청첩장 / 돌잔치 / 감사장 / 행사 초대장을 만듭니다. 디자인 확정과 인쇄용 PDF 다운로드까지 제공합니다."
        />

        <PaperSamples />

        <div className="mt-9 grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] items-center gap-[18px] rounded-[18px] border border-[#EAE5DC] bg-[#FAF8F3] px-[34px] py-8">
          <div>
            <h2 className="mb-2 text-[17px] font-semibold">아직 준비 중입니다</h2>
            <p className="m-0 text-[13.5px] leading-[1.75] text-muted">
              300dpi, 사방 3mm 재단 여백, 재단선/안전영역 가이드, RGB PDF 납품으로 준비하고
              있습니다. 종이는 모바일 청첩장과 같은 내용을 쓰므로, 먼저 모바일 청첩장을 만들어
              두면 그대로 옮겨집니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Link
              to="/app/new"
              className="rounded-full bg-ink px-[26px] py-[13px] text-[13.5px] text-paper-soft"
            >
              모바일 청첩장 만들기
            </Link>
            <Link
              to="/invitation"
              className="rounded-full border border-line-strong bg-white px-[22px] py-[13px] text-[13.5px]"
            >
              기능 먼저 보기
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
