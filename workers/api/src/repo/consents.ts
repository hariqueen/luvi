/**
 * 동의 이력 — **append-only**.
 *
 * 🔴 **기존 레코드를 수정하거나 삭제하지 마세요.** 철회도 `agreed: false` 인 **새 레코드**로
 *    남깁니다. 동의 이력은 "언제 무엇에 동의했는가"를 증명하는 기록이고, 덮어쓸 수 있으면
 *    증거로서 의미가 없습니다. 그래서 이 파일에 update·delete 함수가 없습니다
 *    (탈퇴 시 일괄 삭제만 예외 — `deleteAllForUser`).
 *
 * ─── 두 곳에 쓰는 이유 ──────────────────────────────────────────
 *
 * 원본은 `consents` 컬렉션이고, `users/{uid}.consentVersions` 는 **판정용 사본**입니다.
 * 재동의 게이트는 로그인·화면 진입마다 판정해야 하는데, 매번 `consents` 를 쿼리하면
 * Firestore 읽기가 진입 수만큼 늘어납니다. 사본은 문서 하나를 읽으면 끝입니다.
 *
 * 둘은 **같은 commit 으로** 씁니다 — 따로 쓰면 한쪽만 성공했을 때 "이력은 있는데 게이트가
 * 계속 뜨는" 또는 그 반대 상태가 됩니다.
 */
import {
  DOC_VERSIONS,
  isRequiredConsent,
  type ConsentDocType,
  type ConsentMethod,
  type ConsentRecord,
} from '@luvi/schema';
import {
  decodeFields,
  encode,
  fieldPath,
  fsTimestamp,
  where,
  type Firestore,
  type FsWrite,
} from '../lib/firestore';

const COLLECTION = 'consents';

/** 컬렉션 스캔 상한. 한 사람이 이 이상 동의를 누를 일은 없습니다 */
const HISTORY_LIMIT = 200;

export interface RecordConsentInput {
  uid: string;
  items: { docType: ConsentDocType; agreed: boolean }[];
  method: ConsentMethod;
  /** 기존 방명록·이벤트와 같은 HMAC 방식. 원문 IP 는 저장하지 않습니다 */
  ipHash: string | null;
  userAgent: string | null;
}

/**
 * 동의를 기록하고 `users.consentVersions` 사본을 갱신합니다.
 *
 * 사본 갱신은 **점 표기 마스크**(`consentVersions.terms`)로 항목별로 씁니다.
 * `consentVersions` 전체를 마스크에 넣으면 맵이 통째로 교체되어, 마케팅 하나만 철회했을 때
 * 약관·개인정보 동의가 함께 지워집니다.
 */
export async function recordConsents(
  db: Firestore,
  input: RecordConsentInput,
): Promise<ConsentRecord[]> {
  const now = new Date().toISOString();
  const writes: FsWrite[] = [];
  const records: ConsentRecord[] = [];

  // 사본에 넣을 값. 동의 → 버전 문자열, 철회 → 필드 삭제(마스크에만 넣고 값은 안 보냄)
  const versionFields: Record<string, ReturnType<typeof encode>> = {};
  const versionMask: string[] = [];

  for (const item of input.items) {
    const docVersion = DOC_VERSIONS[item.docType];

    // 필수 항목을 `agreed: false` 로 기록하면 "동의하지 않은 회원" 이 생깁니다.
    // 그 상태를 허용할 거라면 탈퇴 처리를 해야지 이력만 남길 일이 아닙니다.
    if (!item.agreed && isRequiredConsent(item.docType)) {
      throw new Error(`필수 동의 항목은 철회할 수 없습니다: ${item.docType}`);
    }

    const id = crypto.randomUUID();
    writes.push({
      update: {
        name: db.docName(`${COLLECTION}/${id}`),
        fields: {
          uid: encode(input.uid),
          docType: encode(item.docType),
          docVersion: encode(docVersion),
          agreed: encode(item.agreed),
          agreedAt: fsTimestamp(now),
          ipHash: encode(input.ipHash),
          userAgent: encode(input.userAgent),
          method: encode(input.method),
        },
      },
      // 같은 ID 가 이미 있으면 덮어쓰지 않습니다 — append-only 의 마지막 방어선
      currentDocument: { exists: false },
    });

    records.push({
      id,
      docType: item.docType,
      docVersion,
      agreed: item.agreed,
      agreedAt: now,
      method: input.method,
    });

    const path = fieldPath('consentVersions', item.docType);
    versionMask.push(path);
    if (item.agreed) versionFields[item.docType] = encode(docVersion);
    // 철회는 값을 넣지 않습니다 — 마스크에만 있으면 그 필드가 삭제됩니다
  }

  if (versionMask.length > 0) {
    writes.push({
      update: {
        name: db.docName(`users/${input.uid}`),
        fields: { consentVersions: { mapValue: { fields: versionFields } } },
      },
      updateMask: { fieldPaths: versionMask },
    });
  }

  await db.commit(writes);
  return records;
}

/**
 * 내 동의 이력 — 최신순.
 *
 * `orderBy` 를 쓰지 않고 워커에서 정렬합니다. `where uid ==` 와 `orderBy agreedAt` 을 함께
 * 걸면 복합 색인이 필요해지고, 색인 배포는 별도 작업입니다 (`lib/firestore.ts` 원칙 4).
 */
export async function listConsents(db: Firestore, uid: string): Promise<ConsentRecord[]> {
  const docs = await db.query('', {
    from: [{ collectionId: COLLECTION }],
    where: where('uid', 'EQUAL', uid),
    limit: HISTORY_LIMIT,
  });

  return docs
    .map((doc) => {
      const f = decodeFields(doc.fields);
      return {
        id: doc.id,
        docType: f.docType as ConsentDocType,
        docVersion: typeof f.docVersion === 'string' ? f.docVersion : '',
        agreed: f.agreed === true,
        agreedAt: typeof f.agreedAt === 'string' ? f.agreedAt : doc.createTime,
        method: f.method as ConsentMethod,
      } satisfies ConsentRecord;
    })
    .sort((a, b) => (a.agreedAt < b.agreedAt ? 1 : a.agreedAt > b.agreedAt ? -1 : 0));
}

/**
 * 탈퇴 시 해당 uid 의 동의 이력을 전부 지웁니다.
 *
 * append-only 원칙의 유일한 예외입니다 — 탈퇴하면 이력을 남길 근거(회원)가 사라지므로
 * 보관이 오히려 파기 의무 위반이 됩니다. **몇 건을 지웠는지 돌려주어 검증에 씁니다.**
 */
export async function deleteAllForUser(db: Firestore, uid: string): Promise<number> {
  let deleted = 0;

  // 한 번에 다 못 지울 수 있으므로(상한) 비워질 때까지 반복합니다
  for (;;) {
    const docs = await db.query('', {
      from: [{ collectionId: COLLECTION }],
      where: where('uid', 'EQUAL', uid),
      limit: HISTORY_LIMIT,
    });
    if (docs.length === 0) return deleted;

    await db.commit(docs.map((doc) => ({ delete: db.docName(`${COLLECTION}/${doc.id}`) })));
    deleted += docs.length;

    if (docs.length < HISTORY_LIMIT) return deleted;
  }
}
