/**
 * B3 식전영상 소개 — 어두운 화면.
 *
 * 지금은 **수동 제작**입니다. AI 자동 생성은 준비 중이라 목록의 마지막 항목으로 두고
 * 골드 테두리로 구분합니다 — 완성된 기능들과 나란히 두면 이미 되는 것처럼 읽힙니다.
 *
 * 샘플 영상 자리는 자동재생하지 않습니다. 소리 있는 영상이 갑자기 재생되면 바로 닫습니다.
 */
import { Link } from 'react-router-dom';
import { useReveal } from '@/lib/reveal';
import { ScreenHeading } from './_ScreenHeading';

const POINTS = [
  { title: '시네마틱 편집', body: '사진·영상 소스를 흐름 있게 구성합니다.' },
  { title: '감성 자막', body: '두 사람의 이야기를 문장으로 얹습니다.' },
  { title: '4K & 예식장 규격', body: '홀 스크린 비율과 코덱에 맞춰 납품합니다.' },
] as const;

export default function Film() {
  useReveal();

  return (
    <section className="bg-ink text-paper">
      <div
        data-reveal
        className="mx-auto max-w-page px-[clamp(16px,3vw,28px)] py-[clamp(56px,7vw,96px)]"
      >
        <ScreenHeading
          label="FILM"
          title="식전영상"
          tone="dark"
          desc="예식 시작 전 홀 스크린에 트는 영상입니다. 지금은 사람이 직접 만들고, 곧 프롬프트만으로 만들 수 있게 됩니다."
        />

        <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] items-start gap-5">
          <div
            className="flex aspect-video w-full min-w-0 flex-col items-center justify-center gap-3.5 rounded-[18px]"
            style={{
              background: 'repeating-linear-gradient(135deg,#252320 0 10px,#1F1D1B 10px 20px)',
            }}
          >
            <span className="flex h-[54px] w-[54px] items-center justify-center rounded-full border border-[#4A463E] text-[15px] text-gold">
              ▶
            </span>
            <span className="text-xs text-[#6B665C]">샘플 영상 (자동재생 없음)</span>
          </div>

          <ul className="flex flex-col gap-2.5">
            {POINTS.map((p) => (
              <li key={p.title} className="rounded-[14px] border border-ink-mid px-[22px] py-5">
                <h2 className="mb-[5px] text-[14.5px] font-semibold">{p.title}</h2>
                <p className="m-0 text-[13px] leading-[1.7] text-[#A8A399]">{p.body}</p>
              </li>
            ))}

            {/* 준비 중 — 완성된 항목들과 섞이지 않게 골드로 떼어 둡니다 */}
            <li className="rounded-[14px] border border-[#4A3F2C] bg-gold/[.08] px-[22px] py-5">
              <h2 className="mb-[5px] text-[14.5px] font-semibold text-[#E0C79A]">
                AI 자동 생성{' '}
                <span className="text-[11px] font-normal text-[#9B8A6E]">준비 중</span>
              </h2>
              <p className="m-0 text-[13px] leading-[1.7] text-[#A8A399]">
                프롬프트만 입력하면 영상이 만들어집니다.
              </p>
            </li>
          </ul>
        </div>

        <div className="mt-11 flex flex-wrap gap-2.5">
          <Link
            to="/app/new"
            className="rounded-full bg-paper-soft px-[26px] py-[13px] text-[13.5px] text-ink"
          >
            청첩장부터 만들기
          </Link>
          {/* 누를 수 없는 안내입니다 — pill 모양으로 두면 버튼으로 보여 누르게 됩니다 */}
          <p className="m-0 self-center text-[13px] text-[#8A8175]">
            영상 제작 문의 창구는 준비 중입니다.
          </p>
        </div>
      </div>
    </section>
  );
}
