/**
 * Firebase Authentication 계정 삭제 — Identity Toolkit REST.
 *
 * **왜 REST 인가:** Admin SDK 는 Node 전용이라 Workers 에서 동작하지 않습니다.
 * Firestore 를 REST 로 부르는 것(`lib/firestore.ts`)과 같은 이유입니다.
 *
 * **왜 필요한가:** 탈퇴하면서 Firestore 문서만 지우고 Auth 계정을 남기면, 그 사람은
 * 여전히 로그인할 수 있고 로그인하는 순간 `upsertUser` 가 사용자 문서를 **다시 만듭니다.**
 * 탈퇴가 되돌려지는 셈입니다.
 *
 * 🔴 **스코프가 다릅니다.** Firestore 용 `datastore` 토큰으로 부르면 403 입니다.
 *    `SCOPE_IDENTITY` 로 받은 토큰을 써야 합니다.
 */
import { getAccessToken, SCOPE_IDENTITY } from './googleAuth';
import type { ServiceAccount } from './jwt';

export class IdentityToolkitError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

/**
 * 계정을 삭제합니다.
 *
 * **이미 없는 계정은 성공으로 봅니다.** 탈퇴는 중간에 실패하면 재시도하는 구조인데
 * (`DELETE /api/account`), 두 번째 시도에서 `USER_NOT_FOUND` 로 멈추면 그 뒤 단계가
 * 영영 실행되지 않습니다. "없음" 은 우리가 원하는 최종 상태이므로 실패가 아닙니다.
 */
export async function deleteAuthAccount(
  sa: ServiceAccount,
  projectId: string,
  uid: string,
): Promise<void> {
  const token = await getAccessToken(sa, SCOPE_IDENTITY);

  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:delete`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ localId: uid }),
    },
  );

  if (res.ok) return;

  const body = (await res.json().catch(() => null)) as {
    error?: { message?: string; status?: string };
  } | null;
  const reason = body?.error?.message ?? '';

  // 멱등성: 이미 지워진 계정은 성공으로 취급합니다 (위 주석 참고)
  if (res.status === 400 && reason.includes('USER_NOT_FOUND')) return;

  throw new IdentityToolkitError(
    `Auth 계정 삭제 실패 (${res.status} ${reason})`.trim(),
    res.status,
  );
}
