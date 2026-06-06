const API_BASE = "/api";

async function request<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail ?? "Request failed");
  }

  return res.json() as Promise<T>;
}

export type CellType =
  | "FLOOR" | "WALL" | "NARROW_GAP"
  | "STAIR_UP" | "STAIR_DOWN" | "CHARGING_STATION";

export type ModelType = "STANDARD" | "SLIM" | "STAIR_CAPABLE";

export type Capability =
  | "BASIC_CLEAN" | "EDGE_CLEAN" | "NARROW_GAP_TRAVERSE"
  | "STAIR_TRAVERSE" | "SPOT_CLEAN";

export type JobType =
  | "FULL_CLEAN" | "SPOT_CLEAN" | "EDGE_CLEAN"
  | "STAIR_CLEAN" | "NARROW_ONLY";

export interface MapCellInput {
  x: number;
  y: number;
  cell_type: CellType;
  floor_connection?: number | null;
}

export interface MapCreateRequest {
  map_name: string;
  floor_number: number;
  width: number;
  height: number;
  grid_data: MapCellInput[];
  website: string;
}

export interface MapCellResponse {
  id: string;
  x: number;
  y: number;
  cell_type: CellType;
  floor_connection: number | null;
}

export interface MapResponse {
  id: string;
  map_name: string;
  floor_number: number;
  width: number;
  height: number;
  created_at: string;
  cells: MapCellResponse[];
}

export interface RobotCreateRequest {
  robot_name: string;
  model_type: ModelType;
  capabilities: Capability[];
  website: string;
}

export interface RobotCapabilityResponse {
  id: string;
  capability: Capability;
}

export interface RobotResponse {
  id: string;
  robot_name: string;
  model_type: ModelType;
  status: string;
  capabilities: RobotCapabilityResponse[];
  created_at: string;
}

export interface RobotPositionResponse {
  robot_id: string;
  job_id: string;
  x: number;
  y: number;
  cell_type: CellType;
  updated_at: string;
}

export interface JobCreateRequest {
  robot_id: string;
  map_id: string;
  job_type: JobType;
  priority: number;
  website: string;
}

export interface JobResponse {
  id: string;
  robot_id: string;
  map_id: string;
  job_type: JobType;
  status: string;
  priority: number;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  total_cells: number;
  cleaned_cells: number;
}

export interface JobHistoryItem {
  id: string;
  robot_id: string;
  map_id: string;
  job_type: JobType;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  total_cells: number;
  cleaned_cells: number;
  coverage_pct: number;
}

export interface JobHistoryResponse {
  history: JobHistoryItem[];
  total: number;
}

export const api = {
  init: () => request<{ session_id: string; expires_at: string }>("/"),

  createMap: (body: MapCreateRequest) =>
    request<MapResponse>("/maps", { method: "POST", body: JSON.stringify(body) }),

  getMap: (mapId: string) => request<MapResponse>(`/maps/${mapId}`),

  createRobot: (body: RobotCreateRequest) =>
    request<RobotResponse>("/robots", { method: "POST", body: JSON.stringify(body) }),

  getRobotPosition: (robotId: string) =>
    request<RobotPositionResponse>(`/robots/${robotId}/position`),

  createJob: (body: JobCreateRequest) =>
    request<JobResponse>("/jobs", { method: "POST", body: JSON.stringify(body) }),

  startJob: (jobId: string) =>
    request<{ job_id: string; started_at: string }>(`/jobs/${jobId}/start`, {
      method: "POST",
    }),

  cancelJob: (jobId: string) =>
    request<{ cancelled: boolean; job_id: string; cleaned_cells: number }>(
      `/jobs/${jobId}/cancel`,
      { method: "POST" },
    ),

  getHistory: () => request<JobHistoryResponse>("/jobs/history"),
};
