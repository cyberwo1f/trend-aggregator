# AI 認証・コスト

> 関連: [アーキテクチャ](./architecture.md)

本アプリは **Anthropic Console の API キー（従量課金）を既定の認証方式**として実装する。今日時点で唯一の公式ルートであり、利用規約上もクリアで、軽い個人利用ならコストも月数〜$20 程度に収まる。

## 事実整理（2026-06 時点）

- Claude Free/Pro/Max の **OAuth トークンを Agent SDK 等の他製品で使うのは消費者向け利用規約違反**（2026-02 の Anthropic 声明）。→ 現状は API キー一択。
- **2026-06-15 以降**、Pro/Max プランに **Agent SDK クレジット**（Pro $20 / Max 5x $100 / Max 20x $200・月額・繰越なし・ユーザー単位）が付与され、Agent SDK・`claude -p`・サードパーティアプリから利用可能になる予定。→ サブスク方式が公式に使えるようになる見込み。
- 対話型の Claude Code 利用は従来の利用制限枠、**Agent SDK / `claude -p` のみ**がこのクレジット枠から消費される。

## 方針

- **現在**: `ANTHROPIC_API_KEY` による API キー認証のみをサポート。
- **2026-06-15 以降（フォローアップ）**: 認証を抽象化し、API キー / `CLAUDE_CODE_OAUTH_TOKEN`（`claude setup-token` で生成、有効期間 1 年）の **両対応**へ拡張する。Opus 多用など利用が重くなる場合はサブスク定額が有利。

> ⚠️ 6/15 開始の認証手順・規約の細部、および各モデルの per-token 単価は変更余地があり、本ドキュメント作成時点で完全には確証できていない。実装直前に必ず[公式記事 15036540](https://support.claude.com/en/articles/15036540) と[価格ページ](https://platform.claude.com/docs/en/about-claude/pricing)、[Agent SDK ドキュメント](https://code.claude.com/docs/en/agent-sdk/overview)で最新仕様を確認すること。

## コスト目安（軽い個人利用）

数カテゴリ × 1 日 1 回更新程度を想定した概算（**要・価格ページ確認**）。

- Web 検索: $10 / 1,000 検索（$0.01/件）。WebFetch は無料（トークン代のみ）。
- 要約トークン: Sonnet で入力 $3 / 出力 $15（per 100 万トークン）程度。
- **合計の目安: 月 $10〜20（Haiku なら $5〜10、Opus 多用なら $50〜70）。** 検索回数とモデル選択が支配項。

## API キーの保管

- **開発時**: `.env` の `ANTHROPIC_API_KEY`（コミット・ログ出力は禁止）。
- **配布パッケージ**: 平文 `.env` はパッケージから抽出容易なため使用しない。**Electron 標準の `safeStorage`** で OS キーチェーン（macOS Keychain / Windows Credential Manager / Linux secret store）に暗号化保存し、メインプロセスからのみ復号する。
