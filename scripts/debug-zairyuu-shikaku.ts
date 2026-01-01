/**
 * Tab 1 vs Tab 2 の完全な内容比較スクリプト
 *
 * 目的:
 * - Tab 1 (schedule_238_8_tab1) に上野さんの面談情報が本当にないか確認
 * - Tab 2 (schedule_238_8_tab2) の面談情報がどこに含まれているか確認
 * - なぜGeminiがTab 1を選択したのか分析
 */

import dotenv from 'dotenv';
import path from 'path';

// .env.local を読み込む
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import {
  fetchScheduleRecordInternal,
  convertScheduleRecordToText
} from '../app/lib/kintone-client';

async function main() {
  console.log('🔍 Tab 1 vs Tab 2 の完全な内容比較を開始します\n');

  try {
    // 年間スケジュールレコード取得（キャッシュバイパス）
    const record = await fetchScheduleRecordInternal();

    if (!record) {
      console.error('❌ レコードが見つかりませんでした');
      return;
    }

    console.log(`✅ レコード取得成功: record=${record.$id.value}\n`);

    // XML形式に変換
    const xmlData = convertScheduleRecordToText(record);

    // Tab 1 と Tab 2 のデータを抽出
    const tabs = [
      { tabNumber: 1, label: '随時' },
      { tabNumber: 2, label: '10月' }
    ];

    for (const tab of tabs) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`📋 Tab ${tab.tabNumber} (${tab.label})`);
      console.log('='.repeat(80));

      // XMLからTab固有のデータを抽出
      const tabPattern = new RegExp(
        `<schedule id="schedule_238_8_tab${tab.tabNumber}">([\\s\\S]*?)</schedule>`,
        'g'
      );

      const match = tabPattern.exec(xmlData);
      if (match) {
        const tabContent = match[1];

        // URLを抽出
        const urlMatch = tabContent.match(/<url>([^<]+)<\/url>/);
        const url = urlMatch ? urlMatch[1] : 'URLなし';

        // contentを抽出
        const contentMatch = tabContent.match(/<content>([\s\S]*?)<\/content>/);
        const content = contentMatch ? contentMatch[1] : 'contentなし';

        console.log(`\n🔗 URL: ${url}`);
        console.log(`\n📄 Content全文:\n${content}`);

        // 「上野」キーワードの出現回数
        const uenoCount = (content.match(/上野/g) || []).length;
        console.log(`\n🔍 「上野」の出現回数: ${uenoCount}回`);

        // 「面談」キーワードの出現回数
        const mentanCount = (content.match(/面談/g) || []).length;
        console.log(`🔍 「面談」の出現回数: ${mentanCount}回`);

        // contentの文字数
        console.log(`📊 Content文字数: ${content.length}文字`);

        // 最初の150文字（プレビュー）
        const preview = content.substring(0, 150);
        console.log(`\n📌 Content最初の150文字（プレビュー）:\n${preview}...`);

        // 「上野」を含む行を抽出
        if (uenoCount > 0) {
          const lines = content.split('\n');
          const uenoLines = lines.filter(line => line.includes('上野'));
          console.log(`\n🎯 「上野」を含む行（${uenoLines.length}行）:`);
          uenoLines.forEach((line, index) => {
            console.log(`  ${index + 1}. ${line.trim()}`);
          });
        }
      } else {
        console.log(`❌ Tab ${tab.tabNumber} のデータが見つかりませんでした`);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('🎯 分析結果:');
    console.log('='.repeat(80));
    console.log('1. Tab 1とTab 2の「上野」「面談」の出現回数を比較');
    console.log('2. Tab 1に「上野」が含まれていない場合、Geminiの誤選択を確認');
    console.log('3. Tab 2のプレビュー（最初の150文字）に「上野」が含まれていない場合、');
    console.log('   コンテンツプレビューの問題を確認');
    console.log('4. Tab 2の「上野」を含む行の位置を確認（コンテンツの深さを分析）');

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  }
}

main();
