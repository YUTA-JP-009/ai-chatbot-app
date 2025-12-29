/**
 * 統合Kintoneデータ分析スクリプト
 *
 * combined-kintone-data.txt ファイルを分析し、
 * プロンプトに埋め込むための「データマップ」を生成します。
 */

import * as fs from 'fs';
import * as path from 'path';

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
    'データソース', 'アプリ', 'レコード', 'URL', '期', '日付', '全体', 'ミーティング',
    '年間', 'スケジュール', 'ルールブック', 'JM', '記録', '分類', '項目'
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
 * セクションを分割して個別に分析
 */
function splitSections(content: string): {
  jmRecords: string;
  schedule: string;
  rulebook: string;
} {
  // セクション区切り
  const jmStart = content.indexOf('【データソース】JM記録アプリ - 全体ミーティング');
  const scheduleStart = content.indexOf('【データソース】年間スケジュールアプリ');
  const rulebookStart = content.indexOf('【データソース】ルールブック');

  // JM記録
  let jmRecords = '';
  if (jmStart !== -1 && scheduleStart !== -1) {
    jmRecords = content.substring(jmStart, scheduleStart);
  } else if (jmStart !== -1) {
    jmRecords = content.substring(jmStart);
  }

  // 年間スケジュール
  let schedule = '';
  if (scheduleStart !== -1 && rulebookStart !== -1) {
    schedule = content.substring(scheduleStart, rulebookStart);
  } else if (scheduleStart !== -1) {
    schedule = content.substring(scheduleStart);
  }

  // ルールブック
  let rulebook = '';
  if (rulebookStart !== -1) {
    rulebook = content.substring(rulebookStart);
  }

  return { jmRecords, schedule, rulebook };
}

/**
 * JM記録の分析
 */
function analyzeJMRecords(text: string) {
  console.log('📊 JM記録アプリを分析中...\n');

  // レコード数をカウント（【データソース】の出現回数）
  const recordMatches = text.match(/【データソース】JM記録アプリ - 全体ミーティング/g);
  const recordCount = recordMatches ? recordMatches.length : 0;

  // 日付を抽出（【日付】の後の値）
  const dateMatches = text.match(/【日付】(\d{4}-\d{2}-\d{2})/g);
  const dates = dateMatches ? dateMatches.map(m => m.replace('【日付】', '')).sort() : [];
  const oldestDate = dates[0] || '不明';
  const newestDate = dates[dates.length - 1] || '不明';

  // 頻出キーワード
  const keywords = extractFrequentKeywords(text, 20);

  console.log(`件数: ${recordCount}件`);
  console.log(`日付範囲: ${oldestDate} 〜 ${newestDate}`);
  console.log(`\n頻出キーワード TOP 20:`);
  keywords.forEach((kw, i) => {
    console.log(`  ${i + 1}. ${kw.keyword} (${kw.count}回)`);
  });

  return {
    count: recordCount,
    dateRange: { oldest: oldestDate, newest: newestDate },
    keywords: keywords.slice(0, 10).map(k => k.keyword)
  };
}

/**
 * 年間スケジュールの分析
 */
function analyzeSchedule(text: string) {
  console.log('\n\n📊 年間スケジュールアプリを分析中...\n');

  // 期の抽出
  const periodMatch = text.match(/【期】(\d+期)/);
  const period = periodMatch ? periodMatch[1] : '不明';

  // 頻出キーワード
  const keywords = extractFrequentKeywords(text, 20);

  console.log(`対象期間: ${period}（2024年10月〜2025年9月）`);
  console.log(`\n頻出キーワード TOP 20:`);
  keywords.forEach((kw, i) => {
    console.log(`  ${i + 1}. ${kw.keyword} (${kw.count}回)`);
  });

  return {
    period: `${period}（2024年10月〜2025年9月）`,
    keywords: keywords.slice(0, 10).map(k => k.keyword)
  };
}

/**
 * ルールブックの分析
 */
function analyzeRulebook(text: string) {
  console.log('\n\n📊 ルールブックアプリを分析中...\n');

  // レコード数をカウント
  const recordMatches = text.match(/【データソース】ルールブック/g);
  const recordCount = recordMatches ? recordMatches.length : 0;

  // 分類を抽出
  const categoryMatches = text.match(/【分類】(.+)/g);
  const categories = new Map<string, number>();
  if (categoryMatches) {
    categoryMatches.forEach(match => {
      const cat = match.replace('【分類】', '').trim();
      categories.set(cat, (categories.get(cat) || 0) + 1);
    });
  }

  // 項目を抽出（最初の15件）
  const itemMatches = text.match(/【項目】(.+)/g);
  const items = new Set<string>();
  if (itemMatches) {
    itemMatches.forEach(match => {
      const item = match.replace('【項目】', '').trim();
      items.add(item);
    });
  }

  // 頻出キーワード
  const keywords = extractFrequentKeywords(text, 20);

  console.log(`件数: ${recordCount}件`);
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
    count: recordCount,
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
  console.log('🔍 統合Kintoneデータ構造分析を開始します\n');
  console.log('========================================\n');

  try {
    // ファイルを読み込む
    const filePath = path.join(process.cwd(), 'combined-kintone-data.txt');
    console.log(`📂 ファイル読み込み中: ${filePath}`);

    if (!fs.existsSync(filePath)) {
      throw new Error('combined-kintone-data.txt が見つかりません。先に scripts/test-combined-data.ts を実行してください。');
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    console.log(`✅ ファイル読み込み完了: ${content.length}文字\n`);
    console.log('========================================\n');

    // セクションを分割
    const { jmRecords, schedule, rulebook } = splitSections(content);

    // 各データソースを分析
    const jmAnalysis = analyzeJMRecords(jmRecords);
    const scheduleAnalysis = analyzeSchedule(schedule);
    const rulebookAnalysis = analyzeRulebook(rulebook);

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
    console.log('場所: ステップ0【質問の意図分析とデータソース選択】の直前に挿入\n');

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  }
}

main();
