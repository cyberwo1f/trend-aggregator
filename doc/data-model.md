# データモデル

> 関連: [アーキテクチャ](./architecture.md) / [開発ガイド](./development.md)
> 正となるスキーマは `electron/db/schema.sql`。本ドキュメントは仕様の説明。

## スキーマ（SQLite / node:sqlite）

```sql
-- カテゴリ（ユーザー定義）
CREATE TABLE categories (
  id          INTEGER PRIMARY KEY,
  name        TEXT NOT NULL,
  purpose     TEXT,            -- 調査目的。AI 要約・整理の方向付けに使う
  keywords    TEXT,            -- 検索キーワード（任意）
  created_at  TEXT NOT NULL
);

-- 収集アイテム
CREATE TABLE items (
  id            INTEGER PRIMARY KEY,
  category_id   INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  url           TEXT NOT NULL,
  source        TEXT,
  excerpt       TEXT,          -- 取得した本文の抜粋
  ai_summary    TEXT,          -- AI による要約
  importance    INTEGER,       -- AI による重要度スコア（1-10）
  published_at  TEXT,
  collected_at  TEXT NOT NULL,
  run_id        INTEGER,       -- どの収集実行で取得したか
  is_read       INTEGER NOT NULL DEFAULT 0,  -- 既読フラグ
  is_favorite   INTEGER NOT NULL DEFAULT 0,  -- お気に入り
  is_read_later INTEGER NOT NULL DEFAULT 0,  -- 後で見る
  UNIQUE(category_id, url)     -- 同一カテゴリ内の URL 重複を防止
);

-- 収集実行ログ
CREATE TABLE collection_runs (
  id           INTEGER PRIMARY KEY,
  category_id  INTEGER REFERENCES categories(id) ON DELETE CASCADE,
  started_at   TEXT NOT NULL,
  finished_at  TEXT,
  status       TEXT NOT NULL   -- running / done / error
);
```

## 状態フラグ

各アイテムは 3 つの独立したフラグを持つ。

| フラグ | 意味 | 再収集時 |
| --- | --- | --- |
| `is_read` | 既読 / 未読 | 一時アイテムなら削除対象 |
| `is_favorite` | お気に入り（残したいもの） | **保持** |
| `is_read_later` | 後で見る（未読ストック） | **保持** |

## 再収集時のクリア挙動（重要な仕様）

再収集（リフレッシュ）は次のルールで動作する。

- 一覧に並ぶ**一時的なアイテムは削除**され、新しく収集したアイテムで置き換えられる。
- **お気に入り** または **後で見る** が付いたアイテムは**削除されず保持**される。
- URL 単位で重複排除するため、保持済みアイテムが再収集で二重に増えることはない。

クリアは次のクエリで表現される。

```sql
-- 再収集時：一覧の一時アイテムのみ削除。お気に入り・後で見るは残す
DELETE FROM items
WHERE category_id = :categoryId
  AND is_favorite   = 0
  AND is_read_later = 0;
```

新規アイテムの保存は `INSERT OR IGNORE`（`UNIQUE(category_id, url)`）で行い、保持済みアイテムと URL が衝突する場合は無視する。

> この挙動はリポジトリ層のユニットテスト（`electron/db/repository.test.ts`）で回帰テスト化している。仕様変更時はテストを先に更新すること（[TDD](./development.md#tdd-ワークフロー)）。
