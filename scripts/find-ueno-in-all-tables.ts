/**
 * 全テーブルから「上野」を含むテーブルを探すスクリプト
 */

import 'dotenv/config';
import { fetchScheduleRecordInternal } from '../app/lib/kintone-client';

async function main() {
  console.log('🔍 全テーブルから「上野」を検索します\n');

  const record = await fetchScheduleRecordInternal();

  if (!record) {
    console.error('❌ レコード取得失敗');
    return;
  }

  const tableFields = [
    { name: 'Table_3', label: '毎月', tab: 0 },
    { name: 'Table_4', label: '随時', tab: 1 },
    { name: 'Table_5', label: '10月', tab: 2 },
    { name: 'Table_6', label: '11月', tab: 3 },
    { name: 'Table_7', label: '12月', tab: 4 },
    { name: 'Table_8', label: '1月', tab: 5 },
    { name: 'Table_9', label: '2月', tab: 6 },
    { name: 'Table_10', label: '3月', tab: 7 },
    { name: 'Table_11', label: '4月', tab: 8 },
    { name: 'Table_12', label: '5月', tab: 9 },
    { name: 'Table_13', label: '6月', tab: 10 },
    { name: 'Table_15', label: '7月', tab: 11 },
    { name: 'Table_14', label: '8月', tab: 12 },
    { name: 'Table_16', label: '9月', tab: 13 },
  ];

  for (const tableField of tableFields) {
    const tableData = record[tableField.name]?.value;

    if (!tableData || !Array.isArray(tableData) || tableData.length === 0) {
      console.log(`⚪ ${tableField.name} (${tableField.label}, Tab ${tableField.tab}): データなし`);
      continue;
    }

    // テーブル全体をJSON文字列化して「上野」を検索
    const tableJson = JSON.stringify(tableData, null, 2);
    const uenoCount = (tableJson.match(/上野/g) || []).length;

    if (uenoCount > 0) {
      console.log(`\n🎯 ${tableField.name} (${tableField.label}, Tab ${tableField.tab}): 「上野」が${uenoCount}回出現`);
      console.log('================================================================================');

      // 「上野」を含む行を表示
      for (const row of tableData) {
        const rowJson = JSON.stringify(row, null, 2);
        if (rowJson.includes('上野')) {
          console.log(rowJson);
          console.log('--------------------------------------------------------------------------------');
        }
      }
    } else {
      console.log(`⚪ ${tableField.name} (${tableField.label}, Tab ${tableField.tab}): 「上野」なし（データ${tableData.length}行）`);
    }
  }

  console.log('\n✅ 検索完了');
}

main().catch(error => {
  console.error('❌ エラーが発生しました:', error);
  process.exit(1);
});
