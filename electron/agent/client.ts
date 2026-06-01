// Claude Agent SDK の薄いラッパ（シーム）。
// 実ネットワーク呼び出しはここに隔離し、テストではこのモジュールをモックする。

/** エージェント呼び出しの入力 */
export interface AgentQueryInput {
  prompt: string
  systemPrompt: string
  /** 許可するツール（例: WebSearch / WebFetch） */
  allowedTools: string[]
  model: string
  /** エージェントループの最大ターン数（暴走・長時間化の防止）。未指定なら SDK 既定 */
  maxTurns?: number
  /** 全体のタイムアウト(ms)。超過したら中断する（UI が無限に待たないため）。既定 90 秒 */
  timeoutMs?: number
}

/** 進捗イベント（UI 表示用。categoryId は呼び出し側で付与する） */
export interface AgentProgress {
  phase: 'start' | 'search' | 'fetch' | 'summarize' | 'done'
  message: string
}

/** 実行中の副作用フック（進捗通知など）。プロンプト構築とは分離する */
export interface AgentHooks {
  onProgress?: (progress: AgentProgress) => void
}

/** URL からホスト名を取り出す（進捗表示用。失敗時は元文字列の先頭） */
function hostOf(url: string): string {
  try {
    return new URL(url).host
  } catch {
    return url.slice(0, 40)
  }
}

/**
 * assistant メッセージの tool_use ブロックから進捗イベントを生成する。
 * AI_DEBUG=1 のときは併せて stderr に詳細を出す。
 */
function handleMessage(
  message: unknown,
  hooks: AgentHooks,
  log: (...a: unknown[]) => void
): void {
  const m = message as { type?: string; subtype?: string; message?: { content?: unknown } }

  if (m.type === 'system') {
    log(`system/${m.subtype ?? '?'}`)
    return
  }

  if (m.type === 'assistant') {
    const content = Array.isArray(m.message?.content) ? m.message!.content : []
    for (const block of content as Array<Record<string, unknown>>) {
      if (block.type === 'tool_use') {
        const name = String(block.name)
        const input = (block.input ?? {}) as Record<string, unknown>
        log(`tool_use: ${name} ${JSON.stringify(input).slice(0, 200)}`)
        if (name === 'WebSearch' && typeof input.query === 'string') {
          hooks.onProgress?.({ phase: 'search', message: `検索中: ${input.query}` })
        } else if (name === 'WebFetch' && typeof input.url === 'string') {
          hooks.onProgress?.({ phase: 'fetch', message: `記事を確認中: ${hostOf(input.url)}` })
        }
      } else if (block.type === 'text') {
        const text = String(block.text ?? '').replace(/\s+/g, ' ').slice(0, 120)
        if (text) {
          log(`text: ${text}`)
          // 本文テキストを出し始めた＝最終的な要約・整理フェーズ
          hooks.onProgress?.({ phase: 'summarize', message: '要約・整理しています…' })
        }
      }
    }
    return
  }

  if (m.type === 'result') {
    const r = message as { subtype?: string; num_turns?: number; duration_ms?: number }
    log(`result/${r.subtype ?? '?'} turns=${r.num_turns ?? '?'} duration=${r.duration_ms ?? '?'}ms`)
  }
}

/**
 * Claude Agent SDK でエージェントを 1 回実行し、最終テキスト結果を返す。
 *
 * - SDK は ESM-only のため動的 import で読み込む（メインプロセスは CommonJS）。
 * - 認証は `ANTHROPIC_API_KEY`（未設定なら明示的に失敗させる）。
 * - WebSearch / WebFetch は読み取り専用のため、非対話で実行できるよう権限をバイパスする。
 * - `maxTurns` でループ上限、`timeoutMs` + AbortController で全体時間を上限化する
 *   （SDK の api_retry 等で無限待ちになるのを防ぐ）。
 * - `hooks.onProgress` で検索/フェッチ等の進捗を通知（UI 表示用）。
 * - `AI_DEBUG=1` で SDK メッセージと CLI の stderr を stderr に出力（診断用）。
 */
export async function runAgentQuery(input: AgentQueryInput, hooks: AgentHooks = {}): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY が未設定です。AI 収集には API キーが必要です。')
  }

  const debug = process.env.AI_DEBUG === '1'
  const log = (...a: unknown[]) => {
    if (debug) console.error('[agent]', ...a)
  }

  const { query } = await import('@anthropic-ai/claude-agent-sdk')

  const abortController = new AbortController()
  const timeoutMs = input.timeoutMs ?? 90_000
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    log(`timeout ${timeoutMs}ms 到達 → abort`)
    abortController.abort()
  }, timeoutMs)

  hooks.onProgress?.({ phase: 'start', message: '収集を開始しています…' })
  log(`start model=${input.model} maxTurns=${input.maxTurns ?? '(既定)'} timeout=${timeoutMs}ms`)
  try {
    const response = query({
      prompt: input.prompt,
      options: {
        systemPrompt: input.systemPrompt,
        allowedTools: input.allowedTools,
        model: input.model,
        maxTurns: input.maxTurns,
        // 読み取り専用ツールのみ許可した上で、非対話実行のため権限プロンプトをバイパスする
        permissionMode: 'bypassPermissions',
        allowDangerouslySkipPermissions: true,
        abortController,
        stderr: (data: string) => log('stderr:', data.replace(/\s+$/, '')),
      },
    })

    for await (const message of response) {
      handleMessage(message, hooks, log)
      if (message.type === 'result') {
        if (message.subtype === 'success') {
          hooks.onProgress?.({ phase: 'done', message: '完了しました' })
          return message.result
        }
        throw new Error(`Agent 実行に失敗しました: ${message.subtype}`)
      }
    }
    throw new Error('Agent から結果メッセージが返りませんでした')
  } catch (err) {
    if (timedOut) {
      throw new Error(`Agent がタイムアウトしました（${timeoutMs}ms）。`)
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}
