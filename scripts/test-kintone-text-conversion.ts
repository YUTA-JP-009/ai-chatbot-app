#!/usr/bin/env tsx

/**
 * Kintoneデータのテキスト変換テスト
 *
 * fetchAllKintoneRecords() と convertKintoneRecordsToText() の動作確認
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

// app/lib/kintone-client.tsをインポート
import { fetchAllKintoneRecords, convertKintoneRecordsToText, convertKintoneRecordsToSummary } from '../app/lib/kintone-client';

async function testTextConversion() {
  console.log('🔄 Kintoneデータのテキスト変換テスト\n');

  try {
    // ステップ1: Kintoneから全レコード取得
    console.log('📥 Kintoneからレコードを取得中...');
    const startFetch = Date.now();
    const records = await fetchAllKintoneRecords();
    const fetchTime = Date.now() - startFetch;

    console.log(`✅ 取得完了（${fetchTime}ms）`);
    console.log(`📊 総レコード数: ${records.length}\n`);

    // ステップ2: Q&A形式に変換
    console.log('📝 Q&A形式に変換中...');
    const startConvert = Date.now();
    const qaText = convertKintoneRecordsToText(records);
    const convertTime = Date.now() - startConvert;

    console.log(`✅ 変換完了（${convertTime}ms）`);
    console.log(`📄 テキスト長: ${qaText.length.toLocaleString()} 文字\n`);

    // ファイルに保存
    fs.writeFileSync('kintone-qa-output.txt', qaText);
    console.log('💾 kintone-qa-output.txt に保存しました\n');

    // プレビュー表示（最初の2000文字）
    console.log('=== プレビュー（最初の2000文字） ===\n');
    console.log(qaText.substring(0, 2000));
    console.log('\n...(続く)\n');

    // Q&A数をカウント
    const qCount = (qaText.match(/^Q\d+:/gm) || []).length;
    console.log(`📚 Q&A総数: ${qCount}問\n`);

    // ステップ3: 要約形式に変換（比較用）
    console.log('📝 要約形式に変換中...');
    const summaryText = convertKintoneRecordsToSummary(records);
    fs.writeFileSync('kintone-summary-output.txt', summaryText);
    console.log('💾 kintone-summary-output.txt に保存しました\n');

    // サイズ比較
    console.log('📊 形式別サイズ比較:');
    console.log(`  Q&A形式: ${qaText.length.toLocaleString()} 文字`);
    console.log(`  要約形式: ${summaryText.length.toLocaleString()} 文字\n`);

    // パフォーマンスサマリー
    console.log('⏱️  パフォーマンス:');
    console.log(`  Kintone取得: ${fetchTime}ms`);
    console.log(`  テキスト変換: ${convertTime}ms`);
    console.log(`  合計: ${fetchTime + convertTime}ms\n`);

    console.log('✅ テスト完了！');
    console.log('\n次のステップ:');
    console.log('1. kintone-qa-output.txt を確認してフォーマットが適切か確認');
    console.log('2. テストエンドポイント（/api/chatwork-test）を更新してKintoneデータを使用');
    console.log('3. 実際に質問を送って回答精度を確認');

  } catch (error) {
    console.error('❌ エラー:', error);
    if (error instanceof Error) {
      console.error('詳細:', error.message);
      console.error('スタック:', error.stack);
    }
    process.exit(1);
  }
}

testTextConversion();
