import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, Response, Cookie
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from backend.config import CORS_ORIGINS
from backend.database import get_db, init_db
from backend.services.session_service import get_or_create_session
from backend.services.reset_scheduler import start_scheduler, stop_scheduler
from backend.schemas import SessionResponse
from backend.routers import maps, robots, jobs

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    start_scheduler()
    logger.info("Application started")
    yield
    stop_scheduler()
    logger.info("Application stopped")


app = FastAPI(
    title="Next-Gen Cleaning Robot Demo API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(maps.router)
app.include_router(robots.router)
app.include_router(jobs.router)


@app.get("/", response_model=SessionResponse)
async def root(
    response: Response,
    session_id: str | None = Cookie(default=None),
    db: AsyncSession = Depends(get_db),
) -> SessionResponse:
    session = await get_or_create_session(db, session_id)
    response.set_cookie(
        key="session_id",
        value=session.id,
        httponly=True,
        samesite="lax",
        max_age=86400,
    )
    return SessionResponse(session_id=session.id, expires_at=session.expires_at)
