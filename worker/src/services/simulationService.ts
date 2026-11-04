// 清掃ジョブの進行（Python 版 backend/services/simulation.py の置き換え）。
//
// Workers にはプロセス常駐のバックグラウンドタスクが無いため、開始時刻からの経過時間で進捗を算出し、
// ジョブを参照・操作するタイミングで D1 へ反映する（settle）。反映は冪等（同じ ID のイベントは 1 回だけ、
// 進捗・位置は単調増加）なので、並行するリクエストが同時に反映しても結果は一つに定まる。

import {
  EVENT_TYPE,
  JOB_STATUS,
  LOG_EVENT,
  ROBOT_STATUS,
  STAIR_CELL_TYPES,
  STEP_INTERVAL_MS,
} from "../config/constants";
import { buildGrid, calculatePath, cellKey, type GridCell } from "../domain/pathfinder";
import { computeProgress } from "../domain/progress";
import { toJobType } from "../domain/terrain";
import {
  advanceCleanedCells,
  cancelJobIfCancellable,
  claimPendingJob,
  completeJob,
  findJobById,
  insertJobEvents,
  listInProgressJobs,
  upsertRobotPosition,
  type JobEventRow,
  type JobRow,
} from "../repo/jobRepo";
import { listMapCells } from "../repo/mapRepo";
import { setRobotStatus } from "../repo/robotRepo";
import { logInfo } from "../logger";
import { parseIso, toIso } from "../util/time";

function eventTypeForCell(cellType: string): string {
  if ((STAIR_CELL_TYPES as readonly string[]).includes(cellType)) {
    return EVENT_TYPE.STAIR_TRAVERSAL;
  }
  if (cellType === "NARROW_GAP") {
    return EVENT_TYPE.NARROW_GAP_TRAVERSAL;
  }
  return EVENT_TYPE.CELL_CLEANED;
}

function requireCellType(grid: ReadonlyMap<string, GridCell>, x: number, y: number): string {
  const cell = grid.get(cellKey(x, y));
  if (cell === undefined) {
    throw new Error(`Path cell is missing from map grid: (${x},${y})`);
  }
  return cell.cell_type;
}

/** ジョブを開始する。PENDING から IN_PROGRESS へ切り替えられたら true。 */
export async function startJob(db: D1Database, job: JobRow, now: Date): Promise<boolean> {
  const cells = await listMapCells(db, job.map_id);
  const path = calculatePath(cells, toJobType(job.job_type));
  const startedIso = toIso(now);

  const claimed = await claimPendingJob(db, job.id, startedIso, path.length);
  if (!claimed) {
    return false;
  }

  await setRobotStatus(db, job.robot_id, ROBOT_STATUS.RUNNING);
  await insertJobEvents(db, [
    {
      id: `${job.id}:start`,
      job_id: job.id,
      event_type: EVENT_TYPE.JOB_STARTED,
      cell_x: null,
      cell_y: null,
      occurred_at: startedIso,
    },
  ]);
  logInfo(LOG_EVENT.JOB_STARTED, { jobId: job.id, totalCells: path.length });

  const started = await findJobById(db, job.id);
  if (started !== null) {
    await settleJob(db, started, now);
  }
  return true;
}

/** 現在時刻までの進捗を D1 へ反映する。実行中でないジョブには何もしない。 */
export async function settleJob(db: D1Database, job: JobRow, now: Date): Promise<void> {
  if (job.status !== JOB_STATUS.IN_PROGRESS || job.started_at === null) {
    return;
  }

  const cells = await listMapCells(db, job.map_id);
  const grid = buildGrid(cells);
  const path = calculatePath(cells, toJobType(job.job_type));
  const total = path.length;
  const startedMs = parseIso(job.started_at).getTime();

  const progress = computeProgress(now.getTime() - startedMs, total);
  const previous = job.cleaned_cells;
  const target = Math.max(previous, progress.reachedSteps);

  if (target > previous) {
    const events: JobEventRow[] = [];
    for (let step = previous; step < target; step += 1) {
      const cell = path[step];
      if (cell === undefined) {
        throw new Error(`Path step is out of range: job=${job.id} step=${step}`);
      }
      events.push({
        id: `${job.id}:cell:${step}`,
        job_id: job.id,
        event_type: eventTypeForCell(requireCellType(grid, cell.x, cell.y)),
        cell_x: cell.x,
        cell_y: cell.y,
        occurred_at: toIso(new Date(startedMs + step * STEP_INTERVAL_MS)),
      });
    }
    await insertJobEvents(db, events);
    await advanceCleanedCells(db, job.id, target);

    const last = path[target - 1];
    if (last !== undefined) {
      await upsertRobotPosition(db, {
        id: crypto.randomUUID(),
        job_id: job.id,
        robot_id: job.robot_id,
        x: last.x,
        y: last.y,
        cell_type: requireCellType(grid, last.x, last.y),
        updated_at: toIso(new Date(startedMs + (target - 1) * STEP_INTERVAL_MS)),
      });
    }
  }

  if (progress.finished) {
    const completedAt = toIso(new Date(startedMs + total * STEP_INTERVAL_MS));
    await completeJob(db, job.id, completedAt, total);
    await setRobotStatus(db, job.robot_id, ROBOT_STATUS.IDLE);
    await insertJobEvents(db, [
      {
        id: `${job.id}:complete`,
        job_id: job.id,
        event_type: EVENT_TYPE.JOB_COMPLETED,
        cell_x: null,
        cell_y: null,
        occurred_at: completedAt,
      },
    ]);
    logInfo(LOG_EVENT.JOB_COMPLETED, { jobId: job.id, cleanedCells: total });
  }
}

/** 指定セッションの実行中ジョブを現在時刻まで進める。 */
export async function settleSessionJobs(db: D1Database, sessionId: string, now: Date): Promise<void> {
  const jobs = await listInProgressJobs(db, sessionId);
  for (const job of jobs) {
    await settleJob(db, job, now);
  }
}

/** 全セッションの実行中ジョブを現在時刻まで進める（ESP32 の送風指令の判定用）。 */
export async function settleAllJobs(db: D1Database, now: Date): Promise<void> {
  const jobs = await listInProgressJobs(db, null);
  for (const job of jobs) {
    await settleJob(db, job, now);
  }
}

/**
 * 実行中（または一時停止中）のジョブをキャンセルする。
 * 更新できたら true。すでに完了・キャンセル済みなどで更新できなければ false。
 */
export async function cancelRunningJob(db: D1Database, job: JobRow): Promise<boolean> {
  const wasRunning = job.status === JOB_STATUS.IN_PROGRESS || job.status === JOB_STATUS.PAUSED;
  const cancelled = await cancelJobIfCancellable(db, job.id);
  if (!cancelled) {
    return false;
  }
  if (wasRunning) {
    await setRobotStatus(db, job.robot_id, ROBOT_STATUS.IDLE);
  }
  logInfo(LOG_EVENT.JOB_CANCELLED, { jobId: job.id, wasRunning });
  return true;
}
