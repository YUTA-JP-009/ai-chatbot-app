# kintoneレコードURLを参照URLとして取得する設定方法

## 概要

Vertex AI Searchの検索結果に、kintoneのレコードURL（例: `https://eu-plan.cybozu.com/k/238/show#record=8&tab=0`）を参照URLとして含める方法を説明します。

---

## 方法1: Cloud Storageのカスタムメタデータを使用（推奨）

### 手順

1. **Cloud StorageにアップロードするPDF/ファイルにメタデータを追加**

Google Cloud Consoleまたは`gsutil`コマンドでメタデータを設定します。

#### GCloud Consoleでの設定

```bash
# Cloud Storageバケットを開く
# ファイルを選択 → メタデータを編集
# カスタムメタデータに以下を追加:
key: url
value: https://eu-plan.cybozu.com/k/238/show#record=8&tab=0
```

#### gsutilコマンドでの設定

```bash
# メタデータを追加
gsutil setmeta -h "x-goog-meta-url:https://eu-plan.cybozu.com/k/238/show#record=8&tab=0" \
  gs://your-bucket-name/documents/document.pdf

# 確認
gsutil stat gs://your-bucket-name/documents/document.pdf
```

---

## 方法2: ドキュメント内にURL情報を埋め込む

### PDFの場合

PDFのメタデータ（Author, Subject, Keywordsなど）にURLを埋め込む方法もありますが、Vertex AI Searchがこれをうまくパースできるとは限りません。

### テキストファイルの場合

ドキュメントの最初や最後に以下のような形式で埋め込みます：

```
---
URL: https://eu-plan.cybozu.com/k/238/show#record=8&tab=0
---

[本文]
```

---

## 方法3: JSONドキュメントとしてアップロード

Cloud StorageにJSON形式でドキュメントをアップロードし、`url`フィールドを明示的に含めます。

### サンプルJSON

```json
{
  "id": "rule-001",
  "title": "有給休暇の計画取得日",
  "content": "22期の有給休暇の計画取得日は、12月30日（火）と8月10日（月）の2日間です。",
  "url": "https://eu-plan.cybozu.com/k/238/show#record=8&tab=0",
  "category": "有給休暇"
}
```

### アップロード

```bash
gsutil cp rule-001.json gs://your-bucket-name/documents/
```

---

## 現在のコード対応状況

`app/api/chatwork/route.ts`では、以下の優先順位でURLを取得します：

1. `structData.link`
2. `structData.uri`
3. `extractive_answers[0].uri` または `extractive_answers[0].page_identifier`
4. `structData.url`（カスタムメタデータ）
5. `structData.source_url`
6. `structData.record_url`
7. `document.name`（フォールバック）

---

## テスト方法

1. Cloud Storageに1つのドキュメントをアップロード（メタデータ付き）
2. Chatworkから質問を送信
3. ログを確認:
   ```
   📎 Source URL: https://eu-plan.cybozu.com/k/238/show#record=8&tab=0
   🔍 DEBUG - structData keys: ['title', 'snippet', 'url', ...]
   ```

---

## 次のステップ

- Cloud Storageの既存ドキュメントにメタデータを一括追加するスクリプトを作成
- kintone APIと連携してレコードURLを自動取得する仕組みを検討
