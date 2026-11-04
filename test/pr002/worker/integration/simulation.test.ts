import { describe, expect, it } from "vitest";
import { runDailyReset } from "../../../../worker/src/services/dailyResetService";
import { corridorGrid, createHarness } from "../support/harness";

interface SessionBody {
  session_id: string;
}

interface MapBody {
  id: string;
}

interface RobotBody {
  id: string;
}

interface JobBody {
  id: string;
}

interface HistoryBody {
  history: Array<{
    id: string;
    status: string;
    total_cells: number;
    cleaned_cells: number;
    coverage_pct: number;
  }>;
}

interface PositionBody {
  x: number;
  y: number;
  cell_type: string;
  job_id: string;
}

const CORRIDOR_LENGTH = 5;

/** 5 マスの通路マップ、ロボット（BASIC_CLEAN）、FULL_CLEAN ジョブを用意する。 */
async function prepareCorridorJob(h: ReturnType<typeof createHarness>) {
  const session = await h.call<SessionBody>("GET", "/api");
  const sessionId = session.body.session_id;
  const map = await h.call<MapBody>("POST", "/api/maps", {
    body: {
      map_name: "Corridor",
      floor_number: 1,
      width: CORRIDOR_LENGTH,
      height: 2,
      grid_data: corridorGrid(CORRIDOR_LENGTH),
      website: "",
    },
    sessionId,
  });
  const robot = await h.call<RobotBody>("POST", "/api/robots", {
    body: { robot_name: "RoboA", model_type: "STANDARD", capabilities: ["BASIC_CLEAN"], website: "" },
    sessionId,
  });
  const job = await h.call<JobBody>("POST", "/api/jobs", {
    body: {
      robot_id: robot.body.id,
      map_id: map.body.id,
      job_type: "FULL_CLEAN",
      priority: 5,
      website: "",
    },
    sessionId,
  });
  return { sessionId, robotId: robot.body.id, jobId: job.body.id };
}

