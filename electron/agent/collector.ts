import type { Category } from '@shared/types'

/** 収集された記事候補（要約前） */
export interface CollectedItem {
  title: string
  url: string
  source: string | null
  excerpt: string | null
  publishedAt: string | null
}

/**
 * カテゴリの目的に沿って Web を検索し、トレンド記事の候補を収集する。
 *
 * TODO(次ステップ): Claude Agent SDK (@anthropic-ai/claude-agent-sdk) の
 *   WebSearch / WebFetch ツールで実装する。認証は ANTHROPIC_API_KEY を使用予定。
 *   現状はスタブで、動作確認用のモックデータを返す。
 */
export async function collectForCategory(category: Category): Promise<CollectedItem[]> {
  const stamp = new Date().toISOString()
  return [
    {
      title: `[サンプル] ${category.name} の最新トレンド`,
      url: `https://example.com/${encodeURIComponent(category.name)}/${stamp}`,
      source: 'example.com',
      excerpt: `これはスタブの収集結果です。目的: ${category.purpose ?? '(未設定)'}`,
      publishedAt: stamp,
    },
  ]
}
