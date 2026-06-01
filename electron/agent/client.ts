// Claude Agent SDK の薄いラッパ（シーム）。
// 実ネットワーク呼び出しはここに隔離し、テストではこのモジュールをモックする。

/** エージェント呼び出しの入力 */
export interface AgentQueryInput {
  prompt: string
  systemPrompt: string
  /** 許可するツール（例: WebSearch / WebFetch） */
  allowedTools: string[]
  model: string
}

/**
 * Claude Agent SDK でエージェントを 1 回実行し、最終テキスト結果を返す。
 *
 * - SDK は ESM-only のため動的 import で読み込む（メインプロセスは CommonJS）。
 * - 認証は `ANTHROPIC_API_KEY`（未設定なら明示的に失敗させる）。
 * - WebSearch / WebFetch は読み取り専用のため、非対話で実行できるよう権限をバイパスする。
 */
export async function runAgentQuery(input: AgentQueryInput): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY が未設定です。AI 収集には API キーが必要です。')
  }

  const { query } = await import('@anthropic-ai/claude-agent-sdk')

  const response = query({
    prompt: input.prompt,
    options: {
      systemPrompt: input.systemPrompt,
      allowedTools: input.allowedTools,
      model: input.model,
      // 読み取り専用ツールのみ許可した上で、非対話実行のため権限プロンプトをバイパスする
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
    },
  })

  for await (const message of response) {
    if (message.type === 'result') {
      if (message.subtype === 'success') return message.result
      throw new Error(`Agent 実行に失敗しました: ${message.subtype}`)
    }
  }
  throw new Error('Agent から結果メッセージが返りませんでした')
}
