# Kintone統合機能 本番環境展開ガイド

## 📋 実装概要

本番環境（`/api/chatwork`）にKintone統合機能を実装しました。
環境変数 `USE_KINTONE_DATA` で、Q&AデータベースとKintone統合を切り替え可能です。

## 🔧 環境変数設定

### Vercelダッシュボードでの設定

1. **Vercelダッシュボードにアクセス**
   - [Vercel Dashboard](https://vercel.com/dashboard) にログイン
   - プロジェクト `ai-chatbot-app` を選択

2. **Settings → Environment Variables**
   - 左サイドバー「Settings」をクリック
   - 「Environment Variables」タブを選択

3. **USE_KINTONE_DATA を追加**

   **Kintone統合データを使用する場合:**
   ```
   Name: USE_KINTONE_DATA
   Value: true
   Environment: Production, Preview, Development
   ```

   **既存Q&Aデータベース（568問）を使用する場合（デフォルト）:**
   ```
   Name: USE_KINTONE_DATA
   Value: false
   # または環境変数を削除
   ```

4. **既存のKintone環境変数を確認**

   以下の環境変数が既に設定されていることを確認:
   - `KINTONE_DOMAIN`: `eu-plan.cybozu.com`
   - `KINTONE_API_TOKEN_JM`: `rSIPyQzzioQ3r2wbXFBF0jCC6I0RhYks9q8aAOzm`
   - `KINTONE_APP_ID_JM`: `117`
   - `KINTONE_API_TOKEN_SCHEDULE`: `nM4eNyO6En5WrQFGbZEkIpZnrPU7YULzZX51mWtD`
   - `KINTONE_APP_ID_SCHEDULE`: `238`
   - `KINTONE_API_TOKEN_RULEBOOK`: `xXaIMQ6u1YgAmVS2xS1nBPcATpYoeom4HJIjO8Lq`
   - `KINTONE_APP_ID_RULEBOOK`: `296`

## 📊 データソースの切り替え

### Kintone統合データ (`USE_KINTONE_DATA=true`)

**データソース:**
- JM記録アプリ（アプリID: 117）: 全体ミーティング議事録26件
- 年間スケジュールアプリ（アプリID: 238）: 22期の年間スケジュール
- ルールブックアプリ（アプリID: 296）: 社内ルール集37件

**特徴:**
- ✅ リアルタイムでKintoneの最新データを取得
- ✅ キーワードフィルタリングで24-25%データ削減
- ✅ 総データ量: 114,459文字 → 86,000-88,000文字（フィルタリング後）
- ⏱️ 処理時間: 3.6-5.2秒（Kintone取得 + Gemini生成）
- 💰 コスト: $0.0019-0.0021/リクエスト

**参照URL:**
- kintone レコードURL（`https://eu-plan.cybozu.com/k/{app_id}/show#record={record_id}`）

### Q&Aデータベース (`USE_KINTONE_DATA=false` または未設定)

**データソース:**
- `app/data/qa-database.ts`: 568問の事前定義Q&A

**特徴:**
- ✅ 超高速（1.6-2.0秒）
- ✅ 固定データで安定した回答
- ✅ コスト最小（$0.001/リクエスト）
- ⚠️ データ更新時はコード変更＆デプロイ必要

**参照URL:**
- kintone レコードURL（Q&Aデータベースに含まれる固定URL）

## 🎯 回答スタイルの統一

両方のデータソースで同じプロンプトスタイルを使用:

### ✅ 良い表現
- 「〜ですよ！」「〜してくださいね」（柔らかい表現）
- 絵文字を1-2個使用（📝 ⏰ 💡 ✅）
- 「！」を活用して明るい雰囲気
- 「です・ます」調を維持
- 「」や【】で強調

### ❌ 避けるべき表現
- そのままコピペ
- Q番号への言及（「Q91によると...」）
- 硬すぎる敬語（「〜でございます」）
- カジュアルすぎる表現（「〜だね」「〜だよ」）
- 過度な絵文字使用（3個以上）
- 他者への誘導（「総務に聞いてください」）
- 誤った社名表記（「ユウプラン」→正しくは「U'plan」）
- `**`記法の使用（必ず「」や【】を使用）

## 🚀 デプロイ手順

### 1. GitHub にコミット＆プッシュ

```bash
git add .
git commit -m "Kintone統合機能を本番環境に実装: USE_KINTONE_DATA環境変数で切り替え可能に"
git push origin main
```

### 2. Vercel自動デプロイ

GitHub push後、Vercelが自動でデプロイを開始します。

### 3. 環境変数の設定

Vercelダッシュボードで `USE_KINTONE_DATA` を設定:
- **Kintone統合を有効化**: `true` に設定
- **Q&Aデータベースに戻す**: `false` に設定または削除

### 4. Vercelで再デプロイ

環境変数変更後、Vercelで「Redeploy」をクリック:
- Deployments タブ → 最新デプロイの「...」→「Redeploy」

## 🧪 テスト方法

### テストエンドポイント (`/api/chatwork-test`)

```bash
# GETリクエスト
curl "https://your-domain.vercel.app/api/chatwork-test?q=有給休暇の申請方法を教えて"

# POSTリクエスト
curl -X POST "https://your-domain.vercel.app/api/chatwork-test" \
  -H "Content-Type: application/json" \
  -d '{"question": "有給休暇の申請方法を教えて"}'
```

### 本番環境 (Chatwork Webhook)

Chatworkからボットにメッセージを送信してテスト。

## 📈 パフォーマンス比較

| 項目 | Q&Aデータベース | Kintone統合 |
|------|----------------|------------|
| 処理時間 | 1.6-2.0秒 | 3.6-5.2秒 |
| コスト/リクエスト | $0.001 | $0.0019-0.0021 |
| データ更新 | コード変更必要 | リアルタイム |
| データ量 | 固定（568問） | 可変（114,459文字） |
| 回答精度 | 固定Q&Aで安定 | 最新情報で柔軟 |

## 🔄 切り戻し手順

### Kintone統合 → Q&Aデータベースへ戻す

1. **Vercelダッシュボード**で環境変数を変更
   - `USE_KINTONE_DATA` を `false` に変更
   - または環境変数を削除

2. **Redeploy**
   - Deployments タブ → 最新デプロイの「...」→「Redeploy」

3. **確認**
   - ログに「📚 Q&Aデータベースから全568問を取得します」が表示されることを確認

### Q&Aデータベース → Kintone統合へ戻す

1. **Vercelダッシュボード**で環境変数を変更
   - `USE_KINTONE_DATA` を `true` に変更

2. **Redeploy**
   - Deployments タブ → 最新デプロイの「...」→「Redeploy」

3. **確認**
   - ログに「📊 Kintone統合データを取得します」が表示されることを確認

## 🐛 トラブルシューティング

### エラー: "KINTONE_API_TOKEN_JM が設定されていません"

**原因:** Kintone環境変数が設定されていない

**解決策:**
1. Vercelダッシュボードで環境変数を確認
2. 不足している場合は追加（上記「環境変数設定」参照）
3. Redeploy

### エラー: "Module not found: Can't resolve '../../lib/kintone-client'"

**原因:** ビルド時にkintone-client.tsが見つからない

**解決策:**
1. `app/lib/kintone-client.ts` が存在することを確認
2. GitHub に正しくプッシュされているか確認
3. Redeploy

### 処理時間が遅い（10秒以上）

**原因:** Vercelのコールドスタート、またはKintone APIの応答遅延

**解決策:**
1. `BOT_PREFIX`（「お調べしています...」）を先行送信してユーザー体感速度を改善
2. Q&Aデータベースに切り戻して速度を優先

## 📝 ログ確認

### Vercelログでデータソースを確認

**Kintone統合使用時:**
```
📊 Kintone統合データを取得します（JM記録 + 年間スケジュール + ルールブック）
✅ Kintone統合データ取得完了
📝 データ長: 86,537 文字
```

**Q&Aデータベース使用時:**
```
📚 Q&Aデータベースから全568問を取得します
✅ Q&Aデータベース取得完了（568問）
📝 データ長: 46,234 文字
```

## 🎯 推奨運用方針

### 初期段階（検証期間）

1. **Kintone統合を有効化**（`USE_KINTONE_DATA=true`）
2. 1-2週間運用して回答精度を検証
3. ユーザーフィードバックを収集

### 検証後

**回答精度が十分な場合:**
- Kintone統合を継続使用
- リアルタイムデータ更新のメリットを活用

**回答精度が不十分な場合:**
- Q&Aデータベースに戻す（`USE_KINTONE_DATA=false`）
- Kintone統合のプロンプト最適化を検討
- 必要に応じてQ&Aデータベースを拡充

## 📚 関連ドキュメント

- [Kintone API統合 実装サマリー](./KINTONE_INTEGRATION_SUMMARY.md)
- [Kintone API設定ガイド](./KINTONE_API_SETUP.md)
- [テストアーキテクチャ設計](./DESIGN_KINTONE_TEST.md)

---

**更新日**: 2025-12-27
**実装者**: Claude Code
**ステータス**: ✅ 実装完了、本番展開準備完了
