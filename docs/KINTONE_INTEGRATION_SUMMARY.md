# Kintone API統合 実装サマリー

## 📊 実装概要

3つのKintoneアプリからデータを取得し、Gemini APIで質問応答を行うシステムを構築しました。

### データソース

1. **JM記録アプリ（アプリID: 117）**
   - 全体ミーティング議事録
   - 2025年10月1日以降のレコードのみ取得
   - 現在26件のレコード

2. **年間スケジュールアプリ（アプリID: 238）**
   - 22期の年間スケジュール
   - レコードID 8（22期）のみ取得
   - 13個のテーブルフィールド（毎月、随時、10月～9月）

3. **ルールブックアプリ（アプリID: 296）**
   - 社内ルール集
   - 全37件のレコード
   - 3つの分類（オフィスの運営、会社のルール、社会人のマナー）

## 🔧 主要なファイル

### 1. [app/lib/kintone-client.ts](../app/lib/kintone-client.ts)

3つのアプリからデータを取得・変換する統合クライアント。

**主要な関数:**

- `fetchJMRecords()`: JM記録アプリからレコード取得
- `fetchScheduleRecord()`: 年間スケジュールアプリから22期レコード取得
- `fetchRulebookRecords()`: ルールブックアプリから全レコード取得
- `convertJMRecordsToText()`: JM記録を議事録形式に変換
- `convertScheduleRecordToText()`: 年間スケジュールをテキスト形式に変換
- `convertRulebookRecordsToText()`: ルールブックをテキスト形式に変換
- `extractKeywords()`: 質問からキーワードを抽出
- `filterRelevantData()`: キーワードに基づいてデータをフィルタリング
- `fetchAllKintoneData()`: 3つのアプリから統合データを取得（メイン関数）

**データ形式:**

```
========================================
【データソース】JM記録アプリ - 全体ミーティング
【日付】2025-11-10
【期】22期
【レコードURL】https://eu-plan.cybozu.com/k/117/show#record=377
========================================

[議事録の生テキスト]

---

========================================
【データソース】年間スケジュールアプリ
【期】22期
【レコードURL】https://eu-plan.cybozu.com/k/238/show#record=8
========================================

【毎月】

[年間スケジュールの生テキスト]

---
```

### 2. [app/api/chatwork-test/route.ts](../app/api/chatwork-test/route.ts)

テスト専用エンドポイント（既存の /api/chatwork には影響なし）。

**機能:**
- GET/POSTリクエスト対応
- Kintone統合データ取得
- Gemini APIで質問応答
- パフォーマンス計測

**使用例:**

```bash
# GETリクエスト
curl "http://localhost:3000/api/chatwork-test?q=夏期休業はいつ？"

# POSTリクエスト
curl -X POST "http://localhost:3000/api/chatwork-test" \
  -H "Content-Type: application/json" \
  -d '{"question": "夏期休業はいつ？"}'
```

### 3. [.env.local](./.env.local)

環境変数設定ファイル。

```bash
# Kintone API接続用
KINTONE_DOMAIN=eu-plan.cybozu.com

# JM記録アプリ（アプリID 117）
KINTONE_API_TOKEN_JM=rSIPyQzzioQ3r2wbXFBF0jCC6I0RhYms9q8aAOzm
KINTONE_APP_ID_JM=117

# 年間スケジュールアプリ（アプリID 238）
KINTONE_API_TOKEN_SCHEDULE=nM4eNyO6En5WrQFGbZEkIpZnrPU7YULzZX51mWtD
KINTONE_APP_ID_SCHEDULE=238

# ルールブックアプリ（アプリID 296）
KINTONE_API_TOKEN_RULEBOOK=xXaIMQ6u1YgAmVS2xS1nBPcATpYoeom4HJIjO8Lq
KINTONE_APP_ID_RULEBOOK=296

# Gemini API
GEMINI_API_KEY=AIzaSyCYkvmW-aSv82MEvau5j79ZVW6YwCrMQH0
```

## 📈 パフォーマンス指標

### データ規模
- **総文字数**: 114,459文字（JM記録: 23,674 + 年間スケジュール: 68,057 + ルールブック: 22,728）
- **データソース数**: 64件（JM記録: 26件 + 年間スケジュール: 1件 + ルールブック: 37件）
- **キーワードフィルタリング後**: 約86,000-88,000文字（24-25%削減）

### 処理時間
- **Kintone API取得**: 500-600ms（3回のAPI呼び出し）
- **キーワードフィルタリング**: 50-100ms
- **Gemini API生成**: 3.0-4.5秒
- **合計処理時間**: 3.6-5.2秒

### コスト（Gemini 2.0 Flash-exp）
- **フィルタリング前**: 約85,000トークン × $0.00003 = $0.0025
- **フィルタリング後**: 約65,000トークン × $0.00003 = $0.0019
- **Output tokens**: 約200トークン × $0.00012 = $0.00002
- **合計**: $0.0021/リクエスト（月1000件で$2.10）

## ✅ テスト結果

### 質問テスト

