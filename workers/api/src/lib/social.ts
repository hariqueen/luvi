/**
 * 카카오 · 네이버 소셜 로그인 — 인가 코드를 프로필로 바꿉니다.
 *
 * 두 제공자를 한 파일에 둔 이유: 흐름이 동일하고(코드 → 토큰 → 프로필) 다른 건 엔드포인트와
 * 응답 모양뿐입니다. 하나로 묶으면 라우트가 제공자마다 갈라지지 않습니다.
 *
 * ⚠️ 둘 다 **이메일이 선택 동의**입니다. 이메일 없는 계정이 정상적으로 존재하므로
 *    "이메일 필수" 를 전제한 코드를 쓰면 안 됩니다.
 */

export type SocialProvider = 'kakao' | 'naver';

/** 제공자와 무관한 정규화된 프로필 */
export interface SocialProfile {
  provider: SocialProvider;
  /** 제공자 내 고유 ID */
  id: string;
  /** Firebase uid — 제공자 접두어를 붙여 충돌을 막습니다 */
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  /**
   * 휴대전화번호. **네이버만 값이 옵니다** — 카카오는 비즈 앱 + 별도 검수 등급이라
   * 대부분의 사용자는 null 입니다. "전화번호가 있다" 를 전제한 코드를 쓰면 안 됩니다.
   *
   * 🔴 이 값은 **클라이언트로 돌려주지 않습니다.** 주문 연락용으로 서버에만 보관합니다 —
   *    브라우저에 내려보내면 노출 지점이 늘어날 뿐 화면에서 쓸 데가 없습니다.
   */
  phone: string | null;
}

/**
 * 전화번호 표기 정규화.
 *
 * 네이버는 `010-1234-5678`, 카카오는 `+82 10-1234-5678` 형태로 줍니다.
 * 그대로 저장하면 같은 번호가 두 가지 문자열로 쌓여 중복 판별·검색이 깨집니다.
 * 숫자만 남긴 뒤 국가번호를 국내 표기로 되돌립니다.
 */
function normalizePhone(raw: string | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/[^\d+]/g, '');
  if (!digits) return null;

  // +8210xxxxxxxx → 010xxxxxxxx
  const local = digits.startsWith('+82')
    ? `0${digits.slice(3)}`
    : digits.startsWith('82') && digits.length > 10
      ? `0${digits.slice(2)}`
      : digits;

  const onlyDigits = local.replace(/\D/g, '');
  return onlyDigits.length >= 9 ? onlyDigits : null;
}

export class SocialAuthError extends Error {
  constructor(
    message: string,
    /** 로그에만 남기고 사용자에게는 노출하지 않습니다 */
    public readonly cause?: unknown,
  ) {
    super(message);
  }
}

interface TokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

async function exchangeCode(
  tokenUrl: string,
  params: Record<string, string>,
): Promise<string> {
  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
    body: new URLSearchParams(params).toString(),
  });

  const json = (await res.json()) as TokenResponse;
  if (!res.ok || !json.access_token) {
    throw new SocialAuthError('소셜 로그인 토큰 교환에 실패했습니다', json);
  }
  return json.access_token;
}

// ─────────────────────────── 카카오 ───────────────────────────

interface KakaoMe {
  id?: number;
  kakao_account?: {
    email?: string;
    /** 비즈 앱 + 별도 검수 등급. 대부분의 앱에서는 오지 않습니다 */
    phone_number?: string;
    profile?: { nickname?: string; profile_image_url?: string };
  };
}

async function fetchKakaoProfile(accessToken: string): Promise<SocialProfile> {
  const res = await fetch('https://kapi.kakao.com/v2/user/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = (await res.json()) as KakaoMe;

  if (!res.ok || json.id === undefined) {
    throw new SocialAuthError('카카오 사용자 정보를 가져오지 못했습니다', json);
  }

  const id = String(json.id);
  const profile = json.kakao_account?.profile;
  return {
    provider: 'kakao',
    id,
    uid: `kakao:${id}`,
    email: json.kakao_account?.email ?? null,
    displayName: profile?.nickname ?? null,
    photoURL: profile?.profile_image_url ?? null,
    // 카카오는 '+82 10-1234-5678' 형태로 줍니다 (동의항목이 열려 있는 경우에만)
    phone: normalizePhone(json.kakao_account?.phone_number),
  };
}

// ─────────────────────────── 네이버 ───────────────────────────

interface NaverMe {
  resultcode?: string;
  message?: string;
  response?: {
    id?: string;
    email?: string;
    name?: string;
    nickname?: string;
    profile_image?: string;
    /** '010-1234-5678' */
    mobile?: string;
    /** '+821012345678' — 있으면 이쪽이 더 정확합니다 */
    mobile_e164?: string;
  };
}

async function fetchNaverProfile(accessToken: string): Promise<SocialProfile> {
  const res = await fetch('https://openapi.naver.com/v1/nid/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = (await res.json()) as NaverMe;

  // 네이버는 HTTP 200 으로 응답하면서 본문의 resultcode 로 실패를 알립니다
  const id = json.response?.id;
  if (!res.ok || json.resultcode !== '00' || !id) {
    throw new SocialAuthError('네이버 사용자 정보를 가져오지 못했습니다', json);
  }

  const r = json.response;
  return {
    provider: 'naver',
    id,
    uid: `naver:${id}`,
    email: r?.email ?? null,
    displayName: r?.name ?? r?.nickname ?? null,
    photoURL: r?.profile_image ?? null,
    phone: normalizePhone(r?.mobile_e164 ?? r?.mobile),
  };
}

// ─────────────────────────── 공통 진입점 ───────────────────────────

export interface SocialCredentials {
  kakaoRestKey?: string;
  kakaoClientSecret?: string;
  naverClientId?: string;
  naverClientSecret?: string;
}

export interface ResolveInput {
  provider: SocialProvider;
  code: string;
  redirectUri: string;
  /** 네이버는 토큰 교환에 state 를 함께 보내야 합니다 */
  state?: string;
  credentials: SocialCredentials;
}

/** 인가 코드 → 정규화된 프로필 */
export async function resolveSocialProfile(input: ResolveInput): Promise<SocialProfile> {
  const { credentials: cred } = input;

  if (input.provider === 'kakao') {
    if (!cred.kakaoRestKey) throw new SocialAuthError('카카오 REST 키가 설정되지 않았습니다');

    const accessToken = await exchangeCode('https://kauth.kakao.com/oauth/token', {
      grant_type: 'authorization_code',
      client_id: cred.kakaoRestKey,
      redirect_uri: input.redirectUri,
      code: input.code,
      // 카카오 콘솔에서 "Client Secret 사용"을 켠 경우에만 필요합니다
      ...(cred.kakaoClientSecret ? { client_secret: cred.kakaoClientSecret } : {}),
    });
    return fetchKakaoProfile(accessToken);
  }

  if (!cred.naverClientId || !cred.naverClientSecret) {
    throw new SocialAuthError('네이버 클라이언트 정보가 설정되지 않았습니다');
  }

  const accessToken = await exchangeCode('https://nid.naver.com/oauth2.0/token', {
    grant_type: 'authorization_code',
    client_id: cred.naverClientId,
    client_secret: cred.naverClientSecret,
    code: input.code,
    ...(input.state ? { state: input.state } : {}),
  });
  return fetchNaverProfile(accessToken);
}
