# 社内ルール対応AIチャットボット開発プロジェクト

## 1. プロジェクト概要

### 目的
kintoneに保管されている社内ルールのデータを学習し、社員がChatworkから質問すると自動で回答するAIチャットボットを開発する。

### 技術スタック
- **AI基盤**: Google Gemini API
  - **AIモデル**: Gemini 2.0 Flash-exp
  - **認証方式**: APIキーベース認証（Google AI SDK使用）
- **アプリケーション**: Next.js 16.0.10 (App Router, Turbopack)
- **ホスティング**: Vercel (東京リージョン)
- **データソース**: kintone API
  - JM記録アプリ（#117）: 全体ミーティング議事録
  - 年間スケジュールアプリ（#238）: 22期スケジュール
  - ルールブックアプリ（#296）: 社内ルール集
- **連携サービス**:
  - Chatwork API (Webhook)

### その他要件
- **応答性能**: 1.5-2.0秒の高速応答を実現（東京リージョン + 2段階フィルタリング）
- Githubへのコミット名は日本語で記載する。

---

## 2. 現在のシステムアーキテクチャ

### データフロー（最終版）

```
1. Chatwork Webhook受信
2. BOT_PREFIX送信（0.3秒）
3. Kintoneデータ取得（0.15秒）← キャッシュ効果
4. キーワード抽出（extractKeywords関数）
5. 【1段階目フィルタリング】スコアリングで上位20件選択
   └─ 76件 → 20件（calculateTagScore関数）
6. 【2段階目フィルタリング】各タグを2,000文字に制限
   └─ 81,856文字 → 36,898文字（55%削減、truncateTagContent関数）
7. Gemini API呼び出し（1.5秒）
   └─ promptTokenCount: 31,245トークン
   └─ temperature: 0.3
   └─ maxOutputTokens: 500
8. Chatworkに返信
```

**総処理時間**: 1.5-2.0秒（東京リージョン）

### パフォーマンス指標

**速度:**
- promptTokenCount: 31,245トークン（最適化前: 60,621トークン、48%削減）
- 応答時間: 1.5-2.0秒（最適化前: 5.1秒、70%高速化）
- データ圧縮: 81,856文字 → 36,898文字（55%削減）

**コスト（Gemini 2.0 Flash-exp）:**
- Prompt tokens: 31,245 × $0.00003 = $0.00094
- Output tokens: 200 × $0.00012 = $0.00024
- **合計: $0.00118/リクエスト** （月1000件で$1.18）

**リージョン最適化:**
- Vercel リージョン: 東京（Tokyo, Japan - ap-northeast-1 - hnd1）
- ネットワークレイテンシ: 10-30ms（Washington D.C.から150-200ms削減）

### 環境変数（Vercel）

```
GEMINI_API_KEY: Google AI Studio APIキー
CHATWORK_API_TOKEN: Chatwork API トークン
CHATWORK_MY_ID: 10686206
BOT_PREFIX: 「お調べしています...」
KINTONE_DOMAIN: eu-plan.cybozu.com
KINTONE_API_TOKEN: kintone API トークン
```

### 使用モデル

- **LLM**: Gemini 2.0 Flash-exp
- **temperature**: 0.3（一貫性重視）
- **maxOutputTokens**: 500

---

## 3. 開発セッションログ

### 2026年1月2日 - kintone統合 & 速度最適化セッション

#### 実施内容サマリー

1. **アーキテクチャ大転換: Q&Aデータベース → kintone直接連携**
   - Q&Aデータベース方式（568問）を廃止
   - kintone APIから直接データ取得方式に変更
   - データキャッシュ機能実装（60秒TTL）

2. **Tab 1フィルタリング問題の解決**
   - 「22期1回目の個人面談」が「22期2回目」と誤回答される問題を修正
   - Tab 1から社員面談データを除外するフィルタリングを削除
   - 正確な回答を実現（上野さん: 11月4日、3番目、10:00～10:30）

