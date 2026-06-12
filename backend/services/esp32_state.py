from datetime import datetime
from typing import Optional

_fan_command: str = "off"
_sensor_data: Optional[dict] = None
_sensor_updated_at: Optional[datetime] = None


def set_fan_command(command: str) -> None:
    global _fan_command
    _fan_command = command


def get_fan_command() -> str:
    return _fan_command


def update_sensor(temperature: float, humidity: float) -> None:
    global _sensor_data, _sensor_updated_at
    _sensor_data = {"temperature": temperature, "humidity": humidity}
    _sensor_updated_at = datetime.utcnow()


def get_sensor() -> Optional[dict]:
    if _sensor_data is None:
        return None
    return {
        **_sensor_data,
        "updated_at": _sensor_updated_at.isoformat() if _sensor_updated_at else None,
    }
