import { useEffect, useState } from 'react';
import { useCopy } from '@/hooks/useCopy';
import { calendarRedirectUrl } from '@/lib/calendar';
import {
  hasKakao,
  kakaoReady,
  preloadKakao,
  shareToKakao,
  shareToKakaoNow,
} from '@/lib/kakao';
import { useInvitation } from '@/lib/invitationContext';

export function Footer() {
  const { footer, groom, bride, share } = useInvitation();
  const { copy, isCopied } = useCopy();
  const [sharing, setSharing] = useState(false);
  /** 공유가 막혔을 때 하객에게 무슨 일이 났는지 알려줍니다 (조용히 링크만 복사되면 고장으로 보입니다) */
  const [shareNote, setShareNote] = useState<string | null>(null);

  // SDK 를 미리 받아둡니다 — 클릭한 뒤 받으면 그 사이 사용자 제스처가 끊겨
  // 브라우저가 공유창(팝업·앱 전환)을 막습니다 (iOS 사파리에서 첫 클릭이 항상 실패했습니다)
  useEffect(() => {
    if (hasKakao()) preloadKakao();
  }, []);

  const shareUrl = share.url || window.location.href;
  const imageUrl = new URL(share.image, shareUrl).href;

  // 구글 캘린더를 직접 가리키면 카카오가 미등록 도메인으로 막습니다.
  // 자기 도메인을 경유해 넘어가도록 합니다.
  const calendarUrl = calendarRedirectUrl(shareUrl);

  const handleKakaoShare = async () => {
    const payload = {
      title: share.title,
      description: share.description,
      imageUrl,
      url: shareUrl,
      calendarUrl,
    };
    setShareNote(null);

    // 준비돼 있으면 await 없이 곧바로 — 이 경로만 팝업 차단을 피합니다
    if (kakaoReady()) {
      const result = shareToKakaoNow(payload);
      if (result.ok) return;
      copy(shareUrl, 'link');
      setShareNote('카카오톡 공유가 막혀서 링크를 복사했어요. 붙여넣어 보내주세요.');
      return;
    }

    // 아직 로딩 중이면 기다렸다 시도합니다 (차단될 수 있어 폴백을 함께 안내)
    setSharing(true);
    const result = await shareToKakao(payload);
    setSharing(false);
    if (!result.ok) {
      copy(shareUrl, 'link');
      setShareNote('카카오톡 공유가 막혀서 링크를 복사했어요. 붙여넣어 보내주세요.');
    }
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

        {shareNote && (
          <p className="mt-3 text-[12px] leading-relaxed text-white/90">{shareNote}</p>
        )}
      </div>
    </section>
  );
}
