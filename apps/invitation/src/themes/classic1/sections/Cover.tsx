/**
 * 커버 — 사진 위에 에디터가 배치한 텍스트 레이어를 그대로 렌더합니다.
 *
 * 좌표·폰트 크기 계산은 에디터(CoverCanvas)와 **같은 함수**(@luvi/schema 의 layers.ts)를 씁니다.
 * 한쪽만 바뀌면 편집 화면과 하객 화면의 글자 위치가 어긋나기 때문입니다.
 */
import { useEffect, useRef, useState } from 'react';
import { FONT_STACK, alignTransform, ensureFonts, layerToPx } from '@luvi/schema';
import { useInvitation } from '@/lib/invitationContext';

export function Cover() {
  const { cover } = useInvitation();
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  // 이 청첩장이 실제로 쓰는 글꼴만 받아옵니다 — 목록 전체를 상시 로드하지 않는 이유는 fonts.ts 참고
  useEffect(() => {
    ensureFonts(cover.layers.map((l) => l.font));
  }, [cover.layers]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className="relative flex min-h-[94vh] flex-col overflow-hidden"
      style={{ backgroundColor: '#15110f' }}
    >
      {/* 배경 사진 */}
      {cover.image && (
        <div
          className="absolute inset-0 bg-cover"
          style={{ backgroundImage: `url("${cover.image}")`, backgroundPosition: 'center 28%' }}
        />
      )}
      {/* 가독성용 그라디언트 */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(180deg,rgba(15,12,10,.34),rgba(15,12,10,.08) 38%,rgba(15,12,10,.68))',
        }}
      />

      {/* 자유 배치 텍스트 레이어 */}
      {cover.layers.map((layer) => {
        const px = layerToPx(layer, size);
        return (
          <div
            key={layer.id}
            className="absolute whitespace-pre-wrap"
            style={{
              left: px.left,
              top: px.top,
              transform: alignTransform(layer.align),
              fontSize: px.fontSize,
              fontFamily: FONT_STACK[layer.font],
              fontWeight: layer.weight,
              lineHeight: layer.lineHeight,
              letterSpacing: `${layer.letterSpacing}em`,
              color: layer.color,
              textAlign: layer.align,
              textShadow: layer.shadow ? '0 1px 12px rgba(0,0,0,.45)' : 'none',
              maxWidth: '86%',
            }}
          >
            {layer.text}
          </div>
        );
      })}

      <div className="absolute bottom-[22px] left-1/2 z-[2] -translate-x-1/2 animate-floatY text-[10px] tracking-[0.3em] text-white opacity-85">
        SCROLL ↓
      </div>
    </section>
  );
}
