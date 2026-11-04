-- 初期スキーマ。backend/models.py（SQLAlchemy）と SPEC/er_diagram.md に対応する。
-- 日時はすべて UTC の ISO 8601 文字列（例: 2026-06-06T00:40:51.000Z）で保存する。
-- 日次リセット（JST 03:00）は purgeAll で全データを削除する。esp32_sensor_readings は対象外（Python 版と同じ）。

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS maps (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id),
  map_name TEXT NOT NULL,
  floor_number INTEGER NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_maps_session ON maps(session_id);

CREATE TABLE IF NOT EXISTS map_cells (
  id TEXT PRIMARY KEY,
  map_id TEXT NOT NULL REFERENCES maps(id),
  x INTEGER NOT NULL,
  y INTEGER NOT NULL,
  cell_type TEXT NOT NULL CHECK (cell_type IN ('FLOOR', 'WALL', 'NARROW_GAP', 'STAIR_UP', 'STAIR_DOWN', 'CHARGING_STATION')),
  floor_connection INTEGER
);
CREATE INDEX IF NOT EXISTS idx_map_cells_map ON map_cells(map_id);

CREATE TABLE IF NOT EXISTS robots (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id),
  robot_name TEXT NOT NULL,
  model_type TEXT NOT NULL CHECK (model_type IN ('STANDARD', 'SLIM', 'STAIR_CAPABLE')),
  status TEXT NOT NULL CHECK (status IN ('IDLE', 'RUNNING', 'PAUSED', 'ERROR')),
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_robots_session ON robots(session_id);

CREATE TABLE IF NOT EXISTS robot_capabilities (
  id TEXT PRIMARY KEY,
  robot_id TEXT NOT NULL REFERENCES robots(id),
  capability TEXT NOT NULL CHECK (capability IN ('BASIC_CLEAN', 'EDGE_CLEAN', 'NARROW_GAP_TRAVERSE', 'STAIR_TRAVERSE', 'SPOT_CLEAN'))
);
CREATE INDEX IF NOT EXISTS idx_robot_capabilities_robot ON robot_capabilities(robot_id);

CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id),
  robot_id TEXT NOT NULL REFERENCES robots(id),
  map_id TEXT NOT NULL REFERENCES maps(id),
  job_type TEXT NOT NULL CHECK (job_type IN ('FULL_CLEAN', 'SPOT_CLEAN', 'EDGE_CLEAN', 'STAIR_CLEAN', 'NARROW_ONLY')),
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED', 'PAUSED')),
  priority INTEGER NOT NULL DEFAULT 5,
  scheduled_at TEXT,
  started_at TEXT,
  completed_at TEXT,
  total_cells INTEGER NOT NULL DEFAULT 0,
  cleaned_cells INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_jobs_session ON jobs(session_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);

CREATE TABLE IF NOT EXISTS job_events (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs(id),
  event_type TEXT NOT NULL,
  cell_x INTEGER,
  cell_y INTEGER,
  occurred_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_job_events_job ON job_events(job_id);

-- 1 ジョブ・1 ロボットにつき位置は 1 行（更新は UPSERT）。
CREATE TABLE IF NOT EXISTS robot_positions (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs(id),
  robot_id TEXT NOT NULL REFERENCES robots(id),
  x INTEGER NOT NULL,
  y INTEGER NOT NULL,
  cell_type TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (job_id, robot_id)
);
CREATE INDEX IF NOT EXISTS idx_robot_positions_robot ON robot_positions(robot_id, updated_at);

CREATE TABLE IF NOT EXISTS reset_logs (
  id TEXT PRIMARY KEY,
  reset_at TEXT NOT NULL
);

-- ESP32 の最新センサー値（1 行のみ）。Python 版ではプロセスメモリに保持していたものを D1 へ移す。
CREATE TABLE IF NOT EXISTS esp32_sensor_readings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  temperature REAL NOT NULL,
  humidity REAL NOT NULL,
  updated_at TEXT NOT NULL
);
