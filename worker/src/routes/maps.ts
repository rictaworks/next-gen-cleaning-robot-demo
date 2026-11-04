import type { Hono } from "hono";
import { LOG_EVENT } from "../config/constants";
import { MESSAGES } from "../config/messages";
import { sessionExpireHours } from "../env";
import { ensureSession, readSessionCookie, requireSession, writeSessionCookie } from "../http/session";
import { logInfo } from "../logger";
import { toMapResponse } from "../presenters/responses";
import { findMapForSession, insertMapWithCells, listMapCells, type MapCellRow, type MapRow } from "../repo/mapRepo";
import { notFound } from "../util/errors";
import { toIso } from "../util/time";
import { rejectFilledHoneypot } from "../security/honeypot";
import { validateTerrain } from "../domain/terrain";
import { parseMapCreateRequest, readJsonBody } from "../validation/requests";
import type { AppEnv } from "../types";

export function registerMapRoutes(app: Hono<AppEnv>): void {
  // POST /api/maps: フロアマップを登録する。
  app.post("/api/maps", async (c) => {
    const request = parseMapCreateRequest(await readJsonBody(c.req.raw));
    rejectFilledHoneypot(request.website);
    validateTerrain(request.grid_data);

    const db = c.env.DB;
    const now = c.get("now");
    const { session, created } = await ensureSession(
      db,
      readSessionCookie(c),
      now,
      sessionExpireHours(c.env),
    );
    if (created) {
      writeSessionCookie(c, session.id);
    }

    const mapId = crypto.randomUUID();
    const map: MapRow = {
      id: mapId,
      session_id: session.id,
      map_name: request.map_name,
      floor_number: request.floor_number,
      width: request.width,
      height: request.height,
      created_at: toIso(now),
    };
    const cells: MapCellRow[] = request.grid_data.map((cell) => ({
      id: crypto.randomUUID(),
      map_id: mapId,
      x: cell.x,
      y: cell.y,
      cell_type: cell.cell_type,
      floor_connection: cell.floor_connection,
    }));

    await insertMapWithCells(db, map, cells);
    logInfo(LOG_EVENT.MAP_CREATED, { mapId, cellCount: cells.length });
    return c.json(toMapResponse(map, cells), 201);
  });

  // GET /api/maps/:id: 自分のセッションのマップを取得する。
  app.get("/api/maps/:id", async (c) => {
    const db = c.env.DB;
    const session = await requireSession(db, readSessionCookie(c), c.get("now"));
    const map = await findMapForSession(db, c.req.param("id"), session.id);
    if (map === null) {
      throw notFound(MESSAGES.mapNotFound);
    }
    const cells = await listMapCells(db, map.id);
    return c.json(toMapResponse(map, cells));
  });
}
