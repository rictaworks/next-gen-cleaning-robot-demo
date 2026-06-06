from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


# --- Enums as string literals (validated via CHECK constraints in DB) ---

CELL_TYPES = ["FLOOR", "WALL", "NARROW_GAP", "STAIR_UP", "STAIR_DOWN", "CHARGING_STATION"]
MODEL_TYPES = ["STANDARD", "SLIM", "STAIR_CAPABLE"]
CAPABILITIES = [
    "BASIC_CLEAN", "EDGE_CLEAN", "NARROW_GAP_TRAVERSE", "STAIR_TRAVERSE", "SPOT_CLEAN"
]
JOB_TYPES = ["FULL_CLEAN", "SPOT_CLEAN", "EDGE_CLEAN", "STAIR_CLEAN", "NARROW_ONLY"]
JOB_STATUSES = ["PENDING", "IN_PROGRESS", "COMPLETED", "FAILED", "CANCELLED", "PAUSED"]
ROBOT_STATUSES = ["IDLE", "RUNNING", "PAUSED", "ERROR"]


# --- Map Schemas ---

class MapCellInput(BaseModel):
    x: int = Field(..., ge=0)
    y: int = Field(..., ge=0)
    cell_type: str
    floor_connection: Optional[int] = None


class MapCreateRequest(BaseModel):
    map_name: str = Field(..., min_length=1, max_length=100)
    floor_number: int = Field(..., ge=1)
    width: int = Field(..., ge=2, le=50)
    height: int = Field(..., ge=2, le=50)
    grid_data: list[MapCellInput]
    website: str = Field(default="")  # honeypot field


class MapCellResponse(BaseModel):
    id: str
    x: int
    y: int
    cell_type: str
    floor_connection: Optional[int]

    model_config = {"from_attributes": True}


class MapResponse(BaseModel):
    id: str
    map_name: str
    floor_number: int
    width: int
    height: int
    created_at: datetime
    cells: list[MapCellResponse] = []

    model_config = {"from_attributes": True}


# --- Robot Schemas ---

class RobotCreateRequest(BaseModel):
    robot_name: str = Field(..., min_length=1, max_length=100)
    model_type: str
    capabilities: list[str]
    website: str = Field(default="")  # honeypot field


class RobotCapabilityResponse(BaseModel):
    id: str
    capability: str

    model_config = {"from_attributes": True}


class RobotResponse(BaseModel):
    id: str
    robot_name: str
    model_type: str
    status: str
    capabilities: list[RobotCapabilityResponse] = []
    created_at: datetime

    model_config = {"from_attributes": True}


class RobotPositionResponse(BaseModel):
    robot_id: str
    job_id: str
    x: int
    y: int
    cell_type: str
    updated_at: datetime

    model_config = {"from_attributes": True}


# --- Job Schemas ---

class JobCreateRequest(BaseModel):
    robot_id: str
    map_id: str
    job_type: str
    priority: int = Field(default=5, ge=1, le=10)
    scheduled_at: Optional[datetime] = None
    website: str = Field(default="")  # honeypot field


class JobResponse(BaseModel):
    id: str
    robot_id: str
    map_id: str
    job_type: str
    status: str
    priority: int
    scheduled_at: Optional[datetime]
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    total_cells: int
    cleaned_cells: int

    model_config = {"from_attributes": True}


class JobStartResponse(BaseModel):
    job_id: str
    started_at: datetime


class JobCancelResponse(BaseModel):
    cancelled: bool
    job_id: str
    cleaned_cells: int


class JobHistoryItem(BaseModel):
    id: str
    robot_id: str
    map_id: str
    job_type: str
    status: str
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    total_cells: int
    cleaned_cells: int
    coverage_pct: float

    model_config = {"from_attributes": True}


class JobHistoryResponse(BaseModel):
    history: list[JobHistoryItem]
    total: int


# --- Session Schema ---

class SessionResponse(BaseModel):
    session_id: str
    expires_at: datetime
