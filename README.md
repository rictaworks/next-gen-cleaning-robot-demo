# next-gen-cleaning-robot-demo

狭い隙間（NARROW_GAP）や階段（STAIR）にも対応する次世代掃除ロボットの管理・操作デモシステム。
ブラウザ上でフロアマップを設定し、ロボットの清掃ジョブをシミュレーション実行・監視できる。

---

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| フロントエンド | Next.js 15 (App Router) + TypeScript + Tailwind CSS |
| バックエンド | FastAPI (Python) |
| データベース | SQLite（デモ版固定） |
| 認証 | なし（セッション ID のみ） |
| アイコン | Font Awesome |

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

- Python 3.12+
- Node.js 20.x LTS

### バックエンド起動（ポート 8000）

```bash
pip install -r backend/requirements.txt
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

### フロントエンド起動（ポート 3000）

```bash
cd frontend
npm install
npm run dev
```

### Docker Compose（一括起動）

```bash
docker compose up
```

### 環境変数

`.env` を参照（リポジトリには `.env.example` を用意予定）:

```
ENVIRONMENT=development
DATABASE_URL=sqlite+aiosqlite:///./demo.db
SESSION_EXPIRE_HOURS=24
RESET_HOUR_JST=3
CORS_ORIGINS=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## テスト実行

```bash
# バックエンド統合テスト（サーバー起動後）
pytest test/pr001/test_backend.py -v

# E2E テスト（両サーバー起動後）
cd frontend && npx playwright test

# フロントエンドビルド確認
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
