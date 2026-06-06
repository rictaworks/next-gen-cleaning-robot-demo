from collections import deque
from backend.models import MapCell


TRAVERSABLE_TYPES = {"FLOOR", "NARROW_GAP", "STAIR_UP", "STAIR_DOWN", "CHARGING_STATION"}
NARROW_TYPES = {"NARROW_GAP"}
STAIR_TYPES = {"STAIR_UP", "STAIR_DOWN"}

JOB_TYPE_TRAVERSABLE: dict[str, set[str]] = {
    "FULL_CLEAN": {"FLOOR", "CHARGING_STATION"},
    "SPOT_CLEAN": {"FLOOR", "NARROW_GAP", "CHARGING_STATION"},
    "EDGE_CLEAN": {"FLOOR", "CHARGING_STATION"},
    "STAIR_CLEAN": {"FLOOR", "STAIR_UP", "STAIR_DOWN", "CHARGING_STATION"},
    "NARROW_ONLY": {"FLOOR", "NARROW_GAP", "CHARGING_STATION"},
}


def build_grid(cells: list[MapCell]) -> dict[tuple[int, int], str]:
    return {(c.x, c.y): c.cell_type for c in cells}


def bfs_path(
    grid: dict[tuple[int, int], str],
    start: tuple[int, int],
    traversable: set[str],
    width: int,
    height: int,
) -> list[tuple[int, int]]:
    visited: set[tuple[int, int]] = {start}
    queue: deque[list[tuple[int, int]]] = deque([[start]])
    all_reachable: list[tuple[int, int]] = []

    while queue:
        path = queue.popleft()
        current = path[-1]
        all_reachable.append(current)

        x, y = current
        for dx, dy in [(0, 1), (0, -1), (1, 0), (-1, 0)]:
            nx, ny = x + dx, y + dy
            if (nx, ny) in visited:
                continue
            cell_type = grid.get((nx, ny))
            if cell_type and cell_type in traversable:
                visited.add((nx, ny))
                queue.append(path + [(nx, ny)])

    return all_reachable


def calculate_path(
    cells: list[MapCell],
    job_type: str,
    width: int,
    height: int,
) -> list[tuple[int, int]]:
    grid = build_grid(cells)
    traversable = JOB_TYPE_TRAVERSABLE.get(job_type, {"FLOOR", "CHARGING_STATION"})

    charging_stations = [
        (x, y) for (x, y), t in grid.items() if t == "CHARGING_STATION"
    ]
    floors = [(x, y) for (x, y), t in grid.items() if t in traversable]

    if not floors:
        return []

    start = charging_stations[0] if charging_stations else floors[0]
    if grid.get(start) not in traversable:
        start = floors[0]

    return bfs_path(grid, start, traversable, width, height)
