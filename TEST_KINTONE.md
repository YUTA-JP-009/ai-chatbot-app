# Kintone API統合 安全テスト手順書

**目的**: 既存のChatwork回答に一切影響を与えず、VS Code上でKintone API統合の回答精度を確認する

---

## テスト環境の特徴

### ✅ 完全に独立したテスト環境

- **新規エンドポイント**: `/api/chatwork-test` （既存の `/api/chatwork` とは完全別物）
- **既存コードへの影響**: ゼロ（[app/api/chatwork/route.ts](app/api/chatwork/route.ts) は一切変更なし）
- **既存Chatworkへの影響**: ゼロ（Webhookは既存エンドポイントのまま）
- **qa-database.tsへの影響**: ゼロ（一切変更なし）

### 🔍 テスト可能な内容

1. **Kintone APIからのQ&A取得**: 正常に取得できるか
2. **回答精度**: 既存のハードコードQ&Aと同等の精度か
3. **応答速度**: 2-3秒以内に収まるか（目標）
4. **エラーハンドリング**: GAS APIエラー時の挙動
5. **パフォーマンス計測**: Kintone取得時間、Gemini生成時間の内訳

---

## ステップ1: 環境変数の設定

### .env.local ファイルを編集

```bash
# 既存の環境変数（変更なし）
GEMINI_API_KEY=your_existing_key
CHATWORK_API_TOKEN=your_existing_token
CHATWORK_MY_ID=10686206
CHATWORK_WEBHOOK_TOKEN=your_existing_token
BOT_PREFIX=お調べしています...
BOT_PERSONALITY=friendly

# 新規追加（テスト用）
KINTONE_GAS_ENDPOINT=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
```

**重要**: `KINTONE_GAS_ENDPOINT` は実際のGAS APIのURLに置き換えてください。

---

## ステップ2: ローカルサーバーの起動

```bash
# プロジェクトディレクトリで実行
cd /Users/yuta.sakamoto/ai-chatbot-app

# 開発サーバー起動
npm run dev
```

**起動確認**: `http://localhost:3000` がブラウザで開けることを確認

---

## ステップ3: ブラウザでテスト（最も簡単）

### 方法1: ブラウザのアドレスバーに直接入力

```
http://localhost:3000/api/chatwork-test?q=有給休暇の申請方法
```

**結果表示例**:
```json
{
  "success": true,
  "question": "有給休暇の申請方法",
  "answer": "有給休暇の申請は、KING OF TIMEで行えますよ！⏰\n遅刻や残業の申請も同じくKING OF TIMEでOKです。\n\n📎 参考: https://eu-plan.cybozu.com/k/296/show#record=25",
  "performance": {
    "kintone_fetch_ms": 850,
    "gemini_generation_ms": 1200,
    "total_ms": 2050,
    "total_seconds": "2.05"
  },
  "metadata": {
    "qa_data_length": 85000,
    "timestamp": "2025-12-27T12:34:56.789Z"
  }
}
```

### テストすべき質問例（10問）

1. `http://localhost:3000/api/chatwork-test?q=有給休暇の申請方法`
2. `http://localhost:3000/api/chatwork-test?q=コアタイムは何時から何時まで`
3. `http://localhost:3000/api/chatwork-test?q=リモートワークは週何日可能`
4. `http://localhost:3000/api/chatwork-test?q=前受金について教えて`
5. `http://localhost:3000/api/chatwork-test?q=社員面談はいつ`
6. `http://localhost:3000/api/chatwork-test?q=パワーナップ制度とは`
7. `http://localhost:3000/api/chatwork-test?q=ノー残業デーはいつ`
8. `http://localhost:3000/api/chatwork-test?q=書籍購入補助はいくらまで`
9. `http://localhost:3000/api/chatwork-test?q=リファラル採用のインセンティブ`
10. `http://localhost:3000/api/chatwork-test?q=BIMプロジェクトについて`

---

## ステップ4: VS Code REST Client拡張機能でテスト（推奨）

### 4-1. REST Client拡張機能をインストール

VS Codeで `Ctrl+Shift+X` → `REST Client` を検索してインストール

### 4-2. テストファイルを作成

新規ファイル `test-kintone.http` を作成:

