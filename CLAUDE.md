# 社内ルール対応AIチャットボット開発プロジェクト

## 1. プロジェクト概要

### 目的
OneDriveやGoogle Driveに保管されている社内規程のドキュメント（PDF, Excel等）を学習し、社員がChatworkから質問すると自動で回答するAIチャットボットを開発する。

### 技術スタック
- **AI基盤**: Google Cloud Platform (GCP)
  - **AIサービス**: Vertex AI Search & Conversation
  - **AIモデル**: Gemini (Flashシリーズなど高速なモデルを想定)
  - **データ連携**: Cloud Functions
- **アプリケーション**: Next.js (App Router)
- **ホスティング**: Vercel
- **連携サービス**:
  - Chatwork API (Webhook)
  - Microsoft Graph API (OneDrive)
  - Google Drive API

### 重要要件
- **応答性能**: 原則3秒以内の高速応答を目指す。ストリーミング応答やキャッシュも視野に入れる。

---

## 2. これまでの進捗サマリー

### Step 1: GCPのセットアップ
- GCPプロジェクトを新規作成済み。
- 以下のAPIを有効化済み。
  - `Vertex AI API`
  - `Cloud Functions API`
  - `Cloud Storage API`
- Vercelからの認証用として**サービスアカウントを作成済み**。
- 認証情報が記載された**JSONキーファイルをダウンロード済み**。

### Step 2: 開発環境のセットアップ
- `npx create-next-app`コマンドで、ローカルPCに`ai-chatbot-app`という名称のNext.jsプロジェクトを作成済み。
- 以下の構成でセットアップ済み。
  - Linter: ESLint
  - Tailwind CSS: Yes
  - `src/` directory: Yes
  - App Router: Yes

### Step 3: VercelとGitHubのセットアップ
- GitHubにリポジトリを作成し、ローカルのNext.jsプロジェクトをプッシュ済み。
- Vercelにプロジェクトを作成し、GitHubリポジトリと連携済み。
- Vercelの環境変数に以下を設定済み。
  - `GCP_CREDENTIALS`: ダウンロードしたJSONキーファイルの中身を全て設定。
  - `GCP_PROJECT_ID`: GCPのプロジェクトIDを設定。

### Step 4: APIエンドポイントの作成
- ChatworkからのWebhookを受け取るためのAPIルートとして、以下のファイルを正しい階層に作成済み。
  - **ファイルパス**: `app/api/chatwork/route.ts`
- 上記ファイルに、Webhookリクエストの受け取りと、GCPのAIを呼び出す関数の雛形コードを貼り付け済み。

---

## 3. 次のステップ

. コードの検証 (Code Verification)
対象ファイル: app/api/chatwork/route.ts

検証項目:

askAI関数が@google-cloud/discoveryengineライブラリを使用しているか確認せよ。

GCP_DATA_STORE_ID環境変数を参照しているか確認せよ。

2. 依存関係の検証 (Dependency Verification)
対象ファイル: package.json

検証項目:

dependenciesまたはdevDependencies内に@google-cloud/discoveryengineパッケージが存在するか確認せよ。

3. 環境変数の検証 (Environment Variable Verification)
検証対象: Vercelプロジェクト設定

検証項目:

以下の環境変数がすべて設定されているか確認せよ。

GCP_DATA_STORE_ID

CHATWORK_API_TOKEN

CHATWORK_MY_ID

CHATWORK_WEBHOOK_TOKEN

GCP_PROJECT_ID

GCP_CREDENTIALS

4. デプロイメント状態の確認 (Deployment Status Check)
検証対象: Vercelダッシュボード

検証項目:

直近のGitHubへのプッシュがトリガーとなり、最新のビルドが成功し、本番環境にデプロイされていることを確認せよ。

5. エンドツーエンドテストの実行 (End-to-End Test Execution)
実行プロトコル:

テストデータの準備: Google Driveの指定フォルダ内にあるドキュメントから、そのドキュメントにしか記載されていない固有の情報を特定する。

質問の実行: Chatworkの指定されたグループチャットにて、準備した情報に関する質問を投稿する。

期待される結果 (Expected Outcome):

AIがドキュメントの内容に即した正確な回答をChatworkに返信する。

失敗時の対応 (Failure Protocol):

期待される結果が得られない場合、VercelのFunction Logを取得し、エラーメッセージや関連するログ出力を報告せよ。