# API 仕様書

最終更新: 2026-06-06

ベース URL: `http://localhost:8000`

認証: Cookie `session_id`（GET / で自動発行）

---

## GET /

セッションを初期化し、session_id Cookie を発行する。

**レスポンス** `200 OK`

```json
{
  "session_id": "7857573d-46d3-4a20-88c4-e337892fd6a0",
  "expires_at": "2026-06-07T00:00:00"
}
```

---

## POST /maps

フロアマップを登録する。

**リクエスト**

```json
{
  "map_name": "1F メイン",
  "floor_number": 1,
  "width": 8,
  "height": 8,
  "grid_data": [
    { "x": 0, "y": 0, "cell_type": "WALL", "floor_connection": null },
    { "x": 1, "y": 1, "cell_type": "CHARGING_STATION", "floor_connection": null },
    { "x": 2, "y": 1, "cell_type": "FLOOR", "floor_connection": null },
    { "x": 1, "y": 3, "cell_type": "STAIR_UP", "floor_connection": 2 }
  ],
  "website": ""
}
```

- `cell_type`: `FLOOR` / `WALL` / `NARROW_GAP` / `STAIR_UP` / `STAIR_DOWN` / `CHARGING_STATION`
- `floor_connection`: `STAIR_UP` / `STAIR_DOWN` のみ必須（接続先フロア番号）
- `website`: ハニーポットフィールド（必ず空文字）

**レスポンス** `201 Created`

```json
{
  "id": "4ea5e72d-...",
  "map_name": "1F メイン",
  "floor_number": 1,
  "width": 8,
  "height": 8,
  "created_at": "2026-06-06T00:00:00",
  "cells": [...]
}
```

**エラー**

| コード | 条件 |
|-------|------|
| 400 | ハニーポット検知（website に値あり） |
| 401 | セッション無効・期限切れ |
| 422 | 不正な cell_type / STAIR に floor_connection なし |

---

## GET /maps/{map_id}

マップを取得する。

**レスポンス** `200 OK` — POST /maps と同形式

**エラー**

| コード | 条件 |
|-------|------|
| 401 | セッション無効 |
| 404 | 存在しない / 他セッションのマップ |

---

## POST /robots

ロボットを登録する。

**リクエスト**

```json
{
  "robot_name": "RoboX",
  "model_type": "STANDARD",
  "capabilities": ["BASIC_CLEAN", "EDGE_CLEAN"],
  "website": ""
}
```

- `model_type`: `STANDARD` / `SLIM` / `STAIR_CAPABLE`
- `capabilities`: `BASIC_CLEAN` / `EDGE_CLEAN` / `NARROW_GAP_TRAVERSE` / `STAIR_TRAVERSE` / `SPOT_CLEAN`

**レスポンス** `201 Created`

```json
{
  "id": "3d0d1aa3-...",
  "robot_name": "RoboX",
  "model_type": "STANDARD",
  "status": "IDLE",
  "capabilities": [
    { "id": "...", "capability": "BASIC_CLEAN" }
  ],
  "created_at": "2026-06-06T00:00:00"
}
```

---

## GET /robots/{robot_id}/position

ロボットの現在位置を取得する（1 秒ポーリング推奨）。

**レスポンス** `200 OK`

```json
{
  "robot_id": "3d0d1aa3-...",
  "job_id": "0ce5b09c-...",
  "x": 3,
  "y": 2,
  "cell_type": "FLOOR",
  "updated_at": "2026-06-06T00:40:53"
}
```

**エラー**

| コード | 条件 |
|-------|------|
| 404 | ロボット未登録 / 位置データなし（ジョブ未開始） |

---

## POST /jobs

清掃ジョブを作成する。

**リクエスト**

```json
{
  "robot_id": "3d0d1aa3-...",
  "map_id": "4ea5e72d-...",
  "job_type": "FULL_CLEAN",
  "priority": 5,
  "website": ""
}
```

- `job_type`: `FULL_CLEAN` / `SPOT_CLEAN` / `EDGE_CLEAN` / `STAIR_CLEAN` / `NARROW_ONLY`
- `priority`: 1〜10（デフォルト 5）

**ジョブタイプ × 必須ケイパビリティ**

| job_type | 必須 capability | マップ必須セル |
|----------|----------------|--------------|
| FULL_CLEAN | BASIC_CLEAN | — |
| SPOT_CLEAN | SPOT_CLEAN | — |
| EDGE_CLEAN | EDGE_CLEAN | — |
| STAIR_CLEAN | STAIR_TRAVERSE | STAIR_UP または STAIR_DOWN |
| NARROW_ONLY | NARROW_GAP_TRAVERSE | NARROW_GAP |

**レスポンス** `201 Created`

```json
{
  "id": "0ce5b09c-...",
  "robot_id": "3d0d1aa3-...",
  "map_id": "4ea5e72d-...",
  "job_type": "FULL_CLEAN",
  "status": "PENDING",
  "priority": 5,
  "scheduled_at": null,
  "started_at": null,
  "completed_at": null,
  "total_cells": 0,
  "cleaned_cells": 0
}
```

**エラー**

| コード | 条件 |
|-------|------|
| 404 | ロボット / マップが存在しない |
| 409 | ロボットが IDLE でない |
| 422 | ケイパビリティ不足 / マップに必要なセルなし |

---

## POST /jobs/{job_id}/start

ジョブを開始する（BFS 経路計算 → 非同期シミュレーション開始）。

**レスポンス** `200 OK`

```json
{
  "job_id": "0ce5b09c-...",
  "started_at": "2026-06-06T00:40:51"
}
```

**エラー**

| コード | 条件 |
|-------|------|
| 404 | ジョブが存在しない |
| 409 | ジョブが PENDING でない |

---

## POST /jobs/{job_id}/cancel

ジョブをキャンセルする。

**レスポンス** `200 OK`

```json
{
  "cancelled": true,
  "job_id": "0ce5b09c-...",
  "cleaned_cells": 5
}
```

**エラー**

| コード | 条件 |
|-------|------|
| 404 | ジョブが存在しない |
| 409 | PENDING / IN_PROGRESS / PAUSED 以外はキャンセル不可 |

---

## GET /jobs/history

セッション内の清掃履歴を取得する。

**レスポンス** `200 OK`

```json
{
  "history": [
    {
      "id": "0ce5b09c-...",
      "robot_id": "3d0d1aa3-...",
      "map_id": "4ea5e72d-...",
      "job_type": "FULL_CLEAN",
      "status": "COMPLETED",
      "started_at": "2026-06-06T00:40:51",
      "completed_at": "2026-06-06T00:40:56",
      "total_cells": 9,
      "cleaned_cells": 9,
      "coverage_pct": 100.0
    }
  ],
  "total": 1
}
```
