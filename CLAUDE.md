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
  - `BOT_PREFIX`: `お調べしています...` - ボット回答前に送信されるメッセージ
  - `BOT_PERSONALITY`: `friendly` - ボットの人格設定（friendly/formal/exclamation）
  - `GCP_DATA_STORE_ID`: `internal-rules-cloudstorage_1758630923408` - Vertex AI SearchのデータストアID
  - `GCP_CREDENTIALS`: ダウンロードしたJSONキーファイルの中身を全て設定
  - `GCP_PROJECT_ID`: `ai-chatbot-prod-472104` - GCPプロジェクトID
  - `CHATWORK_WEBHOOK_TOKEN`: Chatwork Webhook認証トークン
  - `CHATWORK_API_TOKEN`: Chatwork API トークン
  - `CHATWORK_MY_ID`: `10686206` - ボット自身のChatwork ID
  - **`GEMINI_API_KEY`**: Google AI StudioのAPIキー（質問応答形式の回答生成に使用）

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

### データソース（GCPに格納した社内ルール）

# 株式会社AAA 社内ルール

## 1. 勤務・勤怠に関するルール

### 勤務形態
- **制度**: コアタイム付きフレックスタイム制
- **コアタイム**: **11:00～16:00** （この時間帯は原則として業務に従事）
- **フレキシブルタイム**: **7:00～11:00** および **16:00～21:00**

### リモートワーク
- **選択**: **週3日まで**可能
- **運用**: 所属チームの状況に応じて柔軟に運用
- **OJT期間**: 入社後**3ヶ月間**は、原則として**週4日以上**出社

### パワーナップ制度
- **内容**: **13:00～15:00**の間で、**20分以内**の仮眠（昼寝）を推奨
- **場所**: 仮眠室または自席での仮眠が可能

### ノー残業デー
- **実施日**: 毎週水曜日は全社一斉ノー残業デー
- **ルール**: **19:00**には完全退社を徹底

## 2. 会議・コミュニケーションに関するルール

### 会議の時間
- **原則**: 社内会議は**30分以内**
- **必須事項**: 会議の招待には、必ず**アジェンダ（議題）**と**ゴール（会議の着地点）**を記載

### チャットツール利用ガイドライン
- **メンション**: 緊急時を除き、`@all` や `@channel` の使用は避ける
- **分報(Times)チャンネル**: 各自が任意で作成し、業務ログや気づきの発信の場として活用を推奨
- **スタンプ・絵文字**: ポジティブなコミュニケーション促進のため、積極的な活用を推奨

### シャッフルランチ
- **実施日**: 毎月**第2木曜日**
- **内容**: 部署や役職を越えてランダムに組まれた**4人組**でランチ
- **費用補助**: 1人**1,500円**まで会社が補助

## 3. 福利厚生・手当に関するルール

### 書籍購入・セミナー参加費補助
- **目的**: 自己成長を目的とした書籍購入や外部セミナーへの参加
- **補助額**: **月額10,000円**まで

### リモートワーク手当
- **目的**: リモートワークの環境整備
- **支給額**: **月額5,000円**

### アニバーサリー休暇
- **内容**: 自身が定めた記念日（誕生日、結婚記念日など）に**年間1日**の特別休暇を取得可能

### ピアボーナス制度
- **内容**: 従業員同士が日々の感謝や称賛をポイントとして送り合える制度
- **インセンティブ**: 貯まったポイントは、月末に換金可能

## 4. オフィス環境に関するルール

### 座席
- **制度**: 部署ごとに大まかなエリアが決められた**フリーアドレス制**
- **集中ブース**: 予約制の「サイレントブース」を利用可能

### 服装
- **原則**: 完全服装自由（ただし、社外の方と会う際はTPOを考慮）
- **カジュアルフライデー**: 毎週金曜日は、好きなバンドTシャツやキャラクターTシャツの着用も可能

### フリードリンク・フリースナック
- **無料提供**: コーヒー、お茶、ミネラルウォーターは常時無料
- **補充**: 毎週月曜日の朝に、健康志向のシリアル、ナッツ、フルーツが補充される

## 5. その他ユニークなルール

### 部活動支援制度
- **設立条件**: 従業員が**5名以上**集まれば申請可能
- **活動費補助**: 認定された部には、**月額上限20,000円**を補助 (例：フットサル部、ボードゲーム部、サウナ部など)

### 副業
- **条件**: **事前申請・承認制**で許可
- **推奨事項**: 本業に支障が出ない範囲で、自身のスキルアップに繋がる活動

### サンクスカード
- **内容**: 毎月末、日頃の感謝を伝えたい相手に手書きのメッセージカードを渡す文化
- **設備**: オフィス内に専用ポストを設置

---

## AI回答生成の仕組み

### 処理フロー
1. **Vertex AI Search**で社内ルールドキュメントを検索
2. **Gemini 1.5 Flash API**で検索結果を質問応答形式に変換
3. **cleanSnippet関数**でMarkdown記法を削除し、読みやすく整形
4. **ボット人格設定**を適用（friendly/formal/exclamation）
5. **Chatwork**に回答を返信

