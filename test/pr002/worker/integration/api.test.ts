import { describe, expect, it } from "vitest";
import { createHarness, singleCellGrid } from "../support/harness";

interface SessionBody {
  session_id: string;
  expires_at: string;
}

interface MapBody {
  id: string;
  cells: Array<{ x: number; y: number; cell_type: string; floor_connection: number | null }>;
}

interface RobotBody {
  id: string;
  status: string;
  capabilities: Array<{ id: string; capability: string }>;
}

interface JobBody {
  id: string;
  status: string;
  total_cells: number;
  cleaned_cells: number;
}

async function openSession(h: ReturnType<typeof createHarness>): Promise<string> {
  const result = await h.call<SessionBody>("GET", "/api/");
  expect(result.status).toBe(200);
  expect(result.sessionCookie).toBe(result.body.session_id);
  return result.body.session_id;
}

function mapPayload(grid: unknown[] = singleCellGrid(), website = ""): Record<string, unknown> {
  return {
    map_name: "Test Map",
    floor_number: 1,
    width: 3,
    height: 3,
    grid_data: grid,
    website,
  };
}

function robotPayload(capabilities: string[] = ["BASIC_CLEAN"]): Record<string, unknown> {
  return {
    robot_name: "RoboA",
    model_type: "STANDARD",
    capabilities,
    website: "",
  };
}

describe("session", () => {
  it("GET /api issues a session id, expiry and cookie", async () => {
    const h = createHarness();
    const result = await h.call<SessionBody>("GET", "/api");

    expect(result.status).toBe(200);
    expect(result.body.session_id).toMatch(/^[0-9a-f-]{36}$/);
    expect(result.body.expires_at).toBe("2026-06-07T00:00:00.000Z");
    expect(result.sessionCookie).toBe(result.body.session_id);
  });

  it("always sets the session cookie with HttpOnly, SameSite=Lax and Secure", async () => {
    const h = createHarness();
    const result = await h.call<SessionBody>("GET", "/api");

    expect(result.setCookieHeader).not.toBeNull();
    expect(result.setCookieHeader).toContain("HttpOnly");
    expect(result.setCookieHeader).toContain("SameSite=Lax");
    expect(result.setCookieHeader).toContain("Secure");
  });

  it("returns 401 for map reads without a valid session", async () => {
    const h = createHarness();
    const owner = await openSession(h);
    const created = await h.call<MapBody>("POST", "/api/maps", {
      body: mapPayload(),
      sessionId: owner,
    });
    expect(created.status).toBe(201);

    const anonymous = await h.call("GET", `/api/maps/${created.body.id}`);
    expect(anonymous.status).toBe(401);

    const stale = await h.call("GET", `/api/maps/${created.body.id}`, {
      sessionId: "fake-session-id",
    });
    expect(stale.status).toBe(401);
    expect(stale.body).toEqual({ detail: "Invalid or expired session" });
  });

  it("treats conflicting session_id cookies as no session (401), in either order", async () => {
    const h = createHarness();
    const owner = await openSession(h);
    const created = await h.call<MapBody>("POST", "/api/maps", {
      body: mapPayload(),
      sessionId: owner,
    });

    const fakeFirst = await h.call("GET", `/api/maps/${created.body.id}`, {
      cookieHeader: `session_id=fake-session-id; session_id=${owner}`,
    });
    expect(fakeFirst.status).toBe(401);

    const validFirst = await h.call("GET", `/api/maps/${created.body.id}`, {
      cookieHeader: `session_id=${owner}; session_id=fake-session-id`,
    });
    expect(validFirst.status).toBe(401);

    const sameValueTwice = await h.call("GET", `/api/maps/${created.body.id}`, {
      cookieHeader: `session_id=${owner}; session_id=${owner}`,
    });
    expect(sameValueTwice.status).toBe(200);
  });

  it("does not expose another session's map (404)", async () => {
    const h = createHarness();
    const owner = await openSession(h);
    const other = await openSession(h);
    const created = await h.call<MapBody>("POST", "/api/maps", {
      body: mapPayload(),
      sessionId: owner,
    });

    const result = await h.call("GET", `/api/maps/${created.body.id}`, { sessionId: other });
    expect(result.status).toBe(404);
    expect(result.body).toEqual({ detail: "Map not found" });
  });

  it("issues a new session cookie when a write arrives with an expired session", async () => {
    const h = createHarness();
    const stale = await openSession(h);
    h.advanceMs(25 * 60 * 60 * 1000);

    const result = await h.call<MapBody>("POST", "/api/maps", {
      body: mapPayload(),
      sessionId: stale,
    });
    expect(result.status).toBe(201);
    expect(result.sessionCookie).not.toBeNull();
    expect(result.sessionCookie).not.toBe(stale);

    const readBack = await h.call<MapBody>("GET", `/api/maps/${result.body.id}`, {
      sessionId: result.sessionCookie,
    });
    expect(readBack.status).toBe(200);
  });
});

