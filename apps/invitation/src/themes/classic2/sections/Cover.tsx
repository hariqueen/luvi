/**
 * 커버 (classic2) — 아이보리 여백 위에 사진을 **액자처럼** 앉힙니다.
 *
 * classic1 은 사진이 화면을 가득 채우고 문구가 그 위에 얹히는 구성입니다.
 * 여기서는 사진을 골드 테두리 액자에 넣고, 액자 밖에 예식장 정보를 활자로 정돈합니다.
 *
 * 🔴 문구는 classic1 과 **같은 텍스트 레이어**(`core.cover.layers`)를 그립니다 — 렌더와 편집
 *    배선은 공용 `CoverLayers` 에 있습니다.
 *    좌표 계산도 같은 함수(@luvi/schema 의 layers.ts)를 쓰되, 기준 박스가 화면 전체가
 *    아니라 **액자** 입니다 — 그래서 에디터에서 가운데 놓은 문구가 사진 가운데에 옵니다.
 *    날짜·이름을 여기서 또 활자로 찍지 않는 이유: 레이어에 이미 들어 있어 두 번 나옵니다.
 */
import { useEffect, useRef, useState } from 'react';
import { ensureFonts } from '@luvi/schema';
import { useInvitation } from '@/lib/invitationContext';
import { CoverLayers } from '@/components/common/CoverLayers';
import { Rich } from '@/components/common/Rich';

export function Cover() {
  const { cover, location } = useInvitation();
  const frameRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  // 이 청첩장이 실제로 쓰는 글꼴만 받아옵니다 — 목록 전체를 상시 로드하지 않는 이유는 fonts.ts 참고
  useEffect(() => {
    ensureFonts(cover.layers.map((l) => l.font));
  }, [cover.layers]);

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="relative overflow-hidden bg-c2-ivory px-8 pb-16 pt-14 text-center">
      {/* 배경 장식 — 세이지·골드 원형 번짐 */}
      <div
        className="pointer-events-none absolute -left-[60px] -top-[60px] h-[220px] w-[220px] rounded-full"
        style={{ background: 'radial-gradient(circle,rgba(142,156,132,.16),transparent 70%)' }}
      />
      <div
        className="pointer-events-none absolute -bottom-10 -right-[70px] h-[240px] w-[240px] rounded-full"
        style={{ background: 'radial-gradient(circle,rgba(180,154,99,.14),transparent 70%)' }}
      />

      <div className="relative z-[2]">
        {/* 액자 — 문구 레이어의 기준 박스이기도 합니다 */}
        <div className="relative mx-auto w-[268px] max-w-full">
          <div
            ref={frameRef}
            /* 문구 좌표의 기준 박스 — classic2 는 액자가 기준입니다 (CoverLayers 주석 참고) */
            data-preview-frame="cover"
            className="relative aspect-[3/4] overflow-hidden bg-c2-cream shadow-[0_18px_38px_rgba(62,58,51,.18)]"
          >
            {cover.image && (
              <div
                className="absolute inset-0 bg-cover"
                style={{ backgroundImage: `url("${cover.image}")`, backgroundPosition: 'center 28%' }}
              />
            )}
            {/* 사진이 밝아도 흰 문구가 읽히도록 아래위로만 살짝 눌러줍니다 */}
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  'linear-gradient(180deg,rgba(40,36,30,.26),rgba(40,36,30,.04) 42%,rgba(40,36,30,.44))',
              }}
            />

            <CoverLayers layers={cover.layers} size={size} maxWidth="88%" />
          </div>

          {/* 액자 테두리 — 골드 실선 + 안쪽 흰 실선 */}
          <div className="pointer-events-none absolute -inset-[7px] border border-c2-gold opacity-85" />
          <div className="pointer-events-none absolute inset-[3px] border border-white/50" />
        </div>

        {/*
          액자 밖 활자 — 레이어에 없는 정보(예식장)만 적습니다.
          Cormorant 는 한글 글리프가 없어 예식장 이름은 명조로 씁니다.
        */}
        {location.venue && (
          <div className="mt-9 font-myeongjo text-[15px] tracking-[0.04em] text-c2-ink">
            <Rich text={location.venue} />
            {location.hall && (
              <span className="text-c2-ink-soft">
                {' · '}
                <Rich text={location.hall} />
              </span>
            )}
          </div>
        )}

        <div className="mt-8 animate-floatY text-[10px] tracking-[0.3em] text-c2-ink-soft">
          SCROLL
        </div>
      </div>
    </section>
  );
}
