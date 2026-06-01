import { describe, it, expect, beforeAll } from 'vitest'
import { collectForCategory } from './collector'
import type { Category } from '@shared/types'

/**
 * 実 API を叩く「実機検証」用のオプトイン統合テスト。
 *
 * - **課金が発生する**（Web 検索 + 要約トークン）ため、既定の `npm test` では必ずスキップする。
 * - 実行するには明示的にフラグを立てる:
 *     RUN_AI_INTEGRATION=1 npx vitest run electron/agent/collect.integration.test.ts
 * - 認証は `.env` の `ANTHROPIC_API_KEY`（beforeAll で読み込む）。シェルで export 済みでも可。
 * - SDK(`query`)は Claude Code CLI サブプロセスを spawn するため、ここが通れば
 *   「鍵 + Web 検索 + 解析」のパイプラインが実機で動くことを確認できる（GUI なしの最短経路）。
 */
const enabled = process.env.RUN_AI_INTEGRATION === '1'

describe.skipIf(!enabled)('収集パイプライン 実機統合（実 API・課金あり）', () => {
  beforeAll(() => {
    // .env から ANTHROPIC_API_KEY を process.env に読み込む（シェル export 済みなら不要）
    try {
      process.loadEnvFile()
    } catch {
      /* .env が無くても、シェルで設定済みならそのまま続行 */
    }
    // 診断のため SDK メッセージ/stderr のストリームを出力する
    process.env.AI_DEBUG = '1'
  })

  it(
    '実 Web 検索で 1 件以上を収集・要約できる',
    async () => {
      const category: Category = {
        id: 1,
        name: 'AI エージェント',
        purpose: '開発者向けの最新動向をいくつか把握する',
        keywords: null,
        createdAt: new Date().toISOString(),
      }

      // 進捗イベントも検証する（UI 表示に使う）
      const phases: string[] = []
      const items = await collectForCategory(category, {
        onProgress: (p) => phases.push(p.phase),
      })

      // 結果サマリ（公開情報のタイトル・URL のみ。認証情報は出力しない）
      console.log(`\n進捗フェーズ: ${phases.join(' → ')}`)
      console.log(`収集件数: ${items.length}`)
      for (const it of items) {
        console.log(`- [重要度 ${it.importance ?? '-'}] ${it.title} (${it.source ?? it.url})`)
      }

      expect(items.length).toBeGreaterThan(0)
      for (const it of items) {
        expect(it.title).toBeTruthy()
        expect(it.url).toMatch(/^https?:\/\//)
      }
      // 進捗が start → … → search → … と通知されること
      expect(phases[0]).toBe('start')
      expect(phases).toContain('search')
    },
    // client 側の 90 秒 abort が先に発火し、ストリームログ付きで失敗するように余裕を持たせる
    180_000
  )
})