describe("time-based cleaning simulation", () => {
  it("advances one cell every 500 ms and reports the position while running", async () => {
    const h = createHarness();
    const { sessionId, robotId, jobId } = await prepareCorridorJob(h);
    await h.call("POST", `/api/jobs/${jobId}/start`, { sessionId });

    const atStart = await h.call<PositionBody>("GET", `/api/robots/${robotId}/position`, {
      sessionId,
    });
    expect(atStart.body).toMatchObject({ x: 0, y: 0, cell_type: "CHARGING_STATION" });

    h.advanceMs(1000);
    const later = await h.call<PositionBody>("GET", `/api/robots/${robotId}/position`, {
      sessionId,
    });
    expect(later.body).toMatchObject({ x: 2, y: 0, cell_type: "FLOOR", job_id: jobId });

    const history = await h.call<HistoryBody>("GET", "/api/jobs/history", { sessionId });
    expect(history.body.history[0]).toMatchObject({
      status: "IN_PROGRESS",
      total_cells: CORRIDOR_LENGTH,
      cleaned_cells: 3,
    });
  });

  it("completes after total x 500 ms, frees the robot and reaches 100 percent coverage", async () => {
    const h = createHarness();
    const { sessionId, robotId, jobId } = await prepareCorridorJob(h);
    await h.call("POST", `/api/jobs/${jobId}/start`, { sessionId });

    h.advanceMs(CORRIDOR_LENGTH * 500);
    const history = await h.call<HistoryBody>("GET", "/api/jobs/history", { sessionId });
    expect(history.body.history[0]).toMatchObject({
      status: "COMPLETED",
      cleaned_cells: CORRIDOR_LENGTH,
      coverage_pct: 100,
    });

    const position = await h.call<PositionBody>("GET", `/api/robots/${robotId}/position`, {
      sessionId,
    });
    expect(position.body).toMatchObject({ x: CORRIDOR_LENGTH - 1, y: 0 });

    const nextJob = await h.call<JobBody>("POST", "/api/jobs", {
      body: { robot_id: robotId, map_id: await mapIdOf(h, sessionId), job_type: "FULL_CLEAN", website: "" },
      sessionId,
    });
    expect(nextJob.status).toBe(201);
  });

  it("does not allow cancelling a finished job", async () => {
    const h = createHarness();
    const { sessionId, jobId } = await prepareCorridorJob(h);
    await h.call("POST", `/api/jobs/${jobId}/start`, { sessionId });
    h.advanceMs(CORRIDOR_LENGTH * 500);

    const cancel = await h.call("POST", `/api/jobs/${jobId}/cancel`, { sessionId });
    expect(cancel.status).toBe(409);
    expect(cancel.body).toEqual({ detail: "Job cannot be cancelled (status: COMPLETED)" });
  });

  it("keeps the cells cleaned before cancellation and frees the robot", async () => {
    const h = createHarness();
    const { sessionId, robotId, jobId } = await prepareCorridorJob(h);
    await h.call("POST", `/api/jobs/${jobId}/start`, { sessionId });
    h.advanceMs(1000);

    const cancel = await h.call<{ cancelled: boolean; cleaned_cells: number }>(
      "POST",
      `/api/jobs/${jobId}/cancel`,
      { sessionId },
    );
    expect(cancel.status).toBe(200);
    expect(cancel.body).toEqual({ cancelled: true, job_id: jobId, cleaned_cells: 3 });

    h.advanceMs(5000);
    const history = await h.call<HistoryBody>("GET", "/api/jobs/history", { sessionId });
    expect(history.body.history[0]).toMatchObject({ status: "CANCELLED", cleaned_cells: 3 });

    const robotIdle = await h.call("POST", "/api/jobs", {
      body: { robot_id: robotId, map_id: await mapIdOf(h, sessionId), job_type: "FULL_CLEAN", website: "" },
      sessionId,
    });
    expect(robotIdle.status).toBe(201);
  });

  it("writes each progress record only once however often the job is read", async () => {
    const h = createHarness();
    const { sessionId, jobId } = await prepareCorridorJob(h);
    await h.call("POST", `/api/jobs/${jobId}/start`, { sessionId });
    h.advanceMs(CORRIDOR_LENGTH * 500);

    for (let read = 0; read < 3; read += 1) {
      await h.call("GET", "/api/jobs/history", { sessionId });
    }

    const rows = await h.db
      .prepare("SELECT COUNT(*) AS count FROM job_events WHERE job_id = ?1")
      .bind(jobId)
      .first<{ count: number }>();
    // JOB_STARTED + CELL_CLEANED x 5 + JOB_COMPLETED
    expect(rows?.count).toBe(CORRIDOR_LENGTH + 2);
  });

  it("completes an empty job immediately", async () => {
    const h = createHarness();
    const session = await h.call<SessionBody>("GET", "/api");
    const sessionId = session.body.session_id;
    const map = await h.call<MapBody>("POST", "/api/maps", {
      body: {
        map_name: "Walls",
        floor_number: 1,
        width: 2,
        height: 2,
        grid_data: [{ x: 0, y: 0, cell_type: "WALL", floor_connection: null }],
        website: "",
      },
      sessionId,
    });
    const robot = await h.call<RobotBody>("POST", "/api/robots", {
      body: { robot_name: "R", model_type: "SLIM", capabilities: ["BASIC_CLEAN"], website: "" },
      sessionId,
    });
    const job = await h.call<JobBody>("POST", "/api/jobs", {
      body: { robot_id: robot.body.id, map_id: map.body.id, job_type: "FULL_CLEAN", website: "" },
      sessionId,
    });

    const started = await h.call("POST", `/api/jobs/${job.body.id}/start`, { sessionId });
    expect(started.status).toBe(200);
    const history = await h.call<HistoryBody>("GET", "/api/jobs/history", { sessionId });
    expect(history.body.history[0]).toMatchObject({
      status: "COMPLETED",
      total_cells: 0,
      coverage_pct: 0,
    });
  });
});

