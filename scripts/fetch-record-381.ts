#!/usr/bin/env tsx

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function fetchRecord381() {
  const domain = process.env.KINTONE_DOMAIN!;
  const apiToken = process.env.KINTONE_API_TOKEN!;
  const appId = process.env.KINTONE_APP_ID || '117';

  const url = `https://${domain}/k/v1/record.json?app=${appId}&id=381`;

  console.log(`📥 レコードID 381 を取得中...`);

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

  // JSON全体をファイルに保存
  fs.writeFileSync('record-381.json', JSON.stringify(data, null, 2));
  console.log('✅ record-381.json に保存しました');

  // Table フィールドの内容を表示
  const record = data.record;
  console.log(`\n📝 レコードID: ${record.$id.value}`);
  console.log(`📅 日付: ${record.日付?.value}\n`);

  if (record.Table && Array.isArray(record.Table.value)) {
    console.log('=== Table フィールド（議事録） ===\n');
    record.Table.value.forEach((row: any, index: number) => {
      const text = row.value['文字列__複数行_']?.value;
      if (text) {
        console.log(`【項目 ${index + 1}】`);
        console.log(text);
        console.log('');
      }
    });
  }
}

fetchRecord381().catch(console.error);