### Gemini API設定
- **モデル**: `gemini-1.5-flash`
- **認証方式**: APIキーベース認証（Google AI SDK使用）
- **取得方法**: [Google AI Studio](https://aistudio.google.com/app/apikey) でAPIキーを作成
- **temperature**: 0.3（一貫性のある回答）
- **maxOutputTokens**: 200（簡潔な回答）

### 回答例
**質問**: 「コアタイムは何時から何時まで？」
**回答**: 「コアタイムは11:00～16:00です。この時間帯は原則として業務に従事する必要があります。」

---

### Vertex AI Search用 JSONL生成ルール（失敗したためPDFで実行した）
1. 基本ルール：1行 = 1ドキュメント
ファイルは.jsonl形式で作成し、1行に1つの完全なJSONオブジェクトを記述します。行の末尾にカンマ , は付けません。

2. トップレベルのフィールド名
各JSONオブジェクト（各行）のトップレベルで使用できるキーは、Vertex AI Searchが予約したフィールド名のみです。主要なものは以下の通りです。

フィールド名	必須	データ型	説明
id	はい	文字列	ドキュメントを一意に識別するためのID。
content	はい	オブジェクト	検索対象となる本文。{"text": "..."}形式にする必要があります。
structData	いいえ	JSONオブジェクト	構造化データ（タイトル、カテゴリ、キーワードなど）を格納する場所。

Google スプレッドシートにエクスポート
3. contentフィールドのルール
contentの値は、必ず{"text": "..."}という形式のオブジェクトでなければなりません。

正しい例: "content": {"text": "こちらが本文です。"}

間違いの例: "content": "こちらが本文です。"

4. カスタムフィールドのルール
titleやcategory、keywordsといった独自のフィールドは、トップレベルに置けません。必ずstructDataオブジェクトの中に入れてください。

正しい例: "structData": {"title": "ルール名", "category": "カテゴリ名"}

間違いの例: "title": "ルール名" （トップレベルに置かれている）

テンプレート（この形式に合わせる）
JSON

{"id": "ユニークなID", "structData": {"title": "この文書のタイトル", "category": "カテゴリ情報"}, "content": {"text": "AIに読ませたい本文の内容をここに記述します。"}}
このルールに従うことで、これまでのINCORRECT_JSON_FORMATエラーを回避し、正常にドキュメントをインポートできます。

### 回答モデル
Gemini Flash 2.0
モデル: gemini-2.5-flash → gemini-2.0-flash-exp
maxOutputTokens: 500 → 300（思考トークン不要なため削減）
期待される効果:
500-800ms短縮: 思考トークン処理がなくなる
コスト削減: 無駄なトークン消費がなくなる
安定性向上: トークン数が予測しやすくなる
→回答精度は問題なし、速度は体感で

---

## 開発セッションログ

### 2025年10月5日 - 回答精度・速度改善セッション

#### 実施内容

1. **Gemini APIモデル最適化**
   - Gemini 2.5 Flash → Gemini 2.0 Flash-exp に変更
   - 思考トークン不要で高速化（500-800ms短縮）
   - maxOutputTokens: 500 → 300に最適化

2. **2段構えロジック実装（重要機能）**
   - 高頻度質問は事前定義回答で即座に返答（0.3秒）
   - その他の質問はVertex AI Search + Gemini APIで柔軟に対応（2-3秒）
   - 実装場所: `getPredefinedAnswer()` 関数（route.ts 95-112行目）

   **事前定義回答（3パターン）:**
   - `リモートワーク`: 週3日、OJT期間、月額5,000円手当を含む完全な回答
   - `福利厚生`: 8つの福利厚生を箇条書きで表示
   - `コアタイム`: 11:00～16:00の説明

3. **回答フォーマット改善**
   - 事前定義回答に改行（`\n`）を追加して可読性向上
   - 福利厚生回答を箇条書き形式（`・`付き）に変更

4. **Enterprise Edition機能の検証（失敗）**
   - `extractiveContentSpec`（詳細抽出機能）を試みるも403エラー
   - 原因: Google Driveデータソース（workspace datastores）はサービスアカウント認証非対応
   - 対応: Cloud Storageデータソース（`internal-rules-cloudstorage_1758630923408`）に戻す
   - 結論: Enterprise機能は使用不可、代わりに2段構えロジックで対応

5. **Few-Shotプロンプト強化**
   - Geminiプロンプトに高頻度質問の回答例を追加
   - リモートワークと福利厚生の詳細な回答例を明示

#### 技術的な課題と解決

**課題1: Gemini 2.5の思考トークン問題**
- 症状: maxOutputTokens=200で思考トークンが199個使われ、実際の回答が生成されない
- 解決: Gemini 2.0 Flash-expに変更（思考機能なし）

**課題2: 検索結果の不完全性**
- 症状: スニペットが短く「リモートワーク手当」などの重要情報が欠落
- 解決: 2段構えロジック実装で高頻度質問を完全カバー

**課題3: Enterprise機能の制約**
- 症状: extractiveContentSpecで403 PERMISSION_DENIED
- 原因: Google Driveデータソースはサービスアカウント認証非対応
- 解決: Cloud Storageデータソースに戻し、事前定義回答で精度確保

#### 現在のパフォーマンス

**処理速度:**
- 事前定義回答（リモートワーク等）: 0.3秒 ⚡
- 通常質問（ウォーム状態）: 2.3-3.3秒
- 通常質問（コールドスタート）: 4.3-5.3秒

**コールドスタート:**
- 発生条件: 5-10分間アクセスなし（Vercelのスリープ）
- 影響: 初回リクエストに+1-3秒の遅延
- 対策: BOT_PREFIX先行送信で体感速度改善

#### 主要なコミット

- `292008c` - Gemini 2.0 Flashに変更（高速化）
- `10b42bc` - 2段構えロジック実装（事前定義回答）
- `5d33bf7` - 事前定義回答に改行追加
- `e3f1cc5` - 福利厚生を箇条書き形式に変更

#### 未実装の最適化案

1. **BOT_PREFIX高速化**: ログ出力削減で50-100ms短縮可能
2. **Keep-Alive**: 定期Pingでコールドスタート回避（無料枠消費）
3. **Vercel Proプラン**: コールドスタート最小化（月額$20〜）

#### 次回の検討事項

- BOT_PREFIXのさらなる高速化（ログ削減）
- 事前定義回答の追加（高頻度質問の洗い出し）
- Cloud StorageへのFAQ.pdf追加（大量Q&A対応）

---

### 2025年11月1日 - kintone URL抽出機能実装セッション

#### 実施内容

1. **事前定義回答の本番データ化（10パターン）**
   - テスト用の3パターン（リモートワーク、福利厚生、コアタイム）を削除
   - 本番用10パターンに置き換え（有給休暇、遅刻連絡、PC私的利用、朝チャット、休日連絡、契約書、在宅勤務、備品購入、計画取得日、未入金）
   - キーワードマッチングをスコアリング方式に変更（keyword count × 10 + keyword length）

2. **アーキテクチャの大幅変更: 事前定義回答を完全廃止**
   - ユーザーの要望: 「事前定義回答はなし、質問に近い回答はできるだけ持ってくる」
   - **全ての質問をVertex AI Searchで処理**する方式に変更
   - 94行の事前定義回答コードを削除
   - kintone レコードURLを参照URLとして回答に添える仕様に変更

3. **kintone URL抽出機能の実装（未解決）**
   - **目的**: PDF内に埋め込まれたkintone URL（`https://eu-plan.cybozu.com/k/238/show#record=X`）を抽出
   - **実装場所**: `app/api/chatwork/route.ts` 377-425行目

   **実装した抽出ロジック（3段階の優先順位）:**
   ```typescript
   // ステップ1: スニペット内容を取得
   let rawSnippet = structData.snippets?.[0]?.snippet || structData.snippet || '';

   // ステップ2: スニペットテキストからkintone URLを正規表現で抽出（最優先）
   const kintoneUrlPattern = /https:\/\/[^\s<]+cybozu\.com[^\s<]*/g;
   const urlMatches = rawSnippet.match(kintoneUrlPattern);
   if (urlMatches) sourceUrl = urlMatches[0];

   // ステップ3: フォールバック（structData.link, uri, extractive_answers, document.name）
   if (!sourceUrl) {
     sourceUrl = structData.link || structData.uri || ...
   }
   ```

4. **TypeScript型エラーの修正**
   - ESLintエラー: `@typescript-eslint/no-explicit-any`
   - 全ての`as any`を削除し、適切な型定義に置き換え
   - `ExtractiveAnswer`インターフェースを定義
   - `in`演算子と型アサーションを使用

#### 現在の問題（未解決）

**症状**: kintone URLの抽出に失敗し、Cloud StorageパスがURLとして返される

**デバッグログ:**
```
📎 最終的なSource URL: gs://ai-chatbot-documents/U'plan様_Kintone_@年間スケジュール...
```

**期待される動作:**
```
📎 最終的なSource URL: https://eu-plan.cybozu.com/k/238/show#record=34&tab=0
```

**原因の調査結果:**
- スニペットにはkintone URLが含まれていることを確認: `"snippet": "レコードID レコードURL 項目 分類 NO ルール 解説 更新日 1 https://eu-plan. ..."`
- 正規表現パターン `/https:\/\/[^\s<]+cybozu\.com[^\s<]*/g` を実装済み
- しかし依然としてCloud Storageパスが返される

**考えられる原因:**
1. スニペットが切り詰められている可能性（`https://eu-plan. ...`）
2. HTMLエンティティやエンコードの問題
3. Vertex AI SearchのスニペットにURLが完全な形で含まれていない
4. `structData.link`が優先されてスニペット抽出処理が実行されていない

#### 試した解決策

1. ✅ スニペット取得を最優先に変更（377-395行目）
2. ✅ 正規表現パターンの実装（399-406行目）
3. ✅ デバッグログの追加（386, 405, 422行目）
4. ❌ **結果変わらず**: 依然としてCloud Storageパスが返される

#### データソース構成

**現在のデータストア:**
- Data Store ID: `internal-rules-cloudstorage_1758630923408`
- データソース: Cloud Storage
- ファイル形式: PDF（kintone URLがテキストとして埋め込まれている）

**PDFの構造:**
```
レコードID | レコードURL                                      | 項目 | 分類 | NO | ルール | 解説
1          | https://eu-plan.cybozu.com/k/238/show#record=34&tab=0 | ...
```

#### 関連ファイル

1. [app/api/chatwork/route.ts](app/api/chatwork/route.ts#L377-L425) - URL抽出ロジック
2. [docs/kintone-url-setup.md](docs/kintone-url-setup.md) - kintone URL設定方法のドキュメント
3. [scripts/add-metadata-to-gcs.sh](scripts/add-metadata-to-gcs.sh) - Cloud Storageメタデータ追加スクリプト
4. [scripts/list-documents.ts](scripts/list-documents.ts) - Data Storeドキュメント一覧取得スクリプト

#### 主要なコミット

- `ab9b3ee` - スニペットテキストからkintone URLを正規表現で抽出する処理を実装（最新、未解決）
- `25d3e05` - 事前定義回答を廃止し、全質問をVertex AI Searchで処理
- `d3a1f02` - TypeScript型エラーを修正（`as any`削除）
- `f8b5e12` - 事前定義回答を10パターンに拡張
- `c4a9a3d` - キーワードマッチングをスコアリング方式に変更

#### 次回のタスク（優先度順）

1. **🔴 kintone URL抽出の根本原因調査（最優先）**
   - Vertex AI SearchのレスポンスJSONを完全にログ出力
   - `rawSnippet`変数の内容をログ出力（正規表現前）
   - `urlMatches`の結果をログ出力
   - `structData.snippets`配列の全件をログ出力
   - スニペット内のURLが切り詰められているか確認

2. **代替アプローチの検討**
   - Cloud Storageカスタムメタデータでkintone URLを保存（[docs/kintone-url-setup.md](docs/kintone-url-setup.md) 参照）
   - PDFのメタデータフィールドにURLを埋め込む
   - JSON形式でドキュメントを再アップロード（`url`フィールド付き）

3. **デバッグ用スクリプトの実行**
   - [scripts/list-documents.ts](scripts/list-documents.ts) でData Store内のドキュメント構造を確認
   - `structData`に含まれるフィールドを全て確認

#### 技術的なメモ

**Vertex AI Searchのスニペット仕様:**
- `structData.snippets`: 配列形式（複数のスニペット候補）
- `snippet_status`: `"SUCCESS"` のものを使用
- スニペットの最大長: 不明（切り詰められる可能性あり）
- HTMLタグが含まれる: `<b>キーワード</b>` など

**正規表現パターンの詳細:**
```typescript
/https:\/\/[^\s<]+cybozu\.com[^\s<]*/g
```
- `[^\s<]+`: 空白とHTMLタグの前まで
- `g`フラグ: 複数マッチに対応
- `&`記号も含む: `#record=34&tab=0`

**現在の処理フロー:**
```
1. Chatwork Webhook受信
2. BOT_PREFIX送信（「お調べしています...」）
3. askAI() 実行
   └─ Vertex AI Search API呼び出し
   └─ スニペット取得
   └─ 正規表現でURL抽出 ← ここで失敗
   └─ structData.linkにフォールバック ← Cloud Storageパスが返される
4. generateAnswerWithGemini() 実行
5. 回答 + URL（`📎 参考: {URL}`）をChatworkに送信
```

---

### 2025年11月2日 - LLM切り替え実験セッション（Claude 4.5 Sonnet）

#### 実施内容

1. **LLMをGemini 2.0 Flash-exp → Claude 4.5 Sonnetに変更**
   - **目的**: より高精度な日本語理解と回答生成を実現
   - **実装場所**: `app/api/chatwork/route.ts`
   - **主な変更点**:
     - パッケージ: `@google/generative-ai` → `@anthropic-ai/sdk`
     - モデル: `gemini-2.0-flash-exp` → `claude-sonnet-4-20250514`
     - 関数名: `generateAnswerWithGemini()` → `generateAnswerWithClaude()`
     - 環境変数: `GEMINI_API_KEY` → `ANTHROPIC_API_KEY`

2. **Anthropic SDK実装の詳細**
   ```typescript
   const anthropic = new Anthropic({ apiKey: apiKey });
   const message = await anthropic.messages.create({
     model: 'claude-sonnet-4-20250514',
     max_tokens: 300,
     temperature: 0.3,
     system: systemPrompt,
     messages: [{ role: 'user', content: userPrompt }]
   });
   ```

3. **環境変数の設定**
   - Vercelに`ANTHROPIC_API_KEY`を追加
   - 既存の`GEMINI_API_KEY`は保持（ロールバック用）

#### 検証結果

**✅ 実装成功**: Claude 4.5 Sonnetへの接続は正常に動作

**❌ クレジット不足エラー**:
```
Error: 400 {"type":"error","error":{"type":"invalid_request_error",
"message":"Your credit balance is too low to access the Anthropic API.
Please go to Plans & Billing to upgrade or purchase credits."}}
```

**ログ証拠**:
```
🤖 Claude 4.5 Sonnet API 呼び出し開始...
📤 Claude APIにリクエスト送信中...
❌ Claude API エラー: Error: 400 ...
```

#### アーキテクチャの確認

**手動RAG（2段階処理）を継続**:
```
1. Vertex AI Search（検索エンジン）
   ↓ スニペット取得
2. LLM（Gemini/Claude）で質問応答形式に変換
   ↓ 自然な回答生成
3. Chatworkに返信
```

**重要な気づき**:
- **以前から手動RAG**: Vertex AI Search（検索）+ Gemini（回答生成）
- **今回も手動RAG**: Vertex AI Search（検索）+ Claude（回答生成）
- **組み込みRAG未使用**: Vertex AI SearchのLLM Addon（`summarySpec`）は`LLM_ADDON_NOT_ENABLED`のため利用不可

#### 回答精度の問題分析

**根本原因はVertex AI Searchの検索品質**:

1. **スニペット品質の問題**
   - 質問「有給休暇の取得手順」に対して、**チャット連絡ルール**のスニペットが返される
   - PDFの**テーブルヘッダー**（レコードID、レコードURL、項目...）がスニペットに含まれる
   - **肝心のルール本文**が欠落

2. **ランキングスコアが低い**
   ```json
   "rankSignals": {
     "keywordSimilarityScore": 2.31,      // 低い
     "semanticSimilarityScore": 0.75,     // 低い（1.0が最高）
     "topicalityRank": 3                   // 3位 = 最適ではない
   }
   ```

3. **PDFフォーマットの問題**
   - テーブル形式のPDFは、テキスト抽出時に構造が崩れる
   - 列見出しとデータが混在
   - URLが切り詰められる（`https://eu-plan. ...`）

#### 対応方針

**優先度1: Vertex AI Searchの検索品質改善**
- PDFフォーマットを自然文形式に変更
- チャンク設定の最適化
- Markdown形式のデータソース追加

**優先度2: LLMの切り替えは後回し**
- Claude 4.5は実装完了済み（コード保存済み）
- Anthropic APIクレジット購入後にいつでも切り替え可能
- 現在はGemini 2.0 Flash-expで継続

#### 最終決定

**LLMをGemini 2.0 Flash-expに戻す**:
- 理由: Anthropic APIクレジット不足
- 戻し作業完了: コミット `d305fb5`
- 検索品質改善を優先

#### 主要なコミット

- `b1fbaae` - LLMをGemini 2.0 Flash-exp → Claude 4.5 Sonnetに変更
- `d305fb5` - Claude 4.5 Sonnet → Gemini 2.0 Flash-expに戻す（クレジット不足のため）

#### 次回の優先タスク

1. **🔴 Vertex AI Searchの検索品質改善（最優先）**
   - PDFフォーマットを自然文形式に変更
   - スニペット品質の向上
   - チャンク設定の最適化（`maxSnippetCount`など）

2. **🟡 kintone URL抽出問題の解決**
   - スニペット切り詰め問題の調査
   - Cloud Storageメタデータの活用検討

3. **🟢 Claude 4.5への切り替え（将来）**
   - Anthropic APIクレジット購入後
   - 実装コードは保存済み（`b1fbaae`コミット参照）

#### 技術的な学び

**手動RAGのメリット**:
- LLMを自由に切り替え可能（Gemini ⇔ Claude）
- プロンプトを細かく制御可能
- コスト最適化が容易

**課題**:
- **検索品質がボトルネック**: LLMがいくら優秀でも、検索結果が不適切なら回答精度は低い
- **Vertex AI Searchの最適化が必須**: スニペット品質、PDFフォーマット、チャンク設定

**結論**:
「良いLLM」よりも「良い検索結果」が重要。まずはVertex AI Searchの改善に注力する。

---

### 2025年11月16日 - Q&Aデータベース大幅拡張セッション（97問→229問）

#### 実施内容

1. **アーキテクチャの大転換: Vertex AI Search完全廃止**
   - **背景**: Vertex AI Searchの検索品質問題（無関係なスニペット、低いランキングスコア、PDF構造崩れ）
   - **新方式**: 全Q&Aをコード内データベースファイル（`qa-database.ts`）に格納
   - **処理フロー**: Q&Aデータベース全件をGeminiに渡し、最適な回答を選択させる方式
   - **実装場所**: [app/data/qa-database.ts](app/data/qa-database.ts)

2. **柔軟な回答生成機能の実装**
   - **目的**: 質問の具体性に応じて回答数を動的に調整
   - **ロジック**:
     - 具体的な質問（例: 「有給休暇の申請方法は？」）→ 1つのQ&Aのみ回答
     - 抽象的な質問（例: 「有給休暇について教えて」）→ 最大3つのQ&Aを回答
   - **判断基準**: Geminiが質問の具体性を自動判断（Embedding不使用）
   - **プロンプト最適化**: 回答フォーマット・例文を詳細に指定

3. **Q&Aデータベースの大幅拡張（97問→229問）**
   - **既存**: 社内ルール 97問（Q1～Q97）
   - **追加**: 年間スケジュール 132問（Q1～Q132）
   - **合計**: 229問
   - **データ形式**: TypeScript型安全構造（`QAItem` interface）
   - **セクション分離**: コメントで明確に区分

   **データ構造:**
   ```typescript
   interface QAItem {
     id: string;
     question: string;
     answer: string;
     category: string;
     url: string;
   }
   ```

4. **Gemini APIプロンプト最適化**
   - **maxOutputTokens**: 300 → 500（複数Q&A対応のため増加）
   - **回答ルール**:
     1. 質問の具体性を判断
     2. 具体的質問 → 単一Q&A回答（2-4文）
     3. 抽象的質問 → メイン回答 + 【関連情報】（最大3件）
     4. 参照URLを必ず含める
     5. Q番号（Q91など）は回答に含めない
   - **UI最適化**: ユーザー要望により「【メイン回答】」見出しを削除

5. **Python自動変換スクリプトの作成**
   - **目的**: 生テキスト132問を自動でTypeScript形式に変換
   - **処理内容**:
     - カテゴリ、質問、回答、kintone URLを正規表現で抽出
     - TypeScript配列形式に整形
     - カンマ位置エラーの自動修正（`}  ,` → `},`）
   - **生産性**: 手動整形数時間 → 自動化30秒

#### 技術的な設計判断

**3つの選択肢の比較:**

| 方式 | メリット | デメリット | 選択結果 |
|------|---------|----------|---------|
| **案A: Geminiに判断を任せる** | ・実装シンプル<br>・コスト低<br>・速度1.2-1.5秒 | ・明確な一致度スコアなし | ✅ **採用** |
| 案B: キーワードマッチング | ・完全制御可能<br>・高速 | ・柔軟性なし<br>・メンテ大変 | ❌ 不採用 |
| 案C: Embedding検索 | ・精度最高 | ・コスト高<br>・遅い（2段階API呼び出し） | ❌ 不採用 |

**選定理由:**
- 229問程度なら全件送信で十分（25,000トークン ≈ $0.0007）
- Geminiの自然言語理解で十分な精度（avgLogprobs: -0.0055 = 高信頼度）
- 実装がシンプルで保守性が高い

#### パフォーマンス指標

**処理速度:**
- 97問時: 0.84秒（10,776トークン）
- 229問時: 1.2-1.5秒（25,000トークン）
- 増加: +0.36-0.66秒（許容範囲内）

**コスト（Gemini 2.0 Flash-exp）:**
- Prompt tokens: 25,000 × $0.00003 = $0.00075
- Output tokens: 150 × $0.00012 = $0.00002
- **合計: $0.0007/リクエスト** （月1000件で$0.70）

**データ規模:**
- データファイルサイズ: ~46,000文字
- プロンプト全体: ~25,000トークン
- スケーラビリティ: 500問まで問題なし

#### エラー修正履歴

**Error 1: TypeScript Path Alias**
- 症状: `Module not found: Can't resolve '@/app/data/qa-database'`
- 原因: ビルド時のエイリアス解決失敗
- 修正: `../../data/qa-database` に相対パス変更

**Error 2: ESLint Violations（4件）**
- `cleanSnippet` 未使用: 関数全削除（Vertex AI Search廃止のため不要）
- `question`, `sourceUrl` 未使用: `_question`, `_sourceUrl` にリネーム
- `text` 再代入なし: `let` → `const` 変更

**Error 3: TypeScript Parsing Error**
- 症状: `Property assignment expected` at line 720
- 原因: `}  ,` のカンマ位置が間違い
- 修正: Pythonスクリプトで `}  ,` → `},` 一括置換

#### 主要なコミット

- `61e1f55` - Q&Aデータベース大幅拡張: 97問→229問（+132問追加）
- `e13b687` - コメント追加: 社内ルールと年間スケジュールを明確に区分
- `9844614` - プロンプト修正: 抽象的な質問への回答から「【メイン回答】」見出しを削除
- `04e4e7e` - Geminiプロンプト最適化: 質問の具体性に応じた柔軟な回答生成機能を実装

#### 実装ファイル

1. **[app/data/qa-database.ts](app/data/qa-database.ts)**
   - 229問のQ&Aデータベース（社内ルール97問 + 年間スケジュール132問）
   - `getAllQAAsText()` 関数: 全Q&Aをテキスト形式で取得
   - TypeScript型安全（`QAItem` interface）

2. **[app/api/chatwork/route.ts](app/api/chatwork/route.ts)**
   - `askAI()` 関数: Q&Aデータベース全件取得（149-164行）
   - `generateAnswerWithGemini()` 関数: プロンプト最適化（167-265行）
   - Q&A数表示: 「229問」に更新（150, 155, 191行）
   - maxOutputTokens: 500に設定（186行）

#### 回答例（実際の動作）

**具体的な質問:**
```
質問: 「有給休暇の申請方法を教えて」
回答:
有給休暇の申請は、KING OF TIMEで行ってください。遅刻・残業なども同じくKING OF TIMEで申請を行います。
参照URL: https://eu-plan.cybozu.com/k/296/show#record=25
```

**抽象的な質問:**
```
質問: 「有給休暇について教えて」
回答:
有給休暇の申請は、KING OF TIMEで行ってください。遅刻・残業なども同じくKING OF TIMEで申請を行います。

【関連情報】
・計画取得日: 奇数月の第2水曜日が有給休暇の計画取得日として推奨されています。
・半休・時間休: 午前半休は13時から勤務開始、午後半休は13時までの勤務です。時間休は1時間単位で取得可能です。

参照URL:
https://eu-plan.cybozu.com/k/296/show#record=25
https://eu-plan.cybozu.com/k/296/show#record=90
https://eu-plan.cybozu.com/k/296/show#record=96
```

#### アーキテクチャの変更履歴

**旧方式（Vertex AI Search使用）:**
```
1. Chatwork Webhook受信
2. BOT_PREFIX送信
3. Vertex AI Search APIで検索
   └─ スニペット取得（品質問題あり）
   └─ kintone URL抽出（失敗）
4. Geminiで回答生成
5. Chatworkに返信
```

**新方式（Q&Aデータベース直接参照）:**
```
1. Chatwork Webhook受信
2. BOT_PREFIX送信
3. Q&Aデータベースから全229問を取得
   └─ qa-database.ts の getAllQAAsText() 呼び出し
4. Geminiに全Q&Aを渡して最適な回答を選択
   └─ 具体的質問 → 1件回答
   └─ 抽象的質問 → 最大3件回答
5. kintone URLを含む回答をChatworkに返信
```

#### メリット・デメリット

**メリット:**
- ✅ **回答精度の向上**: Vertex AI Searchの検索品質問題を完全回避
- ✅ **応答速度の改善**: Vertex AI Search API呼び出しが不要（200-500ms高速化）
- ✅ **コスト削減**: Vertex AI Search APIコール不要（Gemini APIのみ）
- ✅ **URL抽出の確実性**: kintone URLがデータベースに確実に格納
- ✅ **管理の容易さ**: TypeScriptファイル1つで全Q&A管理
- ✅ **即座に反映**: ファイル更新 → GitHub push → Vercel自動デプロイ
- ✅ **柔軟な回答**: 質問の具体性に応じて1件～3件の回答を自動調整

**デメリット:**
- ⚠️ **トークン数増加**: 全229問を毎回Geminiに送る（25,000トークン）
- ⚠️ **応答時間微増**: プロンプトが長いため+200-500ms
- ⚠️ **更新時デプロイ必要**: Q&A追加/修正時にGitHub push + Vercel再デプロイ
- ⚠️ **スケーラビリティ**: 500問以上になると検討が必要（Embedding検索への移行を検討）

#### 現在のシステム状態

**環境変数（Vercel）:**
- `GEMINI_API_KEY`: Google AI Studio APIキー
- `CHATWORK_API_TOKEN`: Chatwork API トークン
- `CHATWORK_MY_ID`: 10686206
- `BOT_PREFIX`: 「お調べしています...」

**使用モデル:**
- **LLM**: Gemini 2.0 Flash-exp
- **temperature**: 0.3（一貫性重視）
- **maxOutputTokens**: 500（複数Q&A対応）

**デプロイ状態:**
- ✅ Vercel本番環境デプロイ済み
- ✅ 229問Q&A稼働中
- ✅ 柔軟な回答生成機能動作中
- ✅ 処理時間: 1.2-1.5秒
- ✅ コスト: $0.0007/リクエスト

#### 今後の拡張予定

**短期（現状維持）:**
- Q&A数が500問以下なら現在のシンプル全件送信方式を継続
- 月間コスト: 1000リクエスト = $0.70（許容範囲）

**中期（Embedding検索への移行を検討）:**
- Q&A数が500問を超えたら以下を検討:
  1. Vertex AI Embedding API使用
  2. ベクトル検索で上位10件に絞る
  3. 絞った10件をGeminiに渡す
- コスト試算: Embedding $0.00002 + Gemini $0.0003 = $0.00032（現状の半分）
- 実装工数: 2-3日

**長期（AI Agent化）:**
- 複数のデータソース統合（社内ルール、FAQ、技術ドキュメント）
- ストリーミング応答対応
- 会話履歴保持（コンテキスト対応）

#### 技術的な学び

**シンプルな実装の価値:**
- 229問程度なら全件送信で十分（過度な最適化不要）
- Geminiの自然言語理解は信頼できる（明示的スコア不要）
- TypeScriptの型安全性がデータ品質を保証

**Vertex AI Searchの限界:**
- PDFテーブル形式はスニペット品質が低い
- ランキングスコアが不安定（semanticSimilarityScore: 0.75）
- kintone URL抽出が困難（切り詰め問題）

**Q&Aデータベース方式の成功要因:**
- データ量が適切（229問 ≈ 25,000トークン）
- LLMの能力活用（具体性判断、複数回答選択）
- TypeScriptによる型安全性

#### 結論

**Vertex AI Search → Q&Aデータベース直接参照方式への移行は成功**
- 回答精度向上、速度改善、コスト削減を同時達成
- 229問のデータ規模なら全件送信方式が最適
- 今後500問超えたらEmbedding検索への移行を検討

---

### 2025年12月15日 - Q&Aデータベース拡張セッション（229問→312問）& 前受金優先処理実装

#### 実施内容

**セッション1: リファラル採用 & 代休の追加（229問→267問）**
1. リファラル採用（Referral recruitment）: 29問追加（Q133-Q161）
   - 紹介制度の基本、インセンティブ、手続き、対象者など
   - 参照URL: `https://eu-plan.cybozu.com/k/238/show#record=8&tab=2`

2. 代休（Compensatory leave）: 9問追加（Q162-Q170）
   - 休日出勤後の代休取得ルール（当月内取得必須）
   - 参照URL: `https://eu-plan.cybozu.com/k/238/show#record=8&tab=2`

**セッション2: 社員面談の追加（267問→307問）**
3. 社員面談（Employee interviews）: 40問追加（Q171-Q210）
   - 面談の基本、スケジュール（11/4-6）、SG sheet締切、評価方法など
   - 参照URL: `https://eu-plan.cybozu.com/k/238/show#record=8&tab=2`

**セッション3: 贈答品 & 郵便物の追加（307問→312問）**
4. 贈答品（Gifts）: 2問追加（Q211-Q212）
   - お歳暮・お中元の受け取り手続き
   - 参照URL: `https://eu-plan.cybozu.com/k/238/show#record=8&tab=3`

5. 郵便物（Mail）: 3問追加（Q213-Q215）
   - 郵便物の受け取りと送付の基本ルール
   - 参照URL: `https://eu-plan.cybozu.com/k/238/show#record=8&tab=0`

**セッション4: 前受金優先処理の実装（Q26削除 → Q216追加）**

#### 前受金優先処理の実装詳細

**背景と問題**:
- 既存Q26に誤った前受金ルールが記載されていた
  - 誤: 「新規顧客30万＋税以上50％、既存顧客50万＋税以上30％」
  - 正: 「税込22万円以下は全額前受、22万1円以上は半額前受金」
- ユーザー要望: 正しいルールが最優先で返答されるように「特別枠」を実装

**実装内容**:

1. **誤ったQ26を削除**
   - ファイル: [app/data/qa-database.ts](app/data/qa-database.ts)
   - 行番号: 206-212行目（削除）

2. **正しいQ216を追加**
   ```typescript
   {
     id: "Q216",
     question: "前受金について教えてください。",
     answer: "税込22万円以下は全額前受、22万1円以上は半額前受金です。※前受金は50％かつ、1000円未満は切り捨てです（2020年3月以降　暫定ルール）",
     category: "前受金",
     url: "https://eu-plan.cybozu.com/k/296/show#record=26"
   }
   ```

3. **事前定義回答の特別優先枠を実装**
   - ファイル: [app/api/chatwork/route.ts](app/api/chatwork/route.ts)
   - 関数: `getPredefinedAnswer()` (148-161行)
   - トリガー: 質問に「前受金」「前受」「ぜんうけきん」を含む
   - 動作: キーワードマッチで即座に返答（Gemini API呼び出し不要）

   **実装コード**:
   ```typescript
   function getPredefinedAnswer(question: string): { answer: string; url: string } | null {
     const q = question.toLowerCase();

     // 前受金（優先ルール）- Q216
     if (q.includes('前受金') || q.includes('前受') || q.includes('ぜんうけきん')) {
       return {
         answer: '税込22万円以下は全額前受、22万1円以上は半額前受金です。\n※前受金は50％かつ、1000円未満は切り捨てです（2020年3月以降　暫定ルール）',
         url: 'https://eu-plan.cybozu.com/k/296/show#record=26'
       };
     }

     return null;
   }
   ```

4. **POSTハンドラに統合**
   - 行番号: 55-63行
   - 処理: 事前定義回答チェックを最優先で実行
   - ヒット時: 即座に返答して処理終了
   - ミス時: 通常のQ&Aデータベース検索フローへ

#### 処理フローの変更

**新しい処理フロー（事前定義回答優先）**:
```
1. Chatwork Webhook受信
2. 事前定義回答チェック（最優先）← NEW!
   ├─ ヒット（前受金など） → 即座に返答（0.3-0.5秒）
   └─ ミス → 通常フローへ
3. BOT_PREFIX送信（「お調べしています...」）
4. Q&Aデータベースから全312問を取得
5. Geminiに全Q&Aを渡して最適な回答を選択
6. Chatworkに返信
```

#### パフォーマンス指標

**前受金質問時（事前定義回答）**:
- ⚡ **処理時間**: 0.3-0.5秒（超高速）
- 💰 **コスト**: $0/リクエスト（Gemini API不要）
- 📊 **精度**: 100%（固定回答）

**その他の質問（Q&Aデータベース検索）**:
- 🔍 **処理時間**: 1.6-2.0秒
- 💰 **コスト**: $0.001/リクエスト（312問 ≈ 34,500トークン）
- 📊 **精度**: Geminiの自然言語理解による

#### データ規模の推移

| セッション | 追加内容 | Q&A総数 | プロンプトトークン | コスト/リクエスト |
|-----------|---------|---------|------------------|----------------|
| 初期 | 社内ルール97問 + 年間スケジュール132問 | 229問 | ~25,000 | $0.0007 |
| +1 | リファラル採用29問 + 代休9問 | 267問 | ~29,000 | $0.0008 |
| +2 | 社員面談40問 | 307問 | ~34,000 | $0.001 |
| +3 | 贈答品2問 + 郵便物3問 | 312問 | ~34,500 | $0.001 |
| 最終 | 前受金Q26削除 → Q216追加（総数変わらず） | 312問 | ~34,500 | $0.001 |

#### 重要なルール: 参照URL必須

**全Q&A回答に参照URLを必ず含める（3層保証）**:

1. **データベースレベル（qa-database.ts）**:
   - 全QAItemに`url`フィールド必須
   - カテゴリごとに適切なkintone URLを設定
   - 例: リファラル採用 → `tab=2`, 贈答品 → `tab=3`, 郵便物 → `tab=0`

2. **プロンプトレベル（route.ts）**:
   - Geminiプロンプトに「参照URL: 必須」を明記
   - 具体的質問: 1つのURL
   - 抽象的質問: 最大3つのURLを改行して列挙

3. **例文レベル（プロンプト内）**:
   - 全ての回答例に参照URLを含める
   - フォーマット統一: `参照URL: {URL}`

**実装例（generateAnswerWithGemini関数）**:
```typescript
【回答フォーマット】
【具体的な質問の場合】
- 回答内容（A:の部分を使用、2-4文以内）
- 参照URL: （そのままコピー）  // ← 必須

【抽象的な質問の場合】
- 回答内容（最も重要な情報、2-4文以内）
- 【関連情報】その他の関連ルール（最大2件、各1-2文で簡潔に）
- 参照URL: （全てのURL、改行して列挙）  // ← 必須
```

#### 拡張性の設計

**特別優先枠への追加が容易**:

現在の実装により、今後も重要なルールを特別優先枠に追加可能:

```typescript
// 前受金（優先ルール）- Q216
if (q.includes('前受金') || q.includes('前受') || q.includes('ぜんうけきん')) {
  return { answer: '...', url: '...' };
}

// 将来の追加例: 有給休暇
if (q.includes('有給') && q.includes('申請')) {
  return {
    answer: 'KING OF TIMEで申請してください。遅刻・残業なども同じくKING OF TIMEで申請を行います。',
    url: 'https://eu-plan.cybozu.com/k/296/show#record=25'
  };
}

// 将来の追加例: コアタイム
if (q.includes('コアタイム')) {
  return {
    answer: 'コアタイムは11:00～16:00です。この時間帯は原則として業務に従事する必要があります。',
    url: 'https://eu-plan.cybozu.com/k/238/show#record=8'
  };
}
```

#### 主要なコミット

- `99905a3` - Q&Aデータベース拡張: 229問→267問（リファラル採用29問・代休9問を追加）
- `9c61c8e` - Q&Aデータベース拡張: 267問→307問（社員面談40問を追加）
- `b2f165a` - Q&Aデータベース拡張: 307問→312問（贈答品2問・郵便物3問を追加）
- `459c195` - 前受金Q&A優先処理実装: 誤ったQ26削除・Q216追加・事前定義回答特別枠を実装

#### URL管理のベストプラクティス

**カテゴリごとのURL一貫性**:

| カテゴリ | 参照URL | 備考 |
|---------|---------|------|
| 社内ルール（基本） | `https://eu-plan.cybozu.com/k/238/show#record=8&tab=0` | デフォルト |
| リファラル採用 | `https://eu-plan.cybozu.com/k/238/show#record=8&tab=2` | tab=2 |
| 代休 | `https://eu-plan.cybozu.com/k/238/show#record=8&tab=2` | tab=2 |
| 社員面談 | `https://eu-plan.cybozu.com/k/238/show#record=8&tab=2` | tab=2 |
| 贈答品 | `https://eu-plan.cybozu.com/k/238/show#record=8&tab=3` | tab=3 |
| 郵便物 | `https://eu-plan.cybozu.com/k/238/show#record=8&tab=0` | tab=0 |
| 前受金 | `https://eu-plan.cybozu.com/k/296/show#record=26` | 別レコード |
| 有給休暇 | `https://eu-plan.cybozu.com/k/296/show#record=25` | 別レコード |

**URL設定時の注意点**:
1. 同一カテゴリ内の全Q&Aは同じURLを使用
2. kintoneのタブ番号（`&tab=X`）は正確に指定
3. レコードIDが異なる場合は適切に変更
4. 事前定義回答にもURLを必ず含める

#### 現在のシステム状態

**総Q&A数**: 312問
- 社内ルール: 96問（Q1-Q25, Q27-Q97）※Q26削除
- 年間スケジュール: 132問（Q98-Q229）
- リファラル採用: 29問（Q133-Q161）
- 代休: 9問（Q162-Q170）
- 社員面談: 40問（Q171-Q210）
- 贈答品: 2問（Q211-Q212）
- 郵便物: 3問（Q213-Q215）
- 前受金: 1問（Q216）**【特別優先枠】**

**事前定義回答（特別優先枠）**: 1件
- 前受金: キーワードマッチで即座に返答（0.3-0.5秒）

**環境変数（Vercel）**:
- `GEMINI_API_KEY`: Google AI Studio APIキー
- `CHATWORK_API_TOKEN`: Chatwork API トークン
- `CHATWORK_MY_ID`: 10686206
- `BOT_PREFIX`: 「お調べしています...」

**使用モデル**:
- **LLM**: Gemini 2.0 Flash-exp
- **temperature**: 0.3（一貫性重視）
- **maxOutputTokens**: 500（複数Q&A対応）

**デプロイ状態**:
- ✅ Vercel本番環境デプロイ済み
- ✅ 312問Q&A稼働中
- ✅ 前受金優先処理機能動作中
- ✅ 事前定義回答: 0.3-0.5秒
- ✅ Q&Aデータベース検索: 1.6-2.0秒
- ✅ コスト: $0.001/リクエスト（前受金は$0）

#### 技術的な学び

**事前定義回答の活用**:
- 高頻度質問や重要ルールは事前定義回答で対応
- キーワードマッチングで超高速応答（0.3-0.5秒）
- Gemini APIコスト削減（$0/リクエスト）

**2段構えアーキテクチャの成功**:
- 事前定義回答（特別優先枠） → 超高速・低コスト
- Q&Aデータベース検索（通常フロー） → 柔軟・高精度
- ユーザー体感速度の向上と精度を両立

**URL管理の重要性**:
- 全回答に参照URLを含めることで信頼性向上
- カテゴリごとのURL一貫性が保守性を高める
- 3層保証（データ・プロンプト・例文）で確実性確保

#### 今後の展望

**短期（現状維持）**:
- 事前定義回答を数件追加（有給休暇、コアタイムなど）
- Q&A数が500問以下なら現在の方式を継続

**中期（最適化）**:
- 高頻度質問の洗い出しと事前定義回答化
- 事前定義回答を10-20件まで拡張（キャッシュ効果）

**長期（スケーラビリティ）**:
- Q&A数500問超えたらEmbedding検索への移行検討
- 会話履歴保持によるコンテキスト対応
- ストリーミング応答の実装