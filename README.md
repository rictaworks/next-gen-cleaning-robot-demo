# next-gen-cleaning-robot-demo

狭い隙間（NARROW_GAP）や階段（STAIR）にも対応する次世代掃除ロボットの管理・操作デモシステム。
ブラウザ上でフロアマップを設定し、ロボットの清掃ジョブをシミュレーション実行・監視できる。

---

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| フロントエンド | Next.js 15 (App Router・静的書き出し) + TypeScript + Tailwind CSS |
| バックエンド | Cloudflare Workers + Hono (TypeScript) |
| データベース | Cloudflare D1（SQLite 互換）。毎日 JST 03:00 に全データをリセット |
| 配信 | Workers Assets（フロントエンドと API を同一オリジンで配信。API は `/api`） |
| 認証 | なし（セッション ID のみ） |
| アイコン | Font Awesome |

2026-11 に Railway（FastAPI + SQLite）と Vercel から Cloudflare へ移行した。`backend/`（FastAPI）と `railway.json`・`docker-compose.yml`・`vercel.json` は移行前の構成で、現行の実行経路ではない。

---

## デモ版制約事項

- 外部 API・API キーは一切不使用
- AI 機能はルールベース BFS 経路探索で代替
- ユーザー認証なし、セッション ID をオーナーキーとして全テーブルに付与
- DB は毎日 JST 03:00 に自動リセット
- フロアマップ 1 枚・ロボット 1 台・ジョブ 1 件の最小単位でのテストのみ

---

## ローカル開発セットアップ

### 前提条件

- Node.js 22.13 以上（テストで組み込みの `node:sqlite` を使用。検証は Node 24）
- Python 3.12+（pytest による統合テストを実行する場合のみ）

### 1. フロントエンドを静的書き出し

```bash
cd frontend
npm ci
npm run build    # frontend/out/ に書き出す（Worker が配信する）
```

### 2. Worker（API と D1）起動（ポート 8787）

```bash
cd worker
npm ci
npm run db:migrate:local   # ローカル D1 にスキーマを適用（migrations/）
npm run dev                # wrangler dev --port 8787
```

### 3. フロントエンド開発サーバー（ポート 3000）

```bash
cd frontend
npm run dev    # /api/* を API_ORIGIN（既定 http://127.0.0.1:8787）へ転送する
```

ブラウザでは http://localhost:3000 を開く。Worker だけで確認する場合は http://localhost:8787 を開く。

### 環境変数

`.env.example` を参照（変数名と値の例のみ。秘密値は使わない）。

- `API_ORIGIN`（frontend・開発時のみ）: `/api/*` の転送先
- Worker の設定（`ENVIRONMENT`・`SESSION_EXPIRE_HOURS`・D1 バインディング・日次リセットの cron）は `worker/wrangler.jsonc` で管理する

---

## テスト実行

```bash
# Worker の型検査と単体・結合テスト（テストは test/pr002/worker/）
cd worker && npm run typecheck && npm test

# バックエンド統合テスト（wrangler dev 起動後・http://localhost:8787/api）
pytest test/pr001/test_backend.py -v

# E2E テスト（wrangler dev と next dev の両方を起動後）
cd frontend && npx playwright test

# フロントエンドビルド確認（型検査を含む）
cd frontend && npm run build
```

---

## API 一覧

| Method | Path | 説明 |
|--------|------|------|
| GET | `/` | セッション初期化 |
| POST | `/maps` | フロアマップ登録 |
| GET | `/maps/{map_id}` | マップ取得 |
| POST | `/robots` | ロボット登録 |
| GET | `/robots/{robot_id}/position` | 現在位置取得（ポーリング） |
| POST | `/jobs` | ジョブ作成 |
| POST | `/jobs/{job_id}/start` | ジョブ実行開始 |
| POST | `/jobs/{job_id}/cancel` | ジョブキャンセル |
| GET | `/jobs/history` | 清掃履歴取得 |

詳細: [SPEC/api.md](SPEC/api.md)

---

## ページ一覧

| タブ | 機能 |
|------|------|
| マップ | グリッドエディタでフロアマップを登録 |
| ロボット | モデル・ケイパビリティを設定してロボットを登録 |
| ジョブ | 清掃ジョブを作成・実行・キャンセル、リアルタイム位置確認 |
| 履歴 | 清掃履歴とカバレッジ率を一覧表示 |

対応言語: 日本語 / English / Francais / 中文 / Русский / Espanol / العربية

---

## ブランチ戦略

- `main`: 本番ブランチ（`src/*` 変更は PR 必須）
- `src/*` 以外（ドキュメント等）: main への直接 push 可
- PR には必ず非エンジニア向けユーザーテスト手順を記載

---

## 関連ドキュメント

- [ER 図](SPEC/er_diagram.md)
- [DFD](SPEC/dfd.md)
- [シーケンス図](SPEC/sequence_diagram.md)
- [状態遷移図](SPEC/state_diagram.md)
- [ユースケース図](SPEC/usecase_diagram.md)
- [API 仕様書](SPEC/api.md)
- [開発環境](ENV/DEVELOPMENT.md)
- [本番環境](ENV/PRODUCTION.md)
