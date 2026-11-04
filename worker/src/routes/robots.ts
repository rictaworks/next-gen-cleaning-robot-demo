import type { Hono } from "hono";
import { CAPABILITIES, LOG_EVENT, MODEL_TYPES, ROBOT_STATUS } from "../config/constants";
import { MESSAGES } from "../config/messages";
import { sessionExpireHours } from "../env";
import { ensureSession, readSessionCookie, requireSession, writeSessionCookie } from "../http/session";
import { logInfo } from "../logger";
import { toPositionResponse, toRobotResponse } from "../presenters/responses";
import { findLatestRobotPosition } from "../repo/jobRepo";
import {
  findRobotForSession,
  insertRobotWithCapabilities,
  listRobotCapabilities,
  type RobotCapabilityRow,
  type RobotRow,
} from "../repo/robotRepo";
import { rejectFilledHoneypot } from "../security/honeypot";
import { settleSessionJobs } from "../services/simulationService";
import { notFound, unprocessable } from "../util/errors";
import { toIso } from "../util/time";
import { parseRobotCreateRequest, readJsonBody } from "../validation/requests";
import type { AppEnv } from "../types";

export function registerRobotRoutes(app: Hono<AppEnv>): void {
  // POST /api/robots: ロボットを登録する（状態は IDLE）。
  app.post("/api/robots", async (c) => {
    const request = parseRobotCreateRequest(await readJsonBody(c.req.raw));
    rejectFilledHoneypot(request.website);

    if (!(MODEL_TYPES as readonly string[]).includes(request.model_type)) {
      throw unprocessable(MESSAGES.invalidModelType(request.model_type));
    }
    for (const capability of request.capabilities) {
      if (!(CAPABILITIES as readonly string[]).includes(capability)) {
        throw unprocessable(MESSAGES.invalidCapability(capability));
      }
    }

    const db = c.env.DB;
    const now = c.get("now");
    const { session, created } = await ensureSession(
      db,
      readSessionCookie(c),
      now,
      sessionExpireHours(c.env),
    );
    if (created) {
      writeSessionCookie(c, session.id);
    }

    const robot: RobotRow = {
      id: crypto.randomUUID(),
      session_id: session.id,
      robot_name: request.robot_name,
      model_type: request.model_type,
      status: ROBOT_STATUS.IDLE,
      created_at: toIso(now),
    };
    const capabilities: RobotCapabilityRow[] = request.capabilities.map((capability) => ({
      id: crypto.randomUUID(),
      robot_id: robot.id,
      capability,
    }));

    await insertRobotWithCapabilities(db, robot, capabilities);
    logInfo(LOG_EVENT.ROBOT_CREATED, { robotId: robot.id, capabilityCount: capabilities.length });
    return c.json(toRobotResponse(robot, capabilities), 201);
  });

  // GET /api/robots/:id/position: 最新の位置を返す（ポーリング用）。
  app.get("/api/robots/:id/position", async (c) => {
    const db = c.env.DB;
    const now = c.get("now");
    const session = await requireSession(db, readSessionCookie(c), now);
    const robot = await findRobotForSession(db, c.req.param("id"), session.id);
    if (robot === null) {
      throw notFound(MESSAGES.robotNotFound);
    }

    await settleSessionJobs(db, session.id, now);
    const position = await findLatestRobotPosition(db, robot.id);
    if (position === null) {
      throw notFound(MESSAGES.noPositionData);
    }
    return c.json(toPositionResponse(position));
  });
}
