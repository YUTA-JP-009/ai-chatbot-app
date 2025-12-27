#!/usr/bin/env tsx

/**
 * Kintone API接続テストスクリプト
 *
 * 目的:
 * - JM記録アプリ（アプリID: 117）からレコードを取得できるか確認
 * - APIトークン認証が正常に動作するか確認
 * - レスポンス形式とフィールド構造を確認
 *
 * 実行方法:
 * 1. .env.local に以下を追加:
 *    KINTONE_DOMAIN=eu-plan.cybozu.com
 *    KINTONE_API_TOKEN=your_api_token_here
 *    KINTONE_APP_ID=117
 *
 * 2. 実行:
 *    npx tsx scripts/test-kintone-connection.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// .env.localを読み込み
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

interface KintoneRecord {
  $id: { value: string };
  $revision: { value: string };
  [key: string]: { value: unknown };
}

interface KintoneResponse {
  records: KintoneRecord[];
  totalCount?: string;
}

async function testKintoneConnection() {
  console.log('🔗 Kintone API接続テスト開始...\n');

  // 環境変数チェック
  const domain = process.env.KINTONE_DOMAIN;
  const apiToken = process.env.KINTONE_API_TOKEN;
  const appId = process.env.KINTONE_APP_ID || '117';

  if (!domain || !apiToken) {
    console.error('❌ 環境変数が設定されていません');
    console.error('必要な環境変数:');
    console.error('  KINTONE_DOMAIN=eu-plan.cybozu.com');
    console.error('  KINTONE_API_TOKEN=your_api_token_here');
    console.error('  KINTONE_APP_ID=117 (オプション)');
    process.exit(1);
  }

  console.log('📋 接続情報:');
  console.log(`  Domain: ${domain}`);
  console.log(`  App ID: ${appId}`);
  console.log(`  API Token: ${apiToken.substring(0, 10)}...`);
  console.log('');

  try {
    // Kintone REST APIエンドポイント
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
      console.error('エラー詳細:', errorText);
      process.exit(1);
    }

    const data = await response.json() as KintoneResponse;

    console.log(`✅ 接続成功！（${fetchTime}ms）\n`);

    // レスポンス情報表示
    console.log('📊 取得結果:');
    console.log(`  総レコード数: ${data.totalCount || data.records.length}`);
    console.log(`  取得レコード数: ${data.records.length}`);
    console.log('');

    // 最初の3件のレコードを表示
    if (data.records.length > 0) {
      console.log('📝 レコードサンプル（最初の3件）:\n');

      for (let i = 0; i < Math.min(3, data.records.length); i++) {
        const record = data.records[i];
        console.log(`--- レコード ${i + 1} ---`);
        console.log(`レコードID: ${record.$id.value}`);

        // 全フィールドを表示
        Object.keys(record).forEach(fieldCode => {
          if (!fieldCode.startsWith('$')) {
            const field = record[fieldCode];
            const value = field.value;

            // 値の型に応じて表示形式を変える
            if (typeof value === 'string') {
              // 長い文字列は切り詰め
              const displayValue = value.length > 100
                ? value.substring(0, 100) + '...'
                : value;
              console.log(`  ${fieldCode}: ${displayValue}`);
            } else if (Array.isArray(value)) {
              console.log(`  ${fieldCode}: [配列 ${value.length}件]`);
            } else if (typeof value === 'object' && value !== null) {
              console.log(`  ${fieldCode}: [オブジェクト]`);
            } else {
              console.log(`  ${fieldCode}: ${value}`);
            }
          }
        });
        console.log('');
      }

      // フィールド一覧を表示
      console.log('📋 利用可能なフィールド一覧:');
      const firstRecord = data.records[0];
      const fieldCodes = Object.keys(firstRecord).filter(key => !key.startsWith('$'));
      console.log(`  ${fieldCodes.join(', ')}`);
      console.log('');

      // データサイズを概算
      const jsonSize = JSON.stringify(data.records).length;
      const sizeKB = (jsonSize / 1024).toFixed(2);
      const sizeMB = (jsonSize / 1024 / 1024).toFixed(2);

      console.log('💾 データサイズ:');
      console.log(`  JSON: ${jsonSize.toLocaleString()} bytes`);
      console.log(`  約 ${sizeKB} KB / ${sizeMB} MB`);
      console.log('');

      // Gemini用テキスト形式への変換例
      console.log('📄 Gemini用テキスト形式への変換例:\n');
      const sampleRecord = data.records[0];

      // 日付フィールドを探す
      const dateField = fieldCodes.find(f =>
        f.includes('日付') || f.includes('date') || f === '日付'
      ) || fieldCodes[0];

      // 内容フィールドを探す（議事録、内容、本文など）
      const contentField = fieldCodes.find(f =>
        f.includes('議事録') || f.includes('内容') || f.includes('本文') ||
        f.includes('記録') || f.includes('テーブル')
      );

      console.log('例: Q&A形式への変換');
      console.log(`日付: ${sampleRecord[dateField]?.value}`);
      if (contentField && sampleRecord[contentField]) {
        const content = sampleRecord[contentField].value;
        if (typeof content === 'string') {
          console.log(`内容: ${content.substring(0, 200)}...`);
        } else {
          console.log(`内容: [${typeof content}型のデータ]`);
        }
      }
      console.log('');
    }

    console.log('✅ テスト完了！');
    console.log('\n次のステップ:');
    console.log('1. フィールド構造を確認して、どのフィールドを使うか決める');
    console.log('2. Gemini用のテキスト形式変換ロジックを実装');
    console.log('3. テストエンドポイント（/api/chatwork-test）でKintoneデータを使った回答生成を試す');

  } catch (error) {
    console.error('❌ エラー発生:', error);
    if (error instanceof Error) {
      console.error('エラー詳細:', error.message);
      console.error('スタックトレース:', error.stack);
    }
    process.exit(1);
  }
}

// 実行
testKintoneConnection();