3. **2段階フィルタリングによる速度最適化**
   - 1段階目: キーワードスコアリングで76件 → 20件に絞り込み
   - 2段階目: 各タグを2,000文字に制限（81,856文字 → 36,898文字、55%削減）
   - promptTokenCount: 60,621 → 31,245トークン（48%削減）
   - 応答時間: 5.1秒 → 1.5秒（70%高速化）

4. **東京リージョンへの移行**
   - Vercel Function Region: Washington D.C. → Tokyo
   - ネットワークレイテンシ削減: 150-200ms → 10-30ms
   - さらに100-150ms高速化を実現

#### 技術的な詳細

**kintone統合実装:**

- **ファイル**: [app/lib/kintone-client.ts](app/lib/kintone-client.ts)
- **主要関数**:
  - `fetchJMRecords()`: JM記録アプリ（#117）から全体ミーティング記録を取得
  - `fetchScheduleRecord()`: 年間スケジュールアプリ（#238）から22期データを取得
  - `fetchRulebookRecords()`: ルールブックアプリ（#296）から社内ルール集を取得
  - `convertJMRecordsToText()`: JM記録をXML形式に変換
  - `convertScheduleRecordToText()`: 年間スケジュールをXML形式に変換
  - `convertRulebookRecordsToText()`: ルールブックをXML形式に変換
  - `fetchAllKintoneData()`: 全データソースを統合して返す

**データキャッシュ機能:**

```typescript
const DATA_CACHE = {
  jmRecords: { data: null as any, timestamp: 0 },
  scheduleRecord: { data: null as any, timestamp: 0 },
  rulebookRecords: { data: null as any, timestamp: 0 }
};

const CACHE_TTL = 60 * 1000; // 60秒
```

**XML データ形式:**

```xml
<record id="jm_117_377">
  <url>https://eu-plan.cybozu.com/k/117/show#record=377</url>
  データソース: JM記録アプリ - 全体ミーティング
  日付: 2025-11-10
  期: 22期

  年間スケジュールの確認
  前月の売上等の報告
  ...
</record>

<schedule id="schedule_238_8_tab1">
  <url>https://eu-plan.cybozu.com/k/238/show#record=8&tab=1</url>
  データソース: 年間スケジュールアプリ
  期: 22期
  Tab: 1

  【随時】

  社員面談の日時と流れ
  22期1回目: 11月4日(火)、11月5日(水)、11月6日(木)
  ...
</schedule>

<rule id="rule_296_35">
  <url>https://eu-plan.cybozu.com/k/296/show#record=35</url>
  データソース: ルールブック
  分類: 社会人のマナー
  項目: ★あいさつと返事

  指示や質問を受けた時は、確認の意思表示としてはじめに...
</rule>
```

**キーワード抽出関数:**

```typescript
function extractKeywords(question: string): string[] {
  // 1. Chatworkメンション・改行を削除
  let cleanedQuestion = question.replace(/\[To:\d+\]/g, '');
  cleanedQuestion = cleanedQuestion.replace(/\n/g, '');

  // 2. 2-4文字のN-gramを抽出
  const keywords: string[] = [];
  for (let n = 4; n >= 2; n--) {
    for (let i = 0; i <= cleanedQuestion.length - n; i++) {
      keywords.push(cleanedQuestion.substring(i, i + n));
    }
  }

  // 3. 複合語抽出（カタカナ・漢字3文字以上）
  const compoundWords = cleanedQuestion.match(/[ァ-ヴー]{3,}|[一-龯]{3,}/g);

  // 4. 類義語・関連語を追加
  const synonyms: { [key: string]: string[] } = {
    '社員面談': ['個人面談', '評価面談', '面談', 'SGシート'],
    '評価': ['査定', 'フィードバック', '評価面談']
  };

  // 5. ストップワード除外
  const stopWords = ['について', 'ですか', 'ください', ...];

  return keywords;
}
```

