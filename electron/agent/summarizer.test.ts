import { describe, expect, it } from 'vitest'
import { parseSummarized } from './summarizer'

describe('parseSummarized', () => {
  it('素の JSON 配列を Summarized[] に変換し、summary を aiSummary にマップする', () => {
    const text = JSON.stringify([
      { title: 'A', url: 'https://a', source: 'a.com', summary: '要約A', importance: 8 },
    ])
    const r = parseSummarized(text)
    expect(r).toHaveLength(1)
    expect(r[0]).toMatchObject({
      title: 'A',
      url: 'https://a',
      source: 'a.com',
      aiSummary: '要約A',
      importance: 8,
    })
    expect(r[0].excerpt).toBeNull()
    expect(r[0].publishedAt).toBeNull()
  })

  it('```json フェンスや前後の文章があっても抽出できる', () => {
    const text =
      'はい、結果です:\n```json\n[{"title":"B","url":"https://b","summary":"s"}]\n```\n以上です。'
    const r = parseSummarized(text)
    expect(r).toHaveLength(1)
    expect(r[0].title).toBe('B')
    expect(r[0].importance).toBeNull() // importance 欠落 → null
  })

  it('title か url が無い要素は除外する', () => {
    const text = JSON.stringify([
      { title: 'ok', url: 'https://ok' },
      { title: '', url: 'https://x' },
      { url: 'https://no-title' },
      { title: 'no-url' },
    ])
    expect(parseSummarized(text).map((i) => i.title)).toEqual(['ok'])
  })

  it('importance は 1〜10 に正規化し、範囲外・非数は null', () => {
    const text = JSON.stringify([
      { title: 'a', url: 'u1', importance: 11 },
      { title: 'b', url: 'u2', importance: 0 },
      { title: 'c', url: 'u3', importance: '5' },
      { title: 'd', url: 'u4', importance: 'high' },
    ])
    const byTitle = Object.fromEntries(parseSummarized(text).map((i) => [i.title, i.importance]))
    expect(byTitle).toEqual({ a: null, b: null, c: 5, d: null })
  })

  it('壊れた入力では例外を投げず空配列を返す', () => {
    expect(parseSummarized('not json at all')).toEqual([])
    expect(parseSummarized('')).toEqual([])
    expect(parseSummarized('[ this is { broken ]')).toEqual([])
  })
})
