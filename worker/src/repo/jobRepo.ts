import { JOB_CANCELLABLE_STATUSES, JOB_STATUS } from "../config/constants";
import { buildMultiRowInsert, chunk, ROWS_PER_INSERT } from "./sql";

export interface JobRow {
  id: string;
  session_id: string;
  robot_id: string;
  map_id: string;
  job_type: string;
  status: string;
  priority: number;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  total_cells: number;
  cleaned_cells: number;
}

export interface JobEventRow {
  id: string;
  job_id: string;
  event_type: string;
  cell_x: number | null;
  cell_y: number | null;
  occurred_at: string;
}

export interface RobotPositionRow {
  id: string;
  job_id: string;
  robot_id: string;
  x: number;
  y: number;
  cell_type: string;
  updated_at: string;
}

const JOB_COLUMNS =
  "id, session_id, robot_id, map_id, job_type, status, priority, scheduled_at, started_at, completed_at, total_cells, cleaned_cells";

const EVENT_COLUMNS = ["id", "job_id", "event_type", "cell_x", "cell_y", "occurred_at"] as const;

export async function insertJob(db: D1Database, job: JobRow): Promise<void> {
  await db
    .prepare(
      `INSERT INTO jobs (${JOB_COLUMNS}) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)`,
    )
    .bind(
      job.id,
      job.session_id,
      job.robot_id,
      job.map_id,
      job.job_type,
      job.status,
      job.priority,
      job.scheduled_at,
      job.started_at,
      job.completed_at,
      job.total_cells,
      job.cleaned_cells,
    )
    .run();
}

export async function findJobForSession(
  db: D1Database,
  jobId: string,
  sessionId: string,
): Promise<JobRow | null> {
  return db
    .prepare(`SELECT ${JOB_COLUMNS} FROM jobs WHERE id = ?1 AND session_id = ?2`)
    .bind(jobId, sessionId)
    .first<JobRow>();
}

export async function findJobById(db: D1Database, jobId: string): Promise<JobRow | null> {
  return db.prepare(`SELECT ${JOB_COLUMNS} FROM jobs WHERE id = ?1`).bind(jobId).first<JobRow>();
}

/** セッションの全ジョブを開始時刻の降順で返す（Python 版と同じ並び）。 */
export async function listSessionJobs(db: D1Database, sessionId: string): Promise<JobRow[]> {
  const result = await db
    .prepare(`SELECT ${JOB_COLUMNS} FROM jobs WHERE session_id = ?1 ORDER BY started_at DESC`)
    .bind(sessionId)
    .all<JobRow>();
  return result.results;
}

/** 実行中のジョブ。sessionId を省略すると全セッションが対象（ESP32 の送風制御用）。 */
export async function listInProgressJobs(
  db: D1Database,
  sessionId: string | null,
): Promise<JobRow[]> {
  if (sessionId === null) {
    const result = await db
      .prepare(`SELECT ${JOB_COLUMNS} FROM jobs WHERE status = ?1`)
      .bind(JOB_STATUS.IN_PROGRESS)
      .all<JobRow>();
    return result.results;
  }
  const result = await db
    .prepare(`SELECT ${JOB_COLUMNS} FROM jobs WHERE status = ?1 AND session_id = ?2`)
    .bind(JOB_STATUS.IN_PROGRESS, sessionId)
    .all<JobRow>();
  return result.results;
}

export async function countInProgressJobs(db: D1Database): Promise<number> {
  const row = await db
    .prepare("SELECT COUNT(*) AS count FROM jobs WHERE status = ?1")
    .bind(JOB_STATUS.IN_PROGRESS)
    .first<{ count: number }>();
  return row?.count ?? 0;
}

