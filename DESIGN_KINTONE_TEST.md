# 年間スケジュールアプリ Tab構造調査

## ✅ 確定したTab構造（スクリーンショット確認済み）

**重要な発見:**
- 合計14個のタブが存在
- Tab番号（0-13）は画面表示順に対応
- **7月タブは存在しない**（Table_15は未使用またはデータなし）

| Tab番号 | ラベル | URL | テーブルフィールド | 内容の系統 |
|---------|--------|-----|-------------------|-----------|
| Tab 0 | 毎月 | https://eu-plan.cybozu.com/k/238/show#record=8&tab=0 | Table_3 | 毎月実施の定期業務 |
| Tab 1 | 随時 | https://eu-plan.cybozu.com/k/238/show#record=8&tab=1 | Table_4 | 随時イベント（リファラル採用、代休、社員面談など） |
| Tab 2 | 10月 | https://eu-plan.cybozu.com/k/238/show#record=8&tab=2 | Table_5 | 10月の年間行事 |
| Tab 3 | 11月 | https://eu-plan.cybozu.com/k/238/show#record=8&tab=3 | Table_6 | 11月の年間行事（贈答品含む） |
| Tab 4 | 12月 | https://eu-plan.cybozu.com/k/238/show#record=8&tab=4 | Table_7 | 12月の年間行事 |
| Tab 5 | 1月 | https://eu-plan.cybozu.com/k/238/show#record=8&tab=5 | Table_8 | 1月の年間行事 |
| Tab 6 | 2月 | https://eu-plan.cybozu.com/k/238/show#record=8&tab=6 | Table_9 | 2月の年間行事 |
| Tab 7 | 3月 | https://eu-plan.cybozu.com/k/238/show#record=8&tab=7 | Table_10 | 3月の年間行事 |
| Tab 8 | 4月 | https://eu-plan.cybozu.com/k/238/show#record=8&tab=8 | Table_11 | 4月の年間行事 |
| Tab 9 | 5月 | https://eu-plan.cybozu.com/k/238/show#record=8&tab=9 | Table_12 | 5月の年間行事 |
| Tab 10 | 6月 | https://eu-plan.cybozu.com/k/238/show#record=8&tab=10 | Table_13 | 6月の年間行事 |
| Tab 11 | 8月 | https://eu-plan.cybozu.com/k/238/show#record=8&tab=11 | Table_14 | 8月の年間行事 |
| Tab 12 | 9月 | https://eu-plan.cybozu.com/k/238/show#record=8&tab=12 | Table_16 | 9月の年間行事 |

**注意:** Tab 11は「7月」ではなく「8月」、Tab 12は「9月」

## 重要な発見

### 贈答品の配置
- **確定**: 贈答品はTab 3（11月）に配置されている
- **ユーザー確認URL**: `https://eu-plan.cybozu.com/k/238/show#record=8&tab=3`
- **理由**: 11月にお歳暮シーズンが始まるため、11月タブに贈答品ルールが記載されている

### Tab番号の修正が必要
kintone-client.tsのTab番号を以下のように修正済み：

```typescript
const tableFields = [
  { name: 'Table_3', label: '毎月', tab: 0 },
  { name: 'Table_4', label: '随時', tab: 1 },
  { name: 'Table_5', label: '10月', tab: 2 },
  { name: 'Table_6', label: '11月', tab: 3 },  // ← 贈答品はここ
  { name: 'Table_7', label: '12月', tab: 4 },
  { name: 'Table_8', label: '1月', tab: 5 },
  { name: 'Table_9', label: '2月', tab: 6 },
  { name: 'Table_10', label: '3月', tab: 7 },
  { name: 'Table_11', label: '4月', tab: 8 },
  { name: 'Table_12', label: '5月', tab: 9 },
  { name: 'Table_13', label: '6月', tab: 10 },
  { name: 'Table_14', label: '8月', tab: 11 },  // ← 7月ではなく8月
  { name: 'Table_16', label: '9月', tab: 12 },  // ← tab=13ではなく12
];
```

**重要な修正点:**
- Table_14のTab番号: 12 → 11（8月）
- Table_16のTab番号: 13 → 12（9月）
- 合計13個のタブ（Tab 0-12）、7月タブは存在しない
