import type { Env } from "./env";

/** Hono のコンテキスト型。now は各リクエストの開始時刻（テストで固定できるよう注入する）。 */
export type AppEnv = {
  Bindings: Env;
  Variables: {
    now: Date;
  };
};
