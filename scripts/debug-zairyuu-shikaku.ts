/**
 * 在留資格質問でのTab選択ミスをデバッグするスクリプト
 * Tab 2, Tab 3, Tab 8の<content>を比較する
 */

import dotenv from 'dotenv';
import path from 'path';

// .env.local を読み込む
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import {
  fetchScheduleRecord,
  convertScheduleRecordToText
} from '../app/lib/kintone-client';

async function main() {
  console.log('🔍 在留資格質問でのTab選択ミスをデバッグします\n');

  try {
    // 年間スケジュールレコード取得
    const record = await fetchScheduleRecord();

    if (!record) {
      console.error('❌ レコードが見つかりませんでした');
      return;
    }

    console.log(`✅ レコード取得成功: record=${record.$id.value}\n`);

    // XML形式に変換
    const xmlData = convertScheduleRecordToText(record);

    // Tab 2, Tab 3, Tab 8のデータを抽出
    const tabs = [
      { tabNumber: 2, label: '10月' },
      { tabNumber: 3, label: '11月' },
      { tabNumber: 8, label: '4月' }
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
        console.log(`\n📄 Content:\n${content}`);

        // 「在留資格」キーワードの出現回数
        const keyword = '在留資格';
        const keywordCount = (content.match(new RegExp(keyword, 'g')) || []).length;

        console.log(`\n🔍 「${keyword}」の出現回数: ${keywordCount}回`);

        // contentの文字数
        console.log(`📊 Content文字数: ${content.length}文字`);
      } else {
        console.log(`❌ Tab ${tab.tabNumber} のデータが見つかりませんでした`);
      }
    }

    console.log(`\n${'='.repeat(80)}`);
    console.log('🎯 結論:');
    console.log('='.repeat(80));
    console.log('1. 各Tabの「在留資格」出現回数を比較');
    console.log('2. 各Tabのcontent文字数を比較');
    console.log('3. Tab 2やTab 8に「在留資格」が含まれている場合、キーワードフィルタリングが誤動作している');
    console.log('4. Tab 3のcontent文字数がTab 2やTab 8より少ない場合、Geminiが「詳しさ」で判断している');

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  }
}

main();
