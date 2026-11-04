import { describe, expect, it } from "vitest";
import { calculatePath, type GridCell } from "../../../../worker/src/domain/pathfinder";

function openGrid(width: number, height: number, overrides: Record<string, string> = {}): GridCell[] {
  const cells: GridCell[] = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const key = `${x},${y}`;
      cells.push({ x, y, cell_type: overrides[key] ?? "FLOOR" });
    }
  }
  return cells;
}

describe("calculatePath (BFS, Python 版と同じ探索順)", () => {
  it("starts at the charging station and visits cells in up/down/right/left BFS order", () => {
    const cells = openGrid(3, 3, { "1,1": "CHARGING_STATION" });
    const path = calculatePath(cells, "FULL_CLEAN");

    expect(path.map((c) => `${c.x},${c.y}`)).toEqual([
      "1,1",
      "1,2",
      "1,0",
      "2,1",
      "0,1",
      "2,2",
      "0,2",
      "2,0",
      "0,0",
    ]);
  });

  it("does not pass through walls", () => {
    const cells = openGrid(3, 1, { "1,0": "WALL", "0,0": "CHARGING_STATION" });
    expect(calculatePath(cells, "FULL_CLEAN").map((c) => `${c.x},${c.y}`)).toEqual(["0,0"]);
  });

  it("starts from the first floor cell when there is no charging station", () => {
    const cells = openGrid(2, 1);
    expect(calculatePath(cells, "FULL_CLEAN")[0]).toEqual({ x: 0, y: 0 });
  });

  it("returns an empty path when no traversable cell exists", () => {
    const cells = openGrid(2, 2, { "0,0": "WALL", "1,0": "WALL", "0,1": "WALL", "1,1": "WALL" });
    expect(calculatePath(cells, "FULL_CLEAN")).toEqual([]);
  });

  it("treats narrow gaps as traversable only for job types that allow them", () => {
    const cells = openGrid(3, 1, { "0,0": "CHARGING_STATION", "1,0": "NARROW_GAP" });
    expect(calculatePath(cells, "FULL_CLEAN")).toHaveLength(1);
    expect(calculatePath(cells, "SPOT_CLEAN")).toHaveLength(3);
    expect(calculatePath(cells, "NARROW_ONLY")).toHaveLength(3);
  });

  it("uses the last cell when the same coordinate is listed twice", () => {
    const cells: GridCell[] = [
      { x: 0, y: 0, cell_type: "WALL" },
      { x: 0, y: 0, cell_type: "CHARGING_STATION" },
    ];
    expect(calculatePath(cells, "FULL_CLEAN")).toEqual([{ x: 0, y: 0 }]);
  });
});
