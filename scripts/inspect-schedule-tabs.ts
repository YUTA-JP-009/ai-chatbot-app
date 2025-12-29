/**
 * 年間スケジュールアプリのTab構造を調査するスクリプト
 * 各Tableフィールドがどのタブに対応しているかを確認する
 */

import dotenv from 'dotenv';
import path from 'path';

// .env.local を読み込む
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import { fetchScheduleRecord } from '../app/lib/kintone-client';

async function main() {
  console.log('🔍 年間スケジュールアプリのTab構造を調査します\n');

  try {
    // 年間スケジュールレコード取得
    const record = await fetchScheduleRecord();

    if (!record) {
      console.error('❌ レコードが見つかりませんでした');
      return;
    }

    console.log(`✅ レコード取得成功: record=${record.$id.value}\n`);

    // 全テーブルフィールドを確認
    const tableFields = [
      { name: 'Table_3', label: '毎月' },
      { name: 'Table_4', label: '随時' },
      { name: 'Table_5', label: '10月' },
      { name: 'Table_6', label: '11月' },
      { name: 'Table_7', label: '12月' },
      { name: 'Table_8', label: '1月' },
      { name: 'Table_9', label: '2月' },
      { name: 'Table_10', label: '3月' },
      { name: 'Table_11', label: '4月' },
      { name: 'Table_12', label: '5月' },
      { name: 'Table_13', label: '6月' },
      { name: 'Table_14', label: '8月' },
      { name: 'Table_16', label: '9月' },
    ];

    console.log('📊 各テーブルフィールドの内容サンプル:\n');

    for (const tableField of tableFields) {
      const tableData = record[tableField.name]?.value;

      if (!tableData || !Array.isArray(tableData) || tableData.length === 0) {
        console.log(`❌ ${tableField.name} (${tableField.label}): データなし`);
        continue;
      }

      console.log(`✅ ${tableField.name} (${tableField.label}): ${tableData.length}行`);

      // 最初の1行のサンプルを表示
      const firstRow = tableData[0];
      const sampleTexts: string[] = [];

      Object.keys(firstRow.value).forEach(key => {
        const fieldValue = firstRow.value[key]?.value;
        if (typeof fieldValue === 'string' && fieldValue.trim() !== '') {
          sampleTexts.push(`${key}: ${fieldValue.substring(0, 50)}...`);
        }
      });

      if (sampleTexts.length > 0) {
        console.log(`   サンプル: ${sampleTexts[0]}`);
      }

      console.log('');
    }

    console.log('\n📝 推測されるTab対応関係:');
    console.log('- Tab 0: 基本情報（期、全般）');
    console.log('- Tab 1: 月別スケジュール（毎月、10月〜9月）');
    console.log('- Tab 2: 特別イベント（随時など？）');
    console.log('- Tab 3: その他');
    console.log('\n※正確なTab番号は、kintoneアプリの設定を直接確認する必要があります');
    console.log('※「贈答品」がTab 2に表示されている場合、該当データを含むテーブルフィールドを特定してください');

    // 「贈答品」キーワードを含むデータを検索
    console.log('\n\n🔍 「贈答品」「お歳暮」「お中元」を含むデータを検索中...\n');

    let found = false;
    for (const tableField of tableFields) {
      const tableData = record[tableField.name]?.value;
      if (!tableData || !Array.isArray(tableData)) continue;

      for (const row of tableData) {
        const allText: string[] = [];
        Object.keys(row.value).forEach(key => {
          const fieldValue = row.value[key]?.value;
          if (typeof fieldValue === 'string') {
            allText.push(fieldValue);
          }
        });

        const combinedText = allText.join(' ');
        if (combinedText.includes('贈答品') || combinedText.includes('お歳暮') || combinedText.includes('お中元')) {
          console.log(`✅ 発見: ${tableField.name} (${tableField.label})`);
          console.log(`   内容: ${combinedText.substring(0, 150)}...`);
          console.log('');
          found = true;
        }
      }
    }

    if (!found) {
      console.log('❌ 「贈答品」関連データが見つかりませんでした');
      console.log('※年間スケジュールアプリではなく、ルールブックアプリに含まれている可能性があります');
    }

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  }
}

main();
