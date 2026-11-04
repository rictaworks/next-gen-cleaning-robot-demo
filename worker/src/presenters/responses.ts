// DB の行を API レスポンス（SPEC/api.md の形）に変換する。

import type { JobRow, RobotPositionRow } from "../repo/jobRepo";
import type { MapCellRow, MapRow } from "../repo/mapRepo";
import type { RobotCapabilityRow, RobotRow } from "../repo/robotRepo";
import type { SessionRow } from "../repo/sessionRepo";

export function toSessionResponse(session: SessionRow) {
  return { session_id: session.id, expires_at: session.expires_at };
}

export function toMapResponse(map: MapRow, cells: readonly MapCellRow[]) {
  return {
    id: map.id,
    map_name: map.map_name,
    floor_number: map.floor_number,
    width: map.width,
    height: map.height,
    created_at: map.created_at,
    cells: cells.map((cell) => ({
      id: cell.id,
      x: cell.x,
      y: cell.y,
      cell_type: cell.cell_type,
      floor_connection: cell.floor_connection,
    })),
  };
}

export function toRobotResponse(robot: RobotRow, capabilities: readonly RobotCapabilityRow[]) {
  return {
    id: robot.id,
    robot_name: robot.robot_name,
    model_type: robot.model_type,
    status: robot.status,
    capabilities: capabilities.map((cap) => ({ id: cap.id, capability: cap.capability })),
    created_at: robot.created_at,
  };
}

export function toJobResponse(job: JobRow) {
  return {
    id: job.id,
    robot_id: job.robot_id,
    map_id: job.map_id,
    job_type: job.job_type,
    status: job.status,
    priority: job.priority,
    scheduled_at: job.scheduled_at,
    started_at: job.started_at,
    completed_at: job.completed_at,
    total_cells: job.total_cells,
    cleaned_cells: job.cleaned_cells,
  };
}

export function toPositionResponse(position: RobotPositionRow) {
  return {
    robot_id: position.robot_id,
    job_id: position.job_id,
    x: position.x,
    y: position.y,
    cell_type: position.cell_type,
    updated_at: position.updated_at,
  };
}

/** 清掃率（%）。総マス数 0 のときは 0.0（Python 版と同じ）。小数第 1 位で丸める。 */
export function coveragePercent(cleaned: number, total: number): number {
  if (total <= 0) {
    return 0;
  }
  return Math.round((cleaned / total) * 1000) / 10;
}

export function toJobHistoryItem(job: JobRow) {
  return {
    id: job.id,
    robot_id: job.robot_id,
    map_id: job.map_id,
    job_type: job.job_type,
    status: job.status,
    started_at: job.started_at,
    completed_at: job.completed_at,
    total_cells: job.total_cells,
    cleaned_cells: job.cleaned_cells,
    coverage_pct: coveragePercent(job.cleaned_cells, job.total_cells),
  };
}
