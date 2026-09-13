import { useState } from 'react';
import { Lightbox } from '@/components/common/Lightbox';
import { useInvitation } from '@/lib/invitationContext';
import { SectionText } from '../ui';
import { Field, showOptional } from '@/components/common/Editable';

export function Gallery() {
  const { gallery, sectionText, labels } = useInvitation();
  const text = sectionText.gallery;
  /** 확대해서 보고 있는 사진의 순번. null 이면 닫힘 */
  const [openAt, setOpenAt] = useState<number | null>(null);

  const [hero, ...rest] = gallery;
  // 확대 보기의 순서는 화면에 보이는 순서와 같아야 한다 — 대표 사진이 0번
  const images = gallery.map((item) => item.full);

  return (
    <section className="bg-white px-6 py-[58px] text-center">
      <SectionText section="gallery" zone="head" blocks={text.head} />

      {/* 대표 이미지 */}
      {hero && (
        <button
          onClick={() => setOpenAt(0)}
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
            onClick={() => setOpenAt(i + 1)}
            className="aspect-square cursor-pointer rounded-sm border-none bg-cover bg-center"
            style={{ backgroundImage: `url("${item.thumb}")` }}
            aria-label="사진 크게 보기"
          />
        ))}
      </div>

      <SectionText
        section="gallery"
        zone="foot"
        blocks={text.foot}
        className="mt-3.5"
        /*
          넘김 안내도 눌러서 고칩니다 — 문구 뒤에 붙지만 값은 따로입니다
          (`core.labels.gallerySwipeHint`). 사진이 한 장뿐이면 넘길 것이 없어 붙이지 않습니다.
        */
        append={
          gallery.length > 1 && showOptional(labels.gallerySwipeHint) ? (
            <>
              {' '}
              <Field
                path="core.labels.gallerySwipeHint"
                value={labels.gallerySwipeHint}
                placeholder="넘김 안내"
              />
            </>
          ) : null
        }
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
