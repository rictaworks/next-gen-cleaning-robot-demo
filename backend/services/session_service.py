import uuid
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.models import Session
from backend.config import SESSION_EXPIRE_HOURS


async def get_or_create_session(
    db: AsyncSession, session_id: str | None
) -> Session:
    if session_id:
        result = await db.execute(
            select(Session).where(
                Session.id == session_id,
                Session.expires_at > datetime.utcnow(),
            )
        )
        session = result.scalar_one_or_none()
        if session:
            return session

    return await create_session(db)


async def create_session(db: AsyncSession) -> Session:
    session = Session(
        id=str(uuid.uuid4()),
        expires_at=datetime.utcnow() + timedelta(hours=SESSION_EXPIRE_HOURS),
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


async def validate_session(db: AsyncSession, session_id: str) -> Session:
    from fastapi import HTTPException
    result = await db.execute(
        select(Session).where(
            Session.id == session_id,
            Session.expires_at > datetime.utcnow(),
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    return session
