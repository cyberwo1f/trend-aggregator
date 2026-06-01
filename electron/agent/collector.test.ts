import { describe, expect, it, vi } from 'vitest'
import type { Category } from '@shared/types'

// SDK シームをモックする（実ネットワークを呼ばない）
vi.mock('./client', () => ({
  runAgentQuery: vi.fn(),
}))

import { buildCollectionPrompt, collectForCategory } from './collector'
import { runAgentQuery } from './client'

function category(overrides: Partial<Category> = {}): Category {
  return {
    id: 1,
    name: 'AI',
    purpose: null,
    keywords: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('buildCollectionPrompt', () => {
  it('カテゴリ名・目的・キーワードを含め、Web ツールのみ許可する', () => {
    const input = buildCollectionPrompt(
      category({ name: 'Rust', purpose: '採用判断', keywords: 'async, tokio' })
    )
    expect(input.prompt).toContain('Rust')
    expect(input.prompt).toContain('採用判断')
    expect(input.prompt).toContain('tokio')
    expect(input.allowedTools).toEqual(['WebSearch', 'WebFetch'])
    expect(input.systemPrompt).toMatch(/JSON/)
    // エージェントループの暴走・長時間化を防ぐため上限ターン数と全体タイムアウトを指定する
    expect(input.maxTurns).toBeGreaterThan(0)
    expect(input.timeoutMs).toBeGreaterThan(0)
    // 作業量を抑える指示（検索回数・記事件数・直近スコープ）を含む
    expect(input.systemPrompt).toMatch(/最大.*件/)
    expect(input.systemPrompt).toMatch(/直近/)
    expect(input.systemPrompt).toMatch(/2\s*回/)
  })

  it('モデル指定を反映する（未指定は既定モデル）', () => {
    expect(buildCollectionPrompt(category()).model).toBe('claude-sonnet-4-6')
    expect(buildCollectionPrompt(category(), 'claude-haiku-4-5-20251001').model).toBe(
      'claude-haiku-4-5-20251001'
    )
  })

  it('目的が未設定でも成立する', () => {
    expect(buildCollectionPrompt(category({ purpose: null })).prompt).toContain('指定なし')
  })
})

describe('collectForCategory', () => {
  it('エージェント出力を解析して Summarized[] を返す', async () => {
    vi.mocked(runAgentQuery).mockResolvedValue(
      JSON.stringify([{ title: 'T', url: 'https://t', summary: '要約', importance: 7 }])
    )
    const r = await collectForCategory(category())
    expect(runAgentQuery).toHaveBeenCalledOnce()
    expect(r).toHaveLength(1)
    expect(r[0]).toMatchObject({
      title: 'T',
      url: 'https://t',
      aiSummary: '要約',
      importance: 7,
    })
  })
})
