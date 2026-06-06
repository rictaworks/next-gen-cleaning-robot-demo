import uuid
from fastapi import APIRouter, Depends, Cookie, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from backend.database import get_db
from backend.models import Robot, RobotCapability, RobotPosition
from backend.schemas import (
    RobotCreateRequest, RobotResponse, RobotPositionResponse,
    MODEL_TYPES, CAPABILITIES,
)
from backend.services.session_service import get_or_create_session, validate_session
from backend.validators.honeypot import validate_honeypot

router = APIRouter(prefix="/robots", tags=["robots"])


@router.post("", response_model=RobotResponse, status_code=201)
async def create_robot(
    body: RobotCreateRequest,
    session_id: str | None = Cookie(default=None),
    db: AsyncSession = Depends(get_db),
) -> RobotResponse:
    validate_honeypot(body.website)

    if body.model_type not in MODEL_TYPES:
        raise HTTPException(status_code=422, detail=f"Invalid model_type: {body.model_type}")

    for cap in body.capabilities:
        if cap not in CAPABILITIES:
            raise HTTPException(status_code=422, detail=f"Invalid capability: {cap}")

    session = await get_or_create_session(db, session_id)

    robot = Robot(
        id=str(uuid.uuid4()),
        session_id=session.id,
        robot_name=body.robot_name,
        model_type=body.model_type,
        status="IDLE",
    )
    db.add(robot)

    for cap in body.capabilities:
        db.add(RobotCapability(
            id=str(uuid.uuid4()),
            robot_id=robot.id,
            capability=cap,
        ))

    await db.commit()

    result = await db.execute(
        select(Robot)
        .options(selectinload(Robot.capabilities))
        .where(Robot.id == robot.id)
    )
    return result.scalar_one()


@router.get("/{robot_id}/position", response_model=RobotPositionResponse)
async def get_robot_position(
    robot_id: str,
    session_id: str | None = Cookie(default=None),
    db: AsyncSession = Depends(get_db),
) -> RobotPositionResponse:
    session = await validate_session(db, session_id or "")

    result = await db.execute(
        select(Robot).where(
            Robot.id == robot_id,
            Robot.session_id == session.id,
        )
    )
    robot = result.scalar_one_or_none()
    if not robot:
        raise HTTPException(status_code=404, detail="Robot not found")

    pos_result = await db.execute(
        select(RobotPosition)
        .where(RobotPosition.robot_id == robot_id)
        .order_by(RobotPosition.updated_at.desc())
        .limit(1)
    )
    pos = pos_result.scalar_one_or_none()
    if not pos:
        raise HTTPException(status_code=404, detail="No position data yet")

    return pos
