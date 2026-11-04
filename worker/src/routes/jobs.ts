import type { Hono } from "hono";
import { JOB_CANCELLABLE_STATUSES, JOB_STATUS, LOG_EVENT, ROBOT_STATUS } from "../config/constants";
import { MESSAGES } from "../config/messages";
import { readSessionCookie, requireSession } from "../http/session";
import { logInfo } from "../logger";
import { toJobHistoryItem, toJobResponse } from "../presenters/responses";
import {
  findJobForSession,
  insertJob,
  listSessionJobs,
  type JobRow,
} from "../repo/jobRepo";
import { findMapForSession, listMapCells } from "../repo/mapRepo";
import { findRobotForSession, listRobotCapabilities } from "../repo/robotRepo";
import { rejectFilledHoneypot } from "../security/honeypot";
import {
  cancelRunningJob,
  settleSessionJobs,
  startJob,
} from "../services/simulationService";
import { conflict, notFound, unprocessable } from "../util/errors";
import { toIso } from "../util/time";
import { isJobType, validateJobCapabilityMatrix } from "../domain/terrain";
import { parseJobCreateRequest, readJsonBody } from "../validation/requests";
import type { AppEnv } from "../types";

export function registerJobRoutes(app: Hono<AppEnv>): void {
  // POST /api/jobs: 清掃ジョブを作成する（状態は PENDING）。
  app.post("/api/jobs", async (c) => {
    const request = parseJobCreateRequest(await readJsonBody(c.req.raw));
    rejectFilledHoneypot(request.website);
    if (!isJobType(request.job_type)) {
      throw unprocessable(MESSAGES.invalidJobType(request.job_type));
    }

    const db = c.env.DB;
    const now = c.get("now");
    const session = await requireSession(db, readSessionCookie(c), now);
    await settleSessionJobs(db, session.id, now);

    const robot = await findRobotForSession(db, request.robot_id, session.id);
    if (robot === null) {
      throw notFound(MESSAGES.robotNotFound);
    }
    if (robot.status !== ROBOT_STATUS.IDLE) {
      throw conflict(MESSAGES.robotNotIdle(robot.status));
    }

    const map = await findMapForSession(db, request.map_id, session.id);
    if (map === null) {
      throw notFound(MESSAGES.mapNotFound);
    }

    const cells = await listMapCells(db, map.id);
    const capabilities = await listRobotCapabilities(db, robot.id);
    validateJobCapabilityMatrix(
      request.job_type,
      capabilities.map((cap) => cap.capability),
      new Set(cells.map((cell) => cell.cell_type)),
    );

    const job: JobRow = {
      id: crypto.randomUUID(),
      session_id: session.id,
      robot_id: robot.id,
      map_id: map.id,
      job_type: request.job_type,
      status: JOB_STATUS.PENDING,
      priority: request.priority,
      scheduled_at: request.scheduled_at,
      started_at: null,
      completed_at: null,
      total_cells: 0,
      cleaned_cells: 0,
    };
    await insertJob(db, job);
    logInfo(LOG_EVENT.JOB_CREATED, { jobId: job.id, jobType: job.job_type });
    return c.json(toJobResponse(job), 201);
  });

  // POST /api/jobs/:id/start: ジョブを開始する（経路計算 → 進行の記録を開始）。
  app.post("/api/jobs/:id/start", async (c) => {
    const db = c.env.DB;
    const now = c.get("now");
    const session = await requireSession(db, readSessionCookie(c), now);
    await settleSessionJobs(db, session.id, now);

    const job = await findJobForSession(db, c.req.param("id"), session.id);
    if (job === null) {
      throw notFound(MESSAGES.jobNotFound);
    }
    if (job.status !== JOB_STATUS.PENDING) {
      throw conflict(MESSAGES.jobNotStartable(job.status));
    }

    const started = await startJob(db, job, now);
    if (!started) {
      const latest = await findJobForSession(db, job.id, session.id);
      throw conflict(MESSAGES.jobNotStartable((latest ?? job).status));
    }
    return c.json({ job_id: job.id, started_at: toIso(now) });
  });

  // POST /api/jobs/:id/cancel: 実行中・待機中・一時停止中のジョブをキャンセルする。
  app.post("/api/jobs/:id/cancel", async (c) => {
    const db = c.env.DB;
    const now = c.get("now");
    const session = await requireSession(db, readSessionCookie(c), now);
    await settleSessionJobs(db, session.id, now);

    const job = await findJobForSession(db, c.req.param("id"), session.id);
    if (job === null) {
      throw notFound(MESSAGES.jobNotFound);
    }
    if (!JOB_CANCELLABLE_STATUSES.includes(job.status)) {
      throw conflict(MESSAGES.jobNotCancellable(job.status));
    }

    const cancelled = await cancelRunningJob(db, job);
    if (!cancelled) {
      const latest = await findJobForSession(db, job.id, session.id);
      throw conflict(MESSAGES.jobNotCancellable((latest ?? job).status));
    }

    const finalJob = await findJobForSession(db, job.id, session.id);
    return c.json({
      cancelled: true,
      job_id: job.id,
      cleaned_cells: finalJob?.cleaned_cells ?? job.cleaned_cells,
    });
  });

  // GET /api/jobs/history: セッション内の清掃履歴（開始時刻の降順）。
  app.get("/api/jobs/history", async (c) => {
    const db = c.env.DB;
    const now = c.get("now");
    const session = await requireSession(db, readSessionCookie(c), now);
    await settleSessionJobs(db, session.id, now);

    const jobs = await listSessionJobs(db, session.id);
    const history = jobs.map(toJobHistoryItem);
    return c.json({ history, total: history.length });
  });
}
