// API が返す文言（detail）。SPEC/api.md のエラー条件と一致させる。

export const MESSAGES = {
  botDetected: "Bot detected",
  invalidSession: "Invalid or expired session",
  mapNotFound: "Map not found",
  robotNotFound: "Robot not found",
  noPositionData: "No position data yet",
  jobNotFound: "Job not found",
  noSensorData: "No sensor data available",
  invalidJson: "Request body must be valid JSON",
  invalidBody: "Request body is invalid",
  invalidField: (field: string) => `Invalid field: ${field}`,
  invalidModelType: (value: string) => `Invalid model_type: ${value}`,
  invalidCapability: (value: string) => `Invalid capability: ${value}`,
  invalidJobType: (value: string) => `Invalid job_type: ${value}`,
  invalidCellType: (cellType: string, x: number, y: number) =>
    `Invalid cell_type '${cellType}' at (${x},${y})`,
  stairNeedsFloorConnection: (x: number, y: number) =>
    `STAIR cell at (${x},${y}) requires floor_connection`,
  robotNotIdle: (status: string) => `Robot is not IDLE (current: ${status})`,
  jobNotStartable: (status: string) => `Job cannot be started (status: ${status})`,
  jobNotCancellable: (status: string) => `Job cannot be cancelled (status: ${status})`,
  missingCapabilities: (jobType: string, missing: string[]) =>
    `Robot missing capabilities for job_type '${jobType}': ${missing.join(", ")}`,
  mapLacksRequiredCells: (jobType: string, required: string[]) =>
    `Map has no cells required for job_type '${jobType}': ${required.join(", ")}`,
  internalError: "Internal Server Error",
  notFound: "Not Found",
  configInvalid: (key: string) => `Configuration value is invalid: ${key}`,
} as const;
