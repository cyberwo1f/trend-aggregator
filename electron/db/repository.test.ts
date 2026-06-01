import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// repository.ts は electron の app を import するためモックする（テストでは :memory: を使う）
vi.mock('electron', () => ({
  app: { getPath: () => '/tmp' },
}))

import {
  categoriesRepo,
  closeDatabase,
  initDatabase,
  itemsRepo,
  runsRepo,
  settingsRepo,
} from './repository'
import type { Summarized } from '../agent/types'

/** テスト用に Summarized を組み立てる（url/title 以外はデフォルト） */
function makeItem(
  overrides: Partial<Summarized> & { url: string; title: string }
): Summarized {
  return {
    source: null,
    excerpt: null,
    publishedAt: null,
    aiSummary: null,
    importance: null,
    ...overrides,
  }
}

beforeEach(() => {
  closeDatabase()
  initDatabase(':memory:')
})

afterEach(() => {
  closeDatabase()
})

describe('categoriesRepo', () => {
  it('作成・取得・一覧・更新・削除ができる', () => {
    const c = categoriesRepo.create({ name: 'AI', purpose: '目的' })
    expect(c.id).toBeGreaterThan(0)
    expect(c.name).toBe('AI')
    expect(c.purpose).toBe('目的')

    expect(categoriesRepo.get(c.id)?.name).toBe('AI')
    expect(categoriesRepo.list()).toHaveLength(1)

    const u = categoriesRepo.update(c.id, { name: 'AI/ML', purpose: null })
    expect(u.name).toBe('AI/ML')
    expect(u.purpose).toBeNull()

    categoriesRepo.remove(c.id)
    expect(categoriesRepo.list()).toHaveLength(0)
  })
})

describe('itemsRepo: 再収集クリア', () => {
  it('お気に入り・後で見るは保持し、それ以外は削除する', () => {
    const cat = categoriesRepo.create({ name: 'AI' })
    const runId = runsRepo.start(cat.id)
    itemsRepo.insertCollected(cat.id, runId, [
      makeItem({ title: 'plain-1', url: 'u1' }),
      makeItem({ title: 'fav', url: 'u2' }),
      makeItem({ title: 'later', url: 'u3' }),
      makeItem({ title: 'plain-2', url: 'u4' }),
    ])

    const all = itemsRepo.list(cat.id, 'all')
    const fav = all.find((i) => i.title === 'fav')!
    const later = all.find((i) => i.title === 'later')!
    itemsRepo.setFavorite(fav.id, true)
    itemsRepo.setReadLater(later.id, true)

    expect(itemsRepo.list(cat.id, 'all')).toHaveLength(4)

    itemsRepo.clearTransient(cat.id)

    const remaining = itemsRepo
      .list(cat.id, 'all')
      .map((i) => i.title)
      .sort()
    expect(remaining).toEqual(['fav', 'later'])
  })
})

describe('itemsRepo.insertCollected: 重複排除', () => {
  it('同一カテゴリの同一 URL は無視し、新規のみ追加する', () => {
    const cat = categoriesRepo.create({ name: 'AI' })

    const added1 = itemsRepo.insertCollected(cat.id, runsRepo.start(cat.id), [
      makeItem({ title: 'a', url: 'u1' }),
      makeItem({ title: 'b', url: 'u2' }),
    ])
    expect(added1).toBe(2)

    const added2 = itemsRepo.insertCollected(cat.id, runsRepo.start(cat.id), [
      makeItem({ title: 'a-dup', url: 'u1' }), // 重複 → 無視
      makeItem({ title: 'c', url: 'u3' }), // 新規
    ])
    expect(added2).toBe(1)
    expect(itemsRepo.list(cat.id, 'all')).toHaveLength(3)
  })
})

describe('itemsRepo: フィルタとフラグ', () => {
  it('unread / favorite / readLater で絞り込める', () => {
    const cat = categoriesRepo.create({ name: 'AI' })
    itemsRepo.insertCollected(cat.id, runsRepo.start(cat.id), [
      makeItem({ title: 'x', url: 'u1' }),
      makeItem({ title: 'y', url: 'u2' }),
    ])
    const [x, y] = itemsRepo.list(cat.id, 'all')

    expect(itemsRepo.list(cat.id, 'unread')).toHaveLength(2)

    itemsRepo.setRead(x.id, true)
    expect(itemsRepo.list(cat.id, 'unread').map((i) => i.id)).toEqual([y.id])

    itemsRepo.setFavorite(x.id, true)
    expect(itemsRepo.list(cat.id, 'favorite').map((i) => i.id)).toEqual([x.id])

    itemsRepo.setReadLater(y.id, true)
    expect(itemsRepo.list(cat.id, 'readLater').map((i) => i.id)).toEqual([y.id])
  })
})

describe('runsRepo', () => {
  it('start で run を作成し、finish が例外なく完了する', () => {
    const cat = categoriesRepo.create({ name: 'AI' })
    const runId = runsRepo.start(cat.id)
    expect(runId).toBeGreaterThan(0)
    expect(() => runsRepo.finish(runId, 'done')).not.toThrow()
  })
})

describe('settingsRepo', () => {
  it('未設定なら undefined、set 後は get で取得でき、再 set で上書きする', () => {
    expect(settingsRepo.get('collection_model')).toBeUndefined()

    settingsRepo.set('collection_model', 'claude-sonnet-4-6')
    expect(settingsRepo.get('collection_model')).toBe('claude-sonnet-4-6')

    settingsRepo.set('collection_model', 'claude-haiku-4-5-20251001')
    expect(settingsRepo.get('collection_model')).toBe('claude-haiku-4-5-20251001')
  })
})
