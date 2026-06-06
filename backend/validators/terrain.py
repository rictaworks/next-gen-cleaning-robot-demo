from fastapi import HTTPException
from backend.schemas import MapCellInput, CELL_TYPES

STAIR_TYPES = {"STAIR_UP", "STAIR_DOWN"}


def validate_cell_types(grid_data: list[MapCellInput]) -> None:
    for cell in grid_data:
        if cell.cell_type not in CELL_TYPES:
            raise HTTPException(
                status_code=422,
                detail=f"Invalid cell_type '{cell.cell_type}' at ({cell.x},{cell.y})"
            )


def validate_stair_pairs(grid_data: list[MapCellInput]) -> None:
    stair_cells = [c for c in grid_data if c.cell_type in STAIR_TYPES]
    for cell in stair_cells:
        if cell.floor_connection is None:
            raise HTTPException(
                status_code=422,
                detail=(
                    f"STAIR cell at ({cell.x},{cell.y}) requires floor_connection"
                )
            )


def validate_terrain(grid_data: list[MapCellInput]) -> None:
    validate_cell_types(grid_data)
    validate_stair_pairs(grid_data)


JOB_TYPE_REQUIRED_CAPS: dict[str, set[str]] = {
    "FULL_CLEAN": {"BASIC_CLEAN"},
    "SPOT_CLEAN": {"SPOT_CLEAN"},
    "EDGE_CLEAN": {"EDGE_CLEAN"},
    "STAIR_CLEAN": {"STAIR_TRAVERSE"},
    "NARROW_ONLY": {"NARROW_GAP_TRAVERSE"},
}

JOB_TYPE_REQUIRED_CELLS: dict[str, set[str]] = {
    "STAIR_CLEAN": {"STAIR_UP", "STAIR_DOWN"},
    "NARROW_ONLY": {"NARROW_GAP"},
}


def validate_job_capability_matrix(
    job_type: str,
    robot_capabilities: list[str],
    cell_types_in_map: set[str],
) -> None:
    required_caps = JOB_TYPE_REQUIRED_CAPS.get(job_type, set())
    caps_set = set(robot_capabilities)

    missing = required_caps - caps_set
    if missing:
        raise HTTPException(
            status_code=422,
            detail=f"Robot missing capabilities for job_type '{job_type}': {missing}"
        )

    required_cells = JOB_TYPE_REQUIRED_CELLS.get(job_type, set())
    if required_cells and not required_cells.intersection(cell_types_in_map):
        raise HTTPException(
            status_code=422,
            detail=(
                f"Map has no cells required for job_type '{job_type}': {required_cells}"
            )
        )
