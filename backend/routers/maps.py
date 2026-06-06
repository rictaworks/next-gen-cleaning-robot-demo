import uuid
from fastapi import APIRouter, Depends, Cookie
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from backend.database import get_db
from backend.models import Map, MapCell
from backend.schemas import MapCreateRequest, MapResponse
from backend.services.session_service import get_or_create_session, validate_session
from backend.validators.honeypot import validate_honeypot
from backend.validators.terrain import validate_terrain

router = APIRouter(prefix="/maps", tags=["maps"])


@router.post("", response_model=MapResponse, status_code=201)
async def create_map(
    body: MapCreateRequest,
    session_id: str | None = Cookie(default=None),
    db: AsyncSession = Depends(get_db),
) -> MapResponse:
    validate_honeypot(body.website)
    validate_terrain(body.grid_data)

    session = await get_or_create_session(db, session_id)

    map_obj = Map(
        id=str(uuid.uuid4()),
        session_id=session.id,
        map_name=body.map_name,
        floor_number=body.floor_number,
        width=body.width,
        height=body.height,
    )
    db.add(map_obj)

    for cell in body.grid_data:
        db.add(MapCell(
            id=str(uuid.uuid4()),
            map_id=map_obj.id,
            x=cell.x,
            y=cell.y,
            cell_type=cell.cell_type,
            floor_connection=cell.floor_connection,
        ))

    await db.commit()
    await db.refresh(map_obj)

    result = await db.execute(
        select(Map)
        .options(selectinload(Map.cells))
        .where(Map.id == map_obj.id)
    )
    return result.scalar_one()


@router.get("/{map_id}", response_model=MapResponse)
async def get_map(
    map_id: str,
    session_id: str | None = Cookie(default=None),
    db: AsyncSession = Depends(get_db),
) -> MapResponse:
    session = await validate_session(db, session_id or "")

    result = await db.execute(
        select(Map)
        .options(selectinload(Map.cells))
        .where(Map.id == map_id, Map.session_id == session.id)
    )
    map_obj = result.scalar_one_or_none()
    if not map_obj:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Map not found")
    return map_obj
