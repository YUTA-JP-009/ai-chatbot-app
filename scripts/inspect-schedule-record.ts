#!/usr/bin/env tsx

/**
 * 年間スケジュールアプリのレコード構造調査
 * 22期（レコードID 8）のテーブルデータ構造を詳細に表示
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function inspectScheduleRecord() {
  const domain = process.env.KINTONE_DOMAIN!;
  const apiToken = process.env.KINTONE_API_TOKEN_SCHEDULE!;
  const appId = process.env.KINTONE_APP_ID_SCHEDULE!;

  // レコードID 8（22期）を取得
  const url = `https://${domain}/k/v1/record.json?app=${appId}&id=8`;

  console.log('📥 レコードID 8（22期）を取得中...\n');

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'X-Cybozu-API-Token': apiToken,
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  const data = await response.json();
  const record = data.record;

  // JSON全体をファイルに保存
  fs.writeFileSync('schedule-record-8.json', JSON.stringify(data, null, 2));
  console.log('✅ schedule-record-8.json に保存しました\n');

  // 期の情報
  console.log(`📊 レコード情報:`);
  console.log(`  レコードID: ${record.$id.value}`);
  console.log(`  期: ${record.数値?.value}期`);
  console.log('');

  // 全テーブルフィールドを表示
  const tableFields = Object.keys(record).filter(key =>
    key.startsWith('Table') && Array.isArray(record[key]?.value)
  );

  console.log(`📋 テーブルフィールド一覧（${tableFields.length}個）:\n`);

  tableFields.forEach(tableName => {
    const tableData = record[tableName].value;
    console.log(`--- ${tableName} (${tableData.length}件) ---`);

    if (tableData.length > 0) {
      // 最初の1件のフィールド構造を表示
      const firstRow = tableData[0].value;
      console.log('フィールド構造:');
      Object.keys(firstRow).forEach(fieldName => {
        const fieldValue = firstRow[fieldName]?.value;
        if (typeof fieldValue === 'string') {
          console.log(`  ${fieldName}: "${fieldValue.substring(0, 100)}${fieldValue.length > 100 ? '...' : ''}"`);
        } else {
          console.log(`  ${fieldName}: ${JSON.stringify(fieldValue)}`);
        }
      });

      // 全行のプレビュー
      console.log(`\n全${tableData.length}件のプレビュー:`);
      tableData.forEach((row: any, index: number) => {
        const rowValues = Object.keys(row.value).map(k => {
          const v = row.value[k]?.value;
          if (typeof v === 'string') {
            return v.substring(0, 30);
          }
          return String(v);
        });
        console.log(`  [${index + 1}] ${rowValues.join(' | ')}`);
      });
    }

    console.log('');
  });

  // テーブル名と用途の推測
  console.log('📌 テーブル名の推測:');
  console.log('  Table_3: 毎月（32件） - 月次イベント');
  console.log('  Table_4: 随時（11件） - 不定期イベント');
  console.log('  Table_5: 10月（9件）');
  console.log('  Table_6: 11月（9件）');
  console.log('  Table_7: 12月（3件）');
  console.log('  Table_8: 1月（4件）');
  console.log('  Table_9: 2月（4件）');
  console.log('  Table_10: 3月（14件）');
  console.log('  Table_11: 4月（6件）');
  console.log('  Table_12: 5月（8件）');
  console.log('  Table_13: 6月（4件）');
  console.log('  Table_14: 8月（6件）');
  console.log('  Table_16: 9月（5件）');
  console.log('');

  console.log('✅ 調査完了！');
}

inspectScheduleRecord().catch(console.error);
