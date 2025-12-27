#!/usr/bin/env tsx

/**
 * ルールブックアプリの全レコード構造を詳細調査
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function inspectRulebookRecords() {
  console.log('🔍 ルールブックアプリ全レコード構造調査\n');

  const domain = process.env.KINTONE_DOMAIN;
  const apiToken = process.env.KINTONE_API_TOKEN_RULEBOOK;
  const appId = process.env.KINTONE_APP_ID_RULEBOOK || '296';

  if (!domain || !apiToken) {
    console.error('❌ 環境変数が正しく設定されていません');
    process.exit(1);
  }

  try {
    // 全レコードを取得
    const allRecords: any[] = [];
    let offset = 0;
    const limit = 100;

    while (true) {
      const query = `order by $id asc limit ${limit} offset ${offset}`;
      const encodedQuery = encodeURIComponent(query);
      const url = `https://${domain}/k/v1/records.json?app=${appId}&query=${encodedQuery}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-Cybozu-API-Token': apiToken,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status} ${errorText}`);
      }

      const data = await response.json();

      if (data.records.length === 0) break;
      allRecords.push(...data.records);
      if (data.records.length < limit) break;

      offset += limit;
    }

    console.log(`✅ 全レコード取得完了: ${allRecords.length}件\n`);

    // 分類ごとのカウント
    const categories = new Map<string, number>();
    allRecords.forEach(record => {
      const category = record['分類']?.value || '未分類';
      categories.set(category, (categories.get(category) || 0) + 1);
    });

    console.log('📊 分類ごとのレコード数:');
    categories.forEach((count, category) => {
      console.log(`  ${category}: ${count}件`);
    });

    // サブテーブル（Table）の詳細構造を確認
    console.log('\n📋 サブテーブル（Table）の構造:');
    const sampleRecord = allRecords.find(r => r.Table?.value?.length > 0);
    if (sampleRecord) {
      const tableRows = sampleRecord.Table.value;
      console.log(`  レコードID: ${sampleRecord.$id.value}`);
      console.log(`  項目: ${sampleRecord['項目']?.value}`);
      console.log(`  サブテーブル行数: ${tableRows.length}行\n`);

      console.log('  サブテーブル1行目の構造:');
      const firstRow = tableRows[0];
      Object.keys(firstRow.value).forEach(key => {
        const field = firstRow.value[key];
        console.log(`    - ${key}: ${field.type} = "${field.value?.substring(0, 50) || ''}${field.value?.length > 50 ? '...' : ''}"`);
      });
    }

    // 全データを詳細JSONとして保存
    fs.writeFileSync('rulebook-records-full.json', JSON.stringify(allRecords, null, 2));
    console.log('\n💾 rulebook-records-full.json に全データを保存しました');

    // サンプルテキスト形式を生成
    console.log('\n📝 サンプルテキスト形式（最初の3件）:\n');
    for (let i = 0; i < Math.min(3, allRecords.length); i++) {
      const record = allRecords[i];
      const recordId = record.$id.value;
      const category = record['分類']?.value || '未分類';
      const title = record['項目']?.value || 'タイトルなし';

      console.log(`========================================`);
      console.log(`【データソース】ルールブック`);
      console.log(`【分類】${category}`);
      console.log(`【項目】${title}`);
      console.log(`【レコードURL】https://eu-plan.cybozu.com/k/296/show#record=${recordId}`);
      console.log(`========================================`);
      console.log('');

      const tableContent = record.Table?.value;
      if (tableContent && tableContent.length > 0) {
        for (const row of tableContent) {
          const rule = row.value['ルール']?.value || '';
          const rule0 = row.value['ルール_0']?.value || '';

          if (rule.trim()) {
            console.log(rule.trim());
            console.log('');
          }

          if (rule0.trim()) {
            console.log(rule0.trim());
            console.log('');
          }

          if (rule.trim() || rule0.trim()) {
            console.log('---');
            console.log('');
          }
        }
      }

      console.log('');
    }

    console.log('\n次のステップ:');
    console.log('1. kintone-client.ts にルールブック変換関数を実装');
    console.log('2. fetchAllKintoneData() で3つのアプリを統合');
    console.log('3. テストエンドポイントで動作確認');

  } catch (error) {
    console.error('❌ エラー:', error);
    if (error instanceof Error) {
      console.error('詳細:', error.message);
      console.error('スタック:', error.stack);
    }
    process.exit(1);
  }
}

inspectRulebookRecords();
