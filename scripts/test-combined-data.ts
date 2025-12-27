#!/usr/bin/env tsx

/**
 * 統合データ取得テスト
 * JM記録アプリ + 年間スケジュールアプリの統合データを取得・保存
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import { fetchAllKintoneData } from '../app/lib/kintone-client';

async function testCombinedData() {
  console.log('🔄 Kintone統合データ取得テスト\n');

  try {
    const startTime = Date.now();

    // 統合データを取得
    const combinedData = await fetchAllKintoneData();
    const fetchTime = Date.now() - startTime;

    console.log(`\n⏱️  取得時間: ${fetchTime}ms`);
    console.log(`📊 データ長: ${combinedData.length.toLocaleString()} 文字`);

    // ファイルに保存
    fs.writeFileSync('combined-kintone-data.txt', combinedData);
    console.log('\n💾 combined-kintone-data.txt に保存しました');

    // プレビュー表示（最初の3000文字）
    console.log('\n=== プレビュー（最初の3000文字） ===\n');
    console.log(combinedData.substring(0, 3000));
    console.log('\n...(続く)\n');

    // 統計情報
    const jmCount = (combinedData.match(/【データソース】JM記録アプリ/g) || []).length;
    const scheduleCount = (combinedData.match(/【データソース】年間スケジュールアプリ/g) || []).length;
    const rulebookCount = (combinedData.match(/【データソース】ルールブック/g) || []).length;

    console.log('📈 統計:');
    console.log(`  JM記録アプリ: ${jmCount}件`);
    console.log(`  年間スケジュールアプリ: ${scheduleCount}件`);
    console.log(`  ルールブックアプリ: ${rulebookCount}件`);
    console.log(`  合計データソース: ${jmCount + scheduleCount + rulebookCount}件\n`);

    console.log('✅ テスト完了！');
    console.log('\n次のステップ:');
    console.log('1. combined-kintone-data.txt を確認してフォーマットが適切か確認');
    console.log('2. テストエンドポイント（/api/chatwork-test）で質問をテスト');
    console.log('   - 夏期休業はいつからいつまで？（年間スケジュール）');
    console.log('   - 研修旅行はどこにいく？（JM記録）');
    console.log('   - 毎月の売り上げ目標は？（JM記録）');

  } catch (error) {
    console.error('❌ エラー:', error);
    if (error instanceof Error) {
      console.error('詳細:', error.message);
      console.error('スタック:', error.stack);
    }
    process.exit(1);
  }
}

testCombinedData();
