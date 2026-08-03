import { useState } from 'react';
import { invitation } from '@/config/invitation.config';
import { useCopy } from '@/hooks/useCopy';
import { calendarRedirectUrl } from '@/lib/calendar';
import { hasKakao, shareToKakao } from '@/lib/kakao';

export function Footer() {
  const { footer, groom, bride, share } = invitation;
  const { copy, isCopied } = useCopy();
  const [sharing, setSharing] = useState(false);

  const shareUrl = share.url || window.location.href;
  const imageUrl = new URL(share.image, shareUrl).href;

  // 구글 캘린더를 직접 가리키면 카카오가 미등록 도메인으로 막습니다.
  // 자기 도메인을 경유해 넘어가도록 합니다.
  const calendarUrl = calendarRedirectUrl(shareUrl);

  const handleKakaoShare = async () => {
    setSharing(true);
    const ok = await shareToKakao({
      title: share.title,
      description: share.description,
      imageUrl,
      url: shareUrl,
      calendarUrl,
    });
    setSharing(false);
    // 공유창이 열리지 않으면 최소한 링크는 건네줄 수 있게 폴백
    if (!ok) copy(shareUrl, 'link');
  };

  return (
    <section className="relative overflow-hidden bg-[#b9a596] px-7 pb-[70px] pt-[60px] text-center">
      <div
        className="absolute inset-0 bg-cover"
        style={{ backgroundImage: `url("${footer.image}")`, backgroundPosition: 'center 30%' }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg,rgba(40,30,26,.34),rgba(40,30,26,.66))',
        }}
      />

      <div className="relative z-[2] text-white">
        <div className="font-cormorant text-2xl italic tracking-[0.02em] opacity-90">
          Thank You
        </div>
        <div className="my-3.5 mb-1.5 font-myeongjo text-[15px] leading-[1.9]">
          {groom.firstName} ♥ {bride.firstName}
        </div>
        <div className="text-[13px] tracking-[0.08em] opacity-90">{share.date}</div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {hasKakao() && (
            <button
              onClick={handleKakaoShare}
              disabled={sharing}
              className="cursor-pointer rounded-full bg-[#FEE500] px-6 py-[11px] text-[13px] font-semibold text-[#3A2929] disabled:opacity-70"
            >
              💬 {sharing ? '여는 중…' : '카카오톡으로 공유'}
            </button>
          )}
          <button
            onClick={() => copy(shareUrl, 'link')}
            className="cursor-pointer rounded-full border border-white/60 bg-white/10 px-6 py-[11px] text-[13px] font-semibold text-white backdrop-blur-[4px]"
          >
            🔗 {isCopied('link') ? '링크 복사됨!' : '청첩장 링크 복사'}
          </button>
        </div>
      </div>
    </section>
  );
}
