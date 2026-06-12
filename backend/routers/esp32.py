from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backend.services import esp32_state

router = APIRouter(prefix="/esp32", tags=["esp32"])


class SensorData(BaseModel):
    temperature: float
    humidity: float


@router.get("/command")
async def get_command() -> dict:
    return {"fan": esp32_state.get_fan_command()}


@router.post("/sensor", status_code=204)
async def post_sensor(data: SensorData) -> None:
    esp32_state.update_sensor(data.temperature, data.humidity)


@router.get("/sensor")
async def get_sensor() -> dict:
    data = esp32_state.get_sensor()
    if data is None:
        raise HTTPException(status_code=503, detail="No sensor data available")
    return data