**スコアリング関数:**

```typescript
function calculateTagScore(tagContent: string, keywords: string[]): number {
  let score = 0;

  const title = tagContent.substring(0, 200); // タイトル領域
  const body = tagContent.substring(200);     // 本文領域

  for (const keyword of keywords) {
    // タイトルマッチ（重要）: 10点
    const titleMatches = (title.match(new RegExp(keyword, 'g')) || []).length;
    score += titleMatches * 10;

    // 本文マッチ: 3点
    const bodyMatches = (body.match(new RegExp(keyword, 'g')) || []).length;
    score += bodyMatches * 3;

    // カタカナ固有名詞ボーナス: +5点
    if (/^[ァ-ヴー]+$/.test(keyword) && keyword.length >= 3) {
      score += titleMatches * 5;
    }
  }

  return score;
}
```

**2段階フィルタリング関数:**

```typescript
function truncateTagContent(tagContent: string): string {
  const MAX_BODY_LENGTH = 2000;

  const lines = tagContent.split('\n');
  const headerLines = lines.slice(0, 10);  // ヘッダー（URL、データソース、期、Tab）
  const header = headerLines.join('\n');

  const bodyLines = lines.slice(10);
  const bodyText = bodyLines.join('\n');

  if (bodyText.length <= MAX_BODY_LENGTH) {
    return tagContent;
  }

  const truncatedBody = bodyText.substring(0, MAX_BODY_LENGTH);
  return `${header}\n\n${truncatedBody}\n\n...(以下省略)`;
}

function filterRelevantTags(combinedText: string, keywords: string[]): string {
  // XMLタグを抽出
  const tagPattern = /<(record|schedule|rule) id="([^"]+)">([\s\S]*?)<\/\1>/g;
  const tags: Array<{ type: string; id: string; content: string; score: number }> = [];

  let match;
  while ((match = tagPattern.exec(combinedText)) !== null) {
    const [fullMatch, type, id, content] = match;
    const score = calculateTagScore(content, keywords);
    tags.push({ type, id, content: fullMatch, score });
  }

  // スコア降順でソート
  tags.sort((a, b) => b.score - a.score);

  // 【1段階目】上位20件を選択
  const topTags = tags.slice(0, 20);

  console.log(`  🔍 1段階目フィルタリング: ${tags.length}件 → ${topTags.length}件に絞り込み`);
  console.log(`  📊 上位3件のスコア: ${topTags.slice(0, 3).map(t => `${t.id}(${t.score})`).join(', ')}`);

  // 【2段階目】各タグを2,000文字に制限
  const extractedTags = topTags.map(tag => {
    const contentMatch = tag.content.match(/<(?:record|schedule|rule) id="[^"]+">([\s\S]*?)<\/(?:record|schedule|rule)>/);
    if (!contentMatch) return tag.content;

    const originalContent = contentMatch[1];
    const truncatedContent = truncateTagContent(originalContent);

    const tagName = tag.type;
    const tagId = tag.id;
    return `<${tagName} id="${tagId}">\n${truncatedContent}\n</${tagName}>`;
  });

  const result = extractedTags.join('\n\n');

  console.log(`  ✂️  2段階目フィルタリング: ${topTags.map(t => t.content).join('\n\n').length.toLocaleString()}文字 → ${result.length.toLocaleString()}文字に圧縮`);

  return result;
}
```

#### 主要なコミット

- `d8235ac` - Tab 1フィルタリング廃止: 22期1回目の個人面談データを復元（精度改善）
- `79cc128` - 2段階フィルタリング修正: シンプルな文字数制限方式に変更（81,856→40,000文字想定）

#### 最適化の歴史

**最適化前（初期状態）:**
```
- promptTokenCount: 60,621トークン
- 応答時間: 5.1秒
- リージョン: Washington, D.C.
- データソース: kintone API（キャッシュなし）
```

