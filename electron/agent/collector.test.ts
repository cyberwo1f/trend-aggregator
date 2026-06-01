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
