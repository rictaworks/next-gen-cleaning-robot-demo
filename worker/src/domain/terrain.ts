// マップ・ジョブの整合性検査（Python 版 backend/validators/terrain.py の移植）。

import {
  CELL_TYPES,
  JOB_REQUIRED_CAPABILITIES,
  JOB_REQUIRED_CELLS,
  JOB_TYPES,
  STAIR_CELL_TYPES,
  type JobType,
} from "../config/constants";
import { MESSAGES } from "../config/messages";
import type { MapCellInput } from "../validation/requests";
import { unprocessable } from "../util/errors";

export function isJobType(value: string): value is JobType {
  return (JOB_TYPES as readonly string[]).includes(value);
}

/** DB に保存済みのジョブ種別を型に変換する。保存時に検証済みのため、不一致は内部不整合として例外にする。 */
export function toJobType(value: string): JobType {
  if (!isJobType(value)) {
    throw new Error(`Stored job_type is invalid: ${value}`);
  }
  return value;
}

export function validateTerrain(grid: readonly MapCellInput[]): void {
  for (const cell of grid) {
    if (!(CELL_TYPES as readonly string[]).includes(cell.cell_type)) {
      throw unprocessable(MESSAGES.invalidCellType(cell.cell_type, cell.x, cell.y));
    }
  }
  for (const cell of grid) {
    const isStair = (STAIR_CELL_TYPES as readonly string[]).includes(cell.cell_type);
    if (isStair && cell.floor_connection === null) {
      throw unprocessable(MESSAGES.stairNeedsFloorConnection(cell.x, cell.y));
    }
  }
}

export function validateJobCapabilityMatrix(
  jobType: JobType,
  robotCapabilities: readonly string[],
  cellTypesInMap: ReadonlySet<string>,
): void {
  const capabilities = new Set(robotCapabilities);
  const missing = JOB_REQUIRED_CAPABILITIES[jobType].filter((cap) => !capabilities.has(cap));
  if (missing.length > 0) {
    throw unprocessable(MESSAGES.missingCapabilities(jobType, missing));
  }

  const requiredCells = JOB_REQUIRED_CELLS[jobType];
  if (requiredCells !== undefined && !requiredCells.some((cell) => cellTypesInMap.has(cell))) {
    throw unprocessable(MESSAGES.mapLacksRequiredCells(jobType, [...requiredCells]));
  }
}
