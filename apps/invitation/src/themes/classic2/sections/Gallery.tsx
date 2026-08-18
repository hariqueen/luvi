/**
 * 갤러리 (classic2) — 대표 사진 한 장 + 아래 2열.
 *
 * classic1 은 3열 정사각 썸네일이지만, 이 디자인은 여백을 넓게 쓰므로 사진을 크게 둡니다.
 * 확대 보기는 테마가 함께 쓰는 Lightbox 입니다.
 */
import { useState } from 'react';
import { Heading } from '../ui';
import { Lightbox } from '@/components/common/Lightbox';
import { useInvitation } from '@/lib/invitationContext';

export function Gallery() {
  const { gallery } = useInvitation();
  const [lightbox, setLightbox] = useState<string | null>(null);

  const [hero, ...rest] = gallery;

  return (
    <section className="bg-c2-ivory px-[30px] py-[60px] text-center">
      <Heading script="Moments" label="우리의 순간" />

      {hero && (
        <button
          onClick={() => setLightbox(hero.full)}
          aria-label="사진 크게 보기"
          className="mb-2 mt-7 block aspect-[4/3] w-full cursor-pointer border border-c2-line bg-cover shadow-[0_6px_20px_rgba(62,58,51,.08)]"
          style={{ backgroundImage: `url("${hero.thumb}")`, backgroundPosition: 'center 28%' }}
        />
      )}

      <div className="grid grid-cols-2 gap-2">
        {rest.map((item, i) => (
          <button
            key={i}
            onClick={() => setLightbox(item.full)}
            aria-label="사진 크게 보기"
            className="aspect-square cursor-pointer border border-c2-line bg-cover bg-center"
            style={{ backgroundImage: `url("${item.thumb}")` }}
          />
        ))}
      </div>

      <div className="mt-4 text-[11.5px] tracking-[0.04em] text-c2-ink-soft">
        사진을 누르면 크게 볼 수 있어요
      </div>

      <Lightbox src={lightbox} onClose={() => setLightbox(null)} />
    </section>
  );
}
