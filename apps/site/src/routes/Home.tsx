/**
 * B1 홈.
 *
 * 디자인 산출물(`(저장소 루트)/docs/design/Luvi.dc.html`)의 `B1 홈`·`ART 브랜드 필름`·
 * `B1 서비스 3종` 세 아트보드가 이 한 화면입니다. 섹션마다 파일을 나눈 이유는 길이입니다 —
 * 한 파일에 두면 CTA 문구 하나 고치려고 900줄을 스크롤해야 합니다.
 *
 * 상단 내비·푸터는 SiteLayout 이 그리므로 여기서 다시 그리지 않습니다.
 * 스크롤 연출 훅은 이 화면에서 한 번만 부릅니다 (하위 섹션은 표시 속성만 답니다).
 */
import { useArtParallax, useReveal } from '@/lib/reveal';
import { Hero } from './home/Hero';
import { BrandFilm } from './home/BrandFilm';
import { Services } from './home/Services';
import { WhyLuvi } from './home/WhyLuvi';
import { Marquee } from './home/Marquee';
import { Process } from './home/Process';
import { AiTeaser } from './home/AiTeaser';
import { FinalCta } from './home/FinalCta';

export default function Home() {
  useReveal();
  useArtParallax();

  return (
    <>
      <Hero />
      <BrandFilm />
      <Services />
      <WhyLuvi />
      <Marquee />
      <Process />
      {/* AI 식전영상은 아직 없는 기능입니다 — 출시되면 이 스위치를 끄고 B3 로 옮깁니다 */}
      <AiTeaser show />
      <FinalCta />
    </>
  );
}
