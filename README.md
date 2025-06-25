# Claude Usage Slack Profile Updater

ClaudeのコストをSlackのプロフィールタイトルに自動更新するNode.jsアプリケーション

## セットアップ

1. 依存関係をインストール:
```bash
npm install
```

2. Slack App トークンを取得:

   **事前準備:**
   - Slackワークスペースの管理者権限またはアプリインストール権限が必要です
   - 個人のワークスペースでも動作します

   **手順:**
   
   a. **Slack Appを作成**
      - [Slack API Apps ページ](https://api.slack.com/apps) にアクセス
      - 右上の「Create New App」ボタンをクリック
      - 「From scratch」を選択
      - App Name: 任意の名前（例: "Claude Usage Updater"）
      - Pick a workspace: 使用するワークスペースを選択
      - 「Create App」をクリック

   b. **OAuth権限を設定**
      - 左サイドメニューから「OAuth & Permissions」を選択
      - 「Scopes」セクションまでスクロール
      - 「User Token Scopes」の「Add an OAuth Scope」をクリック
      - `users.profile:write` を検索して選択
        - ※これによりプロフィールのステータス更新が可能になります

   c. **ワークスペースにインストール**
      - ページ上部の「Install to Workspace」ボタンをクリック
      - 権限確認画面で「許可する」をクリック
      - ※初回は管理者の承認が必要な場合があります

   d. **トークンをコピー**
      - インストール完了後、「OAuth & Permissions」ページに戻る
      - 「OAuth Tokens for Your Workspace」セクション
      - 「User OAuth Token」（xoxp-で始まる文字列）をコピー
      - ⚠️ このトークンは秘密情報です。GitHubなどに公開しないでください
        ```bash
         # 例: .env を Git 管理対象外にする
         echo ".env" >> .gitignore
         ```
  
         
       

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
   - `Adobe Creative Cloud 1ヶ月分程度の節約 (合計: $250.00, 節約: $50.00)`
   - `Sony α7C II ボディ程度の節約 (合計: $2400.00, 節約: $2200.00)`
   - `NVIDIA RTX 4090程度の節約 (合計: $3100.00, 節約: $2900.00)`
   - `Mac Pro M2 Ultra 基本構成程度の節約 (合計: $7000.00, 節約: $6800.00)`
   - `もはやスタートアップのサーバー代レベルの節約 (合計: $10000.00+, 節約: $9800.00+)`

## 必要な権限

- Slack: `users.profile:write`
- システム: ccusageコマンドの実行権限

## トラブルシューティング

### Slack Appトークン取得でよくある問題

#### Q: 「Create New App」ボタンが見つからない
- A: https://api.slack.com/apps にサインインしているか確認してください。右上にボタンが表示されます。

#### Q: ワークスペースが選択できない
- A: 対象のワークスペースにサインインしているアカウントでアクセスしてください。

#### Q: 「Install to Workspace」がグレーアウトしている
- A: OAuth Scopeが正しく追加されているか確認してください。`users.profile:write`が必要です。

#### Q: トークンが無効というエラーが出る
- A: トークンが正しくコピーされているか確認（xoxp-で始まる）
- A: .envファイルに余分なスペースや改行が入っていないか確認

#### Q: プロフィールが更新されない
- A: Slackアプリがワークスペースにインストールされているか確認
- A: トークンの権限が正しいか確認（User Token、Bot Tokenではない）