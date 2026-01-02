/**
 * Kintone API クライアント
 *
 * 3つのアプリからデータを取得:
 * 1. JM記録アプリ（アプリID: 117） - 全体ミーティング議事録
 * 2. 年間スケジュールアプリ（アプリID: 238） - 22期年間スケジュール
 * 3. ルールブックアプリ（アプリID: 296） - 社内ルール集
 *
 * キャッシュ機能:
 * - Next.js Data Cache（unstable_cache）で永続的なキャッシュを実現
 * - サーバーレス関数のインスタンス間でキャッシュを共有
 * - TTL（有効期限）: 1時間（3600秒）
 * - 期待される効果: 600-1,200ms短縮（2回目以降のリクエスト、異なるインスタンスでも有効）
 */

import { unstable_cache } from 'next/cache';

// ============================================================
// 型定義
// ============================================================

export interface KintoneTableRow {
  value: {
    '文字列__複数行_'?: { value: string };
    [key: string]: { value: unknown } | undefined;
  };
}

export interface KintoneRecord {
  $id: { value: string };
  日付?: { value: string };
  数値?: { value: number }; // 年間スケジュールアプリの「期」フィールド
  Table?: { value: KintoneTableRow[] };
  ドロップダウン?: { value: string };
  [key: string]: { value: unknown } | undefined;
}

export interface KintoneRecordsResponse {
  records: KintoneRecord[];
  totalCount?: string;
}

/**
 * JM記録アプリ（アプリID 117）からレコードを取得（内部実装）
 * 2025年10月1日以降のデータのみ
 */
async function fetchJMRecordsInternal(): Promise<KintoneRecord[]> {
  console.log('🔄 JM記録: API呼び出し実行中...');

  const domain = process.env.KINTONE_DOMAIN;
  const apiToken = process.env.KINTONE_API_TOKEN_JM;
  const appId = process.env.KINTONE_APP_ID_JM || '117';

  if (!domain || !apiToken) {
    throw new Error('KINTONE_DOMAIN または KINTONE_API_TOKEN_JM が設定されていません');
  }

  const allRecords: KintoneRecord[] = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const query = `日付 >= "2025-10-01" order by $id desc limit ${limit} offset ${offset}`;
    const encodedQuery = encodeURIComponent(query);
    const url = `https://${domain}/k/v1/records.json?app=${appId}&query=${encodedQuery}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Cybozu-API-Token': apiToken,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Kintone API error (JM記録): ${response.status} ${errorText}`);
    }

    const data = await response.json() as KintoneRecordsResponse;

    if (data.records.length === 0) break;
    allRecords.push(...data.records);
    if (data.records.length < limit) break;

    offset += limit;
  }

  console.log(`✅ JM記録: ${allRecords.length}件取得完了`);
  return allRecords;
}

// モジュールレベルでキャッシュ関数を定義（重要: 関数内で定義すると毎回新しいインスタンスが生成される）
const getCachedJMRecords = unstable_cache(
  async () => fetchJMRecordsInternal(),
  ['jm-records-data-v2'], // キャッシュキーを変更（キャッシュクリア用）
  {
    revalidate: 3600, // 1時間
    tags: ['jm-records-v2'] // タグも変更
  }
);

/**
 * JM記録アプリ（アプリID 117）からレコードを取得
 * キャッシュ機能付き: 1時間有効な永続キャッシュ（Data Cache）
 */
export async function fetchJMRecords(maxRecords?: number): Promise<KintoneRecord[]> {
  const allRecords = await getCachedJMRecords();
  return maxRecords ? allRecords.slice(0, maxRecords) : allRecords;
}

/**
 * 年間スケジュールアプリ（アプリID 238）から22期のレコードを取得（内部実装）
 * スクリプトからの直接呼び出し用にexport
 */
