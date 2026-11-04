import { MESSAGES } from "./config/messages";

/** wrangler.jsonc の bindings と vars。 */
export interface Env {
  DB: D1Database;
  ENVIRONMENT: string;
  SESSION_EXPIRE_HOURS: string;
}

/** セッションの有効時間（時間）。未設定・不正値は設定ミスとして例外にする（既定値へのフォールバックはしない）。 */
export function sessionExpireHours(env: Env): number {
  const hours = Number(env.SESSION_EXPIRE_HOURS);
  if (!Number.isInteger(hours) || hours < 1) {
    throw new Error(MESSAGES.configInvalid("SESSION_EXPIRE_HOURS"));
  }
  return hours;
}
