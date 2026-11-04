import type { Hono } from "hono";
import { FAN_COMMAND } from "../config/constants";
import { MESSAGES } from "../config/messages";
import { countInProgressJobs } from "../repo/jobRepo";
import { findLatestSensorReading, upsertSensorReading } from "../repo/esp32Repo";
import { settleAllJobs } from "../services/simulationService";
import { toIso } from "../util/time";
import { parseSensorRequest, readJsonBody } from "../validation/requests";
import type { AppEnv } from "../types";

export function registerEsp32Routes(app: Hono<AppEnv>): void {
  // GET /api/esp32/command: 送風ファンの指令。清掃ジョブが実行中なら on。
  app.get("/api/esp32/command", async (c) => {
    const db = c.env.DB;
    const now = c.get("now");
    await settleAllJobs(db, now);
    const running = await countInProgressJobs(db);
    return c.json({ fan: running > 0 ? FAN_COMMAND.ON : FAN_COMMAND.OFF });
  });

  // POST /api/esp32/sensor: 温湿度センサーの値を保存する。
  app.post("/api/esp32/sensor", async (c) => {
    const request = parseSensorRequest(await readJsonBody(c.req.raw));
    await upsertSensorReading(c.env.DB, {
      temperature: request.temperature,
      humidity: request.humidity,
      updated_at: toIso(c.get("now")),
    });
    return c.body(null, 204);
  });

  // GET /api/esp32/sensor: 最新のセンサー値。未受信なら 503。
  app.get("/api/esp32/sensor", async (c) => {
    const reading = await findLatestSensorReading(c.env.DB);
    if (reading === null) {
      return c.json({ detail: MESSAGES.noSensorData }, 503);
    }
    return c.json({
      temperature: reading.temperature,
      humidity: reading.humidity,
      updated_at: reading.updated_at,
    });
  });
}
