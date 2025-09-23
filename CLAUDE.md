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
  - `GCP_PROJECT_ID`: `ai-chatbot-prod-472104`
  - `GCP_DATA_STORE_ID`: `internal-rules-search`
  - `CHATWORK_API_TOKEN`: `d5d750c100c3351b9a6508aa9c65d7c2`
  - `CHATWORK_MY_ID`: `jp-aichat`
  - `CHATWORK_WEBHOOK_TOKEN`: `kBPhP7ID9abRMautz//FHPSEN2z0B4NN...`

### Step 4: APIエンドポイントの作成
- ChatworkからのWebhookを受け取るためのAPIルートとして、以下のファイルを正しい階層に作成済み。
  - **ファイルパス**: `app/api/chatwork/route.ts`
- 上記ファイルに、Webhookリクエストの受け取りと、GCPのAIを呼び出す関数の雛形コードを貼り付け済み。

### Step 5: Discovery Engine（Data Store）の設定
- **Data Store名**: `internal-rules-search`
- **Collection ID**: `175794210581`
- **リージョン**: `global`
- **接続済みのアプリ**: `internal-rules-search`
- **データソース**: Google Drive連携済み（ドライブID: `1vAFoU52a84plm8thsOUyVf54JjIh57wX`）
- **コネクタの状態**: 有効（接続済み）
- **自動同期**: 有効

---

## 3. 解決済み問題と対策

### 問題1: プロジェクトID不一致エラー
**エラー内容**: Discovery Engine検索で古いプロジェクトID（263476731898）が参照されていた

**解決策**:
- SearchServiceClientの認証情報にプロジェクトIDを強制的に設定
- 複数箇所での明示的なプロジェクトID指定
- autoPaginate警告の解決（autoPaginate: falseを追加）

### 問題2: Data Store ID不一致
**エラー内容**: 環境変数のData Store IDが間違っていた

**解決策**:
- Vercel環境変数 `GCP_DATA_STORE_ID` を `internal-rules-search_1757941895913` から `internal-rules-search` に修正
- GCPコンソールで確認した正しいData Store名を使用

---

## 4. 現在の設定値（記録用）

### Vercel環境変数
- `GCP_PROJECT_ID`: `ai-chatbot-prod-472104`
- `GCP_DATA_STORE_ID`: `internal-rules-search`
- `CHATWORK_API_TOKEN`: `d5d750c100c3351b9a6508aa9c65d7c2`
- `CHATWORK_MY_ID`: `jp-aichat`
- `CHATWORK_WEBHOOK_TOKEN`: `kBPhP7ID9abRMautz//FHPSEN2z0B4NN...`

### Discovery Engine設定
- **Data Store名**: `internal-rules-search`
- **Collection ID**: `175794210581`
- **Serving Config**: `projects/ai-chatbot-prod-472104/locations/global/collections/default_collection/dataStores/internal-rules-search/servingConfigs/default_config`