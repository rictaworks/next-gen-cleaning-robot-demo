// 文字列リテラルの一元管理（CLAUDE.md「文字列分離」）。仕様は SPEC/api.md と README.md が正。

export const CELL_TYPES = [
  "FLOOR",
  "WALL",
  "NARROW_GAP",
  "STAIR_UP",
  "STAIR_DOWN",
  "CHARGING_STATION",
] as const;
export type CellType = (typeof CELL_TYPES)[number];

export const MODEL_TYPES = ["STANDARD", "SLIM", "STAIR_CAPABLE"] as const;

export const CAPABILITIES = [
  "BASIC_CLEAN",
  "EDGE_CLEAN",
  "NARROW_GAP_TRAVERSE",
  "STAIR_TRAVERSE",
  "SPOT_CLEAN",
] as const;

export const JOB_TYPES = [
  "FULL_CLEAN",
  "SPOT_CLEAN",
  "EDGE_CLEAN",
  "STAIR_CLEAN",
  "NARROW_ONLY",
] as const;
export type JobType = (typeof JOB_TYPES)[number];

export const JOB_STATUS = {
  PENDING: "PENDING",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
  PAUSED: "PAUSED",
} as const;

export const ROBOT_STATUS = {
  IDLE: "IDLE",
  RUNNING: "RUNNING",
} as const;

export const EVENT_TYPE = {
  JOB_STARTED: "JOB_STARTED",
  JOB_COMPLETED: "JOB_COMPLETED",
  CELL_CLEANED: "CELL_CLEANED",
  STAIR_TRAVERSAL: "STAIR_TRAVERSAL",
  NARROW_GAP_TRAVERSAL: "NARROW_GAP_TRAVERSAL",
} as const;

export const FAN_COMMAND = {
  ON: "on",
  OFF: "off",
} as const;

/** 1 マスの清掃にかける時間（ミリ秒）。Python 版の STEP_INTERVAL_SECONDS = 0.5 と同じ。 */
export const STEP_INTERVAL_MS = 500;

export const LIMITS = {
  NAME_MAX_LENGTH: 100,
  FLOOR_NUMBER_MIN: 1,
  MAP_SIZE_MIN: 2,
  MAP_SIZE_MAX: 50,
  MAP_CELLS_MAX: 50 * 50,
  COORDINATE_MIN: 0,
  PRIORITY_MIN: 1,
  PRIORITY_MAX: 10,
  PRIORITY_DEFAULT: 5,
} as const;

export const SESSION = {
  COOKIE_NAME: "session_id",
  COOKIE_MAX_AGE_SECONDS: 86400,
} as const;

/** 構造化ログのイベント名。 */
export const LOG_EVENT = {
  MAP_CREATED: "map.created",
  ROBOT_CREATED: "robot.created",
  JOB_CREATED: "job.created",
  JOB_STARTED: "job.started",
  JOB_COMPLETED: "job.completed",
  JOB_CANCELLED: "job.cancelled",
  DAILY_RESET_COMPLETED: "daily_reset.completed",
  REQUEST_FAILED: "request.failed",
} as const;

/** 日次リセットで削除するテーブル（子テーブルから順）。reset_logs と esp32_sensor_readings は別扱い。 */
export const PURGE_TABLES = [
  "job_events",
  "robot_positions",
  "jobs",
  "robot_capabilities",
  "robots",
  "map_cells",
  "maps",
  "sessions",
] as const;

export const STAIR_CELL_TYPES: readonly CellType[] = ["STAIR_UP", "STAIR_DOWN"];

/** ジョブ種別ごとに必要なロボットのケイパビリティ（SPEC/api.md の表）。 */
export const JOB_REQUIRED_CAPABILITIES: Readonly<Record<JobType, readonly string[]>> = {
  FULL_CLEAN: ["BASIC_CLEAN"],
  SPOT_CLEAN: ["SPOT_CLEAN"],
  EDGE_CLEAN: ["EDGE_CLEAN"],
  STAIR_CLEAN: ["STAIR_TRAVERSE"],
  NARROW_ONLY: ["NARROW_GAP_TRAVERSE"],
};

/** ジョブ種別ごとに、マップ上に必要なセル種別（いずれか 1 つ以上）。 */
export const JOB_REQUIRED_CELLS: Readonly<Partial<Record<JobType, readonly CellType[]>>> = {
  STAIR_CLEAN: ["STAIR_UP", "STAIR_DOWN"],
  NARROW_ONLY: ["NARROW_GAP"],
};

/** ジョブ種別ごとに BFS で通過できるセル種別。 */
export const JOB_TRAVERSABLE_CELLS: Readonly<Record<JobType, readonly CellType[]>> = {
  FULL_CLEAN: ["FLOOR", "CHARGING_STATION"],
  SPOT_CLEAN: ["FLOOR", "NARROW_GAP", "CHARGING_STATION"],
  EDGE_CLEAN: ["FLOOR", "CHARGING_STATION"],
  STAIR_CLEAN: ["FLOOR", "STAIR_UP", "STAIR_DOWN", "CHARGING_STATION"],
  NARROW_ONLY: ["FLOOR", "NARROW_GAP", "CHARGING_STATION"],
};

/** 探索の方向（上・下・右・左）。Python 版と同じ順序で BFS し、経路の並びを一致させる。 */
export const SEARCH_DIRECTIONS: ReadonlyArray<readonly [number, number]> = [
  [0, 1],
  [0, -1],
  [1, 0],
  [-1, 0],
];

export const JOB_CANCELLABLE_STATUSES: readonly string[] = ["PENDING", "IN_PROGRESS", "PAUSED"];
