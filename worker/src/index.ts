import { createApp } from "./app";
import type { Env } from "./env";
import { runDailyReset } from "./services/dailyResetService";

const app = createApp();

export default {
  fetch: app.fetch,

  /** wrangler.jsonc の triggers.crons（UTC 18:00 = JST 03:00）から呼ばれる日次リセット。 */
  async scheduled(_controller: ScheduledController, env: Env, _ctx: ExecutionContext): Promise<void> {
    await runDailyReset(env.DB, new Date());
  },
};
