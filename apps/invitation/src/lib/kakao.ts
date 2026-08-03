/**
 * 카카오톡 공유(Kakao Share) 연동.
 *
 * VITE_KAKAO_JS_KEY가 없으면 hasKakao()가 false를 반환하고, 호출부는 버튼을 감춥니다.
 * SDK(약 86KB)는 초기 로딩을 가볍게 유지하기 위해 첫 공유 시점에만 내려받습니다.
 *
 * 주의: 카카오 정책상 이 API로 보낸 메시지에만 버튼이 붙습니다.
 * 하객이 URL만 복사해 붙여넣으면 index.html의 og 태그 미리보기로 표시됩니다.
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

/**
 * 피드 템플릿으로 카카오톡 공유창을 엽니다.
 * 성공 여부를 반환하며, false면 호출부에서 링크 복사 등으로 폴백하세요.
 */
export async function shareToKakao(payload: KakaoSharePayload): Promise<boolean> {
  const sdk = await loadSdk();
  if (!sdk) return false;

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
    return true;
  } catch (e) {
    console.warn('[wed] 카카오 공유 실패', e);
    return false;
  }
}
