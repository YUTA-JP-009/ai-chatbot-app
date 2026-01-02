/**
 * 「1回目」「2回目」を含むテーブルを探すスクリプト
 */

import 'dotenv/config';
import { fetchScheduleRecordInternal } from '../app/lib/kintone-client';

async function main() {
  console.log('🔍 「1回目」「2回目」を含むテーブルを検索します\n');

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
      continue;
    }

    const tableJson = JSON.stringify(tableData, null, 2);

    const round1Count = (tableJson.match(/1回目|１回目/g) || []).length;
    const round2Count = (tableJson.match(/2回目|２回目/g) || []).length;

    if (round1Count > 0 || round2Count > 0) {
      console.log(`\n🎯 ${tableField.name} (${tableField.label}, Tab ${tableField.tab}):`);
      console.log(`   - 1回目: ${round1Count}回`);
      console.log(`   - 2回目: ${round2Count}回`);

      // 「社員面談」+「1回目」または「2回目」を含む行を探す
      for (const row of tableData) {
        const rowJson = JSON.stringify(row, null, 2);
        if ((rowJson.includes('1回目') || rowJson.includes('１回目') ||
             rowJson.includes('2回目') || rowJson.includes('２回目')) &&
            rowJson.includes('社員面談')) {

          // タイトルフィールドを抽出
          const titleField = row.value['文字列__1行__5'] ||
                            row.value['文字列__1行__14'] ||
                            row.value['文字列__1行__4'] ||
                            row.value['文字列__1行__36'];

          const title = titleField?.value || '(タイトルなし)';
          console.log(`   📌 タイトル: ${title}`);

          // 「上野」を含むか確認
          if (rowJson.includes('上野')) {
            console.log(`      ✅ 「上野」を含む`);

            // 詳細内容を表示（最初の500文字）
            const contentField = row.value['文字列__複数行__9'] ||
                                row.value['文字列__複数行__14'] ||
                                row.value['文字列__複数行__8'];

            const content = contentField?.value || '';
            if (content) {
              console.log(`      内容（最初の500文字）:\n${content.substring(0, 500)}...\n`);
            }
          }
        }
      }
    }
  }

  console.log('\n✅ 検索完了');
}

main().catch(error => {
  console.error('❌ エラーが発生しました:', error);
  process.exit(1);
});
