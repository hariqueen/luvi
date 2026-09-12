/**
 * 약관·개인정보 동의 — 문서 버전과 동의 이력.
 *
 * **왜 여기(공용 스키마)에 두는가:** 동의 게이트는 서버(편집·발행 차단)와 화면(모달 표시)이
 * **같은 판정을 내려야** 합니다. 버전 상수나 판정 함수가 양쪽에 따로 있으면 한쪽만 올리는
 * 순간 "화면은 통과시켰는데 서버가 막는" 상태가 됩니다.
 *
 * 🔴 **문서를 개정하면 `DOC_VERSIONS` 의 해당 값을 올리세요.** 그것만으로 기존 회원 전원에게
 *    재동의가 트리거됩니다 (`users.consentVersions` 와 달라지므로). 문서 파일만 고치고
 *    버전을 안 올리면 아무도 새 문서에 동의하지 않은 상태로 남습니다.
 *
 * 문서 원본: `docs/legal/privacy-{version}.md` · `docs/legal/terms-{version}.md`
 */

export type ConsentDocType = 'terms' | 'privacy' | 'age14' | 'marketing';

/** 현재 시행 중인 문서 버전. 개정 시 여기를 올립니다 */
export const DOC_VERSIONS: Record<ConsentDocType, string> = {
  terms: '1.0.0',
  privacy: '1.0.0',
  age14: '1.0.0',
  marketing: '1.0.0',
};

/** 미동의 시 가입할 수 없는 항목 */
export const REQUIRED_CONSENTS = ['age14', 'terms', 'privacy'] as const satisfies
  readonly ConsentDocType[];

/** 미동의해도 가입할 수 있고, 언제든 철회할 수 있는 항목 */
export const OPTIONAL_CONSENTS = ['marketing'] as const satisfies readonly ConsentDocType[];

export function isRequiredConsent(docType: ConsentDocType): boolean {
  return (REQUIRED_CONSENTS as readonly string[]).includes(docType);
}

/** 화면에 그대로 쓸 수 있는 라벨 */
export const CONSENT_LABELS: Record<ConsentDocType, string> = {
  age14: '만 14세 이상입니다',
  terms: '서비스 이용약관에 동의합니다',
  privacy: '개인정보 수집·이용에 동의합니다',
  marketing: '광고성 정보 수신에 동의합니다',
};

/**
 * 동의를 받은 경로.
 * · `signup`     신규 가입 시
 * · `reconsent`  문서 개정 후 재동의
 * · `settings`   계정 설정 화면에서 변경(주로 선택 항목 철회)
 */
export type ConsentMethod = 'signup' | 'reconsent' | 'settings';

/** 이용자에게 돌려주는 동의 이력 한 건 (ipHash·userAgent 는 내려보내지 않습니다) */
export interface ConsentRecord {
  id: string;
  docType: ConsentDocType;
  docVersion: string;
  agreed: boolean;
  agreedAt: string;
  method: ConsentMethod;
}

export interface SubmitConsentsBody {
  method: ConsentMethod;
  items: { docType: ConsentDocType; agreed: boolean }[];
}

/**
 * 동의 게이트 판정 결과.
 *
 * `versions` 는 `users.consentVersions` 캐시입니다 — 원본은 append-only `consents` 컬렉션이고,
 * 이건 **매 진입마다 컬렉션을 쿼리하지 않기 위한** 사본입니다.
 */
export interface ConsentStatus {
  /** 필수 항목이 전부 최신 버전으로 동의됐는가. false 면 편집·발행을 막습니다 */
  satisfied: boolean;
  /** 아직 동의가 필요한 필수 문서 */
  missing: ConsentDocType[];
  versions: Partial<Record<ConsentDocType, string>>;
}

/**
 * 아직 동의가 필요한 필수 문서를 계산합니다.
 *
 * 버전 문자열을 **정확히 일치**로 비교합니다 — 대소 비교를 하면 버전을 되돌린 경우
 * (잘못 올려 롤백) 재동의가 트리거되지 않습니다.
 */
export function missingConsents(
  versions: Partial<Record<ConsentDocType, string>> | null | undefined,
): ConsentDocType[] {
  return REQUIRED_CONSENTS.filter((t) => versions?.[t] !== DOC_VERSIONS[t]);
}

export function toConsentStatus(
  versions: Partial<Record<ConsentDocType, string>> | null | undefined,
): ConsentStatus {
  const missing = missingConsents(versions);
  return { satisfied: missing.length === 0, missing, versions: versions ?? {} };
}
