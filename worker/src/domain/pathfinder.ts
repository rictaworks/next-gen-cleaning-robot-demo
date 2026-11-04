// ルールベース BFS 経路探索（Python 版 backend/services/pathfinder.py の移植）。
// 探索順（上・下・右・左）と結果の並びを Python 版と一致させる。

import { JOB_TRAVERSABLE_CELLS, SEARCH_DIRECTIONS, type JobType } from "../config/constants";

export interface GridCell {
  x: number;
  y: number;
  cell_type: string;
}

export interface Coordinate {
  x: number;
  y: number;
}

export interface GridEntry extends Coordinate {
  cell_type: string;
}

export function cellKey(x: number, y: number): string {
  return `${x},${y}`;
}

/** 同じ座標が複数あれば後のものを採用する（Python 版の dict 生成と同じ）。挿入順を保つ。 */
export function buildGrid(cells: readonly GridCell[]): Map<string, GridEntry> {
  const grid = new Map<string, GridEntry>();
  for (const cell of cells) {
    grid.set(cellKey(cell.x, cell.y), { x: cell.x, y: cell.y, cell_type: cell.cell_type });
  }
  return grid;
}

function bfsReachable(
  grid: ReadonlyMap<string, GridEntry>,
  start: Coordinate,
  traversable: ReadonlySet<string>,
): Coordinate[] {
  const visited = new Set<string>([cellKey(start.x, start.y)]);
  const queue: Coordinate[] = [{ x: start.x, y: start.y }];
  let head = 0;

  while (head < queue.length) {
    const current = queue[head];
    head += 1;
    if (current === undefined) {
      break;
    }
    for (const [dx, dy] of SEARCH_DIRECTIONS) {
      const nx = current.x + dx;
      const ny = current.y + dy;
      const key = cellKey(nx, ny);
      if (visited.has(key)) {
        continue;
      }
      const neighbor = grid.get(key);
      if (neighbor !== undefined && traversable.has(neighbor.cell_type)) {
        visited.add(key);
        queue.push({ x: nx, y: ny });
      }
    }
  }

  return queue;
}

/**
 * ジョブ種別に応じた清掃経路（到達可能セルを BFS の発見順に並べたもの）を返す。
 * 充電ステーションがあればそこを起点とし、無ければ通行可能な最初のセルを起点とする。
 */
export function calculatePath(cells: readonly GridCell[], jobType: JobType): Coordinate[] {
  const grid = buildGrid(cells);
  const traversable = new Set<string>(JOB_TRAVERSABLE_CELLS[jobType]);
  const entries = [...grid.values()];

  const chargingStations = entries.filter((entry) => entry.cell_type === "CHARGING_STATION");
  const floors = entries.filter((entry) => traversable.has(entry.cell_type));

  const firstFloor = floors[0];
  if (firstFloor === undefined) {
    return [];
  }

  const preferred = chargingStations[0];
  const start =
    preferred !== undefined && traversable.has(preferred.cell_type) ? preferred : firstFloor;

  return bfsReachable(grid, start, traversable);
}
