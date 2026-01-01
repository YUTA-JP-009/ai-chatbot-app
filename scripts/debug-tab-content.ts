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
  convertScheduleRecordToText
} from '../app/lib/kintone-client';

// 型定義
interface KintoneField {
  type: string;
  value: string | number | { value: string }[];
}

interface KintoneRecord {
  $id: KintoneField;
  [key: string]: KintoneField;
}

// Kintone APIを直接呼び出して年間スケジュールレコードを取得
async function fetchScheduleRecordDirect(): Promise<KintoneRecord | null> {
  console.log('🔄 年間スケジュール: API呼び出し実行中（キャッシュバイパス）...');

  const domain = process.env.KINTONE_DOMAIN;
  const apiToken = process.env.KINTONE_API_TOKEN_SCHEDULE;
  const appId = process.env.KINTONE_APP_ID_SCHEDULE || '238';

  if (!domain || !apiToken) {
    throw new Error('KINTONE_DOMAIN または KINTONE_API_TOKEN_SCHEDULE が設定されていません');
  }

  const recordId = '8';
  const url = `https://${domain}/k/v1/record.json?app=${appId}&id=${recordId}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'X-Cybozu-API-Token': apiToken,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Kintone API error: ${response.status} ${errorText}`);
  }

  const data = await response.json() as { record: KintoneRecord };
  console.log(`✅ 年間スケジュール: レコードID ${recordId} 取得完了`);

  return data.record;
}

async function main() {
  console.log('🔍 Tab 1 vs Tab 2 の完全な内容比較を開始します\n');

  try {
    // 年間スケジュールレコード取得（キャッシュバイパス）
    const record = await fetchScheduleRecordDirect();

    if (!record) {
      console.error('❌ レコードが見つかりませんでした');
      return;
    }

    console.log(`✅ レコード取得成功: record=${record.$id.value}\n`);

    // XML形式に変換
    const xmlData = convertScheduleRecordToText(record);

    // Tab 1のデータを抽出
    console.log('='.repeat(80));
    console.log('📋 Tab 1 (schedule_238_8_tab1)');
    console.log('='.repeat(80));

    const tab1Pattern = /<schedule id="schedule_238_8_tab1">[\s\S]*?<\/schedule>/g;
    const tab1Match = xmlData.match(tab1Pattern);

    if (tab1Match) {
      const tab1Content = tab1Match[0];

      // URLを抽出
      const tab1UrlMatch = tab1Content.match(/<url>([^<]+)<\/url>/);
      const tab1Url = tab1UrlMatch ? tab1UrlMatch[1] : 'URLなし';

      // contentを抽出
      const tab1ContentMatch = tab1Content.match(/<content>([\s\S]*?)<\/content>/);
      const tab1ContentText = tab1ContentMatch ? tab1ContentMatch[1] : 'contentなし';

      console.log(`\n🔗 URL: ${tab1Url}`);
      console.log(`\n📄 Content全文:\n${tab1ContentText}`);

      // 「上野」キーワードの出現回数
      const uenoCount = (tab1ContentText.match(/上野/g) || []).length;
      console.log(`\n🔍 「上野」の出現回数: ${uenoCount}回`);

      // 「面談」キーワードの出現回数
      const mentanCount = (tab1ContentText.match(/面談/g) || []).length;
      console.log(`🔍 「面談」の出現回数: ${mentanCount}回`);

      // contentの文字数
      console.log(`📊 Content文字数: ${tab1ContentText.length}文字`);

      // 最初の150文字（プレビュー）
      const tab1Preview = tab1ContentText.substring(0, 150);
      console.log(`\n📌 Content最初の150文字（プレビュー）:\n${tab1Preview}...`);
    } else {
      console.log('❌ Tab 1のデータが見つかりませんでした');
    }

    // Tab 2のデータを抽出
    console.log('\n' + '='.repeat(80));
    console.log('📋 Tab 2 (schedule_238_8_tab2)');
    console.log('='.repeat(80));

    const tab2Pattern = /<schedule id="schedule_238_8_tab2">[\s\S]*?<\/schedule>/g;
    const tab2Match = xmlData.match(tab2Pattern);

    if (tab2Match) {
      const tab2Content = tab2Match[0];

      // URLを抽出
      const tab2UrlMatch = tab2Content.match(/<url>([^<]+)<\/url>/);
      const tab2Url = tab2UrlMatch ? tab2UrlMatch[1] : 'URLなし';

      // contentを抽出
      const tab2ContentMatch = tab2Content.match(/<content>([\s\S]*?)<\/content>/);
      const tab2ContentText = tab2ContentMatch ? tab2ContentMatch[1] : 'contentなし';

      console.log(`\n🔗 URL: ${tab2Url}`);
      console.log(`\n📄 Content全文:\n${tab2ContentText}`);

      // 「上野」キーワードの出現回数
      const uenoCount = (tab2ContentText.match(/上野/g) || []).length;
      console.log(`\n🔍 「上野」の出現回数: ${uenoCount}回`);

      // 「面談」キーワードの出現回数
      const mentanCount = (tab2ContentText.match(/面談/g) || []).length;
      console.log(`🔍 「面談」の出現回数: ${mentanCount}回`);

      // contentの文字数
      console.log(`📊 Content文字数: ${tab2ContentText.length}文字`);

      // 最初の150文字（プレビュー）
      const tab2Preview = tab2ContentText.substring(0, 150);
      console.log(`\n📌 Content最初の150文字（プレビュー）:\n${tab2Preview}...`);

      // 「上野」を含む行を抽出
      const tab2Lines = tab2ContentText.split('\n');
      const uenoLines = tab2Lines.filter(line => line.includes('上野'));
      if (uenoLines.length > 0) {
        console.log(`\n🎯 「上野」を含む行（${uenoLines.length}行）:`);
        uenoLines.forEach((line, index) => {
          console.log(`  ${index + 1}. ${line.trim()}`);
        });
      }
    } else {
      console.log('❌ Tab 2のデータが見つかりませんでした');
    }

    // 結論
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
