import type { Hono } from "hono";
import { sessionExpireHours } from "../env";
import { ensureSession, readSessionCookie, writeSessionCookie } from "../http/session";
import { toSessionResponse } from "../presenters/responses";
import type { AppEnv } from "../types";

export function registerSessionRoutes(app: Hono<AppEnv>): void {
  // GET /api（末尾スラッシュ有無のどちらでも一致させる）: セッションを初期化し session_id Cookie を発行する。
  app.get("/api", async (c) => {
    const { session } = await ensureSession(
      c.env.DB,
      readSessionCookie(c),
      c.get("now"),
      sessionExpireHours(c.env),
    );
    writeSessionCookie(c, session.id);
    return c.json(toSessionResponse(session));
  });
}
