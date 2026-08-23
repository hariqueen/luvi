/**
 * 갤러리 (classic2) — 대표 사진 한 장 + 아래 2열.
 *
 * classic1 은 3열 정사각 썸네일이지만, 이 디자인은 여백을 넓게 쓰므로 사진을 크게 둡니다.
 * 확대 보기는 테마가 함께 쓰는 Lightbox 입니다.
 */
import { useState } from 'react';
import { SectionText } from '../ui';
import { Lightbox } from '@/components/common/Lightbox';
import { useInvitation } from '@/lib/invitationContext';

export function Gallery() {
  const { gallery, sectionText } = useInvitation();
  const text = sectionText.gallery;
  /** 확대해서 보고 있는 사진의 순번. null 이면 닫힘 */
  const [openAt, setOpenAt] = useState<number | null>(null);

  const [hero, ...rest] = gallery;
  // 확대 보기의 순서는 화면에 보이는 순서와 같아야 한다 — 대표 사진이 0번
  const images = gallery.map((item) => item.full);

  return (
    <section className="bg-c2-ivory px-[30px] py-[60px] text-center">
      <SectionText section="gallery" zone="head" blocks={text.head} />

      {hero && (
        <button
          onClick={() => setOpenAt(0)}
          aria-label="사진 크게 보기"
          className="mb-2 mt-7 block aspect-[4/3] w-full cursor-pointer border border-c2-line bg-cover shadow-[0_6px_20px_rgba(62,58,51,.08)]"
          style={{ backgroundImage: `url("${hero.thumb}")`, backgroundPosition: 'center 28%' }}
        />
      )}

      <div className="grid grid-cols-2 gap-2">
        {rest.map((item, i) => (
          <button
            key={i}
            onClick={() => setOpenAt(i + 1)}
            aria-label="사진 크게 보기"
            className="aspect-square cursor-pointer border border-c2-line bg-cover bg-center"
            style={{ backgroundImage: `url("${item.thumb}")` }}
          />
        ))}
      </div>

      <SectionText
        section="gallery"
        zone="foot"
        blocks={text.foot}
        className="mt-4"
        override={{ note: 'text-[11.5px] tracking-[0.04em] text-c2-ink-soft' }}
        append={gallery.length > 1 ? ' · 옆으로 넘겨 다음 사진' : null}
      />

      <Lightbox
        images={images}
        index={openAt}
        onIndexChange={setOpenAt}
        onClose={() => setOpenAt(null)}
      />
    </section>
  );
}
