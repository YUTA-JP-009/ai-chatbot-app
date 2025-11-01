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