// アプリ全体で共有するドメイン型と、レンダラ⇔メイン間 IPC の API 型定義。

/** ユーザー定義カテゴリ */
export interface Category {
  id: number
  name: string
  /** 調査目的。AI 要約・整理の方向付けに使う */
  purpose: string | null
  /** 検索キーワード（任意） */
  keywords: string | null
  /** ISO8601 文字列 */
  createdAt: string
}

/** カテゴリの作成・更新入力 */
export interface CategoryInput {
  name: string
  purpose?: string | null
  keywords?: string | null
}

/** 収集アイテム */
export interface Item {
  id: number
  categoryId: number
  title: string
  url: string
  source: string | null
  /** 取得した本文の抜粋 */
  excerpt: string | null
  /** AI による要約 */
  aiSummary: string | null
  /** AI による重要度スコア（1-10） */
  importance: number | null
  publishedAt: string | null
  collectedAt: string
  /** どの収集実行で取得したか */
  runId: number | null
  isRead: boolean
  isFavorite: boolean
  isReadLater: boolean
}

/** 一覧の絞り込み種別 */
export type ItemFilter = 'all' | 'unread' | 'favorite' | 'readLater'

/** 収集実行ログ */
export interface CollectionRun {
  id: number
  categoryId: number | null
  startedAt: string
  finishedAt: string | null
  status: 'running' | 'done' | 'error'
}

/** collect() の戻り値 */
export interface CollectResult {
  runId: number
  /** 新規に追加された件数 */
  added: number
}

/**
 * レンダラ(WebView)に公開する API。
 * preload の contextBridge 経由で `window.api` として参照する。
 */
export interface AppApi {
  // --- カテゴリ ---
  listCategories(): Promise<Category[]>
  createCategory(input: CategoryInput): Promise<Category>
  updateCategory(id: number, input: CategoryInput): Promise<Category>
  deleteCategory(id: number): Promise<void>

  // --- アイテム ---
  listItems(categoryId: number, filter: ItemFilter): Promise<Item[]>
  setRead(itemId: number, value: boolean): Promise<void>
  setFavorite(itemId: number, value: boolean): Promise<void>
  setReadLater(itemId: number, value: boolean): Promise<void>

  // --- 収集 ---
  /** 再収集。一覧の一時アイテムをクリア（お気に入り・後で見るは保持）して新規収集する */
  collect(categoryId: number): Promise<CollectResult>
}
