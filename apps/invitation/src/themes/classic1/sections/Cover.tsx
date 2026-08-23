/**
 * 커버 — 사진 위에 에디터가 배치한 텍스트 레이어를 그대로 렌더합니다.
 *
 * 좌표·폰트 크기 계산은 `@luvi/schema` 의 layers.ts 한 곳에서만 합니다 — 에디터의 미리보기가
 * 바로 이 화면이므로, 편집 화면과 하객 화면의 글자 위치가 어긋날 여지가 없습니다.
 * 한쪽만 바뀌면 편집 화면과 하객 화면의 글자 위치가 어긋나기 때문입니다.
 */
import { useEffect, useRef, useState } from 'react';
import { ensureFonts } from '@luvi/schema';
import { useInvitation } from '@/lib/invitationContext';
import { CoverLayers } from '@/components/common/CoverLayers';

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
      /* 문구 좌표의 기준 박스 — blockDrag 가 가장 가까운 이 표시를 찾습니다 (index.tsx 의
         섹션 래퍼에도 같은 표시가 있지만, 커버는 좌표 기준이 이 section 이라 여기가 이깁니다) */
      data-preview-frame="cover"
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

      {/* 자유 배치 텍스트 레이어 (미리보기에서는 끌어 옮기고 눌러서 고칩니다) */}
      <CoverLayers layers={cover.layers} size={size} maxWidth="86%" />

      <div className="absolute bottom-[22px] left-1/2 z-[2] -translate-x-1/2 animate-floatY text-[10px] tracking-[0.3em] text-white opacity-85">
        SCROLL ↓
      </div>
    </section>
  );
}