describe("maps", () => {
  it("creates a map and returns its cells", async () => {
    const h = createHarness();
    const sessionId = await openSession(h);
    const result = await h.call<MapBody>("POST", "/api/maps", {
      body: mapPayload(),
      sessionId,
    });

    expect(result.status).toBe(201);
    expect(result.body.cells).toHaveLength(9);
    expect(result.body.cells.find((c) => c.cell_type === "CHARGING_STATION")).toMatchObject({
      x: 1,
      y: 1,
    });
  });

  it("rejects a honeypot value with 400 before any other check", async () => {
    const h = createHarness();
    const sessionId = await openSession(h);
    const result = await h.call("POST", "/api/maps", {
      body: mapPayload([], "bot_value"),
      sessionId,
    });
    expect(result.status).toBe(400);
    expect(result.body).toEqual({ detail: "Bot detected" });
  });

  it("rejects an unknown cell type with 422", async () => {
    const h = createHarness();
    const sessionId = await openSession(h);
    const grid = [{ x: 0, y: 0, cell_type: "INVALID", floor_connection: null }];
    const result = await h.call("POST", "/api/maps", { body: mapPayload(grid), sessionId });
    expect(result.status).toBe(422);
  });

  it("rejects a stair cell without floor_connection with 422", async () => {
    const h = createHarness();
    const sessionId = await openSession(h);
    const grid = [{ x: 0, y: 0, cell_type: "STAIR_UP", floor_connection: null }];
    const result = await h.call("POST", "/api/maps", { body: mapPayload(grid), sessionId });
    expect(result.status).toBe(422);
  });

  it("rejects malformed JSON and out-of-range sizes with 422", async () => {
    const h = createHarness();
    const sessionId = await openSession(h);

    const malformed = await h.call("POST", "/api/maps", { rawBody: "{", sessionId });
    expect(malformed.status).toBe(422);

    const tooSmall = await h.call("POST", "/api/maps", {
      body: { ...mapPayload(), width: 1 },
      sessionId,
    });
    expect(tooSmall.status).toBe(422);
  });
});

describe("robots", () => {
  it("creates an IDLE robot with its capabilities", async () => {
    const h = createHarness();
    const sessionId = await openSession(h);
    const result = await h.call<RobotBody>("POST", "/api/robots", {
      body: robotPayload(["BASIC_CLEAN", "EDGE_CLEAN"]),
      sessionId,
    });

    expect(result.status).toBe(201);
    expect(result.body.status).toBe("IDLE");
    expect(result.body.capabilities.map((c) => c.capability)).toEqual([
      "BASIC_CLEAN",
      "EDGE_CLEAN",
    ]);
  });

  it("rejects an unknown model type and an unknown capability with 422", async () => {
    const h = createHarness();
    const sessionId = await openSession(h);

    const badModel = await h.call("POST", "/api/robots", {
      body: { ...robotPayload(), model_type: "SUPER_BOT" },
      sessionId,
    });
    expect(badModel.status).toBe(422);

    const badCap = await h.call("POST", "/api/robots", {
      body: robotPayload(["FLYING"]),
      sessionId,
    });
    expect(badCap.status).toBe(422);
    expect(badCap.body).toEqual({ detail: "Invalid capability: FLYING" });
  });

  it("returns 404 for a position before any job has started", async () => {
    const h = createHarness();
    const sessionId = await openSession(h);
    const robot = await h.call<RobotBody>("POST", "/api/robots", {
      body: robotPayload(),
      sessionId,
    });

    const result = await h.call("GET", `/api/robots/${robot.body.id}/position`, { sessionId });
    expect(result.status).toBe(404);
    expect(result.body).toEqual({ detail: "No position data yet" });
  });
});

