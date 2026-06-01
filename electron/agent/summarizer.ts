import type { CollectedItem } from './collector'

/** 要約・重要度付けが済んだアイテム */
export interface Summarized extends CollectedItem {
  aiSummary: string | null
  importance: number | null
}

/**
 * 収集記事を、カテゴリの目的に沿って要約・整理し、重要度を付ける。
 *
 * TODO(次ステップ): Claude で要約・重要度付けを実装する。
 *   `purpose` をプロンプトに織り込み、目的に沿った観点で要約させる。現状はスタブ。
 */
export async function summarize(
  items: CollectedItem[],
  purpose: string | null
): Promise<Summarized[]> {
  // purpose は将来 Claude のプロンプトに使用する（現状は未使用）
  void purpose
  return items.map((it) => ({
    ...it,
    aiSummary: `（要約スタブ）${it.title}`,
    importance: null,
  }))
}
