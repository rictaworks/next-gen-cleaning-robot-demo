# next-gen-cleaning-robot-demo 設計ドキュメント

> **対象エディション：デモ版**
> **リポジトリ名：** `next-gen-cleaning-robot-demo`
> **プラットフォーム：** ウェブ（Next.js + FastAPI + SQLite）

---

## 1. 仕様書

### 1.1 プロダクト概要

狭い隙間（NARROW_GAP）や階段（STAIR）にも対応する次世代掃除ロボットの管理・操作デモシステム。
ブラウザ上でフロアマップを設定し、ロボットの清掃ジョブをシミュレーション実行・監視できる。

### 1.2 技術スタック

| レイヤー | 技術 |
|---------|------|
| フロントエンド | Next.js (TypeScript) |
| バックエンド | FastAPI (Python) |
| DB | SQLite（デモ版固定） |
| 認証 | なし（セッションIDのみ） |
| Bot対策 | ハニーポット方式 |
| デプロイ | ワンショット（claude --dangerously-skip-permissions） |

### 1.3 デモ版制約事項

- 外部API・APIキーは一切不使用
- AI機能はルールベース（BFS経路探索）で代替
- ユーザー認証なし、セッションIDをオーナーキーとして全テーブルに付与
- セッションをまたいだデータ参照・操作は禁止
- DBは毎日JST 03:00に自動リセット
- **デモ版は最小単位のデータ（セル単位のグリッド1枚・ロボット1台・ジョブ1件）でしかテストできない**
  - 複数フロアの同時運用・複数ロボットの協調動作はMVP以降で対応
  - 実機ロボットとの通信はデモ版の設計対象外

### 1.4 個人情報の取り扱い

- 氏名・メールアドレス・住所・電話番号は保存しない
- GoogleログインなどOAuth認証は組み込まない
- セッションIDは端末識別子として扱い個人情報には該当しないと整理する

### 1.5 マスタデータ件数（デモ版）

| マスタ | 件数 | 値 |
|-------|------|---|
| cell_type_master | **6件** | FLOOR / WALL / NARROW_GAP / STAIR_UP / STAIR_DOWN / CHARGING_STATION |
| model_type_master | **3件** | STANDARD / SLIM / STAIR_CAPABLE |
| capability_master | **5件** | BASIC_CLEAN / EDGE_CLEAN / NARROW_GAP_TRAVERSE / STAIR_TRAVERSE / SPOT_CLEAN |
| job_type_master | **5件** | FULL_CLEAN / SPOT_CLEAN / EDGE_CLEAN / STAIR_CLEAN / NARROW_ONLY |
| job_status_master | **6件** | PENDING / IN_PROGRESS / COMPLETED / FAILED / CANCELLED / PAUSED |
| robot_status_master | **4件** | IDLE / RUNNING / PAUSED / ERROR |
| **合計** | **29件** | |

### 1.6 機能一覧

| 機能ID | 機能名 | 概要 |
|-------|-------|------|
| F-01 | セッション管理 | Cookie+SQLiteによるセッション発行・検証 |
| F-02 | フロアマップ登録 | グリッド形式のマップ登録（特殊地形含む） |
| F-03 | 特殊地形検証 | STAIR/NARROW_GAPの整合性チェック |
| F-04 | ロボット登録 | モデル・ケイパビリティ登録 |
| F-05 | 清掃ジョブ作成 | ジョブタイプ・地形整合性チェック付き |
| F-06 | 経路計算 | BFSによるルールベース経路生成 |
| F-07 | ジョブ実行（シミュレーション） | 擬似実行・イベント記録 |
| F-08 | ロボット現在位置取得 | リアルタイム位置ポーリング |
| F-09 | 清掃履歴取得 | カバレッジ率付き履歴一覧 |
| F-10 | ジョブキャンセル | IN_PROGRESS / PENDING の中断 |
| F-11 | DBデイリーリセット | JST 03:00 cron自動リセット |
| F-12 | ハニーポットBot対策 | hiddenフィールドによるBot判定 |

---

## 2. ER図

