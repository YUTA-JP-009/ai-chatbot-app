/**
 * rule_296_6 (お歳暮・お中元) のデータ内容をデバッグするスクリプト
 */

import dotenv from 'dotenv';
import path from 'path';

// .env.local を読み込む
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import {
  fetchRulebookRecords,
  convertRulebookRecordsToText
} from '../app/lib/kintone-client';

async function main() {
  console.log('🔍 rule_296_6 のデータ内容を確認します\n');

  try {
    // ルールブックアプリから全レコード取得
    const records = await fetchRulebookRecords();
    console.log(`✅ ルールブック: ${records.length}件取得\n`);

    // レコードID=6を探す
    const record6 = records.find(r => r.$id.value === '6');

    if (!record6) {
      console.error('❌ レコードID=6 が見つかりませんでした');
      return;
    }

    console.log('📄 レコードID=6 の基本情報:');
    console.log(`  分類: ${record6['分類']?.value}`);
    console.log(`  項目: ${record6['項目']?.value}`);
    console.log('');

    // XMLタグ形式に変換
    const xmlText = convertRulebookRecordsToText([record6]);

    console.log('📝 XML形式での出力:');
    console.log('========================================');
    console.log(xmlText);
    console.log('========================================');

    // テーブルデータの詳細を表示
    console.log('\n📊 テーブルデータの詳細:');
    const tableContent = record6.Table?.value;
    if (tableContent && Array.isArray(tableContent)) {
      tableContent.forEach((row, index) => {
        console.log(`\n【行 ${index + 1}】`);
        const rule = row.value['ルール']?.value;
        const rule0 = row.value['ルール_0']?.value;

        if (rule) {
          console.log(`  ルール: ${rule.substring(0, 100)}...`);
        }
        if (rule0) {
          console.log(`  ルール_0: ${rule0.substring(0, 100)}...`);
        }
      });
    }

    // キーワードマッチング検証
    console.log('\n🔍 キーワードマッチング検証:');
    const keywords = ['お歳暮', '贈答品', 'お中元', '受け取り', '郵便物', 'CDさん', '社長', '専務', 'リーダー', '開封'];
    keywords.forEach(keyword => {
      const count = (xmlText.match(new RegExp(keyword, 'gi')) || []).length;
      console.log(`  "${keyword}": ${count}回出現`);
    });

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  }
}

main();