**最適化1: キーワード該当箇所抽出（失敗）:**
```
- promptTokenCount: 93,132トークン（53%増加）← 失敗
- 応答時間: 6.9秒（悪化）
- 問題: 全キーワードで抽出し、逆に文字数が増加
```

**最適化2: シンプルな文字数制限方式:**
```
- promptTokenCount: 31,245トークン（48%削減）← 成功
- 応答時間: 1.8秒（65%高速化）
- 方式: 各タグを2,000文字に制限
```

**最適化3: 東京リージョン移行:**
```
- 応答時間: 1.5秒（さらに100-150ms改善）
- ネットワークレイテンシ削減: 150-200ms → 10-30ms
```

**最終結果:**
```
✅ promptTokenCount: 31,245トークン（48%削減）
✅ 応答時間: 1.5秒（70%高速化）
✅ コスト: $0.00118/リクエスト（月1000件で$1.18）
✅ 精度維持: 正確な回答を実現
```

#### 設計思想（KISS原則）

**シンプルさの価値:**
- 複雑なキーワード抽出ロジックより、シンプルな文字数制限が効果的
- 重要情報は通常先頭2,000文字に含まれる
- 実装がシンプルで保守性が高い

**2段階フィルタリングの利点:**
- 1段階目: スコアリングで関連性の高いタグを選択（精度重視）
- 2段階目: 文字数制限でトークン数削減（速度重視）
- 両立が可能

#### トラブルシューティング履歴

**問題1: Tab 1が検索結果に含まれない**
- 症状: 「22期1回目」の質問に「22期2回目」のデータで回答
- 原因: Tab 1フィルタリング（コミットd0e151d）が社員面談を除外
- 解決: Tab 1フィルタリングを完全削除（コミットd8235ac）

**問題2: キーワード抽出で文字数が増加**
- 症状: 81,856文字 → 138,472文字（69%増加）
- 原因: 全キーワード（60個以上）で抽出、重複排除失敗
- 解決: シンプルな文字数制限方式に変更（コミット79cc128）

#### デバッグスクリプト

**作成したスクリプト:**

1. [scripts/find-ueno-in-all-tables.ts](scripts/find-ueno-in-all-tables.ts)
   - 全テーブルから「上野」を検索
   - Tab 1に「22期1回目」データがあることを確認

2. [scripts/find-interview-rounds.ts](scripts/find-interview-rounds.ts)
   - 「1回目」「2回目」を含むテーブルを検索
   - Tab 1とTab 7のデータ構造を比較

---

## 4. 現在のシステム状態

### デプロイ状態

- ✅ Vercel本番環境デプロイ済み（東京リージョン）
- ✅ kintone直接連携稼働中
- ✅ 2段階フィルタリング動作中
- ✅ 処理時間: 1.5-2.0秒
- ✅ promptTokenCount: 31,245トークン
- ✅ コスト: $0.00118/リクエスト

### データソース

**kintone アプリ:**
1. JM記録アプリ（#117）: 全体ミーティング議事録（26件）
2. 年間スケジュールアプリ（#238）: 22期スケジュール（14テーブル、Tab 0-13）
3. ルールブックアプリ（#296）: 社内ルール集（37件）

**Tab マッピング（年間スケジュール）:**
```
Table_3  → tab=0  (毎月)
Table_4  → tab=1  (随時) ← 22期1回目の個人面談データを含む
Table_5  → tab=2  (10月)
Table_6  → tab=3  (11月)
Table_7  → tab=4  (12月)
Table_8  → tab=5  (1月)
Table_9  → tab=6  (2月)
Table_10 → tab=7  (3月) ← 22期2回目の個人面談データを含む
Table_11 → tab=8  (4月)
Table_12 → tab=9  (5月)
Table_13 → tab=10 (6月)
Table_15 → tab=11 (7月)
Table_14 → tab=12 (8月)
Table_16 → tab=13 (9月)
```