export async function fetchScheduleRecordInternal(): Promise<KintoneRecord | null> {
  console.log('🔄 年間スケジュール: API呼び出し実行中...');

  const domain = process.env.KINTONE_DOMAIN;
  const apiToken = process.env.KINTONE_API_TOKEN_SCHEDULE;
  const appId = process.env.KINTONE_APP_ID_SCHEDULE || '238';

  if (!domain || !apiToken) {
    throw new Error('KINTONE_DOMAIN または KINTONE_API_TOKEN_SCHEDULE が設定されていません');
  }

  // 22期のレコード（レコードID 8）を取得
  const url = `https://${domain}/k/v1/record.json?app=${appId}&id=8`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'X-Cybozu-API-Token': apiToken,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Kintone API error (年間スケジュール): ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const record = data.record;

  console.log('✅ 年間スケジュール: 取得完了');
  return record;
}

// モジュールレベルでキャッシュ関数を定義
const getCachedScheduleRecord = unstable_cache(
  async () => fetchScheduleRecordInternal(),
  ['schedule-record-data-v2'], // キャッシュキーを変更（キャッシュクリア用）
  {
    revalidate: 3600, // 1時間
    tags: ['schedule-record-v2'] // タグも変更
  }
);

/**
 * 年間スケジュールアプリ（アプリID 238）から22期のレコードを取得
 * キャッシュ機能付き: 1時間有効な永続キャッシュ（Data Cache）
 */
export async function fetchScheduleRecord(): Promise<KintoneRecord | null> {
  return await getCachedScheduleRecord();
}

/**
 * ルールブックアプリ（アプリID 296）から全レコードを取得（内部実装）
 */
async function fetchRulebookRecordsInternal(): Promise<KintoneRecord[]> {
  console.log('🔄 ルールブック: API呼び出し実行中...');

  const domain = process.env.KINTONE_DOMAIN;
  const apiToken = process.env.KINTONE_API_TOKEN_RULEBOOK;
  const appId = process.env.KINTONE_APP_ID_RULEBOOK || '296';

  if (!domain || !apiToken) {
    throw new Error('KINTONE_DOMAIN または KINTONE_API_TOKEN_RULEBOOK が設定されていません');
  }

  const allRecords: KintoneRecord[] = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const query = `order by $id asc limit ${limit} offset ${offset}`;
    const encodedQuery = encodeURIComponent(query);
    const url = `https://${domain}/k/v1/records.json?app=${appId}&query=${encodedQuery}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Cybozu-API-Token': apiToken,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Kintone API error (ルールブック): ${response.status} ${errorText}`);
    }

    const data = await response.json() as KintoneRecordsResponse;

    if (data.records.length === 0) break;
    allRecords.push(...data.records);
    if (data.records.length < limit) break;

    offset += limit;
  }

  console.log(`✅ ルールブック: ${allRecords.length}件取得完了`);
  return allRecords;
}

// モジュールレベルでキャッシュ関数を定義
const getCachedRulebookRecords = unstable_cache(
  async () => fetchRulebookRecordsInternal(),
  ['rulebook-records-data-v2'], // キャッシュキーを変更（キャッシュクリア用）
  {
    revalidate: 3600, // 1時間
    tags: ['rulebook-records-v2'] // タグも変更
  }
);

/**
 * ルールブックアプリ（アプリID 296）から全レコードを取得
 * キャッシュ機能付き: 1時間有効な永続キャッシュ（Data Cache）
 */
export async function fetchRulebookRecords(): Promise<KintoneRecord[]> {
  return await getCachedRulebookRecords();
}

/**
 * JM記録アプリの議事録をXML形式に変換
 */
export function convertJMRecordsToText(records: KintoneRecord[]): string {
  const meetingNotes: string[] = [];

  for (const record of records) {
    const recordId = record.$id.value;
    const date = record.日付?.value || '日付不明';
    const period = record.ドロップダウン?.value || '期不明';

    const tableContent = record.Table?.value;
    if (!tableContent || tableContent.length === 0) {
      continue;
    }

    // XMLタグ開始
    meetingNotes.push(`<record id="jm_117_${recordId}">`);
    meetingNotes.push(`  <url>https://eu-plan.cybozu.com/k/117/show#record=${recordId}</url>`);
    meetingNotes.push(`  <content>`);
    meetingNotes.push(`    データソース: JM記録アプリ - 全体ミーティング`);
    meetingNotes.push(`    日付: ${date}`);
    meetingNotes.push(`    期: ${period}`);
    meetingNotes.push(``);

    for (const row of tableContent) {
      const content = row.value['文字列__複数行_']?.value;
      if (!content || typeof content !== 'string' || content.trim() === '') {
        continue;
      }

      meetingNotes.push(`    ${content.trim()}`);
      meetingNotes.push(``);
    }

    meetingNotes.push(`  </content>`);
    meetingNotes.push(`</record>`);
    meetingNotes.push('');
  }

  return meetingNotes.join('\n');
}

