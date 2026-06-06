# ユースケース図

最終更新: 2026-06-06

```mermaid
graph LR
    User([ユーザー\nブラウザ])
    Cron([cron\nJST 03:00])

    subgraph System[next-gen-cleaning-robot-demo]
        subgraph MapUC[マップ管理]
            UC1(フロアマップを登録する)
            UC2(特殊地形を設定する)
        end

        subgraph RobotUC[ロボット管理]
            UC3(ロボットを登録する)
            UC4(ケイパビリティを設定する)
        end

        subgraph JobUC[ジョブ管理]
            UC5(清掃ジョブを作成する)
            UC6(ジョブを実行する)
            UC7(ジョブをキャンセルする)
            UC8(ロボット位置を確認する)
        end

        subgraph HistoryUC[履歴・レポート]
            UC9(清掃履歴を閲覧する)
            UC10(カバレッジ率を確認する)
        end

        subgraph InternalUC[内部処理]
            UC11(セッションを管理する)
            UC12(ハニーポット検証)
            UC13(BFS 経路を計算する)
            UC14(DB を自動リセットする)
        end
    end

    User --> UC1
    User --> UC2
    User --> UC3
    User --> UC4
    User --> UC5
    User --> UC6
    User --> UC7
    User --> UC8
    User --> UC9
    User --> UC10
    Cron --> UC14

    UC6 -.extend.-> UC13
    UC1 -.include.-> UC12
    UC3 -.include.-> UC12
    UC5 -.include.-> UC12
    UC1 -.include.-> UC11
    UC3 -.include.-> UC11
    UC5 -.include.-> UC11
    UC6 -.include.-> UC11
    UC7 -.include.-> UC11
    UC8 -.include.-> UC11
    UC9 -.include.-> UC11
```

## アクター説明

| アクター | 説明 |
|---------|------|
| ユーザー（ブラウザ） | セッション ID で識別されるデモ利用者 |
| cron（JST 03:00） | 毎日 03:00 に DB 全データをリセットする自動処理 |

## ユースケース一覧

| ID | ユースケース | 対応 API |
|----|------------|---------|
| UC1 | フロアマップを登録する | POST /maps |
| UC2 | 特殊地形を設定する | POST /maps（grid_data 内 STAIR/NARROW_GAP） |
| UC3 | ロボットを登録する | POST /robots |
| UC4 | ケイパビリティを設定する | POST /robots（capabilities[]） |
| UC5 | 清掃ジョブを作成する | POST /jobs |
| UC6 | ジョブを実行する | POST /jobs/{id}/start |
| UC7 | ジョブをキャンセルする | POST /jobs/{id}/cancel |
| UC8 | ロボット位置を確認する | GET /robots/{id}/position |
| UC9 | 清掃履歴を閲覧する | GET /jobs/history |
| UC10 | カバレッジ率を確認する | GET /jobs/history（coverage_pct） |
| UC11 | セッションを管理する | GET /（Cookie 発行） |
| UC12 | ハニーポット検証 | 全フォーム POST（website フィールド） |
| UC13 | BFS 経路を計算する | 内部処理（start 時） |
| UC14 | DB を自動リセットする | 内部処理（cron） |
