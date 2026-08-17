import { useState } from 'react';
import { SectionHeading } from '@/components/common/SectionHeading';
import { Lightbox } from '@/components/common/Lightbox';
import { useInvitation } from '@/lib/invitationContext';

export function Gallery() {
  const { gallery } = useInvitation();
  const [lightbox, setLightbox] = useState<string | null>(null);

  const [hero, ...rest] = gallery;

  return (
    <section className="bg-white px-6 py-[58px] text-center">
      <SectionHeading eyebrow="🐾 OUR MOMENTS" title="Gallery" />

      {/* 대표 이미지 */}
      {hero && (
        <button
          onClick={() => setLightbox(hero.full)}
          className="mb-2 mt-6 block aspect-[3/2] w-full cursor-pointer overflow-hidden rounded-xl border-none bg-cover shadow-sm"
          style={{ backgroundImage: `url("${hero.thumb}")`, backgroundPosition: 'center 28%' }}
          aria-label="사진 크게 보기"
        />
      )}

      {/* 썸네일 그리드 */}
      <div className="grid grid-cols-3 gap-1.5">
        {rest.map((item, i) => (
          <button
            key={i}
            onClick={() => setLightbox(item.full)}
            className="aspect-square cursor-pointer rounded-sm border-none bg-cover bg-center"
            style={{ backgroundImage: `url("${item.thumb}")` }}
            aria-label="사진 크게 보기"
          />
        ))}
      </div>

      <div className="mt-3.5 text-xs text-ink-soft">사진을 누르면 크게 볼 수 있어요</div>

      <Lightbox src={lightbox} onClose={() => setLightbox(null)} />
    </section>
  );
}
