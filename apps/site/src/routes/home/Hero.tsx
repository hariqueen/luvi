/**
 * B1 히어로 — 첫 화면.
 *
 * 왼쪽은 "무엇을, 왜" 한 문장과 CTA 두 개, 오른쪽은 결과물 목업입니다.
 * 두 열은 `auto-fit/minmax(320px,1fr)` 로 좁아지면 자연히 위아래로 쌓입니다 —
 * 브레이크포인트를 손으로 나누지 않은 이유는 사이드바가 없는 화면이라 폭만 기준이면 충분해서입니다.
 */
import { Link } from 'react-router-dom';
import { PhonePreview } from './PhonePreview';

const STATS = [
  { value: '5분', label: '제작 완료까지' },
  { value: '∞', label: '발행 후 수정 횟수' },
  { value: '9', label: '기본 제공 섹션' },
] as const;

export function Hero() {
  return (
    <section id="b1">
      <div
        data-reveal
        className="mx-auto grid max-w-page grid-cols-[repeat(auto-fit,minmax(320px,1fr))] items-center gap-[clamp(28px,4vw,56px)] px-[clamp(16px,3vw,28px)] pt-[clamp(44px,6vw,76px)]"
      >
        <div>
          <div className="mb-[26px] inline-flex items-center gap-2 rounded-full border border-[#E3D7C2] bg-cream px-3 py-1.5">
            <span className="h-[5px] w-[5px] animate-pulseSoft rounded-full bg-gold" />
            <span className="text-[11.5px] tracking-[.06em] text-[#8A7355]">
              Love&nbsp;+&nbsp;AI / 무료 베타
            </span>
          </div>

          <div className="mb-4 font-script text-[26px] leading-none text-muted-faint">
            Self-made wedding invitation
          </div>

          <h1 className="mb-[22px] text-[clamp(46px,4.6vw,72px)] font-extrabold leading-[1.1] tracking-[-.045em] [text-wrap:pretty]">
            내 청첩장을,
            <br />
            <span className="relative inline-block">
              <span className="relative z-10">내 손으로</span>
              {/* 형광펜 밑줄 — 글자 뒤로 깔립니다 */}
              <span aria-hidden className="absolute inset-x-0 bottom-1.5 h-[9px] bg-sand" />
            </span>{' '}
            계속 고칩니다.
          </h1>

          <p className="mb-[34px] max-w-[460px] text-[16.5px] leading-[1.8] text-ink-soft [text-wrap:pretty]">
            템플릿을 고르고 내용을 채우면 5분 만에 내 주소가 생깁니다.{' '}
            {/* 좁은 화면에서는 문장이 알아서 흐르게 둡니다 — 강제 줄바꿈이 엉뚱한 곳을 끊습니다 */}
            <br className="hidden md:inline" />
            발행한 뒤에도 예식 당일 아침까지 직접 고칠 수 있어요.
          </p>

          <div className="mb-[38px] flex flex-wrap gap-2.5">
            <Link
              to="/app/new"
              className="rounded-full bg-ink px-[30px] py-[15px] text-[14.5px] tracking-[.01em] text-paper-soft"
            >
              무료로 만들기
            </Link>
            <Link
              to="/samples"
              className="rounded-full border border-line-strong bg-white px-[26px] py-[15px] text-[14.5px] text-ink"
            >
              샘플 청첩장 보기
            </Link>
          </div>

          <dl className="flex max-w-[460px] gap-[30px] border-t border-line pt-[26px]">
            {STATS.map((s) => (
              <div key={s.label}>
                <dt className="text-[26px] font-extrabold tracking-[-.03em] text-ink">
                  {s.value}
                </dt>
                <dd className="mt-0.5 text-xs text-muted">{s.label}</dd>
              </div>
            ))}
          </dl>
        </div>

        <PhonePreview />
      </div>
    </section>
  );
}
