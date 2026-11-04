// リクエスト本文の形式検査（Python 版の pydantic モデルに相当）。
// 形式が不正なら 422、ハニーポット判定より前に行う（Python 版と同じ順序）。

import { LIMITS } from "../config/constants";
import { MESSAGES } from "../config/messages";
import { HttpError, unprocessable } from "../util/errors";
import { toIso } from "../util/time";

type JsonObject = Record<string, unknown>;

export interface MapCellInput {
  x: number;
  y: number;
  cell_type: string;
  floor_connection: number | null;
}

export interface MapCreateRequest {
  map_name: string;
  floor_number: number;
  width: number;
  height: number;
  grid_data: MapCellInput[];
  website: string;
}

export interface RobotCreateRequest {
  robot_name: string;
  model_type: string;
  capabilities: string[];
  website: string;
}

export interface JobCreateRequest {
  robot_id: string;
  map_id: string;
  job_type: string;
  priority: number;
  scheduled_at: string | null;
  website: string;
}

export interface SensorRequest {
  temperature: number;
  humidity: number;
}

export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw unprocessable(MESSAGES.invalidJson);
  }
}

function requireObject(value: unknown): JsonObject {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw unprocessable(MESSAGES.invalidBody);
  }
  return value as JsonObject;
}

function fieldError(field: string): HttpError {
  return unprocessable(MESSAGES.invalidField(field));
}

interface TextRule {
  minLength?: number;
  maxLength?: number;
  defaultValue?: string;
}

function readText(source: JsonObject, field: string, rule: TextRule = {}): string {
  const raw = source[field];
  if (raw === undefined && rule.defaultValue !== undefined) {
    return rule.defaultValue;
  }
  if (typeof raw !== "string") {
    throw fieldError(field);
  }
  // Python の len() と同じく文字（コードポイント）数で数える。
  const length = [...raw].length;
  if (rule.minLength !== undefined && length < rule.minLength) {
    throw fieldError(field);
  }
  if (rule.maxLength !== undefined && length > rule.maxLength) {
    throw fieldError(field);
  }
  return raw;
}

interface IntegerRule {
  min?: number;
  max?: number;
  defaultValue?: number;
}

function readInteger(source: JsonObject, field: string, rule: IntegerRule = {}): number {
  const raw = source[field];
  if (raw === undefined && rule.defaultValue !== undefined) {
    return rule.defaultValue;
  }
  if (typeof raw !== "number" || !Number.isInteger(raw)) {
    throw fieldError(field);
  }
  if (rule.min !== undefined && raw < rule.min) {
    throw fieldError(field);
  }
  if (rule.max !== undefined && raw > rule.max) {
    throw fieldError(field);
  }
  return raw;
}

function readOptionalInteger(source: JsonObject, field: string): number | null {
  const raw = source[field];
  if (raw === undefined || raw === null) {
    return null;
  }
  if (typeof raw !== "number" || !Number.isInteger(raw)) {
    throw fieldError(field);
  }
  return raw;
}

function readFiniteNumber(source: JsonObject, field: string): number {
  const raw = source[field];
  if (typeof raw !== "number" || !Number.isFinite(raw)) {
    throw fieldError(field);
  }
  return raw;
}

function readStringList(source: JsonObject, field: string): string[] {
  const raw = source[field];
  if (!Array.isArray(raw) || !raw.every((item) => typeof item === "string")) {
    throw fieldError(field);
  }
  return raw as string[];
}

function parseGridCell(value: unknown): MapCellInput {
  const cell = requireObject(value);
  return {
    x: readInteger(cell, "x", { min: LIMITS.COORDINATE_MIN }),
    y: readInteger(cell, "y", { min: LIMITS.COORDINATE_MIN }),
    cell_type: readText(cell, "cell_type"),
    floor_connection: readOptionalInteger(cell, "floor_connection"),
  };
}

export function parseMapCreateRequest(value: unknown): MapCreateRequest {
  const body = requireObject(value);
  const gridRaw = body.grid_data;
  // 最大サイズのマップ（50 x 50）のセル数を超える入力は拒否する（一括書き込みの過大な負荷を防ぐ）。
  if (!Array.isArray(gridRaw) || gridRaw.length > LIMITS.MAP_CELLS_MAX) {
    throw fieldError("grid_data");
  }
  return {
    map_name: readText(body, "map_name", {
      minLength: 1,
      maxLength: LIMITS.NAME_MAX_LENGTH,
    }),
    floor_number: readInteger(body, "floor_number", { min: LIMITS.FLOOR_NUMBER_MIN }),
    width: readInteger(body, "width", { min: LIMITS.MAP_SIZE_MIN, max: LIMITS.MAP_SIZE_MAX }),
    height: readInteger(body, "height", { min: LIMITS.MAP_SIZE_MIN, max: LIMITS.MAP_SIZE_MAX }),
    grid_data: gridRaw.map(parseGridCell),
    website: readText(body, "website", { defaultValue: "" }),
  };
}

export function parseRobotCreateRequest(value: unknown): RobotCreateRequest {
  const body = requireObject(value);
  return {
    robot_name: readText(body, "robot_name", {
      minLength: 1,
      maxLength: LIMITS.NAME_MAX_LENGTH,
    }),
    model_type: readText(body, "model_type"),
    capabilities: readStringList(body, "capabilities"),
    website: readText(body, "website", { defaultValue: "" }),
  };
}

export function parseJobCreateRequest(value: unknown): JobCreateRequest {
  const body = requireObject(value);
  const scheduledRaw = body.scheduled_at;
  let scheduledAt: string | null = null;
  if (scheduledRaw !== undefined && scheduledRaw !== null) {
    const time = typeof scheduledRaw === "string" ? Date.parse(scheduledRaw) : Number.NaN;
    if (Number.isNaN(time)) {
      throw fieldError("scheduled_at");
    }
    scheduledAt = toIso(new Date(time));
  }
  return {
    robot_id: readText(body, "robot_id"),
    map_id: readText(body, "map_id"),
    job_type: readText(body, "job_type"),
    priority: readInteger(body, "priority", {
      min: LIMITS.PRIORITY_MIN,
      max: LIMITS.PRIORITY_MAX,
      defaultValue: LIMITS.PRIORITY_DEFAULT,
    }),
    scheduled_at: scheduledAt,
    website: readText(body, "website", { defaultValue: "" }),
  };
}

export function parseSensorRequest(value: unknown): SensorRequest {
  const body = requireObject(value);
  return {
    temperature: readFiniteNumber(body, "temperature"),
    humidity: readFiniteNumber(body, "humidity"),
  };
}
