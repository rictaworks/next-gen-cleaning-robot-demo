"""
PR #001 backend integration tests.
Target: development server at http://localhost:8000
Run: pytest test/pr001/test_backend.py -v
"""

import pytest
import httpx

BASE_URL = "http://localhost:8000"
COOKIES: dict[str, str] = {}


@pytest.fixture(scope="session")
def client():
    with httpx.Client(base_url=BASE_URL, follow_redirects=True) as c:
        yield c


@pytest.fixture(scope="session", autouse=True)
def init_session(client: httpx.Client):
    res = client.get("/")
    assert res.status_code == 200
    session_id = res.cookies.get("session_id")
    assert session_id, "session_id cookie must be set"
    COOKIES["session_id"] = session_id


def session_cookies() -> dict[str, str]:
    return {"session_id": COOKIES["session_id"]}


class TestSession:
    def test_init_returns_session(self, client: httpx.Client):
        res = client.get("/")
        assert res.status_code == 200
        body = res.json()
        assert "session_id" in body
        assert "expires_at" in body

    def test_honeypot_rejected(self, client: httpx.Client):
        payload = {
            "map_name": "test",
            "floor_number": 1,
            "width": 3,
            "height": 3,
            "grid_data": [],
            "website": "bot_value",
        }
        res = client.post("/maps", json=payload, cookies=session_cookies())
        assert res.status_code == 400


class TestMaps:
    def _make_grid(self, width: int = 3, height: int = 3) -> list[dict]:
        cells = []
        for y in range(height):
            for x in range(width):
                is_edge = x == 0 or y == 0 or x == width - 1 or y == height - 1
                cells.append({
                    "x": x, "y": y,
                    "cell_type": "WALL" if is_edge else "FLOOR",
                    "floor_connection": None,
                })
        cells[4] = {"x": 1, "y": 1, "cell_type": "CHARGING_STATION", "floor_connection": None}
        return cells

    def test_create_map(self, client: httpx.Client):
        payload = {
            "map_name": "Test Map",
            "floor_number": 1,
            "width": 3,
            "height": 3,
            "grid_data": self._make_grid(),
            "website": "",
        }
        res = client.post("/maps", json=payload, cookies=session_cookies())
        assert res.status_code == 201
        body = res.json()
        assert "id" in body
        assert body["map_name"] == "Test Map"
        assert len(body["cells"]) == 9
        COOKIES["map_id"] = body["id"]

    def test_get_map(self, client: httpx.Client):
        map_id = COOKIES.get("map_id")
        if not map_id:
            pytest.skip("map_id not available")
        res = client.get(f"/maps/{map_id}", cookies=session_cookies())
        assert res.status_code == 200
        body = res.json()
        assert body["id"] == map_id

    def test_invalid_cell_type_rejected(self, client: httpx.Client):
        payload = {
            "map_name": "Bad Map",
            "floor_number": 1,
            "width": 2,
            "height": 2,
            "grid_data": [{"x": 0, "y": 0, "cell_type": "INVALID", "floor_connection": None}],
            "website": "",
        }
        res = client.post("/maps", json=payload, cookies=session_cookies())
        assert res.status_code == 422

    def test_stair_without_floor_connection_rejected(self, client: httpx.Client):
        payload = {
            "map_name": "Stair Map",
            "floor_number": 1,
            "width": 2,
            "height": 2,
            "grid_data": [{"x": 0, "y": 0, "cell_type": "STAIR_UP", "floor_connection": None}],
            "website": "",
        }
        res = client.post("/maps", json=payload, cookies=session_cookies())
        assert res.status_code == 422


class TestRobots:
    def test_create_robot(self, client: httpx.Client):
        payload = {
            "robot_name": "RoboA",
            "model_type": "STANDARD",
            "capabilities": ["BASIC_CLEAN"],
            "website": "",
        }
        res = client.post("/robots", json=payload, cookies=session_cookies())
        assert res.status_code == 201
        body = res.json()
        assert body["robot_name"] == "RoboA"
        assert body["status"] == "IDLE"
        assert len(body["capabilities"]) == 1
        COOKIES["robot_id"] = body["id"]

    def test_invalid_model_type_rejected(self, client: httpx.Client):
        payload = {
            "robot_name": "Bad",
            "model_type": "SUPER_BOT",
            "capabilities": [],
            "website": "",
        }
        res = client.post("/robots", json=payload, cookies=session_cookies())
        assert res.status_code == 422

    def test_position_no_data(self, client: httpx.Client):
        robot_id = COOKIES.get("robot_id")
        if not robot_id:
            pytest.skip("robot_id not available")
        res = client.get(f"/robots/{robot_id}/position", cookies=session_cookies())
        assert res.status_code == 404


class TestJobs:
    def test_create_job(self, client: httpx.Client):
        robot_id = COOKIES.get("robot_id")
        map_id = COOKIES.get("map_id")
        if not robot_id or not map_id:
            pytest.skip("robot_id / map_id not available")

        payload = {
            "robot_id": robot_id,
            "map_id": map_id,
            "job_type": "FULL_CLEAN",
            "priority": 5,
            "website": "",
        }
        res = client.post("/jobs", json=payload, cookies=session_cookies())
        assert res.status_code == 201
        body = res.json()
        assert body["status"] == "PENDING"
        COOKIES["job_id"] = body["id"]

    def test_history_empty_ok(self, client: httpx.Client):
        res = client.get("/jobs/history", cookies=session_cookies())
        assert res.status_code == 200
        body = res.json()
        assert "history" in body
        assert "total" in body

    def test_start_job(self, client: httpx.Client):
        job_id = COOKIES.get("job_id")
        if not job_id:
            pytest.skip("job_id not available")
        res = client.post(f"/jobs/{job_id}/start", cookies=session_cookies())
        assert res.status_code == 200
        body = res.json()
        assert "started_at" in body

    def test_cancel_job(self, client: httpx.Client):
        job_id = COOKIES.get("job_id")
        if not job_id:
            pytest.skip("job_id not available")
        import time
        time.sleep(2)
        res = client.post(f"/jobs/{job_id}/cancel", cookies=session_cookies())
        assert res.status_code in {200, 409}

    def test_cross_session_access_denied(self, client: httpx.Client):
        map_id = COOKIES.get("map_id")
        if not map_id:
            pytest.skip("map_id not available")
        res = client.get(f"/maps/{map_id}", cookies={"session_id": "fake-session-id"})
        assert res.status_code in {401, 404}
