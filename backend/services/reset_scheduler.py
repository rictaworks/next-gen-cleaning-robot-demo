import uuid
import logging
from datetime import datetime
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
import pytz
from backend.database import AsyncSessionLocal, reset_db
from backend.models import ResetLog

logger = logging.getLogger(__name__)
JST = pytz.timezone("Asia/Tokyo")
_scheduler = AsyncIOScheduler(timezone=JST)


async def _do_reset() -> None:
    logger.info("Starting daily DB reset at JST 03:00")
    await reset_db()
    async with AsyncSessionLocal() as db:
        db.add(ResetLog(id=str(uuid.uuid4())))
        await db.commit()
    logger.info("DB reset completed")


def start_scheduler() -> None:
    _scheduler.add_job(
        _do_reset,
        trigger=CronTrigger(hour=3, minute=0, timezone=JST),
        id="daily_reset",
        replace_existing=True,
    )
    _scheduler.start()
    logger.info("Reset scheduler started (JST 03:00 daily)")


def stop_scheduler() -> None:
    if _scheduler.running:
        _scheduler.shutdown(wait=False)
