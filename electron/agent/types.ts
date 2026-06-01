// AI 収集・要約レイヤで使う型。

/** 収集された記事候補（要約前の素データ） */
export interface CollectedItem {
  title: string
  url: string
  source: string | null
  excerpt: string | null
  publishedAt: string | null
}

/** 要約・重要度付けが済んだアイテム（DB 保存対象） */
export interface Summarized extends CollectedItem {
  aiSummary: string | null
  importance: number | null
}