```
┌──────────────────────────────────────────────────────────┐
│                        ER図                               │
└──────────────────────────────────────────────────────────┘

┌─────────────┐       ┌──────────────────┐
│  sessions   │1     *│      maps        │
│─────────────│───────│──────────────────│
│ id (PK)     │       │ id (PK)          │
│ created_at  │       │ session_id (FK)  │
│ expires_at  │       │ map_name         │
└─────────────┘       │ floor_number     │
        │              │ width            │
        │              │ height           │
        │              │ created_at       │
        │              └──────────────────┘
        │                       │1
        │                       │*
        │              ┌──────────────────┐
        │              │   map_cells      │
        │              │──────────────────│
        │              │ id (PK)          │
        │              │ map_id (FK)      │
        │              │ x                │
        │              │ y                │
        │              │ cell_type        │
        │              │ floor_connection │
        │              └──────────────────┘
        │
        │1      ┌───────────────────────┐
        └──────*│       robots          │
                │───────────────────────│
                │ id (PK)               │
                │ session_id (FK)       │
                │ robot_name            │
                │ model_type            │
                │ status                │
                │ created_at            │
                └───────────────────────┘
                          │1
                          │*
                ┌─────────┴─────────────┐
                │  robot_capabilities   │
                │───────────────────────│
                │ id (PK)               │
                │ robot_id (FK)         │
                │ capability            │
                └───────────────────────┘
                          │
        ┌─────────────────┘
        │
        │           ┌───────────────────────┐
        │           │        jobs           │
        │           │───────────────────────│
sessions┤──────────*│ id (PK)               │
        │           │ session_id (FK)       │
robots──┤──────────*│ robot_id (FK)         │
        │           │ map_id (FK)           │
maps────┤──────────*│ job_type              │
                    │ status                │
                    │ priority              │
                    │ scheduled_at          │
                    │ started_at            │
                    │ completed_at          │
                    │ total_cells           │
                    │ cleaned_cells         │
                    └───────────────────────┘
                              │1
                    ┌─────────┴────────────┐
                    │                      │
          ┌─────────┴──────┐   ┌───────────┴──────────┐
          │  job_events    │   │  robot_positions      │
          │────────────────│   │───────────────────────│
          │ id (PK)        │   │ id (PK)               │
          │ job_id (FK)    │   │ job_id (FK)           │
          │ event_type     │   │ robot_id (FK)         │
          │ cell_x         │   │ x                     │
          │ cell_y         │   │ y                     │
          │ occurred_at    │   │ cell_type             │
          └────────────────┘   │ updated_at            │
                               └───────────────────────┘

          ┌──────────────────┐
          │   reset_logs     │
          │──────────────────│
          │ id (PK)          │
          │ reset_at         │
          └──────────────────┘
```

---

## 3. DFD（データフロー図）

```
┌──────────────────────────────────────────────────────────────┐
│                   DFD Level 0（コンテキスト図）                │
└──────────────────────────────────────────────────────────────┘

         ユーザー(ブラウザ)
              │
              │ HTTPリクエスト
              ▼
    ┌─────────────────────┐
    │                     │
    │  清掃ロボット管理    │──────── reset_logs
    │  デモシステム        │
    │                     │
    └─────────────────────┘
              │
              │ データ読み書き
              ▼
           SQLite DB

         cronジョブ ──────▶ DBリセット（JST 03:00）

─────────────────────────────────────────────────────────────────

                   DFD Level 1

 ユーザー
   │
   ├─[マップ操作]──▶ 【1. マップ管理プロセス】
   │                      │ map_id
   │                      ├──▶ maps
   │                      └──▶ map_cells
   │
   ├─[ロボット操作]──▶ 【2. ロボット管理プロセス】
   │                       │ robot_id
   │                       ├──▶ robots
   │                       └──▶ robot_capabilities
   │
   ├─[ジョブ操作]──▶ 【3. ジョブ管理プロセス】
   │                     │
   │                     ├──読み── maps / robots
   │                     ├──▶ jobs
   │                     └──▶【4. 経路計算プロセス】
   │                                │ path[]
   │                                ▼
   │                         【5. シミュレーション実行】
   │                                │
   │                                ├──▶ robot_positions
   │                                └──▶ job_events
   │
   ├─[履歴閲覧]──▶ 【6. 履歴取得プロセス】
   │                   │
   │                   └──読み── jobs / job_events
   │
   └─[フォーム送信]──▶ 【7. ハニーポット検証】
                           │ is_bot判定
                           └──▶ 各プロセスへ通過 or 遮断

 Cookieリクエスト ──▶ 【0. セッション管理】
                           │ session_id
                           └──▶ sessions
                                 │
                                 └── 全プロセスでオーナーキー検証
```

---

## 4. シーケンス図

### 4.1 フロアマップ登録〜ジョブ実行の主シナリオ

