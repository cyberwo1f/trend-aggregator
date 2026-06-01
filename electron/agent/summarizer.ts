import type { Summarized } from './types'

/**
 * エージェントの最終テキスト出力から JSON 配列を抽出し、Summarized[] に正規化する。
 *
 * モデル出力はコードフェンスや前後の文章を含む場合があるため頑健に抽出する。
 * 解釈できない入力や不正な要素は除外し、壊れた入力でも例外は投げない。
 */
export function parseSummarized(text: string): Summarized[] {
  const raw = extractJsonArray(text)
  if (!raw) return []
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return []
  }
  if (!Array.isArray(parsed)) return []
  return parsed.map(normalize).filter((x): x is Summarized => x !== null)
}

/** テキストから JSON 配列部分を取り出す（```json フェンス・前後の文章を許容） */
function extractJsonArray(text: string): string | null {
  if (!text) return null
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const body = fence ? fence[1] : text
  const start = body.indexOf('[')
  const end = body.lastIndexOf(']')
  if (start === -1 || end === -1 || end < start) return null
  return body.slice(start, end + 1)
}

/** JSON 要素 1 件を Summarized に正規化。title/url が無ければ null（除外） */
function normalize(el: unknown): Summarized | null {
  if (typeof el !== 'object' || el === null) return null
  const o = el as Record<string, unknown>

  const title = typeof o.title === 'string' ? o.title.trim() : ''
  const url = typeof o.url === 'string' ? o.url.trim() : ''
  if (!title || !url) return null

  const summary =
    typeof o.summary === 'string'
      ? o.summary
      : typeof o.aiSummary === 'string'
        ? o.aiSummary
        : null

  return {
    title,
    url,
    source: typeof o.source === 'string' ? o.source : null,
    excerpt: typeof o.excerpt === 'string' ? o.excerpt : null,
    publishedAt:
      typeof o.publishedAt === 'string'
        ? o.publishedAt
        : typeof o.published_at === 'string'
          ? o.published_at
          : null,
    aiSummary: summary,
    importance: clampImportance(o.importance),
  }
}

/** importance を 1〜10 の整数に正規化。範囲外・非数・欠落は null */
function clampImportance(v: unknown): number | null {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN
  if (!Number.isFinite(n)) return null
  const rounded = Math.round(n)
  return rounded >= 1 && rounded <= 10 ? rounded : null
}
