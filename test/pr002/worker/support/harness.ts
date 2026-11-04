// HTTP 結合テスト用のハーネス。時刻を固定して、経過時間に依存する清掃の進行を決定的に確かめる。

import { createApp } from "../../../../worker/src/app";
import type { Env } from "../../../../worker/src/env";
import { createTestD1, type TestD1 } from "./d1Adapter";

export const START_TIME = "2026-06-06T00:00:00.000Z";

export interface ApiResult<T = unknown> {
  status: number;
  body: T;
  sessionCookie: string | null;
  /** Set-Cookie ヘッダーの生の値（属性の検証用）。 */
  setCookieHeader: string | null;
}

export interface Harness {
  db: TestD1;
  now(): Date;
  advanceMs(milliseconds: number): void;
  call<T = unknown>(
    method: string,
    path: string,
    options?: CallOptions,
  ): Promise<ApiResult<T>>;
}

export interface CallOptions {
  body?: unknown;
  rawBody?: string;
  sessionId?: string | null;
  /** Cookie ヘッダーをそのまま指定する（重複した Cookie を送るテスト用）。 */
  cookieHeader?: string;
}

export function createHarness(startIso: string = START_TIME): Harness {
  const db = createTestD1();
  let current = new Date(startIso).getTime();
  const app = createApp({ now: () => new Date(current) });
  const env = {
    DB: db as unknown as D1Database,
    ENVIRONMENT: "development",
    SESSION_EXPIRE_HOURS: "24",
  } satisfies Env;

  return {
    db,
    now: () => new Date(current),
    advanceMs(milliseconds: number) {
      current += milliseconds;
    },
    async call<T>(
      method: string,
      path: string,
      options: CallOptions = {},
    ): Promise<ApiResult<T>> {
      const headers: Record<string, string> = {};
      if (options.cookieHeader !== undefined) {
        headers.Cookie = options.cookieHeader;
      } else if (options.sessionId) {
        headers.Cookie = `session_id=${options.sessionId}`;
      }
      let payload: string | undefined;
      if (options.rawBody !== undefined) {
        payload = options.rawBody;
        headers["Content-Type"] = "application/json";
      } else if (options.body !== undefined) {
        payload = JSON.stringify(options.body);
        headers["Content-Type"] = "application/json";
      }
      const response = await app.request(
        `http://localhost${path}`,
        { method, headers, body: payload },
        env,
      );
      const text = await response.text();
      const body = (text.length > 0 ? JSON.parse(text) : null) as T;
      const setCookie = response.headers.get("set-cookie");
      const match = setCookie?.match(/session_id=([^;]+)/);
      return {
        status: response.status,
        body,
        sessionCookie: match?.[1] ?? null,
        setCookieHeader: setCookie,
      };
    },
  };
}

/** 3x3 のマップ（外周は壁、中央が充電ステーション）。通行可能は中央の 1 マスのみ。 */
export function singleCellGrid(): Array<Record<string, unknown>> {
  const cells: Array<Record<string, unknown>> = [];
  for (let y = 0; y < 3; y += 1) {
    for (let x = 0; x < 3; x += 1) {
      const isEdge = x === 0 || y === 0 || x === 2 || y === 2;
      cells.push({
        x,
        y,
        cell_type: isEdge ? "WALL" : x === 1 && y === 1 ? "CHARGING_STATION" : "FLOOR",
        floor_connection: null,
      });
    }
  }
  return cells;
}

/** 1 行の通路（充電ステーションから右へ `length` マス）を含むマップ。全マス清掃に length マス必要。 */
export function corridorGrid(length: number): Array<Record<string, unknown>> {
  const cells: Array<Record<string, unknown>> = [];
  for (let x = 0; x < length; x += 1) {
    cells.push({
      x,
      y: 0,
      cell_type: x === 0 ? "CHARGING_STATION" : "FLOOR",
      floor_connection: null,
    });
  }
  return cells;
}