```
Browser          FastAPI          SQLite
  │                 │                │
  │─ GET /          │                │
  │◀── Set-Cookie: session_id        │
  │                 │──INSERT sessions│
  │                 │                │
  │─ POST /maps ───▶│                │
  │  {map_name,     │─ 特殊地形検証  │
  │   grid_data}    │  (F-03)        │
  │                 │──INSERT maps───▶│
  │                 │──INSERT map_cells▶│
  │◀── {map_id} ───│                │
  │                 │                │
  │─ POST /robots ─▶│                │
  │  {model_type,   │─ capability    │
  │   capabilities} │  整合性確認    │
  │                 │──INSERT robots─▶│
  │◀── {robot_id} ─│                │
  │                 │                │
  │─ POST /jobs ───▶│                │
  │  {robot_id,     │─ 地形×capability│
  │   map_id,       │  マトリクス確認 │
  │   job_type}     │──INSERT jobs───▶│
  │◀── {job_id} ───│                │
  │                 │                │
  │─ POST /jobs/{id}/start           │
  │                 │─ F-06経路計算  │
  │                 │  (BFS)         │
  │                 │──UPDATE jobs(IN_PROGRESS)▶│
  │                 │──UPDATE robots(RUNNING)──▶│
  │◀── {started_at}│                │
  │                 │                │
  │ (ポーリング)    │                │
  │─ GET /robots/{id}/position       │
  │                 │──SELECT robot_positions──▶│
  │◀── {x,y,cell_type}              │
  │                 │                │
  │ (シミュレーション完了)           │
  │                 │──UPDATE jobs(COMPLETED)──▶│
  │                 │──UPDATE robots(IDLE)─────▶│
  │                 │                │
  │─ GET /jobs/history               │
  │                 │──SELECT jobs───▶│
  │◀── {history[], coverage%}        │
```

### 4.2 キャンセルシナリオ

```
Browser          FastAPI          SQLite
  │                 │                │
  │─ POST /jobs/{id}/cancel          │
  │                 │─ status確認    │
  │                 │  (PENDING/IN_PROGRESS?)
  │                 │──UPDATE jobs(CANCELLED)──▶│
  │                 │──UPDATE robots(IDLE)─────▶│
  │◀── {cancelled:true, cleaned_cells}│
```

---

## 5. クラス図

```
┌─────────────────────────────────────────────────────┐
│                     クラス図                          │
└─────────────────────────────────────────────────────┘

┌──────────────────────┐
│   SessionManager     │
│──────────────────────│
│ + init_session()     │
│ + validate_session() │
│ + create_session()   │
└──────────────────────┘

┌──────────────────────┐     ┌──────────────────────┐
│    MapService        │     │   MapCell            │
│──────────────────────│     │──────────────────────│
│ + register_map()     │1───*│ x: int               │
│ + validate_terrain() │     │ y: int               │
│ + get_map()          │     │ cell_type: CellType   │
└──────────────────────┘     │ floor_connection: int│
                             └──────────────────────┘

┌──────────────────────┐
│  CellType (Enum)     │
│──────────────────────│
│ FLOOR                │
│ WALL                 │
│ NARROW_GAP           │
│ STAIR_UP             │
│ STAIR_DOWN           │
│ CHARGING_STATION     │
└──────────────────────┘

┌──────────────────────┐     ┌──────────────────────┐
│   RobotService       │     │   Robot              │
│──────────────────────│     │──────────────────────│
│ + register_robot()   │1───1│ id: str              │
│ + get_robot()        │     │ robot_name: str      │
│ + validate_caps()    │     │ model_type: ModelType│
└──────────────────────┘     │ status: RobotStatus  │
                             │ capabilities: []     │
                             └──────────────────────┘

┌──────────────────────┐
│  ModelType (Enum)    │
│──────────────────────│
│ STANDARD             │
│ SLIM                 │
│ STAIR_CAPABLE        │
└──────────────────────┘

┌──────────────────────┐
│  Capability (Enum)   │
│──────────────────────│
│ BASIC_CLEAN          │
│ EDGE_CLEAN           │
│ NARROW_GAP_TRAVERSE  │
│ STAIR_TRAVERSE       │
│ SPOT_CLEAN           │
└──────────────────────┘

┌──────────────────────┐     ┌──────────────────────┐
│   JobService         │     │   PathFinder         │
│──────────────────────│     │──────────────────────│
│ + create_job()       │────▶│ + calculate_path()   │
│ + start_job()        │     │   (BFS)              │
│ + cancel_job()       │     │ + filter_by_jobtype()│
│ + get_history()      │     │ + estimate_time()    │
└──────────────────────┘     └──────────────────────┘
         │
         ▼
┌──────────────────────┐
│  SimulationRunner    │
│──────────────────────│
│ + run_async()        │
│ + handle_obstacle()  │
│ + update_position()  │
│ + record_event()     │
└──────────────────────┘

┌──────────────────────┐
│  HoneypotValidator   │
│──────────────────────│
│ + validate()         │
└──────────────────────┘

┌──────────────────────┐
│   ResetScheduler     │
│──────────────────────│
│ + reset_db()         │
│ + log_reset()        │
└──────────────────────┘
```

