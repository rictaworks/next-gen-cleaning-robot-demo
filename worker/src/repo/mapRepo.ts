import { buildMultiRowInsert, chunk, ROWS_PER_INSERT } from "./sql";

export interface MapRow {
  id: string;
  session_id: string;
  map_name: string;
  floor_number: number;
  width: number;
  height: number;
  created_at: string;
}

export interface MapCellRow {
  id: string;
  map_id: string;
  x: number;
  y: number;
  cell_type: string;
  floor_connection: number | null;
}

const MAP_COLUMNS = [
  "id",
  "session_id",
  "map_name",
  "floor_number",
  "width",
  "height",
  "created_at",
] as const;

const CELL_COLUMNS = ["id", "map_id", "x", "y", "cell_type", "floor_connection"] as const;

export async function insertMapWithCells(
  db: D1Database,
  map: MapRow,
  cells: readonly MapCellRow[],
): Promise<void> {
  const statements: D1PreparedStatement[] = [];

  const mapInsert = buildMultiRowInsert("INSERT", "maps", MAP_COLUMNS, [
    [
      map.id,
      map.session_id,
      map.map_name,
      map.floor_number,
      map.width,
      map.height,
      map.created_at,
    ],
  ]);
  statements.push(db.prepare(mapInsert.sql).bind(...mapInsert.params));

  for (const rows of chunk(cells, ROWS_PER_INSERT)) {
    const cellInsert = buildMultiRowInsert(
      "INSERT",
      "map_cells",
      CELL_COLUMNS,
      rows.map((cell) => [
        cell.id,
        cell.map_id,
        cell.x,
        cell.y,
        cell.cell_type,
        cell.floor_connection,
      ]),
    );
    statements.push(db.prepare(cellInsert.sql).bind(...cellInsert.params));
  }

  await db.batch(statements);
}

export async function findMapForSession(
  db: D1Database,
  mapId: string,
  sessionId: string,
): Promise<MapRow | null> {
  return db
    .prepare(
      "SELECT id, session_id, map_name, floor_number, width, height, created_at FROM maps WHERE id = ?1 AND session_id = ?2",
    )
    .bind(mapId, sessionId)
    .first<MapRow>();
}

/** マップのセルを登録順に返す（Python 版の挿入順と同じ並び）。 */
export async function listMapCells(db: D1Database, mapId: string): Promise<MapCellRow[]> {
  const result = await db
    .prepare(
      "SELECT id, map_id, x, y, cell_type, floor_connection FROM map_cells WHERE map_id = ?1 ORDER BY rowid",
    )
    .bind(mapId)
    .all<MapCellRow>();
  return result.results;
}