```http
### テスト1: 有給休暇の申請方法（具体的な質問）
GET http://localhost:3000/api/chatwork-test?q=有給休暇の申請方法

### テスト2: 前受金（事前定義回答と比較）
GET http://localhost:3000/api/chatwork-test?q=前受金について教えて

### テスト3: リモートワーク（抽象的な質問 → 複数回答期待）
GET http://localhost:3000/api/chatwork-test?q=リモートワークについて教えて

### テスト4: POSTメソッド（JSON形式）
POST http://localhost:3000/api/chatwork-test
Content-Type: application/json

{
  "question": "コアタイムは何時から何時まで？"
}

### テスト5: 存在しないルール（精度確認）
GET http://localhost:3000/api/chatwork-test?q=育児休暇の取得方法

### テスト6: BIMプロジェクト（JM記録アプリからの回答期待）
GET http://localhost:3000/api/chatwork-test?q=BIMプロジェクトの進捗状況

### テスト7: 社員面談（JM記録アプリからの回答期待）
GET http://localhost:3000/api/chatwork-test?q=社員面談のスケジュール

### テスト8: 複雑な質問（複数Q&A統合回答期待）
GET http://localhost:3000/api/chatwork-test?q=2026年1月からのユニット体制について詳しく教えて

### テスト9: 曖昧な質問（Geminiの柔軟性確認）
GET http://localhost:3000/api/chatwork-test?q=休暇について

### テスト10: 長い質問文（自然言語理解確認）
GET http://localhost:3000/api/chatwork-test?q=社員が入社後OJT期間中にリモートワークを利用したい場合、週に何日までリモートワークできますか？
```

### 4-3. 実行方法

各セクションの上に表示される `Send Request` をクリック

---

## ステップ5: cURLでテスト（ターミナル）

```bash
# テスト1: GETメソッド
curl "http://localhost:3000/api/chatwork-test?q=有給休暇の申請方法"

# テスト2: POSTメソッド（JSON整形表示）
curl -X POST http://localhost:3000/api/chatwork-test \
  -H "Content-Type: application/json" \
  -d '{"question": "前受金について教えて"}' \
  | jq .

# テスト3: 応答速度計測
time curl -s "http://localhost:3000/api/chatwork-test?q=コアタイムは何時から" | jq .
```

**`jq`がない場合はインストール**:
```bash
brew install jq  # macOS
```

---

## ステップ6: 回答精度の比較検証

### 6-1. 既存システムの回答を取得

**方法**: Chatworkで実際に質問を送信

例:
```
質問: 有給休暇の申請方法を教えて
既存システムの回答: （Chatworkで確認）
```

### 6-2. テストシステムの回答を取得

```
http://localhost:3000/api/chatwork-test?q=有給休暇の申請方法
```

### 6-3. 比較項目

| 項目 | 既存システム | テストシステム | 評価 |
|------|------------|--------------|------|
| **回答精度** | （既存の回答） | （テストの回答） | ✅/⚠️/❌ |
| **応答速度** | 2.0-2.5秒 | （total_seconds） | ✅/⚠️/❌ |
| **回答スタイル** | 親しみやすい | （評価） | ✅/⚠️/❌ |
| **参照URL** | あり | （確認） | ✅/⚠️/❌ |
| **絵文字使用** | 適度 | （確認） | ✅/⚠️/❌ |

---

## ステップ7: パフォーマンス検証

### 目標値

- **Kintone取得**: 500-1000ms以内
- **Gemini生成**: 1000-1500ms以内
- **合計**: 2000-2500ms以内（既存システムと同等）

### 確認方法

レスポンスの `performance` フィールドを確認:

```json
"performance": {
  "kintone_fetch_ms": 850,      // ← 1000ms以内が理想
  "gemini_generation_ms": 1200, // ← 1500ms以内が理想
  "total_ms": 2050,             // ← 2500ms以内が理想
  "total_seconds": "2.05"
}
```

**もし遅い場合の対策**:
- Kintone取得が遅い → GAS APIの最適化、キャッシュ導入
- Gemini生成が遅い → プロンプト短縮、maxOutputTokens調整

---

## ステップ8: エラーハンドリング検証

### テスト1: GAS APIエンドポイント未設定

```bash
# .env.localから KINTONE_GAS_ENDPOINT を削除
# サーバー再起動: npm run dev
curl "http://localhost:3000/api/chatwork-test?q=テスト"
```

**期待される結果**:
```json
{
  "error": "テスト実行エラー",
  "details": "❌ KINTONE_GAS_ENDPOINT が設定されていません"
}
```

### テスト2: 存在しないGAS APIエンドポイント

```bash
# .env.localの KINTONE_GAS_ENDPOINT を無効なURLに変更
KINTONE_GAS_ENDPOINT=https://script.google.com/invalid

# サーバー再起動: npm run dev
curl "http://localhost:3000/api/chatwork-test?q=テスト"
```

**期待される結果**:
```json
{
  "error": "テスト実行エラー",
  "details": "GAS API error: 404 Not Found"
}
```

---

## チェックリスト

