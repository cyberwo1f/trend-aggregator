import type { Category } from '@shared/types'
import { runAgentQuery, type AgentQueryInput } from './client'
import { parseSummarized } from './summarizer'
import type { Summarized } from './types'

/** 要約品質とコストのバランスで選ぶ既定モデル（必要に応じて変更可） */
export const DEFAULT_MODEL = 'claude-sonnet-4-6'

/** カテゴリの目的に沿った収集プロンプトを組み立てる（純粋関数・テスト対象） */
export function buildCollectionPrompt(category: Category): AgentQueryInput {
  const purpose = category.purpose?.trim() || '(指定なし)'
  const keywords = category.keywords?.trim()

  const prompt =
    `カテゴリ「${category.name}」の最新トレンドを収集してください。\n` +
    `調査目的: ${purpose}` +
    (keywords ? `\n重視するキーワード: ${keywords}` : '')

  const systemPrompt =
    'あなたはトレンド収集アシスタントです。与えられたカテゴリの目的に沿って次を行います:\n' +
    '1. WebSearch で関連する最新の記事を探す\n' +
    '2. WebFetch で必要に応じて本文を取得する\n' +
    '3. 各記事を目的の観点で日本語で簡潔に要約し、重要度を 1〜10 で付ける\n' +
    '4. 最終出力は JSON 配列のみ。各要素は ' +
    '{"title","url","source","summary","importance"} とする。JSON 以外の文章は出力しない。'

  return {
    prompt,
    systemPrompt,
    allowedTools: ['WebSearch', 'WebFetch'],
    model: DEFAULT_MODEL,
  }
}

/**
 * カテゴリの目的に沿って Web を検索し、要約・整理済みのアイテムを返す。
 * 実際の SDK 呼び出しは {@link runAgentQuery} に隔離している（テストではモック）。
 */
export async function collectForCategory(category: Category): Promise<Summarized[]> {
  const text = await runAgentQuery(buildCollectionPrompt(category))
  return parseSummarized(text)
}
