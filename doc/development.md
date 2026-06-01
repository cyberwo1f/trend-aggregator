# 開発ガイド

> 関連: [アーキテクチャ](./architecture.md) / [データモデル](./data-model.md) / [AI 認証](./ai-auth.md)

## 前提

- **Node.js `20.19+` または `22.12+`**（Vite 7 / electron-vite 5 の要件）。本リポジトリは **Node 24** で動作確認済み。
- Claude の利用権（[AI 認証](./ai-auth.md)を参照）

## セットアップ

```bash
git clone <this-repo>
cd trend-aggregator
npm install        # ネイティブビルドは不要（DB は node:sqlite）

cp .env.example .env
# .env を編集して ANTHROPIC_API_KEY を設定（収集・要約がスタブの間は未設定でも起動可）
```

## スクリプト

```bash
npm run dev        # 開発モード（electron-vite: Vite dev サーバ + Electron、HMR 有効）
npm run build      # 本番ビルド（out/ に main / preload / renderer を生成）
npm run typecheck  # 型チェック（tsc --noEmit）
npm test           # テスト（Vitest, 単発）
npm run test:watch # テスト（ウォッチ）
```

## TDD ワークフロー

**このプロジェクトはテストファースト（TDD）で開発する。** 新機能・バグ修正は必ず次のサイクルで進める。

1. **Red** — 期待する振る舞いを表す**失敗するテスト**を該当層の `*.test.ts` に先に書く。
2. **Green** — テストを通す**最小限の実装**を書く。
3. **Refactor** — テストが green のままコードを整理する。

開発中は `npm run test:watch` を回しっぱなしにする。**コミット前に `npm run typecheck` と `npm test` を必ず green に保つ**こと。

### バグ修正の手順

1. バグを再現する**失敗するテスト**を追加する（これが回帰テストになる）。
2. 修正して green にする。

### 仕様変更の手順

要件（例: [再収集クリア挙動](./data-model.md#再収集時のクリア挙動重要な仕様)）を変える時は、**先に該当テストを新仕様に書き換えて** red にしてから実装する。

## テスト方針（レイヤ別）

| レイヤ | 方法 | 例 |
| --- | --- | --- |
| リポジトリ層（`electron/db`） | Vitest + `node:sqlite` を `:memory:` で。`initDatabase(':memory:')` を使い、`vi.mock('electron')` で `app` をモック | 再収集クリア保持 / 重複排除 / フィルタ（`repository.test.ts`） |
| Agent 層（`electron/agent`） | Claude / ネットワークをモックし、入出力の整形・エラー処理を検証 | 収集結果の正規化、要約の構造化（実装時に追加） |
| IPC / 結合 | repository + agent + ipc を結線して主要フローを検証 | `collect:run` が「クリア→収集→要約→保存」を行う |
| React コンポーネント | （必要に応じて）jsdom + Testing Library。現状は未導入 | フィルタ切替・トグルの表示 |

### テストの所在

- テストは対象コードと同じ階層に `*.test.ts` で置く（例: `electron/db/repository.test.ts`）。
- 設定は `vitest.config.ts`。Vite 基盤のため `import ... from './schema.sql?raw'` もそのまま解決される。

## コーディング規約

- **言語**: コード内コメント・ドキュメント・コミットメッセージは日本語。
- **型**: ドメイン型と IPC API 型は `shared/types.ts` に集約し、メイン／レンダラで共有する。
- **層の分離**: レンダラ（WebView）は DB・AI に直接触れず、必ず `window.api`（IPC）経由でメインプロセスに依頼する。
- **セキュリティ**: API キー等の認証情報はコミット・ログ出力しない（`console.log(process.env)` 禁止）。ハードコード禁止。配布時は `safeStorage` を使う（[AI 認証](./ai-auth.md#api-キーの保管)）。
- **外部収集**: 各サイトの利用規約・robots.txt を尊重する。
