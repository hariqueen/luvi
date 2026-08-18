/**
 * 카카오톡 공유(Kakao Share) 연동.
 *
 * VITE_KAKAO_JS_KEY가 없으면 hasKakao()가 false를 반환하고, 호출부는 버튼을 감춥니다.
 * SDK(약 86KB)는 초기 로딩을 가볍게 유지하기 위해 첫 공유 시점에만 내려받습니다.
 *
 * 주의: 카카오 정책상 이 API로 보낸 메시지에만 버튼이 붙습니다.
 * 하객이 URL만 복사해 붙여넣으면 index.html의 og 태그 미리보기로 표시됩니다.
 *
 * 🔴 **`sendDefault` 는 클릭 핸들러와 같은 실행 흐름에서 불러야 합니다.** 공유창은 팝업(웹)
 * 또는 앱 전환(모바일)이라, 중간에 `await` 가 끼면 브라우저가 사용자 제스처를 잃었다고 보고
 * 막습니다 — 특히 iOS 사파리에서 **첫 클릭이 항상 실패**했습니다(SDK 86KB 를 그 자리에서
 * 내려받았기 때문). 그래서 SDK 는 화면이 뜰 때 `preloadKakao()` 로 미리 받아두고,
 * 클릭 시점에는 `shareToKakaoNow()` 로 **동기 호출**합니다.
 */

const SDK_VERSION = '2.8.1';
const SDK_SRC = `https://t1.kakaocdn.net/kakao_js_sdk/${SDK_VERSION}/kakao.min.js`;
const SDK_INTEGRITY = 'sha384-OL+ylM/iuPLtW5U3XcvLSGhE8JzReKDank5InqlHGWPhb4140/yrBw0bg0y7+C9J';

const jsKey = import.meta.env.VITE_KAKAO_JS_KEY as string | undefined;

interface KakaoLink {
  mobileWebUrl: string;
  webUrl: string;
}

interface KakaoSdk {
  isInitialized(): boolean;
  init(key: string): void;
  Share: {
    sendDefault(settings: {
      objectType: 'feed';
      content: {
        title: string;
        description: string;
        imageUrl: string;
        link: KakaoLink;
      };
      buttons?: { title: string; link: KakaoLink }[];
    }): void;
  };
}

declare global {
  interface Window {
    Kakao?: KakaoSdk;
  }
}

/** 카카오 공유 사용 가능 여부 (JS 키 설정 여부) */
export const hasKakao = (): boolean => Boolean(jsKey);

/** SDK 가 준비됐는지 — 준비됐을 때만 클릭 흐름에서 바로 공유할 수 있습니다 */
export const kakaoReady = (): boolean => Boolean(window.Kakao?.isInitialized());

/**
 * SDK 를 미리 받아둡니다. 화면이 뜰 때 한 번 부르세요.
 * 실패해도 조용히 넘어갑니다 — 공유 버튼은 폴백(링크 복사)이 있습니다.
 */
export function preloadKakao(): void {
  if (!jsKey) return;
  void loadSdk();
}

let loading: Promise<KakaoSdk | null> | null = null;

function loadSdk(): Promise<KakaoSdk | null> {
  if (!jsKey) {
    console.info('[wed] VITE_KAKAO_JS_KEY 미설정 — 카카오 공유가 비활성화됩니다.');
    return Promise.resolve(null);
  }
  if (window.Kakao?.isInitialized()) return Promise.resolve(window.Kakao);
  if (loading) return loading;

  loading = new Promise<KakaoSdk | null>((resolve) => {
    const script = document.createElement('script');
    script.src = SDK_SRC;
    script.integrity = SDK_INTEGRITY;
    script.crossOrigin = 'anonymous';
    script.async = true;

    script.onload = () => {
      const sdk = window.Kakao;
      if (!sdk) {
        console.warn('[wed] 카카오 SDK 로드 후 window.Kakao를 찾을 수 없습니다.');
        resolve(null);
        return;
      }
      try {
        if (!sdk.isInitialized()) sdk.init(jsKey);
        resolve(sdk);
      } catch (e) {
        console.warn('[wed] 카카오 SDK 초기화 실패 (JS 키·도메인 등록 확인)', e);
        resolve(null);
      }
    };

    script.onerror = () => {
      console.warn('[wed] 카카오 SDK 로드 실패');
      loading = null; // 다음 클릭에서 다시 시도
      resolve(null);
    };

    document.head.appendChild(script);
  });

  return loading;
}

export interface KakaoSharePayload {
  title: string;
  description: string;
  /** 절대 URL이어야 합니다 */
  imageUrl: string;
  /** 절대 URL이어야 합니다 */
  url: string;
  /** 캘린더 일정 추가 링크 */
  calendarUrl: string;
}

/** 실패 이유를 호출부가 로그로 남길 수 있게 함께 돌려줍니다 */
export interface KakaoShareResult {
  ok: boolean;
  /** 'no_key' | 'sdk_load_failed' | 'send_failed' | 'blocked_after_await' */
  reason?: string;
  message?: string;
}

function send(sdk: KakaoSdk, payload: KakaoSharePayload): KakaoShareResult {
  const link: KakaoLink = { mobileWebUrl: payload.url, webUrl: payload.url };
  const calendarLink: KakaoLink = {
    mobileWebUrl: payload.calendarUrl,
    webUrl: payload.calendarUrl,
  };

  try {
    sdk.Share.sendDefault({
      objectType: 'feed',
      content: {
        title: payload.title,
        description: payload.description,
        imageUrl: payload.imageUrl,
        link,
      },
      buttons: [
        { title: '청첩장 보기', link },
        { title: '일정 등록', link: calendarLink },
      ],
    });
    return { ok: true };
  } catch (e) {
    // 미등록 도메인이면 여기서 KOE006 / 4019 로 떨어집니다 (카카오 콘솔의 웹 도메인 2곳 확인)
    console.warn('[wed] 카카오 공유 실패', e);
    return { ok: false, reason: 'send_failed', message: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * 공유창을 **await 없이** 엽니다. `kakaoReady()` 가 true 일 때만 성공합니다.
 * 클릭 핸들러에서 이 경로를 우선 쓰세요 — 팝업 차단을 피하는 유일한 방법입니다.
 */
export function shareToKakaoNow(payload: KakaoSharePayload): KakaoShareResult {
  const sdk = window.Kakao;
  if (!sdk?.isInitialized()) return { ok: false, reason: 'not_ready' };
  return send(sdk, payload);
}

/**
 * SDK 를 기다렸다가 공유합니다 (미리 로드가 아직 안 끝난 경우의 차선책).
 * 기다리는 사이 사용자 제스처가 끊겨 브라우저가 팝업을 막을 수 있습니다.
 */
export async function shareToKakao(payload: KakaoSharePayload): Promise<KakaoShareResult> {
  if (!jsKey) return { ok: false, reason: 'no_key' };
  const sdk = await loadSdk();
  if (!sdk) return { ok: false, reason: 'sdk_load_failed' };
  const result = send(sdk, payload);
  if (!result.ok) return result;
  // 성공으로 보고됐지만 제스처가 끊겨 창이 안 뜰 수 있습니다 — 호출부가 구분할 수 있게 알려줍니다
  return { ok: true, reason: 'after_await' };
}
