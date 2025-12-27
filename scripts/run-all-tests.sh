#!/bin/bash

# Kintone統合機能の全テストを実行

echo "🚀 Kintone統合機能 - 全テスト実行"
echo "========================================="
echo ""

# 色定義
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# テスト質問リスト
questions=(
  "毎月の売り上げ目標は？"
  "一級建築士のガイダンスはいつ？"
  "研修旅行はどこにいく？"
  "夏期休業はいつからいつまで？"
  "秘密保持契約の確認はいつやる？"
  "リモートワークについて教えて"
  "休日の連絡事項について教えて"
)

# 各質問をテスト
test_num=1
for question in "${questions[@]}"; do
  echo -e "${BLUE}テスト ${test_num}: ${question}${NC}"
  echo "----------------------------------------"

  curl -s -X POST "http://localhost:3000/api/chatwork-test" \
    -H "Content-Type: application/json" \
    -d "{\"question\": \"$question\"}" | \
    python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print('回答:')
    print(data['answer'][:300] + '...' if len(data['answer']) > 300 else data['answer'])
    print()
    print(f\"⏱️  処理時間: {data['performance']['total_seconds']}秒\")
    print(f\"📊 データ長: {data['metadata']['data_length']:,}文字\")
except Exception as e:
    print(f'エラー: {e}')
"

  echo ""
  echo "========================================="
  echo ""

  test_num=$((test_num + 1))
  sleep 1  # API制限対策
done

echo -e "${GREEN}✅ 全テスト完了！${NC}"
