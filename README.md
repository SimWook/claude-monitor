# Claude Monitor

Claude Code のリアルタイム監視ダッシュボード。ターミナル上で稼働状況、トークン消費、サブエージェント、TODO を一画面で把握できます。

> **対象**: Claude Code (CLI) を日常的に使用する開発者
> **動作環境**: macOS + Node.js 18 以上 + ターミナル (Ghostty / iTerm2 / Terminal.app)

## 機能一覧

| 機能 | 説明 |
|---|---|
| **作業履歴** | セッション一覧を Branch / Summary / メッセージ数 / 経過時間で表示 |
| **トークン効率** | Cache Hit% / Output比率 / 本日vs平均 の3ゲージで可視化 |
| **サブエージェント** | 稼働中エージェントのID、プロジェクト、担当タスク、経過時間を表示 |
| **TODO管理** | 作業履歴から `t` キーでTODO登録/完了/削除。セッション間で永続化 |
| **トークン推移** | 7日間のキャッシュ vs I/O トークン推移をライングラフで表示 |
| **日別消費量** | 7日間の日別トークン消費量をバーチャートで表示 |
| **ヘッダー** | 現在のモデル名、稼働セッション数、累計費用、エージェント数 |

## ダッシュボードレイアウト

```
┌─────────────────── HEADER ────────────────────┐
│ CLAUDE MONITOR | モデル: opus 4.6 | 稼働中: 1  │
├────────────────────────┬──────────────────────┤
│                        │ トークン効率          │
│                        │  Cache命中 ████░ 80% │
│     作業履歴            │  出力比率  ██░░░ 12% │
│  (セッション一覧)       │  本日/平均 ███░░ 67% │
│  [t] でTODO切替        ├──────────────────────┤
│                        │ サブエージェント       │
│                        │  a8c3e2  5s workspace │
│                        │   ダッシュボード調査.. │
├────────────────────────┬──────────────────────┤
│                        │                      │
│  トークン推移 (7日間)    │  TODO (3件)          │
│  キャッシュ vs I/O      │  □ workspace 調査..  │
│                        │  ✓ Mikasa 認証実装   │
├────────────────────────┴──────────────────────┤
│  日別トークン消費量 (7日間)                      │
│  ▓▓▓ ▓▓ ▓▓▓▓ ▓▓▓ ▓▓ ▓▓▓▓ ▓▓               │
└───────────────────────────────────────────────┘
```

## セットアップ

### 1. インストール

```bash
git clone https://github.com/SimWook/claude-monitor.git
cd claude-monitor
npm install
```

### 2. PATH に追加 (推奨)

```bash
npm link
```

または `.zshrc` / `.bashrc` に追加:

```bash
export PATH="$PATH:/path/to/claude-monitor/bin"
```

### 3. Claude Code フックで自動起動 (推奨)

`~/.claude/hooks.json` に以下を追加すると、Claude Code 起動時にダッシュボードが自動で立ち上がります:

```json
{
  "hooks": [
    {
      "matcher": "SessionStart",
      "hooks": [
        {
          "type": "command",
          "command": "node /path/to/claude-monitor/bin/claude-monitor.js on 2>/dev/null || true"
        }
      ]
    }
  ]
}
```

## 使い方

### 基本コマンド

```bash
# ダッシュボードを起動 (別ターミナルウィンドウで)
claude-monitor on

# ダッシュボードを停止
claude-monitor off

# 状態確認
claude-monitor status

# トグル (起動中なら停止、停止中なら起動)
claude-monitor toggle

# カレントターミナルで直接起動
claude-monitor
```

### キー操作

| キー | 動作 |
|---|---|
| `t` | 作業履歴で選択中のセッションのTODO切替 (未登録→登録→完了→削除) |
| `↑` `↓` | 作業履歴の行選択 |
| `Tab` / `Shift+Tab` | ウィジェット間フォーカス移動 |
| `r` | 画面再描画 |
| `q` / `Esc` / `Ctrl+C` | 終了 |

### TODO の使い方

1. 作業履歴パネルで対象セッションを選択
2. `t` キーを押してTODO登録 (□ マーク)
3. もう一度 `t` で完了 (✓ マーク)
4. もう一度 `t` でTODOから削除
5. 登録したTODOは右下のTODOパネルに表示され、セッション間で永続化

## アーキテクチャ

```
claude-monitor/
├── bin/
│   └── claude-monitor.js    # CLI エントリポイント (on/off/toggle/status)
├── src/
│   ├── index.js             # アプリケーション起動
│   ├── store.js             # EventEmitter ベースの状態管理
│   ├── config.js            # 設定 (ポーリング間隔、パス)
│   ├── pid.js               # PID ファイル管理
│   ├── todo-store.js        # TODO 永続化 (~/.claude-monitor-todos.json)
│   ├── collectors/          # データ収集レイヤー
│   │   ├── session-collector.js   # セッション + サブエージェント検出
│   │   ├── usage-collector.js     # トークン消費量 (JSONL パース)
│   │   ├── stats-collector.js     # 累計費用
│   │   ├── task-collector.js      # タスク状態
│   │   └── history-collector.js   # コマンド履歴
│   ├── ui/
│   │   ├── index.js               # blessed screen + grid レイアウト
│   │   └── widgets/
│   │       ├── header.js          # ヘッダーバー
│   │       ├── work-history.js    # 作業履歴テーブル
│   │       ├── token-budget.js    # トークン効率ゲージ
│   │       ├── agent-panel.js     # サブエージェント表示
│   │       ├── token-chart.js     # トークン推移チャート
│   │       ├── todo-panel.js      # TODO リスト
│   │       └── activity-sparkline.js  # 日別消費バーチャート
│   ├── engine/              # 分析エンジン
│   └── utils/               # ユーティリティ
└── package.json
```

### データフロー

```
~/.claude/ (ファイルシステム)
    │
    ├── projects/*/sessions-index.json  ──→  session-collector
    ├── projects/*/subagents/agent-*.jsonl ──→  (タスク内容抽出)
    ├── projects/*/*.jsonl              ──→  usage-collector
    ├── stats-cache.json                ──→  stats-collector
    └── tasks/                          ──→  task-collector
                                              │
                                              ▼
                                    Store (EventEmitter)
                                              │
                                              ▼
                                    UI Widgets (blessed)
```

## 依存関係

| パッケージ | 用途 |
|---|---|
| [blessed](https://github.com/chjj/blessed) | ターミナル UI フレームワーク |
| [blessed-contrib](https://github.com/yaronn/blessed-contrib) | グラフ、テーブル等のウィジェット |
| [chokidar](https://github.com/paulmillr/chokidar) | ファイル監視 |

## 動作要件

- **Node.js**: 18 以上
- **OS**: macOS (Ghostty 自動起動は macOS のみ)
- **Claude Code**: インストール済み (`~/.claude/` ディレクトリが存在すること)

## ライセンス

MIT
