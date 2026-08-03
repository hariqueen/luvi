import { invitation } from '@/config/invitation.config';

export function Cover() {
  const { cover, groom, bride } = invitation;

  return (
    <section className="relative flex min-h-[94vh] flex-col items-center justify-center overflow-hidden px-7 py-10 text-center">
      {/* 배경 사진 */}
      <div
        className="absolute inset-0 bg-cover"
        style={{
          backgroundImage: `url("${cover.image}")`,
          backgroundPosition: 'center 28%',
          backgroundColor: '#15110f',
        }}
      />
      {/* 가독성용 그라디언트 오버레이 */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(180deg,rgba(15,12,10,.34),rgba(15,12,10,.08) 38%,rgba(15,12,10,.68))',
        }}
      />

      <div
        className="relative z-[2] text-white"
        style={{ textShadow: '0 2px 16px rgba(0,0,0,.5)' }}
      >
        <div className="text-[11px] font-semibold uppercase tracking-[0.36em] opacity-90">
          {cover.eyebrow}
        </div>
        <h1 className="my-6 mb-2 font-cormorant text-[58px] font-medium leading-[1.02] tracking-[0.01em] text-white">
          {groom.nameEn}
          <br />
          <span className="text-[26px] font-normal italic opacity-90">and</span>
          <br />
          {bride.nameEn}
        </h1>
        <div className="mt-4 font-myeongjo text-base tracking-[0.34em]">
          {groom.name} · {bride.name}
        </div>
        <div className="mx-auto my-[26px] h-px w-[34px] bg-white/70" />
        <div className="text-[13.5px] tracking-[0.12em] opacity-95">{cover.dateLabel}</div>
        <div className="mt-1.5 text-xs tracking-[0.04em] opacity-80">{cover.venueLabel}</div>
      </div>

      <div className="absolute bottom-[22px] left-1/2 z-[2] -translate-x-1/2 animate-floatY text-[10px] tracking-[0.3em] text-white opacity-85">
        SCROLL ↓
      </div>
    </section>
  );
}
