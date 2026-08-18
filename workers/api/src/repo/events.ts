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

export interface ListEventsQuery {
  limit: number;
  /** 지점 이름으로 좁히기 (예: 'kakao_share') */
  name?: string;
  /** 실패만 보기 */
  failedOnly?: boolean;
  slug?: string;
}

export async function listEvents(
  db: D1Database | undefined,
  q: ListEventsQuery,
): Promise<EventRow[]> {
  if (!db) return [];
  const where: string[] = [];
  const binds: unknown[] = [];
  if (q.name) {
    where.push('name = ?');
    binds.push(q.name);
  }
  if (q.slug) {
    where.push('slug = ?');
    binds.push(q.slug);
  }
  if (q.failedOnly) where.push('ok = 0');

  const sql = `SELECT at, kind, name, ok, detail, invitation_id, slug, session, uid, path, ua, ip_hash
    FROM events
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY at DESC, id DESC
    LIMIT ?`;

  try {
    const res = await db
      .prepare(sql)
      .bind(...binds, q.limit)
      .all<Record<string, unknown>>();
    return (res.results ?? []).map((r) => ({
      at: String(r.at ?? ''),
      kind: String(r.kind ?? ''),
      name: String(r.name ?? ''),
      ok: r.ok === null || r.ok === undefined ? null : Number(r.ok),
      detail: r.detail === null || r.detail === undefined ? null : String(r.detail),
      invitationId: r.invitation_id ? String(r.invitation_id) : null,
      slug: r.slug ? String(r.slug) : null,
      session: r.session ? String(r.session) : null,
      uid: r.uid ? String(r.uid) : null,
      path: r.path ? String(r.path) : null,
      ua: r.ua ? String(r.ua) : null,
      ipHash: r.ip_hash ? String(r.ip_hash) : null,
    }));
  } catch (e) {
    console.error('[api] 이벤트 로그 조회 실패', e);
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
