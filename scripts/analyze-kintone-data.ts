/**
 * Kintoneデータ構造分析スクリプト
 *
 * 3つのデータソース（JM記録、年間スケジュール、ルールブック）を分析し、
 * プロンプトに埋め込むための「データマップ」を生成します。
 *
 * 注意: 環境変数がない場合はモックデータを使用します。
 */

import dotenv from 'dotenv';
import path from 'path';

// .env.local を読み込む
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import {
  fetchJMRecords,
  fetchScheduleRecord,
  fetchRulebookRecords,
  convertJMRecordsToText,
  convertScheduleRecordToText,
  convertRulebookRecordsToText
} from '../app/lib/kintone-client';

/**
 * 環境変数チェック
 */
function checkEnvironmentVariables(): boolean {
  const required = [
    'KINTONE_DOMAIN',
    'KINTONE_API_TOKEN_JM',
    'KINTONE_API_TOKEN_SCHEDULE',
    'KINTONE_API_TOKEN_RULEBOOK'
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.log('⚠️  環境変数が設定されていません:', missing.join(', '));
    console.log('📝 代わりに、既存のテキストデータから推定分析を行います。');
    return false;
  }

  return true;
}

/**
 * テキストから頻出キーワードを抽出
 */
function extractFrequentKeywords(text: string, topN: number = 20): { keyword: string; count: number }[] {
  // ストップワード（除外する単語）
  const stopWords = new Set([
    'の', 'に', 'は', 'を', 'た', 'が', 'で', 'て', 'と', 'し', 'れ', 'さ', 'ある', 'いる',
    'も', 'する', 'から', 'な', 'こと', 'として', 'い', 'や', 'れる', 'など', 'なっ',
    'ない', 'この', 'ため', 'その', 'あっ', 'よう', 'また', 'もの', 'という', 'あり',
    'まで', 'られ', 'なる', 'へ', 'か', 'だ', 'これ', 'によって', 'により', 'おり',
    'より', 'による', 'ず', 'なり', 'られる', 'において', 'ば', 'なかっ', 'なく',
    'しかし', 'について', 'せ', 'だっ', 'その後', 'できる', 'それ', 'う', 'ので',
    'なお', 'のみ', 'でき', 'き', 'つ', 'における', 'および', 'いう', 'さらに',
    'でも', 'ら', 'たり', 'その他', 'に関する', 'たち', 'ます', 'ん', 'なら', 'に対して',
    'http', 'https', 'cybozu', 'com', 'record', 'show', 'eu', 'plan',
    'データソース', 'アプリ', 'レコード', 'URL'
  ]);

  // 2文字以上の単語を抽出
  const words = text.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFFa-zA-Z]{2,}/g) || [];

  // 単語の出現頻度をカウント
  const wordCounts = new Map<string, number>();
  words.forEach(word => {
    if (!stopWords.has(word)) {
      wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
    }
  });

  // 頻度順にソートしてTOP Nを取得
  return Array.from(wordCounts.entries())
    .map(([keyword, count]) => ({ keyword, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, topN);
}

/**
 * JM記録アプリの分析
 */
async function analyzeJMRecords() {
  console.log('📊 JM記録アプリを分析中...\n');

  const records = await fetchJMRecords();
  const text = convertJMRecordsToText(records);

  // 日付範囲を取得
  const dates = records
    .map(r => r.日付?.value)
    .filter((d): d is string => !!d)
    .sort();

  const oldestDate = dates[0];
  const newestDate = dates[dates.length - 1];

  // 頻出キーワード
  const keywords = extractFrequentKeywords(text, 20);

  console.log(`件数: ${records.length}件`);
  console.log(`日付範囲: ${oldestDate} 〜 ${newestDate}`);
  console.log(`\n頻出キーワード TOP 20:`);
  keywords.forEach((kw, i) => {
    console.log(`  ${i + 1}. ${kw.keyword} (${kw.count}回)`);
  });

  return {
    count: records.length,
    dateRange: { oldest: oldestDate, newest: newestDate },
    keywords: keywords.slice(0, 10).map(k => k.keyword)
  };
}

/**
 * 年間スケジュールアプリの分析
 */
async function analyzeScheduleRecord() {
  console.log('\n\n📊 年間スケジュールアプリを分析中...\n');

  const record = await fetchScheduleRecord();
  if (!record) {
    console.log('レコードが見つかりませんでした');
    return null;
  }

  const text = convertScheduleRecordToText(record);

  // 頻出キーワード
  const keywords = extractFrequentKeywords(text, 20);

  console.log(`対象期間: 22期（2024年10月〜2025年9月）`);
  console.log(`\n頻出キーワード TOP 20:`);
  keywords.forEach((kw, i) => {
    console.log(`  ${i + 1}. ${kw.keyword} (${kw.count}回)`);
  });

  return {
    period: '22期（2024年10月〜2025年9月）',
    keywords: keywords.slice(0, 10).map(k => k.keyword)
  };
}

/**
 * ルールブックアプリの分析
 */
async function analyzeRulebookRecords() {
  console.log('\n\n📊 ルールブックアプリを分析中...\n');

  const records = await fetchRulebookRecords();
  const text = convertRulebookRecordsToText(records);

  // 分類別の件数
  const categories = new Map<string, number>();
  const items = new Set<string>();

  records.forEach(record => {
    const category = record['分類']?.value as string | undefined || '未分類';
    const title = record['項目']?.value as string | undefined;

    categories.set(category, (categories.get(category) || 0) + 1);
    if (title) items.add(title);
  });

  // 頻出キーワード
  const keywords = extractFrequentKeywords(text, 20);

  console.log(`件数: ${records.length}件`);
  console.log(`\n分類別の件数:`);
  Array.from(categories.entries()).forEach(([cat, count]) => {
    console.log(`  - ${cat}: ${count}件`);
  });

  console.log(`\n主要項目 (${items.size}件):`);
  const itemArray = Array.from(items).slice(0, 15);
  itemArray.forEach(item => {
    console.log(`  - ${item}`);
  });

  console.log(`\n頻出キーワード TOP 20:`);
  keywords.forEach((kw, i) => {
    console.log(`  ${i + 1}. ${kw.keyword} (${kw.count}回)`);
  });

  return {
    count: records.length,
    categories: Array.from(categories.entries()).map(([cat, count]) => ({ category: cat, count })),
    items: itemArray,
    keywords: keywords.slice(0, 10).map(k => k.keyword)
  };
}

/**
 * 分析結果をプロンプト用のテキストに変換
 */
function generatePromptGuide(jm: any, schedule: any, rulebook: any): string {
  return `【データソース構造ガイド - 自動生成】

<rule id="rule_296_*">（ルールブック - ${rulebook.count}件）
  分類: ${rulebook.categories.map((c: any) => `${c.category}(${c.count}件)`).join('、')}
  主要項目: ${rulebook.items.join('、')}
  頻出キーワード: ${rulebook.keywords.join('、')}
  → 社内ルール、制度、基本的な手続きに関する質問はここを優先

<schedule id="schedule_238_*">（年間スケジュール - ${schedule.period}）
  対象期間: 2024年10月〜2025年9月
  頻出キーワード: ${schedule.keywords.join('、')}
  → 年間行事、休業日、定期イベント、「いつ」に関する質問はここを優先

<record id="jm_117_*">（JM記録 - ${jm.count}件、${jm.dateRange.oldest}〜${jm.dateRange.newest}）
  対象期間: 直近3ヶ月の全体ミーティング議事録
  頻出キーワード: ${jm.keywords.join('、')}
  → 売上目標、プロジェクト、研修旅行など「最近の話題」に関する質問はここを優先`;
}

/**
 * メイン処理
 */
async function main() {
  console.log('🔍 Kintoneデータ構造分析を開始します\n');
  console.log('========================================\n');

  try {
    // 各データソースを分析
    const jmAnalysis = await analyzeJMRecords();
    const scheduleAnalysis = await analyzeScheduleRecord();
    const rulebookAnalysis = await analyzeRulebookRecords();

    // プロンプト用のガイドを生成
    console.log('\n\n========================================');
    console.log('📝 プロンプト用データ構造ガイド');
    console.log('========================================\n');

    const promptGuide = generatePromptGuide(jmAnalysis, scheduleAnalysis, rulebookAnalysis);
    console.log(promptGuide);

    console.log('\n\n========================================');
    console.log('✅ 分析完了！');
    console.log('========================================');
    console.log('\n上記のガイドを app/api/chatwork/route.ts のプロンプトに追加してください。');

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  }
}

main();
