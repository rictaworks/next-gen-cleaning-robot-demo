import { describe, expect, it } from "vitest";
import { HttpError } from "../../../../worker/src/util/errors";
import {
  parseJobCreateRequest,
  parseMapCreateRequest,
  parseRobotCreateRequest,
  parseSensorRequest,
} from "../../../../worker/src/validation/requests";

function expectUnprocessable(action: () => unknown): void {
  try {
    action();
  } catch (error) {
    expect(error).toBeInstanceOf(HttpError);
    expect((error as HttpError).status).toBe(422);
    return;
  }
  throw new Error("expected a 422 HttpError");
}

const validMap = {
  map_name: "1F",
  floor_number: 1,
  width: 3,
  height: 3,
  grid_data: [{ x: 0, y: 0, cell_type: "WALL" }],
};

describe("parseMapCreateRequest", () => {
  it("accepts a valid body and defaults website and floor_connection", () => {
    const parsed = parseMapCreateRequest(validMap);
    expect(parsed.website).toBe("");
    expect(parsed.grid_data[0]?.floor_connection).toBeNull();
  });

  it("rejects an empty map name", () => {
    expectUnprocessable(() => parseMapCreateRequest({ ...validMap, map_name: "" }));
  });

  it("rejects a map size outside 2..50", () => {
    expectUnprocessable(() => parseMapCreateRequest({ ...validMap, width: 1 }));
    expectUnprocessable(() => parseMapCreateRequest({ ...validMap, height: 51 }));
  });

  it("rejects negative coordinates and non-array grid data", () => {
    expectUnprocessable(() =>
      parseMapCreateRequest({ ...validMap, grid_data: [{ x: -1, y: 0, cell_type: "FLOOR" }] }),
    );
    expectUnprocessable(() => parseMapCreateRequest({ ...validMap, grid_data: "x" }));
  });

  it("rejects more cells than the largest allowed map (50 x 50)", () => {
    const tooMany = Array.from({ length: 50 * 50 + 1 }, (_, index) => ({
      x: index % 50,
      y: Math.floor(index / 50),
      cell_type: "FLOOR",
    }));
    expectUnprocessable(() => parseMapCreateRequest({ ...validMap, grid_data: tooMany }));
  });

  it("rejects a body that is not an object", () => {
    expectUnprocessable(() => parseMapCreateRequest([]));
    expectUnprocessable(() => parseMapCreateRequest(null));
  });
});

describe("parseRobotCreateRequest", () => {
  it("requires a capabilities list of strings", () => {
    expectUnprocessable(() =>
      parseRobotCreateRequest({ robot_name: "R", model_type: "SLIM" }),
    );
    expectUnprocessable(() =>
      parseRobotCreateRequest({ robot_name: "R", model_type: "SLIM", capabilities: [1] }),
    );
  });
});

describe("parseJobCreateRequest", () => {
  const base = { robot_id: "r", map_id: "m", job_type: "FULL_CLEAN" };

  it("defaults priority to 5 and normalizes scheduled_at to ISO UTC", () => {
    const parsed = parseJobCreateRequest({ ...base, scheduled_at: "2026-06-06T09:00:00+09:00" });
    expect(parsed.priority).toBe(5);
    expect(parsed.scheduled_at).toBe("2026-06-06T00:00:00.000Z");
  });

  it("rejects priority outside 1..10 and an unparseable scheduled_at", () => {
    expectUnprocessable(() => parseJobCreateRequest({ ...base, priority: 11 }));
    expectUnprocessable(() => parseJobCreateRequest({ ...base, scheduled_at: "not a date" }));
  });
});

describe("parseSensorRequest", () => {
  it("accepts finite numbers and rejects missing values", () => {
    expect(parseSensorRequest({ temperature: 25.5, humidity: 40 })).toEqual({
      temperature: 25.5,
      humidity: 40,
    });
    expectUnprocessable(() => parseSensorRequest({ temperature: 25 }));
  });
});
