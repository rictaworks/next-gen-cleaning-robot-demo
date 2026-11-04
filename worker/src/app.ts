import { Hono } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { LOG_EVENT } from "./config/constants";
import { MESSAGES } from "./config/messages";
import { logError } from "./logger";
import { registerEsp32Routes } from "./routes/esp32";
import { registerJobRoutes } from "./routes/jobs";
import { registerMapRoutes } from "./routes/maps";
import { registerRobotRoutes } from "./routes/robots";
import { registerSessionRoutes } from "./routes/session";
import type { AppEnv } from "./types";
import { HttpError } from "./util/errors";

export interface AppOptions {
  /** 現在時刻の供給元。テストでは固定時刻を注入する。 */
  now?: () => Date;
}

/** Worker の HTTP アプリ。/api 配下の JSON API を提供する（静的ファイルは Workers Assets が配信する）。 */
export function createApp(options: AppOptions = {}): Hono<AppEnv> {
  const clock = options.now ?? (() => new Date());
  const app = new Hono<AppEnv>({ strict: false });

  app.use("*", async (c, next) => {
    c.set("now", clock());
    await next();
  });

  registerSessionRoutes(app);
  registerMapRoutes(app);
  registerRobotRoutes(app);
  registerJobRoutes(app);
  registerEsp32Routes(app);

  app.notFound((c) => c.json({ detail: MESSAGES.notFound }, 404));

  app.onError((error, c) => {
    if (error instanceof HttpError) {
      return c.json({ detail: error.detail }, error.status as ContentfulStatusCode);
    }
    logError(LOG_EVENT.REQUEST_FAILED, {
      path: c.req.path,
      method: c.req.method,
      message: error instanceof Error ? error.message : String(error),
    });
    return c.json({ detail: MESSAGES.internalError }, 500);
  });

  return app;
}
