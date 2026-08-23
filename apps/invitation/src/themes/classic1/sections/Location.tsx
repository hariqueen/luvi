import { useCopy } from '@/hooks/useCopy';
import { CheckIcon, CopyIcon, PhoneIcon } from '@/components/common/icons';
import { useInvitation } from '@/lib/invitationContext';
import { SectionText } from '../ui';
import { Field } from '@/components/common/Editable';

export function Location() {
  const { location, sectionText } = useInvitation();
  const text = sectionText.location;
  const { copy, isCopied } = useCopy();

  return (
    <section className="bg-white px-7 py-[58px] text-center">
      <SectionText section="location" zone="head" blocks={text.head} />

      <div className="mt-1.5 flex items-center justify-center gap-2">
        <span className="text-base font-bold text-ink">
          <Field path="core.location.venue" value={location.venue} />
        </span>
        <a
          href={`tel:${location.tel}`}
          title="전화 문의"
          className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full border border-line bg-white text-rose-deep no-underline"
        >
          <PhoneIcon />
        </a>
      </div>
      <div className="mt-1 text-[13px] font-bold text-rose-deep">
        <Field path="core.location.hall" value={location.hall} />
      </div>

      <div className="mt-1.5 flex items-center justify-center gap-[7px] px-2">
        <span className="text-[13px] leading-[1.5] text-ink-soft">
          <Field path="core.location.address" value={location.address} />
        </span>
        <button
          onClick={() => copy(location.addressForCopy, 'addr')}
          title="주소 복사"
          className="flex h-7 w-7 flex-none items-center justify-center rounded-lg border border-line bg-white p-0 text-ink-soft"
        >
          {isCopied('addr') ? <CheckIcon size={14} /> : <CopyIcon size={13} />}
        </button>
      </div>

      <div className="my-[18px] mb-2.5 overflow-hidden rounded-xl border border-line bg-[#e8eaed] shadow-sm">
        <iframe
          title={`${location.venue} 지도`}
          src={location.mapEmbedSrc}
          className="block h-[200px] w-full border-0"
          loading="lazy"
        />
      </div>

      <div className="flex gap-2">
        <a
          href={location.kakaoMapUrl}
          target="_blank"
          rel="noopener"
          className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[#FEE500] px-3 py-3 text-[13px] font-bold text-[#3A1D1D] no-underline transition-transform active:scale-95"
        >
          카카오맵
        </a>
        <a
          href={location.naverMapUrl}
          target="_blank"
          rel="noopener"
          className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[#03C75A] px-3 py-3 text-[13px] font-bold text-white no-underline transition-transform active:scale-95"
        >
          네이버지도
        </a>
      </div>
      <SectionText
        section="location"
        zone="foot"
        blocks={text.foot}
        className="my-2 mb-[18px]"
        override={{ note: 'text-[11.5px] text-ink-soft' }}
      />

      <div className="flex flex-col gap-2.5 text-left">
        {location.transport.map((t, i) => (
          <div key={i} className="flex gap-3 rounded-md bg-cream px-4 py-3.5">
            <div className="text-lg">{t.icon}</div>
            <div>
              {/* 배열 안의 값 — 저장은 에디터가 배열을 통째로 다시 씁니다 (Editable.tsx) */}
              <div className="text-[13px] font-bold text-ink">
                <Field path={`core.location.transport.${i}.title`} value={t.title} />
              </div>
              <div className="text-[12.5px] leading-[1.6] text-ink-soft">
                <Field path={`core.location.transport.${i}.desc`} value={t.desc} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
