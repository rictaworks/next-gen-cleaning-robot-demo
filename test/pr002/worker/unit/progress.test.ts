import { describe, expect, it } from "vitest";
import { computeProgress } from "../../../../worker/src/domain/progress";

describe("computeProgress", () => {
  it("cleans the first cell at the start and one more every 500 ms", () => {
    expect(computeProgress(0, 3)).toEqual({ reachedSteps: 1, finished: false });
    expect(computeProgress(499, 3)).toEqual({ reachedSteps: 1, finished: false });
    expect(computeProgress(500, 3)).toEqual({ reachedSteps: 2, finished: false });
    expect(computeProgress(1499, 3)).toEqual({ reachedSteps: 3, finished: false });
  });

  it("finishes one step after the last cell, at total x 500 ms", () => {
    expect(computeProgress(1500, 3)).toEqual({ reachedSteps: 3, finished: true });
    expect(computeProgress(99999, 3)).toEqual({ reachedSteps: 3, finished: true });
  });

  it("finishes immediately when there is nothing to clean", () => {
    expect(computeProgress(0, 0)).toEqual({ reachedSteps: 0, finished: true });
  });

  it("treats negative elapsed time as the start", () => {
    expect(computeProgress(-10, 3)).toEqual({ reachedSteps: 1, finished: false });
  });
});
