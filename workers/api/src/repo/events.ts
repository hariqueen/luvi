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
