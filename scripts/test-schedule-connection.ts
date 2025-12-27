#!/usr/bin/env tsx

/**
 * 年間スケジュールアプリ（アプリID 238）接続テスト
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function testScheduleConnection() {
  const domain = process.env.KINTONE_DOMAIN;
  const apiToken = process.env.KINTONE_API_TOKEN_SCHEDULE;
  const appId = process.env.KINTONE_APP_ID_SCHEDULE;

  if (!domain || !apiToken || !appId) {
    console.error('❌ 環境変数が設定されていません');
    console.error('必要な環境変数: KINTONE_DOMAIN, KINTONE_API_TOKEN_SCHEDULE, KINTONE_APP_ID_SCHEDULE');
    process.exit(1);
  }

  console.log('🔗 年間スケジュールアプリ接続テスト\n');
  console.log('📋 接続情報:');
  console.log(`  Domain: ${domain}`);
  console.log(`  App ID: ${appId}`);
  console.log(`  API Token: ${apiToken.substring(0, 10)}...`);
  console.log('');

  try {
    // 全レコード取得
    const url = `https://${domain}/k/v1/records.json?app=${appId}`;

    console.log('📤 リクエスト送信中...');
    console.log(`  URL: ${url}`);

    const startTime = Date.now();

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Cybozu-API-Token': apiToken,
      },
    });

    const fetchTime = Date.now() - startTime;

    if (!response.ok) {
      console.error(`❌ HTTPエラー: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error(`エラー詳細: ${errorText}`);
      process.exit(1);
    }

    const data = await response.json();

    console.log(`✅ 接続成功！（${fetchTime}ms）\n`);

    console.log('📊 取得データ:');
    console.log(`  総レコード数: ${data.records.length}`);

    // 最初の3件のレコード構造を表示
    if (data.records.length > 0) {
      console.log('\n📝 レコード構造（最初の3件）:\n');

      for (let i = 0; i < Math.min(3, data.records.length); i++) {
        const record = data.records[i];
        console.log(`--- レコード ${i + 1} ---`);
        console.log(`レコードID: ${record.$id?.value}`);
        console.log(`フィールド一覧:`);

        Object.keys(record).forEach(key => {
          if (!key.startsWith('$')) {
            const value = record[key]?.value;
            if (typeof value === 'string') {
              console.log(`  ${key}: ${value.substring(0, 50)}${value.length > 50 ? '...' : ''}`);
            } else if (Array.isArray(value)) {
              console.log(`  ${key}: [配列 ${value.length}件]`);
            } else if (typeof value === 'object') {
              console.log(`  ${key}: [オブジェクト]`);
            } else {
              console.log(`  ${key}: ${value}`);
            }
          }
        });
        console.log('');
      }
    }

    console.log('✅ テスト完了！');

  } catch (error) {
    console.error('❌ エラー:', error);
    if (error instanceof Error) {
      console.error('詳細:', error.message);
      console.error('スタック:', error.stack);
    }
    process.exit(1);
  }
}

testScheduleConnection();
