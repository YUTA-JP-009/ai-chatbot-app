#!/usr/bin/env tsx

/**
 * ルールブックアプリ（アプリID 296）接続テスト
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function testRulebookConnection() {
  console.log('🔄 ルールブックアプリ（アプリID 296）接続テスト\n');

  const domain = process.env.KINTONE_DOMAIN;
  const apiToken = process.env.KINTONE_API_TOKEN_RULEBOOK;
  const appId = process.env.KINTONE_APP_ID_RULEBOOK || '296';

  console.log('環境変数確認:');
  console.log(`  KINTONE_DOMAIN: ${domain}`);
  console.log(`  KINTONE_API_TOKEN_RULEBOOK: ${apiToken ? '設定済み' : '未設定'}`);
  console.log(`  KINTONE_APP_ID_RULEBOOK: ${appId}\n`);

  if (!domain || !apiToken) {
    console.error('❌ 環境変数が正しく設定されていません');
    process.exit(1);
  }

  try {
    // 最初の5件のレコードを取得
    const query = 'order by $id asc limit 5';
    const encodedQuery = encodeURIComponent(query);
    const url = `https://${domain}/k/v1/records.json?app=${appId}&query=${encodedQuery}`;

    console.log('リクエストURL:');
    console.log(`  ${url}\n`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Cybozu-API-Token': apiToken,
      },
    });

    console.log(`レスポンスステータス: ${response.status} ${response.statusText}\n`);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error: ${response.status} ${errorText}`);
    }

    const data = await response.json();

    console.log(`✅ 接続成功！`);
    console.log(`取得レコード数: ${data.records.length}件\n`);

    // レコード構造を確認
    if (data.records.length > 0) {
      console.log('レコード構造（1件目）:');
      const firstRecord = data.records[0];
      console.log(JSON.stringify(firstRecord, null, 2));

      console.log('\n利用可能なフィールド:');
      Object.keys(firstRecord).forEach(key => {
        const fieldType = firstRecord[key]?.type || 'unknown';
        console.log(`  - ${key}: ${fieldType}`);
      });
    }

    console.log('\n次のステップ:');
    console.log('1. kintone-client.ts にルールブックアプリの取得関数を追加');
    console.log('2. fetchAllKintoneData() を3つのアプリ統合に更新');
    console.log('3. テストエンドポイントで動作確認');

  } catch (error) {
    console.error('❌ エラー:', error);
    if (error instanceof Error) {
      console.error('詳細:', error.message);
    }
    process.exit(1);
  }
}

testRulebookConnection();