### テスト前の準備

- [ ] `.env.local` に `KINTONE_GAS_ENDPOINT` を追加
- [ ] GAS APIエンドポイントが正常動作することを確認（単体テスト）
- [ ] `npm run dev` でローカルサーバー起動
- [ ] ブラウザで `http://localhost:3000` が開けることを確認

### 回答精度テスト（10問）

- [ ] テスト1: 有給休暇の申請方法
- [ ] テスト2: 前受金について
- [ ] テスト3: リモートワークについて
- [ ] テスト4: コアタイム
- [ ] テスト5: 社員面談
- [ ] テスト6: BIMプロジェクト
- [ ] テスト7: パワーナップ制度
- [ ] テスト8: ノー残業デー
- [ ] テスト9: 書籍購入補助
- [ ] テスト10: リファラル採用

### パフォーマンステスト

- [ ] Kintone取得時間が1000ms以内
- [ ] Gemini生成時間が1500ms以内
- [ ] 合計応答時間が2500ms以内
- [ ] 既存システムと同等またはそれ以下

### エラーハンドリングテスト

- [ ] GAS APIエンドポイント未設定時のエラー
- [ ] 無効なGAS APIエンドポイント時のエラー
- [ ] Kintone API障害時の挙動（可能なら）

### 回答スタイルテスト

- [ ] 「です・ます」調を維持
- [ ] 親しみやすい表現（「〜ですよ！」など）
- [ ] 絵文字が適度に使用されている（1-2個）
- [ ] 「**」記法が使われていない（「」【】を使用）
- [ ] 参照URLが必ず含まれている
- [ ] 「総務に聞いて」などの丸投げ表現がない
- [ ] 「U'plan」の表記が正しい

---

## 次のステップ

### ✅ テスト合格の場合

1. テスト結果をドキュメント化（スクリーンショット保存）
2. [DESIGN_KINTONE_TEST.md](DESIGN_KINTONE_TEST.md) の「Option 1: 環境変数フラグ方式」実装へ進む
3. 既存の `/api/chatwork/route.ts` を改修（切り替え機能追加）
4. プレビュー環境でテスト
5. 本番ロールアウト

### ⚠️ テスト不合格の場合

**問題別の対処方法**:

- **回答精度が低い** → GAS APIのレスポンス形式を確認、プロンプト調整
- **応答速度が遅い** → キャッシュ導入検討（Vercel KV）
- **エラーが多い** → GAS APIのエラーハンドリング強化
- **回答スタイルが不適切** → プロンプト調整、NGルール追加

---

## トラブルシューティング

### 問題1: `Module not found: @google/generative-ai`

```bash
npm install @google/generative-ai
```

### 問題2: `KINTONE_GAS_ENDPOINT が設定されていません`

`.env.local` ファイルが正しく読み込まれているか確認:
```bash
cat .env.local | grep KINTONE_GAS_ENDPOINT
```

サーバー再起動:
```bash
# Ctrl+C でサーバー停止
npm run dev  # 再起動
```

### 問題3: `404 Not Found` エラー

ファイルパスを確認:
```bash
ls -la app/api/chatwork-test/route.ts
```

存在しない場合は再作成。

### 問題4: ブラウザで日本語が文字化け

URLエンコードが必要:
```
# ❌ NG
http://localhost:3000/api/chatwork-test?q=有給休暇

# ✅ OK
http://localhost:3000/api/chatwork-test?q=%E6%9C%89%E7%B5%A6%E4%BC%91%E6%9A%87
```

または、REST Client拡張機能やcURLを使用（自動エンコードされる）。

---

## 安全性の確認

### 既存システムへの影響チェック

1. **既存エンドポイント確認**:
```bash
curl http://localhost:3000/api/chatwork  # 既存エンドポイント
# → 405 Method Not Allowed（Webhookのみ受け付けるため正常）
```

2. **qa-database.ts確認**:
```bash
git status app/data/qa-database.ts
# → nothing to commit（変更なし）
```

3. **既存route.ts確認**:
```bash
git status app/api/chatwork/route.ts
# → nothing to commit（変更なし）
```

4. **Chatwork動作確認**:
既存のChatworkルームで質問を送信 → 正常に回答されることを確認

---

## まとめ

このテスト手順により、以下が確認できます:

1. ✅ **既存システムへの影響ゼロ**（完全独立）
2. ✅ **Kintone APIからのQ&A取得が正常動作**
3. ✅ **回答精度が既存システムと同等以上**
4. ✅ **応答速度が目標値以内**（2-3秒）
5. ✅ **エラーハンドリングが適切**

全てのチェックリストに✅が付いたら、本番実装へ進めます。