---

## 6. 状態遷移図

### 6.1 ジョブの状態遷移

```
                    ┌─────────┐
                    │         │
     作成           │ PENDING │
    ──────────────▶ │         │
                    └────┬────┘
                         │
            start_job()  │        cancel()
                         ▼      ◀──────────
                  ┌─────────────┐
                  │ IN_PROGRESS │
                  └──────┬──────┘
                         │
          ┌──────────────┼──────────────┐
          │              │              │
          ▼              ▼              ▼
    ┌──────────┐   ┌──────────┐  ┌───────────┐
    │COMPLETED │   │  FAILED  │  │ CANCELLED │
    └──────────┘   └──────────┘  └───────────┘

    ※ PAUSED は IN_PROGRESS ↔ PAUSED で双方向遷移
       （障害物検知時に自動PAUSED → 再開でIN_PROGRESSへ）
```

### 6.2 ロボットの状態遷移

```
         登録
    ─────────▶ ┌──────┐
               │ IDLE │◀──────────────────┐
               └──┬───┘                   │
                  │ start_job()           │ 完了/キャンセル
                  ▼                       │
           ┌─────────┐                   │
           │ RUNNING │───────────────────▶│
           └────┬────┘                   │
                │ 障害物検知             │
                ▼                         │
           ┌─────────┐                   │
           │ PAUSED  │──再開─────────────▶│
           └────┬────┘
                │ 異常発生
                ▼
           ┌─────────┐
           │  ERROR  │
           └─────────┘
```

---

## 7. ユースケース図

```
┌────────────────────────────────────────────────────────────┐
│                  next-gen-cleaning-robot-demo               │
│                                                            │
│  ┌─────────────────────────────┐                          │
│  │      マップ管理              │                          │
│  │  ○ フロアマップを登録する    │                          │
│  │  ○ 特殊地形を設定する        │                          │
│  └─────────────────────────────┘                          │
│                                                            │
│  ┌─────────────────────────────┐                          │
│  │      ロボット管理            │                          │
│  │  ○ ロボットを登録する        │                          │
│  │  ○ ケイパビリティを設定する  │                          │
│  └─────────────────────────────┘                          │
│                                                            │
│  ┌─────────────────────────────┐                          │
│  │      ジョブ管理              │                          │
│  │  ○ 清掃ジョブを作成する      │                          │
│  │  ○ ジョブを実行する          │──────extend──▶ 経路計算  │
│  │  ○ ジョブをキャンセルする    │                          │
│  │  ○ ロボット位置を確認する    │                          │
│  └─────────────────────────────┘                          │
│                                                            │
│  ┌─────────────────────────────┐                          │
│  │      履歴・レポート          │                          │
│  │  ○ 清掃履歴を閲覧する        │                          │
│  │  ○ カバレッジ率を確認する    │                          │
│  └─────────────────────────────┘                          │
│                                                            │
└────────────────────────────────────────────────────────────┘
    ▲                              ▲
    │ユーザー                    cronジョブ
    │(ブラウザ)                     │
                              ○ DBを自動リセットする (JST 03:00)

【システム内部アクター】
  ハニーポット検証 ──include──▶ 全フォーム送信ユースケース
  セッション管理   ──include──▶ 全ユースケース
```

---

## 8. APIエンドポイント一覧

| Method | Path | 説明 |
|--------|------|------|
| GET | `/` | セッション初期化・UI配信 |
| POST | `/maps` | フロアマップ登録 |
| GET | `/maps/{map_id}` | マップ取得 |
| POST | `/robots` | ロボット登録 |
| GET | `/robots/{robot_id}/position` | 現在位置取得 |
| POST | `/jobs` | ジョブ作成 |
| POST | `/jobs/{job_id}/start` | ジョブ実行開始 |
| POST | `/jobs/{job_id}/cancel` | ジョブキャンセル |
| GET | `/jobs/history` | 清掃履歴取得 |

