# Claude Usage Slack Profile Updater

ClaudeのコストをSlackのプロフィールタイトルに自動更新するNode.jsアプリケーション

## セットアップ

1. 依存関係をインストール:
```bash
npm install
```

2. Slack App トークンを取得:
   - https://api.slack.com/apps で新しいアプリを作成
   - OAuth & Permissions で `users.profile:write` スコープを追加
   - User OAuth Token をコピー

3. 環境変数を設定:
```bash
cp .env.example .env
# .env ファイルを編集してSLACK_TOKENを設定
```

4. ccusageが利用可能であることを確認:
```bash
npx ccusage@latest monthly --json
```

## 使用方法

```bash
npm start
```

アプリケーションは1分ごとに以下を実行します：
- `npx ccusage@latest monthly --json` でClaudeの使用量を取得
- 最新月のtotalCostに応じて表示パターンを決定
- Slackプロフィールのステータステキストを更新（:claude: 絵文字付き）

### プロフィール表示例

**使用量別の表示パターン:**

1. **$200未満（Claude Max未満）**: 
   - `今月はまだ食べ放題に行くべきではない ($150.00)`
   - `Claude Max使い倒し不足 ($89.00)`
   - `もっとClaudeに頼んでも大丈夫 ($45.00)`
   - など7パターンからランダム表示

2. **$200-212（Claude Max食べ放題中）**: 
   - `Claude Max食べ放題中 ($205.00)`

3. **$212超過（高使用量）**: 
   - `Adobe Creative Cloud 1ヶ月分程度の節約 (合計: $250.00 節約$50.00)`
   - `Sony α7C II ボディ程度の節約 (合計: $2400.00 節約$2200.00)`
   - `NVIDIA RTX 4090程度の節約 (合計: $3100.00 節約$2900.00)`
   - `Mac Pro M2 Ultra 基本構成程度の節約 (合計: $7000.00 節約$6800.00)`
   - `もはやスタートアップのサーバー代レベルの節約 (合計: $10000.00+ 節約$9800.00+)`

## 必要な権限

- Slack: `users.profile:write`
- システム: ccusageコマンドの実行権限