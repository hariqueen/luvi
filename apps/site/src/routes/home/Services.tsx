/**
 * 서비스 3종 카드.
 *
 * 상태 배지(`지금 이용 가능` / `준비 중`)를 카드에 그대로 노출합니다 — 준비 중인 것을
 * 완성된 것처럼 늘어놓으면 클릭한 사람이 빈 페이지를 보게 되고, 그게 더 나쁩니다.
 * 각 카드는 해당 소개 화면(B2·B3·B4)으로 갑니다.
 */
import { Link } from 'react-router-dom';

const SERVICES = [
  {
    no: '01',
    to: '/invitation',
    title: '모바일 청첩장',
    body: '방명록·계좌·지도·카톡 공유·D-day·미니게임까지. 만들고 바로 배포합니다.',
    badge: '지금 이용 가능',
    badgeClass: 'bg-[#EDF4EF] text-[#3F7A57]',
  },
  {
    no: '02',
    to: '/film',
    title: '식전영상',
    body: '시네마틱 편집, 감성 자막, 4K 예식장 규격. 곧 프롬프트만으로 AI가 만듭니다.',
    badge: '수동 제작 / AI 준비 중',
    badgeClass: 'bg-[#F6F1E7] text-[#8A7355]',
  },
  {
    no: '03',
    to: '/card',
    title: '초대장 & 종이 청첩장',
    body: '청첩장 / 돌잔치 / 감사장 / 행사. 디자인 확정부터 인쇄용 PDF 다운로드까지.',
    badge: '준비 중 / 알림 신청',
    badgeClass: 'bg-surface-sunken text-muted',
  },
] as const;

export function Services() {
  return (
    <section id="services" data-reveal className="mx-auto max-w-page px-[clamp(16px,3vw,28px)] pt-[clamp(56px,7vw,96px)]">
      <h2 className="sr-only">서비스</h2>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(272px,1fr))] gap-[18px]">
        {SERVICES.map((s) => (
          <Link
            key={s.no}
            to={s.to}
            className="flex min-h-[270px] flex-col rounded-[18px] border border-line bg-white p-[30px] transition-[transform,box-shadow,border-color] duration-[350ms] ease-[cubic-bezier(.2,.7,.2,1)] hover:-translate-y-1 hover:border-gold-soft hover:shadow-[0_22px_44px_-30px_rgba(40,32,20,.45)]"
          >
            <span className="font-mono text-[11px] font-semibold leading-none tracking-[.18em] text-gold-deep">
              {s.no}
            </span>
            <h3 className="mb-2.5 mt-3.5 text-[23px] font-bold tracking-[-.03em]">{s.title}</h3>
            <p className="m-0 flex-1 text-[13.5px] leading-[1.8] text-muted">{s.body}</p>
            <div className="mt-5">
              <span className={`rounded-full px-[9px] py-1 text-[11px] ${s.badgeClass}`}>
                {s.badge}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
