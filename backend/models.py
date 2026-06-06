from datetime import datetime
from sqlalchemy import String, Integer, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.database import Base


class Session(Base):
    __tablename__ = "sessions"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    expires_at: Mapped[datetime] = mapped_column(DateTime)

    maps: Mapped[list["Map"]] = relationship("Map", back_populates="session")
    robots: Mapped[list["Robot"]] = relationship("Robot", back_populates="session")
    jobs: Mapped[list["Job"]] = relationship("Job", back_populates="session")


class Map(Base):
    __tablename__ = "maps"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    session_id: Mapped[str] = mapped_column(String, ForeignKey("sessions.id"), nullable=False)
    map_name: Mapped[str] = mapped_column(String, nullable=False)
    floor_number: Mapped[int] = mapped_column(Integer, nullable=False)
    width: Mapped[int] = mapped_column(Integer, nullable=False)
    height: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    session: Mapped["Session"] = relationship("Session", back_populates="maps")
    cells: Mapped[list["MapCell"]] = relationship("MapCell", back_populates="map")
    jobs: Mapped[list["Job"]] = relationship("Job", back_populates="map")


class MapCell(Base):
    __tablename__ = "map_cells"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    map_id: Mapped[str] = mapped_column(String, ForeignKey("maps.id"), nullable=False)
    x: Mapped[int] = mapped_column(Integer, nullable=False)
    y: Mapped[int] = mapped_column(Integer, nullable=False)
    cell_type: Mapped[str] = mapped_column(String, nullable=False)
    floor_connection: Mapped[int | None] = mapped_column(Integer, nullable=True)

    map: Mapped["Map"] = relationship("Map", back_populates="cells")


class Robot(Base):
    __tablename__ = "robots"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    session_id: Mapped[str] = mapped_column(String, ForeignKey("sessions.id"), nullable=False)
    robot_name: Mapped[str] = mapped_column(String, nullable=False)
    model_type: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False, default="IDLE")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    session: Mapped["Session"] = relationship("Session", back_populates="robots")
    capabilities: Mapped[list["RobotCapability"]] = relationship(
        "RobotCapability", back_populates="robot"
    )
    jobs: Mapped[list["Job"]] = relationship("Job", back_populates="robot")
    positions: Mapped[list["RobotPosition"]] = relationship(
        "RobotPosition", back_populates="robot"
    )


class RobotCapability(Base):
    __tablename__ = "robot_capabilities"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    robot_id: Mapped[str] = mapped_column(String, ForeignKey("robots.id"), nullable=False)
    capability: Mapped[str] = mapped_column(String, nullable=False)

    robot: Mapped["Robot"] = relationship("Robot", back_populates="capabilities")


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    session_id: Mapped[str] = mapped_column(String, ForeignKey("sessions.id"), nullable=False)
    robot_id: Mapped[str] = mapped_column(String, ForeignKey("robots.id"), nullable=False)
    map_id: Mapped[str] = mapped_column(String, ForeignKey("maps.id"), nullable=False)
    job_type: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False, default="PENDING")
    priority: Mapped[int] = mapped_column(Integer, default=5)
    scheduled_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    total_cells: Mapped[int] = mapped_column(Integer, default=0)
    cleaned_cells: Mapped[int] = mapped_column(Integer, default=0)

    session: Mapped["Session"] = relationship("Session", back_populates="jobs")
    robot: Mapped["Robot"] = relationship("Robot", back_populates="jobs")
    map: Mapped["Map"] = relationship("Map", back_populates="jobs")
    events: Mapped[list["JobEvent"]] = relationship("JobEvent", back_populates="job")
    positions: Mapped[list["RobotPosition"]] = relationship(
        "RobotPosition", back_populates="job"
    )


class JobEvent(Base):
    __tablename__ = "job_events"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    job_id: Mapped[str] = mapped_column(String, ForeignKey("jobs.id"), nullable=False)
    event_type: Mapped[str] = mapped_column(String, nullable=False)
    cell_x: Mapped[int | None] = mapped_column(Integer, nullable=True)
    cell_y: Mapped[int | None] = mapped_column(Integer, nullable=True)
    occurred_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    job: Mapped["Job"] = relationship("Job", back_populates="events")


class RobotPosition(Base):
    __tablename__ = "robot_positions"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    job_id: Mapped[str] = mapped_column(String, ForeignKey("jobs.id"), nullable=False)
    robot_id: Mapped[str] = mapped_column(String, ForeignKey("robots.id"), nullable=False)
    x: Mapped[int] = mapped_column(Integer, nullable=False)
    y: Mapped[int] = mapped_column(Integer, nullable=False)
    cell_type: Mapped[str] = mapped_column(String, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    job: Mapped["Job"] = relationship("Job", back_populates="positions")
    robot: Mapped["Robot"] = relationship("Robot", back_populates="positions")


class ResetLog(Base):
    __tablename__ = "reset_logs"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    reset_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
