import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, Cookie, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from sqlalchemy.orm import selectinload
from backend.database import get_db
from backend.models import Job, Robot, Map, MapCell, RobotCapability
from backend.schemas import (
    JobCreateRequest, JobResponse, JobStartResponse,
    JobCancelResponse, JobHistoryResponse, JobHistoryItem,
    JOB_TYPES,
)
from backend.services.session_service import validate_session
from backend.services import simulation as sim_svc
from backend.validators.honeypot import validate_honeypot
from backend.validators.terrain import validate_job_capability_matrix

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.post("", response_model=JobResponse, status_code=201)
async def create_job(
    body: JobCreateRequest,
    session_id: str | None = Cookie(default=None),
    db: AsyncSession = Depends(get_db),
) -> JobResponse:
    validate_honeypot(body.website)

    if body.job_type not in JOB_TYPES:
        raise HTTPException(status_code=422, detail=f"Invalid job_type: {body.job_type}")

    session = await validate_session(db, session_id or "")

    robot_result = await db.execute(
        select(Robot)
        .options(selectinload(Robot.capabilities))
        .where(Robot.id == body.robot_id, Robot.session_id == session.id)
    )
    robot = robot_result.scalar_one_or_none()
    if not robot:
        raise HTTPException(status_code=404, detail="Robot not found")

    if robot.status != "IDLE":
        raise HTTPException(
            status_code=409, detail=f"Robot is not IDLE (current: {robot.status})"
        )

    map_result = await db.execute(
        select(Map).where(Map.id == body.map_id, Map.session_id == session.id)
    )
    map_obj = map_result.scalar_one_or_none()
    if not map_obj:
        raise HTTPException(status_code=404, detail="Map not found")

    cells_result = await db.execute(
        select(MapCell).where(MapCell.map_id == body.map_id)
    )
    cells = cells_result.scalars().all()
    cell_types_in_map = {c.cell_type for c in cells}

    robot_caps = [rc.capability for rc in robot.capabilities]
    validate_job_capability_matrix(body.job_type, robot_caps, cell_types_in_map)

    job = Job(
        id=str(uuid.uuid4()),
        session_id=session.id,
        robot_id=body.robot_id,
        map_id=body.map_id,
        job_type=body.job_type,
        status="PENDING",
        priority=body.priority,
        scheduled_at=body.scheduled_at,
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)
    return job


@router.post("/{job_id}/start", response_model=JobStartResponse)
async def start_job(
    job_id: str,
    session_id: str | None = Cookie(default=None),
    db: AsyncSession = Depends(get_db),
) -> JobStartResponse:
    session = await validate_session(db, session_id or "")

    result = await db.execute(
        select(Job).where(Job.id == job_id, Job.session_id == session.id)
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.status != "PENDING":
        raise HTTPException(
            status_code=409, detail=f"Job cannot be started (status: {job.status})"
        )

    started_at = datetime.utcnow()
    await sim_svc.start_simulation(job_id)

    return JobStartResponse(job_id=job_id, started_at=started_at)


@router.post("/{job_id}/cancel", response_model=JobCancelResponse)
async def cancel_job(
    job_id: str,
    session_id: str | None = Cookie(default=None),
    db: AsyncSession = Depends(get_db),
) -> JobCancelResponse:
    session = await validate_session(db, session_id or "")

    result = await db.execute(
        select(Job).where(Job.id == job_id, Job.session_id == session.id)
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.status not in {"PENDING", "IN_PROGRESS", "PAUSED"}:
        raise HTTPException(
            status_code=409,
            detail=f"Job cannot be cancelled (status: {job.status})"
        )

    await sim_svc.cancel_simulation(job_id)

    await db.execute(
        update(Job).where(Job.id == job_id).values(status="CANCELLED")
    )
    robot_result = await db.execute(select(Robot).where(Robot.id == job.robot_id))
    robot = robot_result.scalar_one_or_none()
    if robot:
        await db.execute(
            update(Robot).where(Robot.id == job.robot_id).values(status="IDLE")
        )
    await db.commit()

    await db.refresh(job)
    return JobCancelResponse(
        cancelled=True, job_id=job_id, cleaned_cells=job.cleaned_cells
    )


@router.get("/history", response_model=JobHistoryResponse)
async def get_history(
    session_id: str | None = Cookie(default=None),
    db: AsyncSession = Depends(get_db),
) -> JobHistoryResponse:
    session = await validate_session(db, session_id or "")

    result = await db.execute(
        select(Job)
        .where(Job.session_id == session.id)
        .order_by(Job.started_at.desc())
    )
    jobs = result.scalars().all()

    items = []
    for j in jobs:
        coverage = (
            round(j.cleaned_cells / j.total_cells * 100, 1)
            if j.total_cells > 0
            else 0.0
        )
        items.append(JobHistoryItem(
            id=j.id,
            robot_id=j.robot_id,
            map_id=j.map_id,
            job_type=j.job_type,
            status=j.status,
            started_at=j.started_at,
            completed_at=j.completed_at,
            total_cells=j.total_cells,
            cleaned_cells=j.cleaned_cells,
            coverage_pct=coverage,
        ))

    return JobHistoryResponse(history=items, total=len(items))
