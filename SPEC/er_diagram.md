# ER 図

最終更新: 2026-06-06

```mermaid
erDiagram
    sessions {
        TEXT id PK
        DATETIME created_at
        DATETIME expires_at
    }

    maps {
        TEXT id PK
        TEXT session_id FK
        TEXT map_name
        INTEGER floor_number
        INTEGER width
        INTEGER height
        DATETIME created_at
    }

    map_cells {
        TEXT id PK
        TEXT map_id FK
        INTEGER x
        INTEGER y
        TEXT cell_type
        INTEGER floor_connection
    }

    robots {
        TEXT id PK
        TEXT session_id FK
        TEXT robot_name
        TEXT model_type
        TEXT status
        DATETIME created_at
    }

    robot_capabilities {
        TEXT id PK
        TEXT robot_id FK
        TEXT capability
    }

    jobs {
        TEXT id PK
        TEXT session_id FK
        TEXT robot_id FK
        TEXT map_id FK
        TEXT job_type
        TEXT status
        INTEGER priority
        DATETIME scheduled_at
        DATETIME started_at
        DATETIME completed_at
        INTEGER total_cells
        INTEGER cleaned_cells
    }

    job_events {
        TEXT id PK
        TEXT job_id FK
        TEXT event_type
        INTEGER cell_x
        INTEGER cell_y
        DATETIME occurred_at
    }

    robot_positions {
        TEXT id PK
        TEXT job_id FK
        TEXT robot_id FK
        INTEGER x
        INTEGER y
        TEXT cell_type
        DATETIME updated_at
    }

    reset_logs {
        TEXT id PK
        DATETIME reset_at
    }

    sessions ||--o{ maps : "owns"
    sessions ||--o{ robots : "owns"
    sessions ||--o{ jobs : "owns"
    maps ||--o{ map_cells : "has"
    maps ||--o{ jobs : "used_in"
    robots ||--o{ robot_capabilities : "has"
    robots ||--o{ jobs : "assigned_to"
    robots ||--o{ robot_positions : "tracked_by"
    jobs ||--o{ job_events : "generates"
    jobs ||--o{ robot_positions : "records"
```

## マスタ値

### cell_type

| 値 | 説明 |
|----|------|
| FLOOR | 通常の床 |
| WALL | 壁（移動不可） |
| NARROW_GAP | 狭い隙間（NARROW_GAP_TRAVERSE が必要） |
| STAIR_UP | 階段（上り）（STAIR_TRAVERSE + floor_connection 必須） |
| STAIR_DOWN | 階段（下り）（STAIR_TRAVERSE + floor_connection 必須） |
| CHARGING_STATION | 充電ステーション（BFS 出発点） |

### model_type

| 値 | 説明 |
|----|------|
| STANDARD | 標準モデル |
| SLIM | スリムモデル |
| STAIR_CAPABLE | 階段対応モデル |

### capability

| 値 | 説明 |
|----|------|
| BASIC_CLEAN | 基本清掃（FULL_CLEAN に必須） |
| EDGE_CLEAN | エッジ清掃（EDGE_CLEAN に必須） |
| NARROW_GAP_TRAVERSE | 狭所通過（NARROW_ONLY に必須） |
| STAIR_TRAVERSE | 階段通過（STAIR_CLEAN に必須） |
| SPOT_CLEAN | スポット清掃（SPOT_CLEAN に必須） |
