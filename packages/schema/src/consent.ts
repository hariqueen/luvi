/**
 * 약관·개인정보 동의 — 문서 버전과 동의 이력.
 *
 * **왜 여기(공용 스키마)에 두는가:** 동의 게이트는 서버(편집·발행 차단)와 화면(모달 표시)이
 * **같은 판정을 내려야** 합니다. 버전 상수나 판정 함수가 양쪽에 따로 있으면 한쪽만 올리는
 * 순간 "화면은 통과시켰는데 서버가 막는" 상태가 됩니다.
 *
 * 🔴 **문서를 개정하면 `DOC_VERSIONS` 의 해당 값을 올리세요.** 문서 파일만 고치고 버전을 안
 *    올리면 화면이 옛 버전을 계속 보여줍니다 (`Legal.tsx` 가 이 값을 현행본으로 씁니다).
 *
 * 🔴 **그리고 그 개정이 경미한지 판단해 `ACCEPTED_PAST_VERSIONS` 를 함께 손보세요.**
 *    버전만 올리면 기존 회원 **전원**이 재동의 대상이 되고, `CONSENT_ENFORCED` 가 켜져 있으면
 *    그때까지 편집·발행이 막힙니다. 예식을 앞둔 이용자에게는 이것 자체가 사고입니다.
 *
 * 문서 원본: `docs/legal/privacy-{version}.md` · `docs/legal/terms-{version}.md`
 */

export type ConsentDocType = 'terms' | 'privacy' | 'age14' | 'marketing';

/**
 * **현재 시행 중인** 문서 버전. 새로 받는 동의는 이 버전으로 기록되고, `Legal.tsx` 는 이 값을
 * 현행본으로 보여줍니다. 그래서 **공고일이 아니라 시행일에** 올려야 합니다 — 공고만 하고
 * 아직 시행되지 않은 문서를 현행본으로 두면, 그 사이 가입자가 시행 전 문서에 동의한 것으로 남습니다.
 *
 * 🟡 **예정된 변경: 2026-09-23 (privacy 1.1.0 시행일)에 `privacy` 를 '1.1.0' 으로 올립니다.**
 *    문서는 이미 `docs/legal/privacy-1.1.0.md` 에 있고 `Legal.tsx` 에 예고본으로 등록돼 있습니다.
 *    `ACCEPTED_PAST_VERSIONS.privacy` 에 '1.0.0' 이 이미 들어 있으므로, 올려도 기존 회원에게
 *    재동의가 걸리지 않습니다. 올리는 것을 잊으면 **개정본이 시행되지 않은 채 문의 기능만 나갑니다.**
 */
export const DOC_VERSIONS: Record<ConsentDocType, string> = {
  terms: '1.0.0',
  privacy: '1.0.0',
  age14: '1.0.0',
  marketing: '1.0.0',
};

/**
 * 재동의 없이 계속 유효한 것으로 인정하는 **과거** 버전.
 *
 * **왜 필요한가:** 개정에는 두 종류가 있습니다. 이용자의 권리나 기존 수집 범위를 바꾸는
 * **중대한 개정**은 다시 동의를 받아야 합니다. 반면 신규 **선택** 기능에만 적용되는 수집 항목이
 * 늘거나, 오타·연락처가 바뀌는 **경미한 개정**까지 전원을 멈춰 세우는 것은 과합니다.
 * 그 둘을 구분할 수단이 없으면 결국 "고쳐야 하는데 고칠 수 없는" 문서가 됩니다.
 *
 * **현행 버전은 언제나 유효하므로 여기에 적지 않습니다.** 여기에는 옛 버전만 남깁니다.
 * 중대한 개정일 때는 이 배열을 **비워서** 전원 재동의를 트리거합니다.
 *
 * · privacy 1.0.0 → 1.1.0 (2026-09-23 시행): 고객센터 문의 기능 신설. 늘어난 항목은
 *   **이용자가 문의를 접수할 때만** 적용되고, 접수 화면에서 개별 동의를 따로 받습니다.
 *   기존 회원의 기존 이용에는 달라지는 것이 없어 재동의 대상에서 제외합니다.
 */
export const ACCEPTED_PAST_VERSIONS: Record<ConsentDocType, readonly string[]> = {
  terms: [],
  privacy: ['1.0.0'],
  age14: [],
  marketing: [],
};

/**
 * 문서 버전 비교. 조각별 숫자로 봅니다 — 문자열 비교로는 `1.10.0` 이 `1.9.0` 보다 작습니다.
 *
 * ⚠️ **동의 판정에는 쓰지 않습니다.** 거기서는 목록 멤버십으로 정확히 일치시킵니다
 * (버전을 잘못 올려 되돌렸을 때 재동의가 안 걸리는 문제를 피하려고). 이 함수는
 * "이 기능이 방침에 적혀 있는가" 처럼 **순서를 따져야 할 때만** 씁니다.
 */
export function compareDocVersion(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i += 1) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

/** 이 버전으로 받아둔 동의가 지금도 유효한가 */
export function isAcceptedVersion(docType: ConsentDocType, version: string | undefined): boolean {
  if (!version) return false;
  return version === DOC_VERSIONS[docType] || ACCEPTED_PAST_VERSIONS[docType].includes(version);
}

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
 * 버전 문자열을 **정확히 일치**로 비교합니다 (목록 안에 있는지) — 대소 비교(semver)를 하면
 * 버전을 되돌린 경우(잘못 올려 롤백) 재동의가 트리거되지 않습니다. 인정할 옛 버전은
 * `ACCEPTED_PAST_VERSIONS` 에 **손으로 적습니다.** 자동으로 넓히지 않습니다.
 */
export function missingConsents(
  versions: Partial<Record<ConsentDocType, string>> | null | undefined,
): ConsentDocType[] {
  return REQUIRED_CONSENTS.filter((t) => !isAcceptedVersion(t, versions?.[t]));
}

export function toConsentStatus(
  versions: Partial<Record<ConsentDocType, string>> | null | undefined,
): ConsentStatus {
  const missing = missingConsents(versions);
  return { satisfied: missing.length === 0, missing, versions: versions ?? {} };
}
