#!/bin/bash

# Cloud StorageのドキュメントにメタデータとしてkintoneレコードURLを追加するスクリプト

# 使用方法:
# ./scripts/add-metadata-to-gcs.sh gs://bucket-name/path/to/file.pdf "https://eu-plan.cybozu.com/k/238/show#record=8"

GCS_FILE=$1
KINTONE_URL=$2

if [ -z "$GCS_FILE" ] || [ -z "$KINTONE_URL" ]; then
  echo "使用方法: $0 <GCSファイルパス> <kintoneレコードURL>"
  echo "例: $0 gs://my-bucket/doc.pdf https://eu-plan.cybozu.com/k/238/show#record=8"
  exit 1
fi

echo "📎 メタデータを追加中..."
echo "ファイル: $GCS_FILE"
echo "URL: $KINTONE_URL"

# メタデータを追加
gsutil setmeta -h "x-goog-meta-url:$KINTONE_URL" "$GCS_FILE"

if [ $? -eq 0 ]; then
  echo "✅ メタデータが追加されました"
  echo ""
  echo "確認:"
  gsutil stat "$GCS_FILE" | grep "x-goog-meta-url"
else
  echo "❌ エラーが発生しました"
  exit 1
fi