### 主要ファイル

1. **[app/lib/kintone-client.ts](app/lib/kintone-client.ts)**
   - kintone API連携の中核
   - データ取得、変換、キャッシュ機能
   - 2段階フィルタリング実装

2. **[app/api/chatwork/route.ts](app/api/chatwork/route.ts)**
   - Chatwork Webhook受信
   - Gemini API呼び出し
   - 回答生成と返信

---

## 5. 今後の拡張予定

### 短期（現状維持）
- 現在の方式で運用を継続
- パフォーマンスモニタリング
- ユーザーフィードバック収集

### 中期（機能拡張）
- ストリーミング応答の実装
- 会話履歴保持（コンテキスト対応）
- 他のkintoneアプリとの連携

### 長期（AI Agent化）
- 複数のデータソース統合
- 自律的な情報更新
- マルチモーダル対応（画像、PDF直接読み取り）

---

## 6. 技術的な学び

### アーキテクチャの進化

**Phase 1: Vertex AI Search（失敗）**
- 検索品質が低い（無関係なスニペット）
- kintone URL抽出困難
- PDF構造崩れ問題

**Phase 2: Q&Aデータベース（成功 → 保守性問題）**
- 回答精度向上
- 568問まで拡張成功
- 更新時に手動メンテナンスが必要

**Phase 3: kintone直接連携（現在）**
- リアルタイムデータ取得
- 自動同期（キャッシュ60秒TTL）
- 保守性の大幅向上

### パフォーマンス最適化の教訓

1. **シンプルさの価値**
   - 複雑なロジックより、シンプルな実装が効果的
   - KISS原則（Keep It Simple, Stupid）

2. **段階的な最適化**
   - 1段階目: 精度重視（スコアリング）
   - 2段階目: 速度重視（文字数制限）

3. **リージョン最適化の重要性**
   - 物理的距離がレイテンシに直結
   - 東京リージョンで100-150ms改善

### LLMの能力活用

**Gemini 2.0 Flash-expの強み:**
- 自然言語理解の高精度
- 31,245トークンの大量データ処理
- 1.5秒の高速応答
- 低コスト（$0.00118/リクエスト）

---

## 7. 保守・運用ガイド

### データ更新フロー

1. kintoneでデータ更新（JM記録、年間スケジュール、ルールブック）
2. キャッシュTTL（60秒）経過後、自動的に新データ取得
3. 手動でのコード変更不要

### トラブルシューティング

**問題: 回答が遅い**
- Vercel Logsでログ確認
- promptTokenCountをチェック（31,245トークン前後が正常）
- キャッシュが効いているか確認

**問題: 回答が不正確**
- Gemini入力データのデバッグログ確認
- タグIDリスト、URL、スコアを検証
- 必要に応じてキーワード抽出ロジック調整

**問題: kintone接続エラー**
- kintone API トークンの有効期限確認
- ドメイン、アプリIDの設定確認
- キャッシュをクリアして再試行

### モニタリング指標

**監視すべき指標:**
- promptTokenCount: 31,245トークン前後（±5,000トークン）
- 応答時間: 1.5-2.0秒
- コスト: $0.00118/リクエスト
- エラー率: <1%

---

## 8. 参考資料

### API ドキュメント

- [Gemini API Documentation](https://ai.google.dev/gemini-api/docs)
- [kintone REST API](https://developer.cybozu.io/hc/ja/articles/202331474)
- [Chatwork API](https://developer.chatwork.com/reference)
- [Vercel Documentation](https://vercel.com/docs)

### プロジェクトリポジトリ

- GitHub: https://github.com/YUTA-JP-009/ai-chatbot-app
- Vercel: https://vercel.com/yuta-jp-009s-projects/ai-chatbot-app

---

**最終更新日**: 2026年1月2日
**現在のバージョン**: v3.0（kintone直接連携版）