async function mapIdOf(
  h: ReturnType<typeof createHarness>,
  sessionId: string,
): Promise<string> {
  const row = await h.db
    .prepare("SELECT id FROM maps WHERE session_id = ?1 LIMIT 1")
    .bind(sessionId)
    .first<{ id: string }>();
  if (row === null) {
    throw new Error("test setup: map not found");
  }
  return row.id;
}

describe("ESP32 fan command and sensor", () => {
  it("turns the fan on while a job runs and off after it completes", async () => {
    const h = createHarness();
    const { sessionId, jobId } = await prepareCorridorJob(h);

    expect((await h.call<{ fan: string }>("GET", "/api/esp32/command")).body.fan).toBe("off");

    await h.call("POST", `/api/jobs/${jobId}/start`, { sessionId });
    expect((await h.call<{ fan: string }>("GET", "/api/esp32/command")).body.fan).toBe("on");

    h.advanceMs(CORRIDOR_LENGTH * 500);
    expect((await h.call<{ fan: string }>("GET", "/api/esp32/command")).body.fan).toBe("off");
  });

  it("returns 503 until a sensor value arrives, then the latest value", async () => {
    const h = createHarness();

    const empty = await h.call("GET", "/api/esp32/sensor");
    expect(empty.status).toBe(503);
    expect(empty.body).toEqual({ detail: "No sensor data available" });

    const posted = await h.call("POST", "/api/esp32/sensor", {
      body: { temperature: 25.5, humidity: 40 },
    });
    expect(posted.status).toBe(204);

    h.advanceMs(5000);
    await h.call("POST", "/api/esp32/sensor", { body: { temperature: 26, humidity: 41 } });

    const latest = await h.call<{ temperature: number; humidity: number; updated_at: string }>(
      "GET",
      "/api/esp32/sensor",
    );
    expect(latest.status).toBe(200);
    expect(latest.body).toEqual({
      temperature: 26,
      humidity: 41,
      updated_at: "2026-06-06T00:00:05.000Z",
    });
  });

  it("rejects a sensor payload without both values with 422", async () => {
    const h = createHarness();
    const result = await h.call("POST", "/api/esp32/sensor", { body: { temperature: 25 } });
    expect(result.status).toBe(422);
  });
});

describe("daily reset (JST 03:00)", () => {
  it("removes every session and job, logs the reset and keeps the sensor value", async () => {
    const h = createHarness();
    const { sessionId, jobId } = await prepareCorridorJob(h);
    await h.call("POST", `/api/jobs/${jobId}/start`, { sessionId });
    await h.call("POST", "/api/esp32/sensor", { body: { temperature: 20, humidity: 30 } });

    await runDailyReset(h.db as unknown as D1Database, h.now());

    for (const table of ["sessions", "maps", "map_cells", "robots", "jobs", "job_events", "robot_positions"]) {
      const row = await h.db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).first<{ count: number }>();
      expect(row?.count, table).toBe(0);
    }
    const logs = await h.db.prepare("SELECT COUNT(*) AS count FROM reset_logs").first<{ count: number }>();
    expect(logs?.count).toBe(1);

    const sensor = await h.call("GET", "/api/esp32/sensor");
    expect(sensor.status).toBe(200);
  });

  it("treats the old cookie as a new visitor after the reset", async () => {
    const h = createHarness();
    const { sessionId, robotId } = await prepareCorridorJob(h);
    await runDailyReset(h.db as unknown as D1Database, h.now());

    const position = await h.call("GET", `/api/robots/${robotId}/position`, { sessionId });
    expect(position.status).toBe(401);

    const fresh = await h.call<MapBody>("POST", "/api/maps", {
      body: {
        map_name: "After reset",
        floor_number: 1,
        width: 2,
        height: 2,
        grid_data: [{ x: 0, y: 0, cell_type: "FLOOR", floor_connection: null }],
        website: "",
      },
      sessionId,
    });
    expect(fresh.status).toBe(201);
    expect(fresh.sessionCookie).not.toBe(sessionId);
  });
});