/**
 * 年間スケジュールアプリの22期データをXML形式に変換
 * 各テーブルフィールドをTab番号ごとに分けて、個別のXMLタグとして出力
 */
export function convertScheduleRecordToText(record: KintoneRecord): string {
  const scheduleNotes: string[] = [];

  const recordId = record.$id.value;
  const period = record.数値?.value || '期不明';

  // 全テーブルフィールドを処理（Table_3, Table_4, ... Table_16）
  // 各テーブルフィールドに対応するTab番号を定義
  // ※Tab番号はkintoneアプリの実際のUI階層に対応
  // ※ユーザー提供のTab一覧に基づく正確な対応（合計14タブ、Tab 0-13）
  const tableFields = [
    { name: 'Table_3', label: '毎月', tab: 0 },
    { name: 'Table_4', label: '随時', tab: 1 },
    { name: 'Table_5', label: '10月', tab: 2 },
    { name: 'Table_6', label: '11月', tab: 3 },  // 贈答品含む
    { name: 'Table_7', label: '12月', tab: 4 },
    { name: 'Table_8', label: '1月', tab: 5 },
    { name: 'Table_9', label: '2月', tab: 6 },
    { name: 'Table_10', label: '3月', tab: 7 },
    { name: 'Table_11', label: '4月', tab: 8 },
    { name: 'Table_12', label: '5月', tab: 9 },
    { name: 'Table_13', label: '6月', tab: 10 },
    { name: 'Table_15', label: '7月', tab: 11 },  // Table_15は7月
    { name: 'Table_14', label: '8月', tab: 12 },
    { name: 'Table_16', label: '9月', tab: 13 },
  ];

  // Tab番号ごとにテーブルフィールドをグループ化
  const tabGroups = new Map<number, typeof tableFields>();

  for (const tableField of tableFields) {
    const tableData = record[tableField.name]?.value as KintoneTableRow[] | undefined;

    if (!tableData || !Array.isArray(tableData) || tableData.length === 0) {
      continue;
    }

    if (!tabGroups.has(tableField.tab)) {
      tabGroups.set(tableField.tab, []);
    }
    tabGroups.get(tableField.tab)!.push(tableField);
  }

  // Tab番号ごとに個別のXMLタグを生成
  for (const [tabNumber, fields] of Array.from(tabGroups.entries()).sort((a, b) => a[0] - b[0])) {
    scheduleNotes.push(`<schedule id="schedule_238_${recordId}_tab${tabNumber}">`);
    scheduleNotes.push(`  <url>https://eu-plan.cybozu.com/k/238/show#record=${recordId}&tab=${tabNumber}</url>`);
    scheduleNotes.push(`  <content>`);
    scheduleNotes.push(`    データソース: 年間スケジュールアプリ`);
    scheduleNotes.push(`    期: ${period}期`);
    scheduleNotes.push(`    Tab: ${tabNumber}`);
    scheduleNotes.push(``);

    // 【重要】Tab 1（随時）はキャリア採用（中途採用）の情報のみ含める
    // 社員面談などの他の情報は除外し、Tab 2以降の具体的なスケジュールと競合しないようにする
    const isTab1 = tabNumber === 1;

    for (const tableField of fields) {
      const tableData = record[tableField.name]?.value as KintoneTableRow[];

      scheduleNotes.push(`    【${tableField.label}】`);
      scheduleNotes.push(``);

      for (const row of tableData) {
        // 全フィールドから有効なテキストを抽出
        const allText: string[] = [];

        Object.keys(row.value).forEach(key => {
          const fieldValue = row.value[key]?.value;

          if (typeof fieldValue === 'string' && fieldValue.trim() !== '') {
            allText.push(fieldValue.trim());
          }
        });

        // Tab 1の場合: キャリア採用（中途採用）以外の情報を除外
        if (isTab1) {
          const combinedText = allText.join(' ');

          // キャリア採用関連のキーワードをチェック
          const isCareerRecruitment =
            combinedText.includes('キャリア採用') ||
            combinedText.includes('中途採用') ||
            combinedText.includes('採用') && (
              combinedText.includes('選考') ||
              combinedText.includes('面接') ||
              combinedText.includes('応募')
            );

          // 社員面談関連のキーワードをチェック（除外対象）
          const isEmployeeInterview =
            combinedText.includes('社員面談') ||
            combinedText.includes('SGシート') ||
            combinedText.includes('面談室') ||
            combinedText.includes('評価');

          // キャリア採用以外、または社員面談関連の場合はスキップ
          if (!isCareerRecruitment || isEmployeeInterview) {
            continue;
          }
        }

        if (allText.length > 0) {
          scheduleNotes.push(`    ${allText.join('\n    ')}`);
          scheduleNotes.push(``);
        }
      }
    }

    scheduleNotes.push(`  </content>`);
    scheduleNotes.push(`</schedule>`);
    scheduleNotes.push('');
  }

  return scheduleNotes.join('\n');
}

