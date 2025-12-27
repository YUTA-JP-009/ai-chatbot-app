#!/usr/bin/env tsx

/**
 * Kintone Tableフィールド詳細確認スクリプト
 *
 * 目的:
 * - Tableフィールドの構造を詳しく確認
 * - 議事録本文がどのフィールドに入っているか特定
 * - Gemini用テキスト変換のロジックを設計
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

interface KintoneRecord {
  $id: { value: string };
  日付?: { value: string };
  Table?: { value: Array<{ value: Record<string, { value: unknown }> }> };
  Table_1?: { value: Array<{ value: Record<string, { value: unknown }> }> };
  Table_3?: { value: Array<{ value: Record<string, { value: unknown }> }> };
  [key: string]: { value: unknown } | undefined;
}

interface KintoneResponse {
  records: KintoneRecord[];
}

async function inspectTableFields() {
  console.log('🔍 Kintone Tableフィールド詳細確認\n');

  const domain = process.env.KINTONE_DOMAIN!;
  const apiToken = process.env.KINTONE_API_TOKEN!;
  const appId = process.env.KINTONE_APP_ID || '117';

  try {
    // 最新のレコード1件のみ取得
    const url = `https://${domain}/k/v1/records.json?app=${appId}&query=order by $id desc limit 1`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Cybozu-API-Token': apiToken,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const data = await response.json() as KintoneResponse;

    if (data.records.length === 0) {
      console.log('❌ レコードが見つかりません');
      return;
    }

    const record = data.records[0];
    console.log(`📝 レコードID: ${record.$id.value}\n`);
    console.log(`📅 日付: ${record.日付?.value || 'なし'}\n`);

    // Tableフィールドを詳細表示
    const tableFields = ['Table', 'Table_1', 'Table_3'];

    for (const fieldName of tableFields) {
      const field = record[fieldName];
      if (!field || !Array.isArray(field.value)) continue;

      console.log(`\n=== ${fieldName} フィールド ===`);
      console.log(`行数: ${field.value.length}\n`);

      field.value.forEach((row, rowIndex) => {
        console.log(`--- 行 ${rowIndex + 1} ---`);
        const rowValue = row.value;

        Object.keys(rowValue).forEach(colName => {
          const colValue = rowValue[colName].value;

          // 文字列の場合は内容を表示
          if (typeof colValue === 'string') {
            const preview = colValue.length > 200
              ? colValue.substring(0, 200) + '...'
              : colValue;
            console.log(`  ${colName}:`);
            console.log(`    ${preview}`);
          } else if (Array.isArray(colValue)) {
            console.log(`  ${colName}: [配列 ${colValue.length}件]`);
            if (colValue.length > 0) {
              console.log(`    先頭要素: ${JSON.stringify(colValue[0]).substring(0, 100)}...`);
            }
          } else {
            console.log(`  ${colName}: ${JSON.stringify(colValue).substring(0, 100)}`);
          }
        });
        console.log('');
      });
    }

    // 完全なJSON構造を出力（デバッグ用）
    console.log('\n\n=== 完全なJSON構造（デバッグ用） ===\n');
    console.log(JSON.stringify(record, null, 2).substring(0, 5000) + '\n...(続く)');

  } catch (error) {
    console.error('❌ エラー:', error);
    process.exit(1);
  }
}

inspectTableFields();
