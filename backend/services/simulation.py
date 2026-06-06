import asyncio
import uuid
import logging
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from backend.models import Job, Robot, RobotPosition, JobEvent, MapCell, Map
from backend.services.pathfinder import calculate_path
from backend.database import AsyncSessionLocal

logger = logging.getLogger(__name__)

STEP_INTERVAL_SECONDS: float = 0.5
_running_jobs: dict[str, asyncio.Task] = {}


async def start_simulation(job_id: str) -> None:
    task = asyncio.create_task(_simulate(job_id))
    _running_jobs[job_id] = task
    task.add_done_callback(lambda t: _running_jobs.pop(job_id, None))


async def cancel_simulation(job_id: str) -> None:
    task = _running_jobs.get(job_id)
    if task and not task.done():
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass
    _running_jobs.pop(job_id, None)


async def _simulate(job_id: str) -> None:
    async with AsyncSessionLocal() as db:
        try:
            await _run_simulation(db, job_id)
        except asyncio.CancelledError:
            await _mark_cancelled(db, job_id)
            raise
        except Exception as exc:
            logger.error("Simulation error job=%s: %s", job_id, exc)
            await _mark_failed(db, job_id)


async def _run_simulation(db: AsyncSession, job_id: str) -> None:
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        return

    result = await db.execute(select(MapCell).where(MapCell.map_id == job.map_id))
    cells = result.scalars().all()

    result = await db.execute(select(Map).where(Map.id == job.map_id))
    map_obj = result.scalar_one_or_none()
    if not map_obj:
        return

    path = calculate_path(list(cells), job.job_type, map_obj.width, map_obj.height)
    total = len(path)

    await db.execute(
        update(Job)
        .where(Job.id == job_id)
        .values(total_cells=total, started_at=datetime.utcnow(), status="IN_PROGRESS")
    )
    await db.execute(
        update(Robot).where(Robot.id == job.robot_id).values(status="RUNNING")
    )
    await db.commit()

    await _record_event(db, job_id, "JOB_STARTED", None, None)

    grid = {(c.x, c.y): c.cell_type for c in cells}
    cleaned = 0

    for step, (x, y) in enumerate(path):
        cell_type = grid.get((x, y), "FLOOR")

        pos_result = await db.execute(
            select(RobotPosition).where(
                RobotPosition.job_id == job_id,
                RobotPosition.robot_id == job.robot_id,
            )
        )
        existing_pos = pos_result.scalar_one_or_none()

        if existing_pos:
            await db.execute(
                update(RobotPosition)
                .where(
                    RobotPosition.job_id == job_id,
                    RobotPosition.robot_id == job.robot_id,
                )
                .values(x=x, y=y, cell_type=cell_type, updated_at=datetime.utcnow())
            )
        else:
            db.add(RobotPosition(
                id=str(uuid.uuid4()),
                job_id=job_id,
                robot_id=job.robot_id,
                x=x,
                y=y,
                cell_type=cell_type,
            ))

        cleaned += 1
        await db.execute(
            update(Job).where(Job.id == job_id).values(cleaned_cells=cleaned)
        )
        await db.commit()

        if cell_type in {"STAIR_UP", "STAIR_DOWN"}:
            await _record_event(db, job_id, "STAIR_TRAVERSAL", x, y)
        elif cell_type == "NARROW_GAP":
            await _record_event(db, job_id, "NARROW_GAP_TRAVERSAL", x, y)
        else:
            await _record_event(db, job_id, "CELL_CLEANED", x, y)

        # Check if job was cancelled externally
        job_result = await db.execute(select(Job.status).where(Job.id == job_id))
        current_status = job_result.scalar_one_or_none()
        if current_status in {"CANCELLED", "FAILED"}:
            return

        await asyncio.sleep(STEP_INTERVAL_SECONDS)

    await db.execute(
        update(Job)
        .where(Job.id == job_id)
        .values(status="COMPLETED", completed_at=datetime.utcnow())
    )
    await db.execute(
        update(Robot).where(Robot.id == job.robot_id).values(status="IDLE")
    )
    await db.commit()
    await _record_event(db, job_id, "JOB_COMPLETED", None, None)


async def _record_event(
    db: AsyncSession,
    job_id: str,
    event_type: str,
    x: int | None,
    y: int | None,
) -> None:
    db.add(JobEvent(
        id=str(uuid.uuid4()),
        job_id=job_id,
        event_type=event_type,
        cell_x=x,
        cell_y=y,
    ))
    await db.commit()


async def _mark_cancelled(db: AsyncSession, job_id: str) -> None:
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if job:
        await db.execute(
            update(Job).where(Job.id == job_id).values(status="CANCELLED")
        )
        await db.execute(
            update(Robot).where(Robot.id == job.robot_id).values(status="IDLE")
        )
        await db.commit()


async def _mark_failed(db: AsyncSession, job_id: str) -> None:
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if job:
        await db.execute(
            update(Job).where(Job.id == job_id).values(status="FAILED")
        )
        await db.execute(
            update(Robot).where(Robot.id == job.robot_id).values(status="ERROR")
        )
        await db.commit()
