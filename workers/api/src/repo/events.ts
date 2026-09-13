/**
 * 이벤트 로그 저장소 (D1).
 *
 * 로그는 **서비스보다 덜 중요합니다.** 그래서 이 파일의 모든 함수는 D1 바인딩이 없거나
 * 쿼리가 실패해도 예외를 밖으로 던지지 않습니다 — 로그가 죽어서 청첩장이 안 열리면
 * 로그를 넣은 게 손해입니다.
 *
 * 보관은 14일입니다. `purgeOld` 를 Cron 이 매일 부릅니다.
 */

/** 하나의 이벤트. 클라이언트가 보내는 필드 + 서버가 채우는 필드 */
export interface EventRow {
  at: string;
  /**
   * 'click' | 'error' | 'view' — 화면에서 보낸 것.
   * 'admin' — **서버가 직접 남긴 관리 이력**(방명록 숨김·삭제·초기화, 청첩장 삭제).
   *   지운 사람이 로그를 보내지 않아도 남아야 하므로 워커가 씁니다 (`audit()` in index.ts).
   */
  kind: string;
  name: string;
  ok: number | null;
  detail: string | null;
  invitationId: string | null;
  slug: string | null;
  session: string | null;
  uid: string | null;
  path: string | null;
  ua: string | null;
  ipHash: string | null;
}

export const RETENTION_DAYS = 14;

/** 한 번에 받는 최대 건수 — 클라이언트가 배치로 보냅니다 */
export const MAX_BATCH = 20;

const INSERT = `INSERT INTO events
  (at, kind, name, ok, detail, invitation_id, slug, session, uid, path, ua, ip_hash)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

export async function insertEvents(db: D1Database | undefined, rows: EventRow[]): Promise<number> {
  if (!db || rows.length === 0) return 0;
  try {
    const stmt = db.prepare(INSERT);
    await db.batch(
      rows.map((r) =>
        stmt.bind(
          r.at,
          r.kind,
          r.name,
          r.ok,
          r.detail,
          r.invitationId,
          r.slug,
          r.session,
          r.uid,
          r.path,
          r.ua,
          r.ipHash,
        ),
      ),
    );
    return rows.length;
  } catch (e) {
    console.error('[api] 이벤트 로그 저장 실패', e);
    return 0;
  }
}

/**
 * 같은 사람이 최근에 이 동작을 몇 번 했나 — **속도 제한용**.
 *
 * **왜 KV 가 아니라 D1 인가:** KV 는 하루 1,000 쓰기 한도라 카운터로 쓰면 문의 스팸 한 번에
 * 한도를 태웁니다 (`repo/forms.ts` 주석에 같은 판단이 있습니다). D1 은 무료 10만 쓰기/일이고,
 * 우리는 어차피 모든 접수를 이벤트로 남기므로 **추가 쓰기 없이 세기만** 하면 됩니다.
 *
 * 🔴 D1 이 없거나 실패하면 **0 을 돌려줍니다 = 통과**입니다. 로그가 죽었다고 문의 창구를
 *    닫지 않습니다. 스팸 방어는 Turnstile·허니팟까지 네 겹이라 한 겹이 빠져도 무너지지 않습니다.
 */
export async function countRecent(
  db: D1Database | undefined,
  input: { name: string; ipHash: string; withinMinutes: number },
): Promise<number> {
  if (!db || !input.ipHash) return 0;
  const since = new Date(Date.now() - input.withinMinutes * 60 * 1000).toISOString();
  try {
    const row = await db
      .prepare('SELECT COUNT(*) AS n FROM events WHERE name = ? AND ip_hash = ? AND at >= ?')
      .bind(input.name, input.ipHash, since)
      .first<{ n: number }>();
    return row?.n ?? 0;
  } catch (e) {
    console.error('[api] 속도 제한 조회 실패 — 통과시킵니다', e);
    return 0;
  }
}

/** 운영자 화면이 읽어가는 한 줄. 저장 컬럼 중 화면에 쓰는 것만 담습니다 */
export interface EventView {
  at: string;
  kind: string;
  name: string;
  ok: number | null;
  detail: string | null;
  invitationId: string | null;
  path: string | null;
}

/**
 * 한 회원의 최근 활동.
 *
 * `0001_events.sql` 이 이 테이블을 만든 이유가 바로 이 조회입니다 —
 * "문의가 들어왔을 때 누가 언제 무엇을 눌러 무엇이 실패했나" 를 바로 훑는 것.
 * 지금까지는 볼 화면이 없어 D1 콘솔에서 SQL 로만 봤습니다.
 *
 * 🔴 `ip_hash` · `ua` 는 **고르지 않습니다.** 운영자가 회원의 접속 흔적을 추적할 이유가
 *    없습니다. 그 컬럼들은 속도 제한과 침해 대응에 쓰는 것이고, 화면에 필요 없는 값은
 *    응답에 담지 않는 것이 이 콘솔의 원칙입니다.
 *
 * 실패하면 빈 배열입니다 — 로그가 죽었다고 회원 상세가 안 열리면 안 됩니다.
 */
export async function listForUid(
  db: D1Database | undefined,
  uid: string,
  opts: { onlyErrors?: boolean; limit?: number } = {},
): Promise<EventView[]> {
  if (!db || !uid) return [];
  const limit = Math.min(Math.max(opts.limit ?? 200, 1), 500);

  // 실패만 보기: ok = 0 이거나 kind = 'error'. 둘 다 봐야 합니다 —
  // 화면이 보내는 오류는 kind='error' 이고, 서버가 남기는 실패는 ok=0 입니다.
  const filter = opts.onlyErrors ? ' AND (ok = 0 OR kind = ?)' : '';
  const sql = `SELECT at, kind, name, ok, detail, invitation_id, path
    FROM events WHERE uid = ?${filter} ORDER BY at DESC LIMIT ${limit}`;

  try {
    const stmt = db.prepare(sql);
    const bound = opts.onlyErrors ? stmt.bind(uid, 'error') : stmt.bind(uid);
    const res = await bound.all<{
      at: string;
      kind: string;
      name: string;
      ok: number | null;
      detail: string | null;
      invitation_id: string | null;
      path: string | null;
    }>();

    return (res.results ?? []).map((r) => ({
      at: r.at,
      kind: r.kind,
      name: r.name,
      ok: r.ok,
      detail: r.detail,
      invitationId: r.invitation_id,
      path: r.path,
    }));
  } catch (e) {
    console.error('[api] 회원 활동 로그 조회 실패', e);
    return [];
  }
}

/** 보관 기간이 지난 로그를 지웁니다. Cron 이 매일 부릅니다 */
export async function purgeOld(db: D1Database | undefined, days = RETENTION_DAYS): Promise<number> {
  if (!db) return 0;
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  try {
    const res = await db.prepare('DELETE FROM events WHERE at < ?').bind(cutoff).run();
    const deleted = res.meta?.changes ?? 0;
    console.log(`[api] 이벤트 로그 정리 — ${cutoff} 이전 ${deleted}건 삭제`);
    return deleted;
  } catch (e) {
    console.error('[api] 이벤트 로그 정리 실패', e);
    return 0;
  }
}
