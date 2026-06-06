# Claude Safety Rules

## 削除系コマンドの禁止（重要）

以下のルールはこのワークスペース内のすべての会話で絶対に守られる：

- Claude はファイルまたはディレクトリを削除するコマンドを一切生成してはならない。
  例：rm, rm -rf, rm *, rmdir, unlink, cache --delete,
      lftp mirror --delete, rsync --delete, git clean -df, find -delete 等。

- 削除が必要な場合でも、Claude は削除コマンドを提案せず、
  「手動で削除してください」といった説明に留めること。

- 削除の推奨・削除操作の自動判断も禁止。

- ssh / lftp / デプロイ系スクリプトを生成する場合でも、
  削除コマンドの生成は禁止。

これらはすべての会話・コード生成に適用される。

---

# 開発ルール

## ブランチ戦略

- **main ブランチでの直接作業禁止**。
- `src/*` 以外のファイル（ドキュメント、設定ファイル等）は main への直接 push を許可。
- `src/*` の変更はすべて **PR（プルリクエスト）を作成すること**。
- PR には必ず非エンジニア向けのユーザーテスト手順を丁寧に記載すること。

---

## テスト戦略（TDD 厳守）

TDD サイクル: **plan → red test → coding → green test**

- **バックエンド**: pytest (`pytest test/pr***/ -v`)
- **フロントエンド**: Jest / React Testing Library (`cd frontend && npm test`)
- **E2E**: Playwright (`cd frontend && npx playwright test`)
- **フロント動作確認**: `curl`, Playwright を使用すること
- テストは `test/pr***/` ディレクトリに作成すること
- テストの対象は開発サーバーとすること
- @.claude/TM.md に記載されたテスト手法に従うこと
- @.claude/QC10.md の品質チェック項目を満たすこと
- @.claude/OWASP10.md の脆弱性対策を実施すること
- @.claude/CC.md のコンプライアンス項目を確認すること
- **commit 前に必ず security review を実施すること**

---

## コーディング規約

- **フォールバック禁止**: フォールバック処理を書かず、例外処理をしっかり書くこと
- **デバッグトレース**: ログ出力でデバッグトレースできるようにコードを書くこと
- **クラス/関数化**: 制御構文・条件構文以外はクラスまたは関数に書くこと
- **グローバル変数禁止**: セキュリティの観点からグローバル変数を禁止する
- **文字列分離**: 文字列リテラルは設定ファイルまたはDBに分離すること
- **ハードコードチェック**: 文字列リテラルのハードコードを検出するテストを書くこと
- **アイコン**: デフォルトアイコンは **Font Awesome** を使用すること
- **絵文字禁止**: コード・コメント・ドキュメント内で絵文字を使わないこと
- **環境変数**: 環境変数は `.env` を参照すること
- **native ダイアログ禁止**: `alert()` / `confirm()` / `prompt()` はプロジェクト全体で使用禁止
- **例外処理**: フォールバックを書かず、発生しうるすべての例外に対して適切なハンドリングを書くこと

---

## 技術スタック

### デモ版（現在の実装）

- **フロントエンド**: Next.js 15 (App Router) + TypeScript + Tailwind CSS
- **バックエンド**: FastAPI (Python)
- **データベース**: SQLite（デモ版固定・毎日 JST 03:00 自動リセット）
- **認証**: なし（セッション ID のみ、Cookie: httponly/samesite=lax）
- **アイコン**: Font Awesome

### 本番版（将来対応）

- **バックエンド**: Ruby on Rails 8 (API モード)
- **データベース**: PostgreSQL 16
- **認証**: Google OAuth 2.0

### 追加スタック（必要な場合）

- **AI・解析・画像加工**: FastAPI（デモ版ではルールベース BFS で代替）
- **高速並列処理・リアルタイム通信**: Gin (Go)

### アーキテクチャ

- 規模に応じてマイクロサービス / MVC / API Gateway / メッセージングを意識すること
- メンテナンスコストとセキュリティを優先し、安全なライブラリを選択すること
- 車輪の再発明を避け、オリジナルコードを少なく保つこと

---

## 開発サーバー起動

```bash
# バックエンド（ポート 8000）
pip install -r backend/requirements.txt
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload

# フロントエンド（ポート 3000）
cd frontend && npm install && npm run dev

# 一括起動（Docker Compose）
docker compose up
```

環境変数は `.env` を参照（`DATABASE_URL`, `CORS_ORIGINS`, `SESSION_EXPIRE_HOURS` 等）。

---

## デプロイ先

- **フロントエンド**: Vercel（無料プラン）
- **バックエンド・管理画面**: Render または Railway（無料プラン）
- **ドメイン**: rictaworks.jp のサブドメイン

---

## 環境管理

- 環境の判定を必ず実装し、`development` / `test` / `production` で分岐すること
- テスト可能にするため、**開発環境は認証済み状態に分岐**すること
- 環境変数は `.env` / `.env.development` / `.env.production` で管理

---

## 多言語対応

- **当初から多言語で開発**すること
- 対応言語: 日本語、英語、フランス語、中国語、ロシア語、スペイン語、アラビア語
- **管理画面は日本語のみ**

---

## 画像・コンテンツ

- 画像は AI 生成を使用すること
- プロのライティングはライターエージェントに依頼すること

---

## ディレクトリ管理

| ディレクトリ | 用途 |
|---|---|
| `TASKS/` | タスク管理 |
| `DEBUG/` | バグ報告 |
| `CLIENT/` | クライアント要望 |
| `WORK/` | 作業報告 |
| `ENV/` | 環境設定ドキュメント |
| `ENV/DEVELOPMENT.md` | 開発環境の詳細 |
| `ENV/PRODUCTION.md` | 本番環境の詳細 |
| `SPEC/` | 仕様書・リバースエンジニアリング図 |
| `DELETE/` | ゴミ箱（削除対象の一時置き場） |

---

## SPEC ドキュメント（Mermaid 使用）

`SPEC/` には以下の図を作成・更新すること（Mermaid 記法）:

- ER 図
- DFD（データフロー図）
- シーケンス図
- クラス図
- 状態遷移図
- ユースケース図

---

## エージェント構成（.claude/agents/）

> **未作成・今後対応** — `.claude/agents/` ディレクトリは現在空。規模に応じて以下のエージェントを順次作成すること:


| エージェント | 役割 |
|---|---|
| director | プロジェクト全体の方向性・意思決定 |
| project-manager | タスク管理・スケジュール調整 |
| designer | UI/UX 設計・デザイントークン |
| debugger | バグ調査・原因特定・修正 |
| tester | テスト作成・実行・品質確認 |
| data-scientist | データ分析・可視化・モデル |
| deployer | CI/CD・インフラ・デプロイ管理 |
| writer | プロのライティング・多言語対応 |
| service-manager | サービス監視・アラート・SLA |

---

## Sub Agent ルール

### pr-checker

- PR のレビューをしない
- すべての PR を日本語にすること
- 非エンジニア向けのユーザーテストを PR 本文に丁寧に書くこと

### tester

- 全 PR 対象として、PR に書かれたユーザーテスト手順の実行スクリプトを作成すること
- @.claude/TM.md に記載されたテストを作成すること（pytest, jest など）
- テストは `test/pr***/` に作成すること
- テストの対象は開発サーバーとすること
