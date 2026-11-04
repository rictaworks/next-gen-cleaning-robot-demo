export interface SessionRow {
  id: string;
  created_at: string;
  expires_at: string;
}

/** 有効期限内のセッションを返す。無ければ null。 */
export async function findActiveSession(
  db: D1Database,
  sessionId: string,
  nowIso: string,
): Promise<SessionRow | null> {
  return db
    .prepare("SELECT id, created_at, expires_at FROM sessions WHERE id = ?1 AND expires_at > ?2")
    .bind(sessionId, nowIso)
    .first<SessionRow>();
}

export async function insertSession(db: D1Database, session: SessionRow): Promise<void> {
  await db
    .prepare("INSERT INTO sessions (id, created_at, expires_at) VALUES (?1, ?2, ?3)")
    .bind(session.id, session.created_at, session.expires_at)
    .run();
}
