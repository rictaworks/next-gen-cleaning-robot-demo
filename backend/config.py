import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL: str = os.environ.get("DATABASE_URL", "sqlite+aiosqlite:///./demo.db")
SESSION_EXPIRE_HOURS: int = int(os.environ.get("SESSION_EXPIRE_HOURS", "24"))
RESET_HOUR_JST: int = int(os.environ.get("RESET_HOUR_JST", "3"))
ENVIRONMENT: str = os.environ.get("ENVIRONMENT", "development")
CORS_ORIGINS: list[str] = os.environ.get(
    "CORS_ORIGINS", "http://localhost:3000"
).split(",")
