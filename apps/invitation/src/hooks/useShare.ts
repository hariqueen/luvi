/**
 * 청첩장 공유(카카오톡 · OS 공유 시트 · 링크 복사) — **테마가 함께 쓰는 로직**입니다.
 *
 * 버튼 모양은 디자인마다 다르지만, "카카오가 막히면 OS 공유 시트로, 그것도 없으면 링크 복사" 라는
 * 순서는 어느 디자인에서든 같아야 합니다. 이 순서를 테마마다 다시 적으면 한쪽만 고쳐지고
 * **다른 디자인의 하객은 공유를 못 쓰는** 상태가 됩니다. 그래서 로직만 여기로 모았습니다.
 *
 * 원본 구현은 classic1 의 Footer 였습니다 — 아래 주석은 거기서 함께 옮겨온 것입니다.
 */
import { useEffect, useState } from 'react';
import { useCopy } from '@/hooks/useCopy';
import { calendarRedirectUrl } from '@/lib/calendar';
import { hasKakao, kakaoReady, preloadKakao, shareToKakao, shareToKakaoNow } from '@/lib/kakao';
import { useInvitation } from '@/lib/invitationContext';
import { logEvent } from '@/lib/log';

export interface ShareControls {
  /** 카카오 공유 버튼을 띄울 수 있는 환경인지 (JS 키가 있는지) */
  kakaoAvailable: boolean;
  /** SDK 를 기다리는 중 — 버튼을 잠그고 '여는 중…' 을 보여줍니다 */
  sharing: boolean;
  /** 공유가 막혔을 때 하객에게 보여줄 안내. 없으면 null */
  shareNote: string | null;
  /** 링크 복사 버튼이 방금 눌렸는지 */
  linkCopied: boolean;
  /** 하객에게 보낼 주소 */
  shareUrl: string;
  shareToKakao: () => void;
  copyLink: () => void;
}

export function useShare(): ShareControls {
  const { share } = useInvitation();
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

  /**
   * OS 공유 시트 (Web Share API).
   *
   * 카카오 공유는 **앱 키에 등록된 도메인에서만** 동작합니다 — 주소가 바뀌면 콘솔에 등록하기
   * 전까지 하객은 공유를 못 씁니다(Error 4019). OS 공유 시트는 그 제약이 없고 목록에
   * 카카오톡이 그대로 나오므로, 막혔을 때 여기로 떨어뜨립니다.
   *
   * 반환값 true = 사용자에게 공유 수단을 건넸다(취소 포함). false = 이 기기에서 불가능.
   */
  const shareViaOs = async (): Promise<boolean> => {
    if (typeof navigator === 'undefined' || !navigator.share) return false;
    try {
      await navigator.share({ title: share.title, text: share.description, url: shareUrl });
      logEvent({ kind: 'click', name: 'os_share', ok: true });
      return true;
    } catch (e) {
      // 사용자가 시트를 닫은 것도 여기로 옵니다 — 그건 실패가 아니라 취소입니다
      const cancelled = e instanceof Error && e.name === 'AbortError';
      logEvent({
        kind: 'click',
        name: 'os_share',
        ok: cancelled,
        detail: cancelled ? 'cancelled' : e instanceof Error ? e.message : String(e),
      });
      return cancelled;
    }
  };

  const copyLink = () => {
    copy(shareUrl, 'link');
    logEvent({ kind: 'click', name: 'copy_link', ok: true });
  };

  /** 마지막 수단 — 링크를 복사하고 그 사실을 알립니다 */
  const fallbackToCopy = () => {
    copy(shareUrl, 'link');
    setShareNote('카카오톡 공유가 막혀서 링크를 복사했어요. 붙여넣어 보내주세요.');
  };

  const handleKakaoShare = () => {
    void (async () => {
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
        logEvent({
          kind: 'click',
          name: 'kakao_share',
          ok: result.ok,
          detail: result.ok
            ? 'ready'
            : `${result.reason ?? 'unknown'} ${result.message ?? ''}`.trim(),
        });
        if (result.ok) return;
        // 카카오가 거절했으면(도메인 미등록 등) OS 공유 시트 → 그것도 없으면 링크 복사
        if (!(await shareViaOs())) fallbackToCopy();
        return;
      }

      // 아직 로딩 중이면 기다렸다 시도합니다 (차단될 수 있어 폴백을 함께 안내)
      setSharing(true);
      const result = await shareToKakao(payload);
      setSharing(false);
      logEvent({
        kind: 'click',
        name: 'kakao_share',
        ok: result.ok,
        // 'after_await' 면 성공으로 보고됐지만 팝업이 막혔을 수 있습니다 — 구분해서 남깁니다
        detail: `${result.reason ?? 'unknown'} ${result.message ?? ''}`.trim(),
      });
      if (!result.ok && !(await shareViaOs())) fallbackToCopy();
    })();
  };

  return {
    kakaoAvailable: hasKakao(),
    sharing,
    shareNote,
    linkCopied: isCopied('link'),
    shareUrl,
    shareToKakao: handleKakaoShare,
    copyLink,
  };
}
