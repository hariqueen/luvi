/**
 * 오시는 길 (classic2) — 지도 아래 담백한 아웃라인 버튼, 교통편은 실선으로 나눈 목록.
 *
 * 지도 앱 버튼을 카카오 노란색·네이버 초록색으로 칠하지 않습니다 — 이 디자인은 색을 두 개
 * (세이지·골드)로 제한해서 단정함을 만듭니다. 대신 라벨을 그대로 두어 어디로 가는지 알 수 있게 합니다.
 */
import { useCopy } from '@/hooks/useCopy';
import { SectionText } from '../ui';
import { CheckIcon, CopyIcon } from '@/components/common/icons';
import { useInvitation } from '@/lib/invitationContext';

export function Location() {
  const { location, sectionText } = useInvitation();
  const text = sectionText.location;
  const { copy, isCopied } = useCopy();

  return (
    <section className="bg-c2-ivory px-[30px] py-[60px] text-center">
      <SectionText section="location" zone="head" blocks={text.head} />

      <div className="mt-6 font-myeongjo text-[17px] text-c2-ink">{location.venue}</div>
      <div className="mt-1 text-[12.5px] tracking-[0.04em] text-c2-sage-deep">{location.hall}</div>

      <div className="mt-3 flex items-center justify-center gap-2 px-2">
        <span className="text-[12.5px] leading-[1.6] text-c2-ink-soft">{location.address}</span>
        <button
          onClick={() => copy(location.addressForCopy, 'addr')}
          title="주소 복사"
          className="flex size-7 flex-none items-center justify-center rounded-md border border-c2-line bg-white p-0 text-c2-ink-soft"
        >
          {isCopied('addr') ? <CheckIcon size={13} /> : <CopyIcon size={12} />}
        </button>
      </div>

      <div className="mt-[18px] overflow-hidden border border-c2-line bg-c2-cream">
        <iframe
          title={`${location.venue} 지도`}
          src={location.mapEmbedSrc}
          className="block h-[200px] w-full border-0"
          loading="lazy"
        />
      </div>

      <div className="mt-2.5 flex gap-2">
        <a
          href={location.kakaoMapUrl}
          target="_blank"
          rel="noopener"
          className="flex-1 rounded-full border border-c2-line bg-white py-3 text-[12.5px] text-c2-ink no-underline transition-colors active:bg-c2-cream"
        >
          카카오맵
        </a>
        <a
          href={location.naverMapUrl}
          target="_blank"
          rel="noopener"
          className="flex-1 rounded-full border border-c2-line bg-white py-3 text-[12.5px] text-c2-ink no-underline transition-colors active:bg-c2-cream"
        >
          네이버지도
        </a>
        <a
          href={`tel:${location.tel}`}
          className="rounded-full border border-c2-sage bg-white px-5 py-3 text-[12.5px] text-c2-sage-deep no-underline"
        >
          전화
        </a>
      </div>

      {location.transport.length > 0 && (
        <div className="mt-7 border-t border-c2-line text-left">
          {location.transport.map((t, i) => (
            <div key={i} className="border-b border-c2-line px-1 py-[18px]">
              <div className="font-myeongjo text-[13.5px] text-c2-sage-deep">
                {t.icon} {t.title}
              </div>
              <div className="mt-1.5 text-[12.5px] leading-[1.7] text-c2-ink-soft">{t.desc}</div>
            </div>
          ))}
        </div>
      )}

      <SectionText section="location" zone="foot" blocks={text.foot} className="mt-7" />
    </section>
  );
}
