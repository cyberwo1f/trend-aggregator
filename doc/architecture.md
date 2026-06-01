# アーキテクチャ / 技術選定

> 関連: [データモデル](./data-model.md) / [AI 認証](./ai-auth.md) / [開発ガイド](./development.md)

## 技術スタック

ローカル単一ユーザー利用を前提とする。

| レイヤー | 採用 | 役割 |
| --- | --- | --- |
| UI（WebView 内） | **React 19 + Vite + TypeScript**（electron-vite） | カテゴリ／一覧／お気に入り／後で見るの画面 |
| デスクトップシェル | **Electron** | Web フロントを WebView でラップ。Node ランタイムを内包 |
| AI 収集・要約 | **Claude Agent SDK**（`@anthropic-ai/claude-agent-sdk`） | WebSearch / WebFetch を用いた収集 → 要約・整理のエージェントループ（実装予定） |
| データ保存 | **`node:sqlite`**（Node 標準の SQLite） | ローカルファイルに保存（単一ユーザー）。ネイティブビルド不要 |

### 確定バージョン（2026-06 時点）

- Node.js: `20.19+` / `22.12+`（**Node 24 で動作確認済み**）
- Electron 42 / electron-vite 5 / **Vite 7**（electron-vite 5 のピア依存が vite `^7` 上限）/ @vitejs/plugin-react 5 / React 19

## 技術選定の根拠・トレードオフ（ADR 的メモ）

- **Electron vs Tauri**: 「Next/React を WebView でラップする」発想は **Tauri**（OS ネイティブ WebView・軽量）が最も近い。ただし AI 収集ロジックは Node 製の Agent SDK が中核になるため、Node がそのまま動く **Electron** の方が同居が容易で構成がシンプル、と判断して採用。
  - 軽量さ（バンドル数 MB・低メモリ）を優先するなら **Tauri** も可。その場合は Agent SDK を **Node サイドカー**として同梱する必要がある。
  - フロントは Next.js でも可（`output: 'export'` の静的エクスポート）。SSR は不要なため、デスクトップ用途では Vite の方が単純。
- **収集元 = Web 検索**: Google を直接スクレイピングするのは利用規約違反かつ壊れやすいため非推奨。Claude の **WebSearch / WebFetch ツール**でエージェント自身が検索・本文取得・要約まで行う。非 AI 経路が必要な場合の正規代替は **Brave Search API**（無料枠あり）や **Google Custom Search JSON API**（100 検索/日まで無料）。
- **DB = `node:sqlite`**: 当初 `better-sqlite3` を想定したが、Electron 42 は新しい V8（同梱 Node 24.15）を使い、`better-sqlite3` 12.x が V8 API 変更（`External::New` のシグネチャ変更）に未対応でネイティブビルドが失敗する。Node 標準の **`node:sqlite`（`DatabaseSync`）** は API がほぼ同じ同期型で、**ネイティブビルド不要・Electron の ABI 変更に非依存**。実験的機能のため起動時に警告が出る点のみ留意（SQLite 本体は安定の 3.50 系）。

## 全体構成

```
┌─────────────────────────────────────────────┐
│ Electron アプリ                              │
│                                              │
│  ┌────────────────┐   IPC   ┌─────────────┐  │
│  │ レンダラ (WebView) │◄──────►│ メインプロセス │  │
│  │ React + Vite UI │         │ (Node)       │  │
│  └────────────────┘         │              │  │
│                             │  ┌─────────┐ │  │
│                             │  │ Agent    │ │  │   WebSearch / WebFetch
│                             │  │ (Claude) │─┼──┼──────────────► Claude API
│                             │  └─────────┘ │  │
│                             │  ┌─────────┐ │  │
│                             │  │ SQLite   │ │  │
│                             │  └─────────┘ │  │
│                             └─────────────┘  │
└─────────────────────────────────────────────┘
```

- **レンダラ（WebView）**: 画面描画とユーザー操作のみ。DB や AI には直接触れず、`window.api`（IPC）経由でメインプロセスに依頼する。
- **メインプロセス（Node）**: `node:sqlite` アクセスと、Claude Agent SDK による収集・要約を担当。
- **Agent（Claude）**: `WebSearch` でトレンド記事を発見し、`WebFetch` で本文を取得、カテゴリの目的に沿って要約・整理して構造化（JSON）で返す。

## 収集・要約フロー（Claude Agent SDK）

カテゴリの「目的」をシステムプロンプトに織り込み、エージェントに検索〜要約までを任せる。

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

// カテゴリの目的に沿ってトレンドを収集・要約する
for await (const message of query({
  prompt: `カテゴリ「${category.name}」の最新トレンドを収集してください。` +
          `目的: ${category.purpose}`,
  options: {
    allowedTools: ["WebSearch", "WebFetch"],   // 検索と本文取得のみ許可
    systemPrompt:
      `あなたはトレンド収集アシスタントです。与えられたカテゴリの目的に沿って:\n` +
      `1. WebSearch で関連する最新記事を探す\n` +
      `2. WebFetch で本文を取得する\n` +
      `3. 各記事を要約し、重要度(1-10)を付ける\n` +
      `4. {title, url, source, summary, importance} の JSON 配列で返す`,
    model: "claude-opus-4-8",
  },
})) {
  // 結果を node:sqlite に保存し、UI へ反映する
}
```

> 要約品質・コスト・速度のバランスに応じて `model` を切り替え可能（`claude-opus-4-8` / `claude-sonnet-4-6` / `claude-haiku-4-5-20251001`）。

## ディレクトリ構成

```
trend-aggregator/
├─ electron/                  # Electron メインプロセス（Node）
│  ├─ main.ts                 # ウィンドウ生成・DB 初期化・IPC 登録
│  ├─ preload.ts              # contextBridge で window.api を公開
│  ├─ ipc.ts                  # ipcMain ハンドラ（repository / agent を仲介）
│  ├─ agent/                  # 収集・要約（現状スタブ → Claude Agent SDK で実装予定）
│  │  ├─ collector.ts         # WebSearch / WebFetch で収集
│  │  └─ summarizer.ts        # カテゴリ目的に沿った要約・整理
│  └─ db/                     # node:sqlite アクセス層
│     ├─ schema.sql           # スキーマ（?raw で読み込み）
│     ├─ repository.ts        # categories / items / runs のリポジトリ
│     └─ repository.test.ts   # リポジトリ層のユニットテスト（Vitest）
├─ src/                       # React (Vite) レンダラ = WebView UI
│  ├─ index.html
│  ├─ main.tsx                # React エントリ
│  ├─ App.tsx
│  ├─ pages/HomePage.tsx      # サイドバー + 一覧の合成
│  ├─ components/             # Sidebar.tsx / ItemList.tsx
│  ├─ store/useAppStore.ts    # 画面状態 + window.api 呼び出し
│  └─ styles.css
├─ shared/types.ts            # 共有ドメイン型 + IPC API 型（AppApi）
├─ globals.d.ts               # window.api / *.sql?raw の型宣言
├─ electron.vite.config.ts    # main / preload / renderer のビルド設定
├─ vitest.config.ts           # テスト設定
├─ tsconfig.json
├─ .env.example
└─ README.md
```
