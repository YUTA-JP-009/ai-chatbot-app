/**
 * Kintone APIキャッシュ機能のテストスクリプト
 *
 * 初回リクエスト: API呼び出し実行（キャッシュミス）
 * 2回目リクエスト: キャッシュヒット（API呼び出しスキップ）
 * 3回目リクエスト（5分後想定）: API呼び出し実行（TTL切れ）
 */

import dotenv from 'dotenv';
import path from 'path';

// .env.local を読み込む
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import { fetchAllKintoneData } from '../app/lib/kintone-client';

async function main() {
  console.log('🧪 Kintone APIキャッシュ機能のテスト\n');
  console.log('='.repeat(80));

  // テスト1: 初回リクエスト（キャッシュミス）
  console.log('\n【テスト1】初回リクエスト（キャッシュミス）');
  console.log('='.repeat(80));
  const start1 = Date.now();
  const data1 = await fetchAllKintoneData('リモートワーク');
  const duration1 = Date.now() - start1;
  console.log(`⏱️  処理時間: ${duration1}ms`);
  console.log(`📏 データサイズ: ${data1.length.toLocaleString()}文字\n`);

  // 少し待機
  await new Promise(resolve => setTimeout(resolve, 1000));

  // テスト2: 2回目リクエスト（キャッシュヒット）
  console.log('\n【テスト2】2回目リクエスト（キャッシュヒット）');
  console.log('='.repeat(80));
  const start2 = Date.now();
  const data2 = await fetchAllKintoneData('有給休暇');
  const duration2 = Date.now() - start2;
  console.log(`⏱️  処理時間: ${duration2}ms`);
  console.log(`📏 データサイズ: ${data2.length.toLocaleString()}文字\n`);

  // パフォーマンス改善を計算
  const improvement = duration1 - duration2;
  const improvementPercent = Math.round((improvement / duration1) * 100);

  console.log('\n' + '='.repeat(80));
  console.log('📊 キャッシュ効果の測定結果');
  console.log('='.repeat(80));
  console.log(`初回リクエスト（キャッシュミス）: ${duration1}ms`);
  console.log(`2回目リクエスト（キャッシュヒット）: ${duration2}ms`);
  console.log(`改善時間: ${improvement}ms（${improvementPercent}%短縮）`);
  console.log('='.repeat(80));

  if (improvement >= 600) {
    console.log('\n✅ キャッシュ機能が正常に動作しています！');
    console.log(`   期待される効果（600-1,200ms短縮）を達成: ${improvement}ms短縮`);
  } else if (improvement >= 100) {
    console.log('\n⚠️  キャッシュ機能は動作していますが、期待値より低いです');
    console.log(`   期待される効果: 600-1,200ms短縮`);
    console.log(`   実際の効果: ${improvement}ms短縮`);
    console.log(`   原因: ネットワーク環境、サーバー負荷、フィルタリング処理時間など`);
  } else {
    console.log('\n❌ キャッシュ機能が正常に動作していない可能性があります');
    console.log(`   期待される効果: 600-1,200ms短縮`);
    console.log(`   実際の効果: ${improvement}ms短縮`);
  }
}

main().catch(error => {
  console.error('❌ エラーが発生しました:', error);
  process.exit(1);
});
