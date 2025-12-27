# Kintone API トークンの取得方法

**目的**: JM記録アプリ（アプリID: 117）からデータを取得するためのAPIトークンを生成する

---

## ステップ1: Kintoneアプリ設定画面を開く

1. ブラウザで以下のURLにアクセス:
   ```
   https://eu-plan.cybozu.com/k/117/
   ```

2. 画面右上の「⚙️ 設定」アイコンをクリック

3. 「アプリの設定」を選択

---

## ステップ2: APIトークンを生成

1. 左メニューから「設定」→「APIトークン」を選択

2. 「生成する」ボタンをクリック

3. 以下の設定を行う:

   **アクセス権**:
   - ✅ **レコード閲覧**: ON（必須）
   - ❌ レコード追加: OFF（不要）
   - ❌ レコード編集: OFF（不要）
   - ❌ レコード削除: OFF（不要）

   **説明（任意）**:
   ```
   AI Chatbot用 - レコード閲覧のみ
   ```

4. 「保存」ボタンをクリック

5. **生成されたトークンをコピー**（後で使用）
   - 例: `abcdefghijklmnopqrstuvwxyz123456789`

---

## ステップ3: アプリを更新

1. 画面右上の「アプリを更新」ボタンをクリック

2. 確認ダイアログで「更新」をクリック

**重要**: アプリを更新しないとAPIトークンが有効化されません！

---

## ステップ4: .env.local に設定

プロジェクトルートの `.env.local` ファイルに以下を追加:

```bash
# Kintone API接続用
KINTONE_DOMAIN=eu-plan.cybozu.com
KINTONE_API_TOKEN=abcdefghijklmnopqrstuvwxyz123456789  # ← コピーしたトークンを貼り付け
KINTONE_APP_ID=117
```

**セキュリティ注意**:
- ❌ `.env.local` は絶対にGitにコミットしないでください
- ✅ `.gitignore` に `.env.local` が含まれていることを確認
- ✅ APIトークンは読み取り専用権限のみ付与

---

## ステップ5: 接続テスト

ターミナルで以下を実行:

```bash
# 必要なパッケージをインストール
npm install dotenv tsx @types/node

# 接続テストスクリプトを実行
npx tsx scripts/test-kintone-connection.ts
```

**期待される出力**:
```
🔗 Kintone API接続テスト開始...

📋 接続情報:
  Domain: eu-plan.cybozu.com
  App ID: 117
  API Token: abcdefghij...

📤 リクエスト送信中...
✅ 接続成功！（350ms）

📊 取得結果:
  総レコード数: 383
  取得レコード数: 100

📝 レコードサンプル（最初の3件）:
...
```

---

## トラブルシューティング

### エラー1: `401 Unauthorized`

**原因**: APIトークンが無効または設定されていない

**対処法**:
1. Kintoneでアプリを更新したか確認
2. `.env.local` のトークンが正しいか確認
3. APIトークンを再生成して試す

### エラー2: `403 Forbidden`

**原因**: APIトークンに「レコード閲覧」権限がない

**対処法**:
1. Kintoneの「APIトークン」設定で「レコード閲覧」にチェック
2. アプリを更新

### エラー3: `404 Not Found`

**原因**: アプリIDが間違っている

**対処法**:
1. URLを確認: `https://eu-plan.cybozu.com/k/117/` の `117` がアプリID
2. `.env.local` の `KINTONE_APP_ID` を確認

### エラー4: `CORS error`

**原因**: ブラウザからのアクセスでCORSエラー（通常は発生しない）

**対処法**:
- サーバーサイド（Next.js API Route）からアクセスすれば問題なし
- ブラウザから直接アクセスする場合はKintone側でCORS設定が必要

---

## セキュリティベストプラクティス

### ✅ 推奨事項

1. **最小権限の原則**
   - APIトークンには「レコード閲覧」のみ付与
   - 書き込み権限は絶対に付与しない

2. **トークンのローテーション**
   - 定期的（3-6ヶ月ごと）にAPIトークンを再生成
   - 古いトークンは削除

3. **環境変数の保護**
   - `.env.local` は `.gitignore` に含める
   - Vercelの環境変数は「Production」のみに設定

4. **監査ログの確認**
   - Kintoneの「API使用状況」を定期的に確認
   - 異常なアクセスがないかチェック

### ❌ 避けるべき事項

1. ハードコードしない
   ```typescript
   // ❌ NG
   const apiToken = 'abcdefghijklmnopqrstuvwxyz123456789';

   // ✅ OK
   const apiToken = process.env.KINTONE_API_TOKEN;
   ```

2. パブリックリポジトリにコミットしない
   - `.env.local` は絶対に公開しない
   - APIトークンが漏洩したら即座に再生成

3. ブラウザに公開しない
   - クライアントサイドでAPIトークンを使用しない
   - 必ずサーバーサイド（Next.js API Route）で使用

---

## 次のステップ

接続テストが成功したら:

1. [scripts/test-kintone-connection.ts](../scripts/test-kintone-connection.ts) でフィールド構造を確認
2. どのフィールドをQ&Aに使用するか決定
3. Gemini用のテキスト形式変換ロジックを実装
4. [app/api/chatwork-test/route.ts](../app/api/chatwork-test/route.ts) でKintoneデータを使った回答生成をテスト
