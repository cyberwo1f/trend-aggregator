-- アプリのデータベーススキーマ。better-sqlite3 で初回起動時に exec される。

-- カテゴリ（ユーザー定義）
CREATE TABLE IF NOT EXISTS categories (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  purpose     TEXT,            -- 調査目的。AI 要約・整理の方向付けに使う
  keywords    TEXT,            -- 検索キーワード（任意）
  created_at  TEXT NOT NULL
);

-- 収集アイテム
CREATE TABLE IF NOT EXISTS items (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
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

CREATE INDEX IF NOT EXISTS idx_items_category ON items(category_id);

-- 収集実行ログ
CREATE TABLE IF NOT EXISTS collection_runs (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id  INTEGER REFERENCES categories(id) ON DELETE CASCADE,
  started_at   TEXT NOT NULL,
  finished_at  TEXT,
  status       TEXT NOT NULL   -- running / done / error
);

-- アプリ設定（key-value）。収集モデル等のユーザー設定を保持する
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
