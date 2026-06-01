import { app } from 'electron'
import { DatabaseSync } from 'node:sqlite'
import { join } from 'node:path'
import schemaSql from './schema.sql?raw'
import type { Category, CategoryInput, Item, ItemFilter } from '@shared/types'
import type { Summarized } from '../agent/types'

// SQLite には Node 標準の node:sqlite(DatabaseSync) を使う。
// ネイティブビルド不要で Electron の ABI 変更にも影響されない（実験的機能）。
let db: DatabaseSync | null = null

/** DB を初期化し、スキーマを適用する（アプリ起動時に1回呼ぶ） */
export function initDatabase(filePath?: string): DatabaseSync {
  if (db) return db
  // 未指定なら userData 配下のファイル。テストでは ':memory:' 等を渡せる。
  const file = filePath ?? join(app.getPath('userData'), 'trend-aggregator.db')
  const instance = new DatabaseSync(file)
  instance.exec('PRAGMA journal_mode = WAL')
  instance.exec('PRAGMA foreign_keys = ON')
  instance.exec(schemaSql)
  db = instance
  return db
}

/** DB を閉じる（アプリ終了時やテストのリセット用） */
export function closeDatabase(): void {
  db?.close()
  db = null
}

function getDb(): DatabaseSync {
  if (!db) throw new Error('DB が未初期化です。initDatabase() を先に呼んでください。')
  return db
}

function now(): string {
  return new Date().toISOString()
}

// ---- 行 → 型 のマッピング ----
interface CategoryRow {
  id: number
  name: string
  purpose: string | null
  keywords: string | null
  created_at: string
}
function toCategory(r: CategoryRow): Category {
  return {
    id: r.id,
    name: r.name,
    purpose: r.purpose,
    keywords: r.keywords,
    createdAt: r.created_at,
  }
}

interface ItemRow {
  id: number
  category_id: number
  title: string
  url: string
  source: string | null
  excerpt: string | null
  ai_summary: string | null
  importance: number | null
  published_at: string | null
  collected_at: string
  run_id: number | null
  is_read: number
  is_favorite: number
  is_read_later: number
}
function toItem(r: ItemRow): Item {
  return {
    id: r.id,
    categoryId: r.category_id,
    title: r.title,
    url: r.url,
    source: r.source,
    excerpt: r.excerpt,
    aiSummary: r.ai_summary,
    importance: r.importance,
    publishedAt: r.published_at,
    collectedAt: r.collected_at,
    runId: r.run_id,
    isRead: r.is_read === 1,
    isFavorite: r.is_favorite === 1,
    isReadLater: r.is_read_later === 1,
  }
}

// ---- カテゴリ ----
export const categoriesRepo = {
  list(): Category[] {
    const rows = getDb()
      .prepare('SELECT * FROM categories ORDER BY created_at ASC')
      .all() as unknown as CategoryRow[]
    return rows.map(toCategory)
  },
  get(id: number): Category | undefined {
    const row = getDb().prepare('SELECT * FROM categories WHERE id = ?').get(id) as unknown as
      | CategoryRow
      | undefined
    return row ? toCategory(row) : undefined
  },
  create(input: CategoryInput): Category {
    const info = getDb()
      .prepare('INSERT INTO categories (name, purpose, keywords, created_at) VALUES (?, ?, ?, ?)')
      .run(input.name, input.purpose ?? null, input.keywords ?? null, now())
    return categoriesRepo.get(Number(info.lastInsertRowid))!
  },
  update(id: number, input: CategoryInput): Category {
    getDb()
      .prepare('UPDATE categories SET name = ?, purpose = ?, keywords = ? WHERE id = ?')
      .run(input.name, input.purpose ?? null, input.keywords ?? null, id)
    return categoriesRepo.get(id)!
  },
  remove(id: number): void {
    getDb().prepare('DELETE FROM categories WHERE id = ?').run(id)
  },
}

// ---- アイテム ----
const FILTER_WHERE: Record<ItemFilter, string> = {
  all: '',
  unread: 'AND is_read = 0',
  favorite: 'AND is_favorite = 1',
  readLater: 'AND is_read_later = 1',
}

export const itemsRepo = {
  list(categoryId: number, filter: ItemFilter): Item[] {
    const rows = getDb()
      .prepare(
        `SELECT * FROM items
         WHERE category_id = ? ${FILTER_WHERE[filter]}
         ORDER BY importance DESC, collected_at DESC`
      )
      .all(categoryId) as unknown as ItemRow[]
    return rows.map(toItem)
  },
  setRead(id: number, value: boolean): void {
    getDb().prepare('UPDATE items SET is_read = ? WHERE id = ?').run(value ? 1 : 0, id)
  },
  setFavorite(id: number, value: boolean): void {
    getDb().prepare('UPDATE items SET is_favorite = ? WHERE id = ?').run(value ? 1 : 0, id)
  },
  setReadLater(id: number, value: boolean): void {
    getDb().prepare('UPDATE items SET is_read_later = ? WHERE id = ?').run(value ? 1 : 0, id)
  },
  /**
   * 再収集時のクリア。一覧の一時アイテムのみ削除し、
   * お気に入り・後で見るが付いたアイテムは保持する。
   */
  clearTransient(categoryId: number): void {
    getDb()
      .prepare(
        `DELETE FROM items
         WHERE category_id = ?
           AND is_favorite = 0
           AND is_read_later = 0`
      )
      .run(categoryId)
  },
  /**
   * 収集・要約済みのアイテムを保存する。
   * 同一カテゴリ内で URL が重複する場合は無視（保持済みのお気に入り等を尊重）。
   * @returns 新規に追加された件数
   */
  insertCollected(categoryId: number, runId: number, items: Summarized[]): number {
    const dbi = getDb()
    const stmt = dbi.prepare(
      `INSERT OR IGNORE INTO items
        (category_id, title, url, source, excerpt, ai_summary, importance, published_at, collected_at, run_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    const collectedAt = now()
    dbi.exec('BEGIN')
    try {
      let added = 0
      for (const it of items) {
        const info = stmt.run(
          categoryId,
          it.title,
          it.url,
          it.source,
          it.excerpt,
          it.aiSummary,
          it.importance,
          it.publishedAt,
          collectedAt,
          runId
        )
        added += Number(info.changes)
      }
      dbi.exec('COMMIT')
      return added
    } catch (err) {
      dbi.exec('ROLLBACK')
      throw err
    }
  },
}

// ---- アプリ設定（key-value） ----
export const settingsRepo = {
  get(key: string): string | undefined {
    const row = getDb().prepare('SELECT value FROM settings WHERE key = ?').get(key) as unknown as
      | { value: string }
      | undefined
    return row?.value
  },
  set(key: string, value: string): void {
    getDb()
      .prepare(
        `INSERT INTO settings (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`
      )
      .run(key, value)
  },
}

// ---- 収集実行ログ ----
export const runsRepo = {
  start(categoryId: number): number {
    const info = getDb()
      .prepare('INSERT INTO collection_runs (category_id, started_at, status) VALUES (?, ?, ?)')
      .run(categoryId, now(), 'running')
    return Number(info.lastInsertRowid)
  },
  finish(runId: number, status: 'done' | 'error'): void {
    getDb()
      .prepare('UPDATE collection_runs SET finished_at = ?, status = ? WHERE id = ?')
      .run(now(), status, runId)
  },
}