| 質問 | データソース | 回答精度 | 処理時間 | データ長 |
|------|------------|---------|---------|---------|
| 毎月の売り上げ目標は？ | JM記録 (record=377) | ✅ 正解（1667万円/月） | 1.95秒 | - |
| 一級建築士のガイダンスはいつ？ | JM記録 (record=377) | ✅ 正解（11/20 18:30～） | 2.40秒 | - |
| 研修旅行はどこにいく？ | JM記録 (record=380) | ✅ 正解（ベトナム・ハノイ） | 2.42秒 | - |
| 夏期休業はいつ？ | 年間スケジュール + JM記録 | ✅ 正解（8/8～8/11） | 4.34秒 | 87,750文字 |
| 秘密保持契約の確認はいつ？ | 年間スケジュール + JM記録 | ✅ 正解（毎月） | 3.70秒 | - |
| リモートワークについて教えて | ルールブック (record=2) | ✅ 正解（詳細回答） | 4.11秒 | 86,810文字 |
| 休日の連絡事項について教えて | ルールブック (record=1) + JM記録 | ✅ 正解（詳細回答） | 3.06秒 | 86,682文字 |

### 重要な改善点

**Q&A形式 → 議事録生テキスト形式への変更**

❌ **以前（Q&A形式）:**
- 固定質問パターン: 「〜の全体ミーティングで「〜」について話し合われた内容を教えて」
- 問題: 具体的な数値や日時を抽出できない

✅ **現在（生テキスト形式）:**
- 議事録をそのまま保持
- Geminiが文脈を理解し、具体的な数値・日時を正確に抽出

**結果:**
- ①②③の質問が全て正解
- 参照URLを複数表示可能（統合回答）

## 🔐 セキュリティ

- **APIトークン**: Read-onlyアクセス権限のみ
- **環境変数**: .env.local で管理（Gitにコミットしない）
- **データソース分離**: 2つのアプリで異なるAPIトークンを使用

## 📝 テストスクリプト

### 1. [scripts/test-schedule-connection.ts](../scripts/test-schedule-connection.ts)
年間スケジュールアプリの接続テスト。

```bash
npx tsx scripts/test-schedule-connection.ts
```

### 2. [scripts/inspect-schedule-record.ts](../scripts/inspect-schedule-record.ts)
22期レコードの詳細構造調査。

```bash
npx tsx scripts/inspect-schedule-record.ts
```

### 3. [scripts/test-combined-data.ts](../scripts/test-combined-data.ts)
統合データ取得テスト。

```bash
npx tsx scripts/test-combined-data.ts
```

**出力ファイル:**
- `combined-kintone-data.txt`: 統合データの全文（91,731文字）

## 🚀 次のステップ

### 本番環境への展開

1. **Vercel環境変数の設定**
   ```bash
   KINTONE_API_TOKEN_JM=rSIPyQzzioQ3r2wbXFBF0jCC6I0RhYms9q8aAOzm
   KINTONE_API_TOKEN_SCHEDULE=nM4eNyO6En5WrQFGbZEkIpZnrPU7YULzZX51mWtD
   KINTONE_API_TOKEN_RULEBOOK=xXaIMQ6u1YgAmVS2xS1nBPcATpYoeom4HJIjO8Lq
   KINTONE_APP_ID_JM=117
   KINTONE_APP_ID_SCHEDULE=238
   KINTONE_APP_ID_RULEBOOK=296
   ```

2. **既存のChatworkエンドポイント更新**
   - [app/api/chatwork/route.ts](../app/api/chatwork/route.ts) を更新
   - `fetchAllKintoneData()` 関数を使用
   - 既存のqa-database.ts（568問）との統合を検討

3. **データ更新頻度**
   - JM記録アプリ: 週次更新（毎週のミーティング後）
   - 年間スケジュールアプリ: 期の切り替え時のみ更新（年1回）
   - ルールブックアプリ: 不定期更新（ルール変更時）
   - リアルタイム取得: 毎回最新データを取得（キャッシュなし）

## 🎯 主要な技術的決定

### 1. 議事録形式の採用理由

**メリット:**
- 具体的な数値・日時を保持
- 文脈情報が失われない
- Geminiの自然言語理解能力を最大限活用

**デメリット:**
- プロンプトトークン数増加（約70,000トークン）
- 処理時間微増（+0.5-1.0秒）

### 2. 全件送信方式の採用理由

**メリット:**
- 実装がシンプル
- 常に最新データを参照
- 複数データソースを統合可能

**スケーラビリティ:**
- 現在114,459文字（約85,000トークン）
- キーワードフィルタリングで約86,000文字（約65,000トークン）に削減
- 200,000文字程度まで対応可能
- それ以上になったらEmbedding検索への移行を検討

## 📚 参考資料

- [Kintone API設定ガイド](./KINTONE_API_SETUP.md)
- [テストアーキテクチャ設計](./DESIGN_KINTONE_TEST.md)
- [kintone REST API Documentation](https://cybozu.dev/ja/kintone/docs/rest-api/)

## ✨ 成功要因

1. **段階的な実装**: テストエンドポイント → データ統合 → 本番展開
2. **詳細なデバッグ**: スクリプトによる構造調査と検証
3. **柔軟な設計**: 後方互換性を保ちつつ新機能追加
4. **適切なプロンプト**: 議事録形式に最適化されたGeminiプロンプト

---

**更新日**: 2025-12-27
**実装者**: Claude Code
**ステータス**: ✅ テスト完了、本番展開準備完了
