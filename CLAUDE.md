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

### その他要件
- **応答性能**: 原則3秒以内の高速応答を目指す。ストリーミング応答やキャッシュも視野に入れる。
Githubへのコミット名は日本語で記載する。

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

## 4. 現在のデータ処理フローとエラー発生箇所

### データ処理フロー図
```
1. Chatworkメッセージ受信
   ↓
2. Webhook受信 (app/api/chatwork/route.ts)
   ↓
3. メッセージ解析・認証確認
   ↓
4. askAI関数呼び出し
   ↓
5. SearchServiceClient初期化 ← ★エラー発生箇所★
   ↓
6. Discovery Engine検索実行
   ↓
7. 検索結果処理
   ↓
8. Chatwork返信
```

### 現在発生中のエラー詳細

**エラー発生箇所**: SearchServiceClient.search()実行時
**エラーコード**: 5 NOT_FOUND
**エラーメッセージ**:
```
DataStore projects/263476731898/locations/global/collections/default_collection/dataStores/internal-rules-search not found.
```

### 問題の状況分析

#### ✅ 正常に動作している部分
1. **Webhook受信**: Chatworkからのメッセージ受信は正常
2. **環境変数読み込み**:
   - `GCP_PROJECT_ID`: `ai-chatbot-prod-472104` (正しく設定済み)
   - `GCP_DATA_STORE_ID`: `internal-rules-search` (正しく設定済み)
3. **Serving Config生成**: 正しいパスが生成されている
   ```
   projects/ai-chatbot-prod-472104/locations/global/collections/default_collection/dataStores/internal-rules-search/servingConfigs/default_config
   ```

#### ❌ 問題が発生している箇所
**Google Cloudライブラリ内部での認証処理**
- コードでは正しいプロジェクトID（ai-chatbot-prod-472104）を指定
- しかし実際のAPI呼び出し時には古いプロジェクトID（263476731898）が使用される
- エラーメッセージで古いプロジェクトIDが表示される

### 試行済みの解決策

#### 解決策1: 認証情報の強制上書き
```typescript
const credentialsWithProjectId = {
  ...credentials,
  project_id: process.env.GCP_PROJECT_ID
};
```
**結果**: ❌ 効果なし

#### 解決策2: 完全な認証情報オブジェクトの再構築
```typescript
const newCredentials = {
  type: credentials.type,
  project_id: process.env.GCP_PROJECT_ID,
  // 全フィールドを明示的に設定
};
```
**結果**: ❌ 効果なし

### 推定原因
1. **Google Cloudライブラリの内部キャッシュ**: 初回認証時の古いプロジェクトIDがキャッシュされている
2. **ライブラリのバージョン問題**: 使用中のライブラリバージョンに認証バグが存在する可能性
3. **Vercel実行環境の問題**: サーバーレス環境特有の認証情報継承問題

### 解決策3: API URL構造の修正とEngine IDの正確な特定
**発見した問題**: GCPコンソールURLから正しいDiscovery Engine構造を解析
- **間違っていたURL構造**: `dataStores/{dataStoreId}`
- **正しいURL構造**: `engines/{engineId}`
- **正しいEngine ID**: `internal-rules-search_1757941895913`

**解決手順**:
1. GCPコンソールURLを詳細分析：
   ```
   https://console.cloud.google.com/gen-app-builder/locations/global/engines/internal-rules-search_1757941895913/collections/1757942105818/connector/entities?project=ai-chatbot-prod-472104
   ```
2. SearchServiceClientを削除してREST API直接呼び出しに変更
3. API URL構造をEngine basedに修正
4. Vercel環境変数 `GCP_DATA_STORE_ID` を `internal-rules-search_1757941895913` に更新

**結果**: ✅ 古いプロジェクトID問題完全解決、正しいEngineアクセス成功

### 問題4: Workspace Datastores認証制限
**エラー内容**:
```
Search using service account credentials is not supported for workspace datastores.
```

**原因**: Google DriveタイプのDatastoreはサービスアカウント認証に対応していない

**現在のデータストア設定**:
- **タイプ**: Drive（Workspace Datastore）
- **データソース**: Google Drive連携
- **ステータス**: 有効

### 次に試すべき解決策
1. **データストアタイプ変更**: DriveからWebsiteタイプに変更
2. **OAuth2.0認証実装**: ユーザー認証ベースのアクセス
3. **代替アプローチ**: 直接Google Drive APIを使用してDiscovery Engineを迂回

---

## 5. 現在の設定値（記録用）

### Vercel環境変数
- `GCP_PROJECT_ID`: `ai-chatbot-prod-472104`
- `GCP_DATA_STORE_ID`: `internal-rules-search_1757941895913` ✅ 更新済み
- `CHATWORK_API_TOKEN`: `d5d750c100c3351b9a6508aa9c65d7c2`
- `CHATWORK_MY_ID`: `jp-aichat`
- `CHATWORK_WEBHOOK_TOKEN`: `kBPhP7ID9abRMautz//FHPSEN2z0B4NN...`

### Discovery Engine設定
- **Engine ID**: `internal-rules-search_1757941895913` ✅ 正確な値
- **Collection ID**: `1757942105818`
- **データストアタイプ**: Drive（Workspace Datastore）
- **API URL**: `projects/ai-chatbot-prod-472104/locations/global/collections/default_collection/engines/internal-rules-search_1757941895913/servingConfigs/default_config:search` ✅ 修正済み