---

## 9. DBスキーマ（SQLite）

```sql
-- セッション
CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME
);

-- フロアマップ
CREATE TABLE maps (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES sessions(id),
    map_name TEXT NOT NULL,
    floor_number INTEGER NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- マップセル
CREATE TABLE map_cells (
    id TEXT PRIMARY KEY,
    map_id TEXT NOT NULL REFERENCES maps(id),
    x INTEGER NOT NULL,
    y INTEGER NOT NULL,
    cell_type TEXT NOT NULL
        CHECK(cell_type IN ('FLOOR','WALL','NARROW_GAP','STAIR_UP','STAIR_DOWN','CHARGING_STATION')),
    floor_connection INTEGER
);

-- ロボット
CREATE TABLE robots (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES sessions(id),
    robot_name TEXT NOT NULL,
    model_type TEXT NOT NULL CHECK(model_type IN ('STANDARD','SLIM','STAIR_CAPABLE')),
    status TEXT NOT NULL DEFAULT 'IDLE'
        CHECK(status IN ('IDLE','RUNNING','PAUSED','ERROR')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ロボットケイパビリティ
CREATE TABLE robot_capabilities (
    id TEXT PRIMARY KEY,
    robot_id TEXT NOT NULL REFERENCES robots(id),
    capability TEXT NOT NULL
        CHECK(capability IN ('BASIC_CLEAN','EDGE_CLEAN','NARROW_GAP_TRAVERSE','STAIR_TRAVERSE','SPOT_CLEAN'))
);

-- ジョブ
CREATE TABLE jobs (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES sessions(id),
    robot_id TEXT NOT NULL REFERENCES robots(id),
    map_id TEXT NOT NULL REFERENCES maps(id),
    job_type TEXT NOT NULL
        CHECK(job_type IN ('FULL_CLEAN','SPOT_CLEAN','EDGE_CLEAN','STAIR_CLEAN','NARROW_ONLY')),
    status TEXT NOT NULL DEFAULT 'PENDING'
        CHECK(status IN ('PENDING','IN_PROGRESS','COMPLETED','FAILED','CANCELLED','PAUSED')),
    priority INTEGER DEFAULT 5,
    scheduled_at DATETIME,
    started_at DATETIME,
    completed_at DATETIME,
    total_cells INTEGER DEFAULT 0,
    cleaned_cells INTEGER DEFAULT 0
);

-- ジョブイベント
CREATE TABLE job_events (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL REFERENCES jobs(id),
    event_type TEXT NOT NULL,
    cell_x INTEGER,
    cell_y INTEGER,
    occurred_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ロボット位置
CREATE TABLE robot_positions (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL REFERENCES jobs(id),
    robot_id TEXT NOT NULL REFERENCES robots(id),
    x INTEGER NOT NULL,
    y INTEGER NOT NULL,
    cell_type TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- リセットログ（リセット後も残す唯一のテーブル）
CREATE TABLE reset_logs (
    id TEXT PRIMARY KEY,
    reset_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 10. 注意事項・制限事項

### デモ版の最小単位制約

> **デモ版では最小単位のデータでしかテストできない。**
>
> 具体的には以下の制限がある：
> - フロアマップは **1フロア・1グリッドマップ** 単位での登録・テストのみ
> - ロボットは **1台** ずつの登録・操作のみ（複数ロボットの協調はMVP以降）
> - ジョブは **1件** ずつの実行（並列実行・スケジューリング最適化はMVP以降）
> - 階段をまたいだ **複数フロア連続清掃** はデモ版の動作確認範囲外
> - 本物のロボットとの **ハードウェア通信** はデモ版の設計対象外（全機能シミュレーション）
> - DBは毎日JST 03:00に全データリセットされるため、**永続的なデータ蓄積テストは不可**

### セキュリティ設計

- セッションIDは UUID v4 で生成し、他セッションのデータは参照・更新不可
- Bot対策はハニーポット方式（hidden フィールド "website"）
- SQLiteの全テーブルに `session_id` カラムを付与し、WHERE句で必ずフィルタリング

---

*ドキュメント生成日: 2026-06-06*
*リポジトリ: next-gen-cleaning-robot-demo*
*対象エディション: デモ版*