/**
 * ルールブックアプリのレコードをXML形式に変換
 */
export function convertRulebookRecordsToText(records: KintoneRecord[]): string {
  const rulebookNotes: string[] = [];

  for (const record of records) {
    const recordId = record.$id.value;
    const category = record['分類']?.value as string | undefined || '未分類';
    const title = record['項目']?.value as string | undefined || 'タイトルなし';

    const tableContent = record.Table?.value;
    if (!tableContent || tableContent.length === 0) {
      continue;
    }

    // XMLタグ開始
    rulebookNotes.push(`<rule id="rule_296_${recordId}">`);
    rulebookNotes.push(`  <url>https://eu-plan.cybozu.com/k/296/show#record=${recordId}</url>`);
    rulebookNotes.push(`  <content>`);
    rulebookNotes.push(`    データソース: ルールブック`);
    rulebookNotes.push(`    分類: ${category}`);
    rulebookNotes.push(`    項目: ${title}`);
    rulebookNotes.push(``);

    for (const row of tableContent) {
      const rule = row.value['ルール']?.value;
      const rule0 = row.value['ルール_0']?.value;

      if (rule && typeof rule === 'string' && rule.trim() !== '') {
        rulebookNotes.push(`    ${rule.trim()}`);
        rulebookNotes.push(``);
      }

      if (rule0 && typeof rule0 === 'string' && rule0.trim() !== '') {
        rulebookNotes.push(`    ${rule0.trim()}`);
        rulebookNotes.push(``);
      }
    }

    rulebookNotes.push(`  </content>`);
    rulebookNotes.push(`</rule>`);
    rulebookNotes.push('');
  }

  return rulebookNotes.join('\n');
}

/**
 * 質問からキーワードを抽出
 */
