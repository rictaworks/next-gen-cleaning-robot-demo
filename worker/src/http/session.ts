// セッション（オーナーキー）の発行・検証と Cookie の読み書き。
// Python 版と同じく、Cookie session_id が有効期限内のセッションを指す間はそれを使う。

import type { Context } from "hono";
import { setCookie } from "hono/cookie";
import { SESSION } from "../config/constants";
import type { AppEnv } from "../types";
import { findActiveSession, insertSession, type SessionRow } from "../repo/sessionRepo";
import { unauthorized } from "../util/errors";
import { addHours, toIso } from "../util/time";

/**
 * Cookie の session_id を読む。同名の Cookie が異なる値で複数届いた場合は、どれが正か決められないため
 * 無いものとして扱う（別の値で既存セッションを乗っ取る・すり替える経路を作らないため）。
 */
export function readSessionCookie(c: Context<AppEnv>): string | undefined {
  const header = c.req.header("Cookie") ?? "";
  const values = new Set<string>();
  for (const pair of header.split(";")) {
    const trimmed = pair.trim();
    const separator = trimmed.indexOf("=");
    if (separator > 0 && trimmed.slice(0, separator) === SESSION.COOKIE_NAME) {
      values.add(trimmed.slice(separator + 1));
    }
  }
  if (values.size !== 1) {
    return undefined;
  }
  return [...values][0];
}

/** セッション Cookie を書く。Secure は常に付ける（ENVIRONMENT の値には依存させない）。 */
export function writeSessionCookie(c: Context<AppEnv>, sessionId: string): void {
  setCookie(c, SESSION.COOKIE_NAME, sessionId, {
    httpOnly: true,
    sameSite: "Lax",
    path: "/",
    maxAge: SESSION.COOKIE_MAX_AGE_SECONDS,
    secure: true,
  });
}

async function findValidSession(
  db: D1Database,
  cookieId: string | undefined,
  now: Date,
): Promise<SessionRow | null> {
  if (cookieId === undefined || cookieId === "") {
    return null;
  }
  return findActiveSession(db, cookieId, toIso(now));
}

/** 有効なセッションが必須の操作（Python 版の validate_session）。無ければ 401。 */
export async function requireSession(
  db: D1Database,
  cookieId: string | undefined,
  now: Date,
): Promise<SessionRow> {
  const session = await findValidSession(db, cookieId, now);
  if (session === null) {
    throw unauthorized();
  }
  return session;
}

export interface EnsuredSession {
  session: SessionRow;
  created: boolean;
}

/** 有効なセッションが無ければ新規発行する（Python 版の get_or_create_session）。 */
export async function ensureSession(
  db: D1Database,
  cookieId: string | undefined,
  now: Date,
  expireHours: number,
): Promise<EnsuredSession> {
  const existing = await findValidSession(db, cookieId, now);
  if (existing !== null) {
    return { session: existing, created: false };
  }
  const session: SessionRow = {
    id: crypto.randomUUID(),
    created_at: toIso(now),
    expires_at: toIso(addHours(now, expireHours)),
  };
  await insertSession(db, session);
  return { session, created: true };
}
