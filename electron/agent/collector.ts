import type { Category } from '@shared/types'
import { runAgentQuery, type AgentHooks, type AgentQueryInput } from './client'
import { parseSummarized } from './summarizer'
import type { Summarized } from './types'

/** 要約品質とコストのバランスで選ぶ既定モデル（UI で切替可能） */
export const DEFAULT_MODEL = 'claude-sonnet-4-6'

/** カテゴリの目的に沿った収集プロンプトを組み立てる（純粋関数・テスト対象） */
export function buildCollectionPrompt(category: Category, model: string = DEFAULT_MODEL): AgentQueryInput {
  const purpose = category.purpose?.trim() || '(指定なし)'
  const keywords = category.keywords?.trim()

  const prompt =
    `カテゴリ「${category.name}」の最新トレンドを収集してください。\n` +
    `調査目的: ${purpose}` +
    (keywords ? `\n重視するキーワード: ${keywords}` : '')

  const systemPrompt =
    'あなたはトレンド収集アシスタントです。与えられたカテゴリの目的に沿って次を行います:\n' +
    '1. WebSearch で関連する記事を探す（直近1か月程度の新しい情報を優先。WebSearch は2回までに抑える）\n' +
    '2. 本文確認が必要な記事だけ WebFetch する。WebFetch は合計3〜4回までに抑え、' +
    '検索結果のスニペットで十分なものは fetch しない（fetch は遅いので最小限に）\n' +
    '3. 最も関連性の高い記事を最大5件に絞り、目的の観点で日本語で簡潔に要約し、重要度を 1〜10 で付ける\n' +
    '4. 最終出力は JSON 配列のみ。各要素は ' +
    '{"title","url","source","summary","importance"} とする。JSON 以外の文章は出力しない。'

  return {
    prompt,
    systemPrompt,
    allowedTools: ['WebSearch', 'WebFetch'],
    model,
    // 検索→必要なら数件 fetch→要約、を見込んだ上限。暴走と長時間化を防ぐ
    maxTurns: 20,
    // 収集は検索+数件 fetch+要約で時間がかかる（実測 ~2分）。安全網として現実的な全体上限を設ける
    timeoutMs: 180_000,
  }
}

/** collectForCategory のオプション */
export interface CollectOptions extends AgentHooks {
  /** 収集に使うモデル（未指定は既定モデル） */
  model?: string
}

/**
 * カテゴリの目的に沿って Web を検索し、要約・整理済みのアイテムを返す。
 * 実際の SDK 呼び出しは {@link runAgentQuery} に隔離している（テストではモック）。
 */
export async function collectForCategory(
  category: Category,
  options: CollectOptions = {}
): Promise<Summarized[]> {
  const { model, ...hooks } = options
  const text = await runAgentQuery(buildCollectionPrompt(category, model), hooks)
  return parseSummarized(text)
}