function extractKeywords(question: string): string[] {
  // メンション部分を除去（例: [To:10686206]AIチャットさん → 本文のみ）
  let cleanedQuestion = question;

  // [To:数字] パターンを削除
  cleanedQuestion = cleanedQuestion.replace(/\[To:\d+\]/g, '');

  // [rp aid=数字 to=数字-数字] パターンを削除
  cleanedQuestion = cleanedQuestion.replace(/\[rp aid=\d+ to=\d+-\d+\]/g, '');

  // AI名称を削除（例: AIチャットさん）
  cleanedQuestion = cleanedQuestion.replace(/AIチャット(さん)?/g, '');

  // 余分な空白・改行を削除
  cleanedQuestion = cleanedQuestion.replace(/\s+/g, '');

  console.log('🧹 質問文クリーニング:', {
    元の質問: question.substring(0, 50),
    クリーニング後: cleanedQuestion.substring(0, 50)
  });

  // 基本的なキーワード抽出（助詞・接続詞を除外）
  const stopWords = ['は', 'が', 'を', 'に', 'で', 'と', 'の', 'や', 'か', 'から', 'まで', '？', '?', 'いつ', 'どこ', '何', 'いくら', 'ます', 'です', 'ください'];

  // 複合語を先に抽出（長い方を優先）
  const compounds = [
    '夏期休業', '冬期休業', '年末年始', '研修旅行', '社員旅行', '一級建築士', '二級建築士',
    '秘密保持契約', '有給休暇', '社員面談', '勤続祝い', '売上目標', '給与', '賞与',
    'ボーナス', '夏期', '冬期', '建築士', 'ガイダンス', 'お歳暮', 'お中元', '贈答品',
    'リモートワーク', '前受金', '計画取得日', '代休', 'リファラル', '採用'
  ];

  const extractedKeywords = new Set<string>();

  // 複合語をチェック（クリーニング後の質問文で）
  compounds.forEach(compound => {
    if (cleanedQuestion.includes(compound)) {
      extractedKeywords.add(compound);
    }
  });

  // 単語レベルの抽出（2文字以上、ストップワード除外）
  // クリーニング後の質問文を使用
  const chars = cleanedQuestion.split('');
  for (let i = 0; i < chars.length; i++) {
    for (let len = 4; len >= 2; len--) { // 4文字から2文字まで
      if (i + len <= chars.length) {
        const word = chars.slice(i, i + len).join('');

        // ストップワード、数字、記号、英数字記号をスキップ
        if (!stopWords.includes(word) &&
            !/^[0-9]+$/.test(word) &&
            !/[？?！!。、～\[\]]/.test(word) &&
            !/^[a-zA-Z0-9:]+$/.test(word)) { // 英数字記号のみの単語は除外
          extractedKeywords.add(word);
        }
      }
    }
  }

  // キーワードの同義語・関連語を追加
  const expandedKeywords = new Set<string>(extractedKeywords);

  extractedKeywords.forEach(word => {
    // 同義語マッピング
    const synonyms: Record<string, string[]> = {
      '休暇': ['休み', '休業', '休日'],
      '休み': ['休暇', '休業'],
      '休業': ['休暇', '休み'],
      '夏': ['夏期', '8月'],
      '夏期': ['夏', '8月'],
      '冬': ['冬期', '年末', '年始', '12月', '1月'],
      '冬期': ['冬', '年末', '年始'],
      '給与': ['給料', '賃金', '報酬', 'ボーナス'],
      '賞与': ['ボーナス', '一時金', '給与'],
      '契約': ['秘密保持', 'NDA'],
      '旅行': ['研修旅行', '社員旅行'],
      '建築士': ['一級建築士', '二級建築士', '資格'],
      '面談': ['社員面談', '評価'],
      '売上': ['売り上げ', '目標'],
      'お歳暮': ['贈答品', 'お中元', '受け取り', '郵便物'],
      'お中元': ['贈答品', 'お歳暮', '受け取り', '郵便物'],
      '贈答品': ['お歳暮', 'お中元', '受け取り', '郵便物'],
    };

    if (synonyms[word]) {
      synonyms[word].forEach(syn => expandedKeywords.add(syn));
    }
  });

  const result = Array.from(expandedKeywords).filter(kw => kw.length >= 2);
  return result.length > 0 ? result : ['全般']; // 空の場合は「全般」を返す
}

/**
 * キーワードに基づいてデータをフィルタリング（XML形式対応）
 */
