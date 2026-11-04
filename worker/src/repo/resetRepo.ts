import { PURGE_TABLES } from "../config/constants";

/**
 * 日次リセット。子テーブルから順に全データを削除し、リセット履歴を 1 件だけ残す（Python 版の drop_all + ResetLog と同じ）。
 * ESP32 のセンサー値は対象外（Python 版でもプロセス内に保持し、DB リセットでは消えない）。
 */
export async function purgeAllData(
  db: D1Database,
  resetLogId: string,
  resetIso: string,
): Promise<void> {
  const statements: D1PreparedStatement[] = PURGE_TABLES.map((table) =>
    db.prepare(`DELETE FROM ${table}`),
  );
  statements.push(db.prepare("DELETE FROM reset_logs"));
  statements.push(
    db.prepare("INSERT INTO reset_logs (id, reset_at) VALUES (?1, ?2)").bind(resetLogId, resetIso),
  );
  await db.batch(statements);
}
