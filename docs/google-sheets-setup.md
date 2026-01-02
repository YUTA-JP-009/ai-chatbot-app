# Google Sheets ログ記録機能のセットアップ手順

## 1. Google Cloud Platformでサービスアカウントを作成

### 1-1. GCPコンソールにアクセス
https://console.cloud.google.com/

### 1-2. プロジェクトを選択（または新規作成）
既存のプロジェクトを選択するか、新しいプロジェクトを作成します。

### 1-3. Google Sheets APIを有効化
1. 左側メニュー → 「APIとサービス」 → 「ライブラリ」
2. 「Google Sheets API」を検索
3. 「有効にする」をクリック

### 1-4. サービスアカウントを作成
1. 左側メニュー → 「APIとサービス」 → 「認証情報」
2. 「認証情報を作成」 → 「サービスアカウント」
3. サービスアカウント名: `chatbot-sheets-logger`
4. 説明: `Chatbot Q&A logging to Google Sheets`
5. 「作成して続行」をクリック
6. ロール: 不要（スキップ）
7. 「完了」をクリック

### 1-5. サービスアカウントキーを作成
1. 作成したサービスアカウント名をクリック
2. 「キー」タブ → 「鍵を追加」 → 「新しい鍵を作成」
3. キーのタイプ: **JSON**
4. 「作成」をクリック
5. **JSONファイルがダウンロードされます（重要！）**

JSONファイルの内容（例）:
```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "xxxxx",
  "private_key": "-----BEGIN PRIVATE KEY-----\nxxxxx\n-----END PRIVATE KEY-----\n",
  "client_email": "chatbot-sheets-logger@your-project-id.iam.gserviceaccount.com",
  "client_id": "xxxxx",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/chatbot-sheets-logger%40your-project-id.iam.gserviceaccount.com"
}
```

## 2. Google Sheetsでサービスアカウントに編集権限を付与

### 2-1. スプレッドシートを開く
https://docs.google.com/spreadsheets/d/1lo0AvDdsVgb2jK3fMpos4TtLr5Whcp6uQ5KSQLayzxE/edit

### 2-2. 共有設定を開く
右上の「共有」ボタンをクリック

### 2-3. サービスアカウントのメールアドレスを追加
1. サービスアカウントのメールアドレスをコピー
   - 例: `chatbot-sheets-logger@your-project-id.iam.gserviceaccount.com`
2. 「ユーザーやグループを追加」フィールドに貼り付け
3. 権限: **編集者**
4. 「送信」をクリック

## 3. Vercelに環境変数を設定

### 3-1. Vercelダッシュボードにアクセス
https://vercel.com/yuta-jp-009s-projects/ai-chatbot-app/settings/environment-variables

### 3-2. 新しい環境変数を追加

**環境変数名:**
```
GOOGLE_SHEETS_CREDENTIALS
```

**値:**
ダウンロードしたJSONファイルの内容を**そのまま**貼り付けます。

```json
{"type":"service_account","project_id":"your-project-id","private_key_id":"xxxxx","private_key":"-----BEGIN PRIVATE KEY-----\nxxxxx\n-----END PRIVATE KEY-----\n","client_email":"chatbot-sheets-logger@your-project-id.iam.gserviceaccount.com","client_id":"xxxxx","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/chatbot-sheets-logger%40your-project-id.iam.gserviceaccount.com"}
```

**重要:** 改行を削除して1行にしてください（JSONの構造は保持）。

**環境:**
- Production
- Preview
- Development（ローカル開発時に使用）

### 3-3. 保存
「Save」ボタンをクリック

### 3-4. 再デプロイ
環境変数を追加した後、Vercelが自動的に再デプロイします。
または、手動で「Deployments」 → 最新デプロイ → 「Redeploy」を実行。

## 4. 動作確認

### 4-1. Chatworkから質問を送信
Chatworkで任意の質問を送信します。

### 4-2. スプレッドシートを確認
https://docs.google.com/spreadsheets/d/1lo0AvDdsVgb2jK3fMpos4TtLr5Whcp6uQ5KSQLayzxE/edit

以下の情報が記録されているか確認:
- A列: タイムスタンプ（例: 2026-01-02T06:35:22.123Z）
- B列: 質問者（Chatwork Account ID）
- C列: 質問文
- D列: 回答
- E列: 処理時間（秒）
- F列: promptTokenCount
- G列: 使用タグID（カンマ区切り）
- H列: エラー（あれば）

### 4-3. Vercelログを確認
https://vercel.com/yuta-jp-009s-projects/ai-chatbot-app/logs

成功時のログ:
```
✅ スプレッドシートにログを記録しました { timestamp: '2026-01-02T06:35:22.123Z', questionerId: '10655418', processingTime: 1.8 }
```

失敗時のログ:
```
❌ スプレッドシートへのログ記録に失敗しました: Error: ...
失敗したログエントリ: { timestamp: '2026-01-02T06:35:22.123Z', questionerId: '10655418', question: '...' }
```

## 5. トラブルシューティング

### エラー: `GOOGLE_SHEETS_CREDENTIALS environment variable is not set`
- Vercelの環境変数が設定されていません
- 手順3を確認してください

### エラー: `The caller does not have permission`
- サービスアカウントがスプレッドシートへのアクセス権を持っていません
- 手順2を確認してください（サービスアカウントのメールアドレスを「編集者」として追加）

### エラー: `Unable to parse range: シート1!A:H`
- スプレッドシートのシート名が「シート1」ではありません
- `app/lib/sheets-logger.ts` の `SHEET_NAME` 変数を修正してください

### ログが記録されない（エラーも出ない）
- ログ記録は非同期（Fire-and-Forget）で実行されます
- Vercelログでエラーメッセージを確認してください
- スプレッドシートの共有設定を確認してください

## 6. セキュリティに関する注意事項

### サービスアカウントキーの管理
- **JSONキーファイルは絶対にGitHubにコミットしないでください**
- `.gitignore` に `*.json` を追加済み
- Vercelの環境変数のみに保存

### スプレッドシートへのアクセス制限
- サービスアカウントには最小限の権限（編集者のみ）を付与
- スプレッドシートは組織内の必要なユーザーのみに共有

## 7. ログデータの活用

### データ分析
スプレッドシートに蓄積されたデータを活用して:
- 頻出質問の特定
- 回答精度の評価
- 処理時間の監視
- エラーパターンの分析

### ピボットテーブルの作成
1. スプレッドシート上部メニュー → 「挿入」 → 「ピボットテーブル」
2. 集計例:
   - 質問者別の質問回数
   - 日別の質問数推移
   - 平均処理時間
   - エラー発生率

---

**最終更新日**: 2026年1月2日
