import { describe, expect, it } from "vitest";
import {
  validateJobCapabilityMatrix,
  validateTerrain,
} from "../../../../worker/src/domain/terrain";
import { HttpError } from "../../../../worker/src/util/errors";
import type { MapCellInput } from "../../../../worker/src/validation/requests";

function cell(overrides: Partial<MapCellInput>): MapCellInput {
  return { x: 0, y: 0, cell_type: "FLOOR", floor_connection: null, ...overrides };
}

function expectHttpError(action: () => void, status: number, detail: string): void {
  try {
    action();
  } catch (error) {
    expect(error).toBeInstanceOf(HttpError);
    expect((error as HttpError).status).toBe(status);
    expect((error as HttpError).detail).toBe(detail);
    return;
  }
  throw new Error("expected an HttpError to be thrown");
}

describe("validateTerrain", () => {
  it("accepts known cell types and stairs with a floor connection", () => {
    expect(() =>
      validateTerrain([
        cell({ cell_type: "WALL" }),
        cell({ x: 1, cell_type: "STAIR_UP", floor_connection: 2 }),
      ]),
    ).not.toThrow();
  });

  it("rejects an unknown cell type with 422", () => {
    expectHttpError(
      () => validateTerrain([cell({ cell_type: "LAVA", x: 2, y: 3 })]),
      422,
      "Invalid cell_type 'LAVA' at (2,3)",
    );
  });

  it("rejects a stair cell without floor_connection with 422", () => {
    expectHttpError(
      () => validateTerrain([cell({ cell_type: "STAIR_DOWN", x: 1, y: 1 })]),
      422,
      "STAIR cell at (1,1) requires floor_connection",
    );
  });
});

describe("validateJobCapabilityMatrix", () => {
  it("passes when the robot has the required capability", () => {
    expect(() =>
      validateJobCapabilityMatrix("FULL_CLEAN", ["BASIC_CLEAN"], new Set(["FLOOR"])),
    ).not.toThrow();
  });

  it("rejects a job whose capability is missing", () => {
    expectHttpError(
      () => validateJobCapabilityMatrix("SPOT_CLEAN", ["BASIC_CLEAN"], new Set(["FLOOR"])),
      422,
      "Robot missing capabilities for job_type 'SPOT_CLEAN': SPOT_CLEAN",
    );
  });

  it("rejects STAIR_CLEAN when the map has no stair cell", () => {
    expectHttpError(
      () =>
        validateJobCapabilityMatrix("STAIR_CLEAN", ["STAIR_TRAVERSE"], new Set(["FLOOR"])),
      422,
      "Map has no cells required for job_type 'STAIR_CLEAN': STAIR_UP, STAIR_DOWN",
    );
  });

  it("rejects NARROW_ONLY when the map has no narrow gap", () => {
    expectHttpError(
      () =>
        validateJobCapabilityMatrix(
          "NARROW_ONLY",
          ["NARROW_GAP_TRAVERSE"],
          new Set(["FLOOR"]),
        ),
      422,
      "Map has no cells required for job_type 'NARROW_ONLY': NARROW_GAP",
    );
  });
});