/** PENDING のジョブを IN_PROGRESS に切り替える。別リクエストが先に開始していれば false。 */
export async function claimPendingJob(
  db: D1Database,
  jobId: string,
  startedIso: string,
  totalCells: number,
): Promise<boolean> {
  const result = await db
    .prepare(
      "UPDATE jobs SET status = ?2, started_at = ?3, total_cells = ?4 WHERE id = ?1 AND status = ?5",
    )
    .bind(jobId, JOB_STATUS.IN_PROGRESS, startedIso, totalCells, JOB_STATUS.PENDING)
    .run();
  return result.meta.changes === 1;
}

/** 清掃済みマス数を単調増加で更新する（並行する更新で値を戻さない）。 */
export async function advanceCleanedCells(
  db: D1Database,
  jobId: string,
  cleanedCells: number,
): Promise<void> {
  await db
    .prepare("UPDATE jobs SET cleaned_cells = ?2 WHERE id = ?1 AND cleaned_cells < ?2")
    .bind(jobId, cleanedCells)
    .run();
}

export async function completeJob(
  db: D1Database,
  jobId: string,
  completedIso: string,
  cleanedCells: number,
): Promise<void> {
  await db
    .prepare(
      "UPDATE jobs SET status = ?2, completed_at = ?3, cleaned_cells = ?4 WHERE id = ?1 AND status = ?5",
    )
    .bind(jobId, JOB_STATUS.COMPLETED, completedIso, cleanedCells, JOB_STATUS.IN_PROGRESS)
    .run();
}

/** キャンセル可能な状態のジョブだけを CANCELLED にする。更新できたら true。 */
export async function cancelJobIfCancellable(db: D1Database, jobId: string): Promise<boolean> {
  // ?1 = CANCELLED, ?2 = jobId, ?3 以降 = キャンセル可能な状態。
  const placeholders = JOB_CANCELLABLE_STATUSES.map((_, index) => `?${index + 3}`);
  const result = await db
    .prepare(`UPDATE jobs SET status = ?1 WHERE id = ?2 AND status IN (${placeholders.join(", ")})`)
    .bind(JOB_STATUS.CANCELLED, jobId, ...JOB_CANCELLABLE_STATUSES)
    .run();
  return result.meta.changes === 1;
}

/** 同じ ID のイベントは 1 回だけ記録する（並行する経過反映で重複させないため INSERT OR IGNORE）。 */
export async function insertJobEvents(
  db: D1Database,
  events: readonly JobEventRow[],
): Promise<void> {
  if (events.length === 0) {
    return;
  }
  const statements = chunk(events, ROWS_PER_INSERT).map((rows) => {
    const insert = buildMultiRowInsert(
      "INSERT OR IGNORE",
      "job_events",
      EVENT_COLUMNS,
      rows.map((event) => [
        event.id,
        event.job_id,
        event.event_type,
        event.cell_x,
        event.cell_y,
        event.occurred_at,
      ]),
    );
    return db.prepare(insert.sql).bind(...insert.params);
  });
  await db.batch(statements);
}

/** ロボットの位置を 1 ジョブ 1 行で UPSERT する。古い時刻では上書きしない。 */
export async function upsertRobotPosition(
  db: D1Database,
  position: RobotPositionRow,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO robot_positions (id, job_id, robot_id, x, y, cell_type, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
       ON CONFLICT (job_id, robot_id) DO UPDATE SET
         x = excluded.x,
         y = excluded.y,
         cell_type = excluded.cell_type,
         updated_at = excluded.updated_at
       WHERE excluded.updated_at >= robot_positions.updated_at`,
    )
    .bind(
      position.id,
      position.job_id,
      position.robot_id,
      position.x,
      position.y,
      position.cell_type,
      position.updated_at,
    )
    .run();
}

export async function findLatestRobotPosition(
  db: D1Database,
  robotId: string,
): Promise<RobotPositionRow | null> {
  return db
    .prepare(
      `SELECT id, job_id, robot_id, x, y, cell_type, updated_at
       FROM robot_positions WHERE robot_id = ?1 ORDER BY updated_at DESC LIMIT 1`,
    )
    .bind(robotId)
    .first<RobotPositionRow>();
}