describe("jobs", () => {
  async function setup(h: ReturnType<typeof createHarness>, capabilities = ["BASIC_CLEAN"]) {
    const sessionId = await openSession(h);
    const map = await h.call<MapBody>("POST", "/api/maps", { body: mapPayload(), sessionId });
    const robot = await h.call<RobotBody>("POST", "/api/robots", {
      body: robotPayload(capabilities),
      sessionId,
    });
    return { sessionId, mapId: map.body.id, robotId: robot.body.id };
  }

  it("creates a PENDING job and rejects unknown job types with 422", async () => {
    const h = createHarness();
    const { sessionId, mapId, robotId } = await setup(h);

    const created = await h.call<JobBody>("POST", "/api/jobs", {
      body: { robot_id: robotId, map_id: mapId, job_type: "FULL_CLEAN", priority: 5, website: "" },
      sessionId,
    });
    expect(created.status).toBe(201);
    expect(created.body.status).toBe("PENDING");

    const unknown = await h.call("POST", "/api/jobs", {
      body: { robot_id: robotId, map_id: mapId, job_type: "DANCE", website: "" },
      sessionId,
    });
    expect(unknown.status).toBe(422);
  });

  it("returns 422 when the robot lacks the capability for the job", async () => {
    const h = createHarness();
    const { sessionId, mapId, robotId } = await setup(h, ["BASIC_CLEAN"]);

    const result = await h.call("POST", "/api/jobs", {
      body: { robot_id: robotId, map_id: mapId, job_type: "SPOT_CLEAN", website: "" },
      sessionId,
    });
    expect(result.status).toBe(422);
  });

  it("returns 404 for another session's robot and 409 when the robot is busy", async () => {
    const h = createHarness();
    const { sessionId, mapId, robotId } = await setup(h);
    const other = await openSession(h);

    const foreign = await h.call("POST", "/api/jobs", {
      body: { robot_id: robotId, map_id: mapId, job_type: "FULL_CLEAN", website: "" },
      sessionId: other,
    });
    expect(foreign.status).toBe(404);

    const first = await h.call<JobBody>("POST", "/api/jobs", {
      body: { robot_id: robotId, map_id: mapId, job_type: "FULL_CLEAN", website: "" },
      sessionId,
    });
    await h.call("POST", `/api/jobs/${first.body.id}/start`, { sessionId });

    const busy = await h.call("POST", "/api/jobs", {
      body: { robot_id: robotId, map_id: mapId, job_type: "FULL_CLEAN", website: "" },
      sessionId,
    });
    expect(busy.status).toBe(409);
    expect(busy.body).toEqual({ detail: "Robot is not IDLE (current: RUNNING)" });
  });

  it("refuses a second start with 409 and reports the current status", async () => {
    const h = createHarness();
    const { sessionId, mapId, robotId } = await setup(h);
    const job = await h.call<JobBody>("POST", "/api/jobs", {
      body: { robot_id: robotId, map_id: mapId, job_type: "FULL_CLEAN", website: "" },
      sessionId,
    });

    const started = await h.call<{ job_id: string; started_at: string }>(
      "POST",
      `/api/jobs/${job.body.id}/start`,
      { sessionId },
    );
    expect(started.status).toBe(200);
    expect(started.body.started_at).toBe("2026-06-06T00:00:00.000Z");

    const again = await h.call("POST", `/api/jobs/${job.body.id}/start`, { sessionId });
    expect(again.status).toBe(409);
    expect(again.body).toEqual({ detail: "Job cannot be started (status: IN_PROGRESS)" });
  });

  it("returns 404 when starting or cancelling an unknown job", async () => {
    const h = createHarness();
    const sessionId = await openSession(h);

    const start = await h.call("POST", "/api/jobs/missing/start", { sessionId });
    expect(start.status).toBe(404);
    expect(start.body).toEqual({ detail: "Job not found" });

    const cancel = await h.call("POST", "/api/jobs/missing/cancel", { sessionId });
    expect(cancel.status).toBe(404);
  });

  it("returns history newest first with coverage percentage", async () => {
    const h = createHarness();
    const { sessionId, mapId, robotId } = await setup(h);
    const job = await h.call<JobBody>("POST", "/api/jobs", {
      body: { robot_id: robotId, map_id: mapId, job_type: "FULL_CLEAN", website: "" },
      sessionId,
    });
    await h.call("POST", `/api/jobs/${job.body.id}/start`, { sessionId });
    h.advanceMs(1000);

    const history = await h.call<{
      history: Array<{ id: string; status: string; coverage_pct: number }>;
      total: number;
    }>("GET", "/api/jobs/history", { sessionId });

    expect(history.status).toBe(200);
    expect(history.body.total).toBe(1);
    expect(history.body.history[0]).toMatchObject({
      id: job.body.id,
      status: "COMPLETED",
      coverage_pct: 100,
    });
  });
});