function filterRelevantData(question: string, allData: string): string {
  const keywords = extractKeywords(question);

  console.log(`  🔍 抽出キーワード: ${keywords.join(', ')}`);

  // XMLタグ単位で分割（<record>、<schedule>、<rule>）
  const tagPattern = /(<record id="[^"]+">[\s\S]*?<\/record>|<schedule id="[^"]+">[\s\S]*?<\/schedule>|<rule id="[^"]+">[\s\S]*?<\/rule>)/g;
  const sections = allData.match(tagPattern) || [];

  console.log(`  📦 XMLタグ分割: ${sections.length}件のタグを検出`);

  // 【改善】意図ベースのスコアリング
  // 固有名詞（カタカナ、漢字の人名）を検出
  const properNouns = keywords.filter(kw =>
    /^[ぁ-ん一-龯]{2,}$/.test(kw) || // 漢字のみ2文字以上（人名の可能性）
    /^[ァ-ヴー]{2,}$/.test(kw)        // カタカナのみ2文字以上（人名の可能性）
  );

  const scoredSections = sections.map(section => {
    let score = 0;

    // 【優先度1】固有名詞（人名）マッチング: 1件 = 100点
    properNouns.forEach(properNoun => {
      const escapedKeyword = properNoun.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escapedKeyword, 'gi');
      const matches = section.match(regex);
      if (matches) {
        score += matches.length * 100; // 人名マッチは高得点
      }
    });

    // 【優先度2】一般キーワードマッチング: 1件 = 10点
    keywords.forEach(keyword => {
      // 固有名詞は既にカウント済みなのでスキップ
      if (properNouns.includes(keyword)) return;

      const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escapedKeyword, 'gi');
      const matches = section.match(regex);
      if (matches) {
        score += matches.length * 10; // 通常キーワード
      }
    });

    return { section, score };
  });

  // スコアでソートして、上位30タグに絞る（15 → 30に拡大）
  const relevantSections = scoredSections
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 30) // 上位30タグに拡大（精度向上のため）
    .map(item => item.section);

  const filteredData = relevantSections.join('\n\n');

  console.log(`  ✂️  フィルタリング結果: ${sections.length}件 → ${relevantSections.length}件`);
  console.log(`  📊 データ削減: ${allData.length.toLocaleString()}文字 → ${filteredData.length.toLocaleString()}文字 (${Math.round((1 - filteredData.length / allData.length) * 100)}%削減)`);

  // デバッグ: 抽出されたタグIDとスコアを表示
  const tagScores = scoredSections
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 30)
    .map(item => {
      const idMatch = item.section.match(/id="([^"]+)"/);
      const id = idMatch ? idMatch[1] : 'unknown';
      return `${id}(${item.score}点)`;
    });
  console.log(`  🏷️  フィルタリング後のタグID（スコア順）: ${tagScores.join(', ')}`);

  return filteredData;
}

/**
 * 3つのアプリからデータを取得して統合
 *
 * キャッシュ機能により、2回目以降は600-1,200ms高速化（Data Cache使用）
 *
 * 【重要】キーワードフィルタリングを廃止し、全データをGeminiに渡す方式に変更
 * - フィルタリングによる情報損失を防ぐ
 * - Geminiが全文を見て正確に判断できる
 * - プレビュー切り詰めによるミスマッチを防ぐ
 */
/**
 * タグとキーワードのマッチングスコアを計算
 * - タイトル/見出しマッチ: 10点
 * - 本文マッチ: 3点
 * - 固有名詞（カタカナ・人名）マッチ: +5点ボーナス
 */
function calculateTagScore(tagContent: string, keywords: string[]): number {
  let score = 0;

  // タグの最初の200文字をタイトル領域とみなす
  const title = tagContent.substring(0, 200);
  const body = tagContent.substring(200);

  for (const keyword of keywords) {
    // タイトルマッチ（重要）
    const titleMatches = (title.match(new RegExp(keyword, 'g')) || []).length;
    score += titleMatches * 10;

    // 本文マッチ
    const bodyMatches = (body.match(new RegExp(keyword, 'g')) || []).length;
    score += bodyMatches * 3;

    // カタカナ固有名詞ボーナス（人名・地名・プロジェクト名）
    if (/^[ァ-ヴー]+$/.test(keyword) && keyword.length >= 3) {
      score += titleMatches * 5;
    }
  }

  return score;
}

