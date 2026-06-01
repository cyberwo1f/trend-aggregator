# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## このプロジェクト

ユーザー定義カテゴリのトレンドを Web 検索で収集し、Claude が要約・整理するローカル単一ユーザー向け Electron デスクトップアプリ。会話・コメント・ドキュメント・コミットは日本語。

## 開発フロー（重要）

- **このプロジェクトは TDD（テストファースト）で開発する。** 変更は失敗するテスト（`*.test.ts`）を先に書き、最小実装で green にし、リファクタする。バグ修正は再現テストを先に追加。仕様変更は該当テストを新仕様へ書き換えてから実装する。
- **コミット前に `npm run typecheck` と `npm test` を必ず green に保つ。**
- 詳細な方針・レイヤ別テスト戦略は `doc/development.md`。

## コマンド

```bash
npm run dev        # 開発起動（electron-vite: Vite dev サーバ + Electron, HMR）
npm run build      # 本番ビルド（out/ に main / preload / renderer）
npm run typecheck  # 型チェック（tsc --noEmit）
npm test           # テスト（vitest run）
npm run test:watch # テスト（ウォッチ）

# 単一テスト
npx vitest run electron/db/repository.test.ts      # ファイル指定
npx vitest run -t "再収集"                          # テスト名で絞り込み
```

ネイティブビルドは不要（DB は `node:sqlite`）。GUI 確認は実機で `npm run dev`。

## アーキテクチャ（big picture）

Electron の 3 プロセス構成。**レンダラは DB・AI に直接触れず、必ず `window.api`（IPC）経由でメインプロセスに依頼する**という境界が設計の核。

```
レンダラ(React/src)  --window.api(IPC)-->  メイン(Node/electron)  -->  node:sqlite / Claude Agent SDK
```

- **IPC コントラクトは `shared/types.ts` の `AppApi` が単一の真実**。ここを起点に preload(`electron/preload.ts`) と ipc ハンドラ(`electron/ipc.ts`) が対応する。API を増減する時は `AppApi` → `preload` → `ipc` → repository/agent の順で揃える。ドメイン型（Category / Item など）もここに集約しメイン・レンダラで共有。
- **データ層 `electron/db/repository.ts`**: `node:sqlite` の `DatabaseSync`。`initDatabase(filePath?)` は省略時 `app.getPath('userData')`、テストは `':memory:'` を渡す。`closeDatabase()` でリセット。スキーマは `schema.sql` を `?raw` import して exec。`categoriesRepo` / `itemsRepo` / `runsRepo` を公開。
- **AI 層 `electron/agent/`**: Claude Agent SDK で実装済み。`client.ts`(SDK 呼び出しを隔離するシーム/ESM を動的 import・テストでモック) / `collector.ts`(`buildCollectionPrompt` でプロンプト構築 + 1 回のエージェント実行で収集と要約を兼ねる) / `summarizer.ts`(`parseSummarized`: モデルの JSON 出力を頑健に解析・正規化) / `types.ts`(共有型)。認証は `ANTHROPIC_API_KEY`、WebSearch/WebFetch を `permissionMode:'bypassPermissions'` で非対話実行。**純粋ロジック（プロンプト/解析）と SDK 呼び出しを分離し、後者をモックしてテストする**のがこの層の設計。
- **収集フロー（`ipc.ts` の `collect:run`）**: `clearTransient` → `collectForCategory`（検索+要約を 1 ループ） → `insertCollected` を実行し、`collection_runs` に記録する。

### 死守すべき不変条件（要件の核・テスト済み）

- **再収集すると一覧の一時アイテムは削除されるが、お気に入り(`is_favorite`)・後で見る(`is_read_later`)は保持される。** `itemsRepo.clearTransient` がこれを表現。
- **同一カテゴリ内 URL は `UNIQUE(category_id, url)` + `INSERT OR IGNORE` で重複排除**（保持済みアイテムを尊重、新規のみ加算）。
- これらは `electron/db/repository.test.ts` で固定。挙動を変える時はテストを先に直すこと。仕様詳細は `doc/data-model.md`。

## 非自明な技術的決定

- **DB は `better-sqlite3` ではなく `node:sqlite`**: Electron 42（同梱 Node 24.15 / 新 V8）で better-sqlite3 のネイティブビルドが失敗するため。`node:sqlite` は実験的機能（起動時に警告が出る）。
- **Agent SDK は ESM-only**: メインプロセスは CommonJS のため `client.ts` で動的 `import('@anthropic-ai/claude-agent-sdk')` を使う（externalizeDepsPlugin で外部化）。
- **Vite は 7 系に固定**: electron-vite 5 のピア依存が vite `^7` 上限のため（最新 8 は不可）。plugin-react は 5 系。
- **Node は `20.19+` / `22.12+`（24 で確認）** が必須（Vite 7 / electron-vite 5 の要件）。
- **AI 認証は API キーのみ（現状）**: Claude サブスクの OAuth を SDK で使うのは規約違反。2026-06-15 以降に Agent SDK クレジットで両対応化する予定。詳細・コスト・鍵保管は `doc/ai-auth.md`。

## ドキュメント

`README.md`(入口) / `doc/architecture.md`(構成・選定根拠) / `doc/data-model.md`(スキーマ・クリア挙動) / `doc/ai-auth.md`(認証・コスト) / `doc/development.md`(開発・TDD・テスト方針)。
