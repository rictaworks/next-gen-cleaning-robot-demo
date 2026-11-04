import { LOG_EVENT } from "../config/constants";
import { logInfo } from "../logger";
import { purgeAllData } from "../repo/resetRepo";
import { toIso } from "../util/time";

/** JST 03:00（UTC 18:00）の日次リセット。全データを削除し、リセット履歴を 1 件残す。 */
export async function runDailyReset(db: D1Database, now: Date): Promise<void> {
  const resetId = crypto.randomUUID();
  await purgeAllData(db, resetId, toIso(now));
  logInfo(LOG_EVENT.DAILY_RESET_COMPLETED, { resetId });
}