/**
 * XMLタグを解析してフィルタリング
 * スコア閾値により動的にタグ数を調整:
 * - 高スコア（100以上）: 明確な質問 → 10件に絞る（高速化優先）
 * - 低スコア（100未満）: 曖昧な質問 → 20件確保（精度優先）
 */
function filterRelevantTags(combinedText: string, keywords: string[]): string {
  // XMLタグを抽出（<record>, <schedule>, <rule>）
  const tagPattern = /<(record|schedule|rule) id="([^"]+)">([\s\S]*?)<\/\1>/g;
  const tags: Array<{ type: string; id: string; content: string; score: number }> = [];

  let match;
  while ((match = tagPattern.exec(combinedText)) !== null) {
    const [fullMatch, type, id, content] = match;
    const score = calculateTagScore(content, keywords);
    tags.push({ type, id, content: fullMatch, score });
  }

  // スコア降順でソート
  tags.sort((a, b) => b.score - a.score);

  // スコア閾値による動的な件数調整
  const maxScore = tags[0]?.score || 0;
  const tagLimit = maxScore >= 100 ? 10 : 20;

  const topTags = tags.slice(0, tagLimit);

  console.log(`  🔍 キーワードフィルタリング: ${tags.length}件 → ${topTags.length}件に絞り込み（最高スコア: ${maxScore}）`);
  console.log(`  📊 上位3件のスコア: ${topTags.slice(0, 3).map(t => `${t.id}(${t.score})`).join(', ')}`);

  return topTags.map(t => t.content).join('\n\n');
}

export async function fetchAllKintoneData(question?: string): Promise<string> {
  console.log('🔗 Kintone APIから全データを取得します（Data Cache使用）');

  try {
    // 1. JM記録アプリから全レコード取得（キャッシュ対応）
    console.log('  📥 JM記録アプリ（全体ミーティング）取得中...');
    const jmRecords = await fetchJMRecords();
    console.log(`  ✅ JM記録: ${jmRecords.length}件`);

    // 2. 年間スケジュールアプリから22期レコード取得（キャッシュ対応）
    console.log('  📥 年間スケジュールアプリ（22期）取得中...');
    const scheduleRecord = await fetchScheduleRecord();
    console.log(`  ✅ 年間スケジュール: 取得完了`);

    // 3. ルールブックアプリから全レコード取得（キャッシュ対応）
    console.log('  📥 ルールブックアプリ（社内ルール集）取得中...');
    const rulebookRecords = await fetchRulebookRecords();
    console.log(`  ✅ ルールブック: ${rulebookRecords.length}件`);

    // 4. テキストに変換
    const jmText = convertJMRecordsToText(jmRecords);
    const scheduleText = scheduleRecord ? convertScheduleRecordToText(scheduleRecord) : '';
    const rulebookText = convertRulebookRecordsToText(rulebookRecords);

    // 5. 統合
    const combinedText = `${jmText}\n\n${scheduleText}\n\n${rulebookText}`;

    console.log(`✅ 全データ取得完了: ${combinedText.length.toLocaleString()}文字`);

    // 6. 質問ベースのキーワードフィルタリング（精度重視で上位20件確保）
    if (question && question.trim().length > 0) {
      const keywords = extractKeywords(question);
      console.log(`  🔑 抽出キーワード: ${keywords.join(', ')}`);

      const filteredText = filterRelevantTags(combinedText, keywords);
      console.log(`  ✅ フィルタリング後: ${filteredText.length.toLocaleString()}文字`);

      return filteredText;
    }

    // 質問がない場合は全データを返す（フォールバック）
    console.log('  ℹ️  質問なし: 全データをGeminiに渡します');
    return combinedText;

  } catch (error) {
    console.error('❌ Kintone API呼び出しエラー:', error);
    throw error;
  }
}

// 後方互換性のため、既存の関数名も維持
export async function fetchAllKintoneRecords(maxRecords?: number): Promise<KintoneRecord[]> {
  return fetchJMRecords(maxRecords);
}

export function convertKintoneRecordsToText(records: KintoneRecord[]): string {
  return convertJMRecordsToText(records);
}
