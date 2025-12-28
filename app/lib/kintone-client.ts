/**
 * Kintone API クライアント
 *
 * 3つのアプリからデータを取得:
 * 1. JM記録アプリ（アプリID: 117） - 全体ミーティング議事録
 * 2. 年間スケジュールアプリ（アプリID: 238） - 22期年間スケジュール
 * 3. ルールブックアプリ（アプリID: 296） - 社内ルール集
 */

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
 * JM記録アプリ（アプリID 117）からレコードを取得
 * 2025年10月1日以降のデータのみ
 */
export async function fetchJMRecords(maxRecords?: number): Promise<KintoneRecord[]> {
  const domain = process.env.KINTONE_DOMAIN;
  const apiToken = process.env.KINTONE_API_TOKEN_JM;
  const appId = process.env.KINTONE_APP_ID_JM || '117';

  // デバッグ: 環境変数の値を確認（本番環境では削除推奨）
  console.log('🔍 環境変数デバッグ:');
  console.log(`  KINTONE_DOMAIN: ${domain ? '設定済み' : '未設定'}`);
  console.log(`  KINTONE_API_TOKEN_JM: ${apiToken ? `設定済み（${apiToken.substring(0, 4)}...）` : '未設定'}`);
  console.log(`  KINTONE_APP_ID_JM: ${appId}`);
  console.log(`  USE_KINTONE_DATA: ${process.env.USE_KINTONE_DATA}`);

  if (!domain || !apiToken) {
    throw new Error('KINTONE_DOMAIN または KINTONE_API_TOKEN_JM が設定されていません');
  }

  const allRecords: KintoneRecord[] = [];
  let offset = 0;
  const limit = 100;
  const actualMaxRecords = maxRecords || 999999;

  while (allRecords.length < actualMaxRecords) {
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
    if (allRecords.length >= actualMaxRecords) break;

    offset += limit;
  }

  return maxRecords ? allRecords.slice(0, maxRecords) : allRecords;
}

/**
 * 年間スケジュールアプリ（アプリID 238）から22期のレコードを取得
 */
export async function fetchScheduleRecord(): Promise<KintoneRecord | null> {
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
  return data.record;
}

/**
 * ルールブックアプリ（アプリID 296）から全レコードを取得
 */
export async function fetchRulebookRecords(): Promise<KintoneRecord[]> {
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

  return allRecords;
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
 */
export function convertScheduleRecordToText(record: KintoneRecord): string {
  const scheduleNotes: string[] = [];

  const recordId = record.$id.value;
  const period = record.数値?.value || '期不明';

  // XMLタグ開始
  scheduleNotes.push(`<schedule id="schedule_238_${recordId}">`);
  scheduleNotes.push(`  <url>https://eu-plan.cybozu.com/k/238/show#record=${recordId}</url>`);
  scheduleNotes.push(`  <content>`);
  scheduleNotes.push(`    データソース: 年間スケジュールアプリ`);
  scheduleNotes.push(`    期: ${period}期`);
  scheduleNotes.push(``);

  // 全テーブルフィールドを処理（Table_3, Table_4, ... Table_16）
  const tableFields = [
    { name: 'Table_3', label: '毎月' },
    { name: 'Table_4', label: '随時' },
    { name: 'Table_5', label: '10月' },
    { name: 'Table_6', label: '11月' },
    { name: 'Table_7', label: '12月' },
    { name: 'Table_8', label: '1月' },
    { name: 'Table_9', label: '2月' },
    { name: 'Table_10', label: '3月' },
    { name: 'Table_11', label: '4月' },
    { name: 'Table_12', label: '5月' },
    { name: 'Table_13', label: '6月' },
    { name: 'Table_14', label: '8月' },
    { name: 'Table_16', label: '9月' },
  ];

  for (const tableField of tableFields) {
    const tableData = record[tableField.name]?.value as KintoneTableRow[] | undefined;

    if (!tableData || !Array.isArray(tableData) || tableData.length === 0) {
      continue;
    }

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

      if (allText.length > 0) {
        scheduleNotes.push(`    ${allText.join('\n    ')}`);
        scheduleNotes.push(``);
      }
    }
  }

  scheduleNotes.push(`  </content>`);
  scheduleNotes.push(`</schedule>`);
  scheduleNotes.push('');

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
  // 基本的なキーワード抽出（助詞・接続詞を除外）
  const stopWords = ['は', 'が', 'を', 'に', 'で', 'と', 'の', 'や', 'か', 'から', 'まで', '？', '?', 'いつ', 'どこ', '何', 'いくら', 'ます', 'です', 'ください'];

  // 複合語を先に抽出（長い方を優先）
  const compounds = [
    '夏期休業', '冬期休業', '年末年始', '研修旅行', '社員旅行', '一級建築士', '二級建築士',
    '秘密保持契約', '有給休暇', '社員面談', '勤続祝い', '売上目標', '給与', '賞与',
    'ボーナス', '夏期', '冬期', '建築士', 'ガイダンス'
  ];

  const extractedKeywords = new Set<string>();

  // 複合語をチェック
  compounds.forEach(compound => {
    if (question.includes(compound)) {
      extractedKeywords.add(compound);
    }
  });

  // 単語レベルの抽出（2文字以上、ストップワード除外）
  const chars = question.split('');
  for (let i = 0; i < chars.length; i++) {
    for (let len = 4; len >= 2; len--) { // 4文字から2文字まで
      if (i + len <= chars.length) {
        const word = chars.slice(i, i + len).join('');

        // ストップワード、数字、記号をスキップ
        if (!stopWords.includes(word) &&
            !/^[0-9]+$/.test(word) &&
            !/[？?！!。、～]/.test(word)) {
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
    };

    if (synonyms[word]) {
      synonyms[word].forEach(syn => expandedKeywords.add(syn));
    }
  });

  const result = Array.from(expandedKeywords).filter(kw => kw.length >= 2);
  return result.length > 0 ? result : ['全般']; // 空の場合は「全般」を返す
}

/**
 * キーワードに基づいてデータをフィルタリング
 */
function filterRelevantData(question: string, allData: string): string {
  const keywords = extractKeywords(question);

  console.log(`  🔍 抽出キーワード: ${keywords.join(', ')}`);

  // データをセクションごとに分割
  const sections = allData.split('========================================\n');

  // 各セクションのスコアを計算
  const scoredSections = sections.map(section => {
    let score = 0;

    // キーワードマッチング
    keywords.forEach(keyword => {
      // 正規表現の特殊文字をエスケープ
      const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escapedKeyword, 'gi');
      const matches = section.match(regex);
      if (matches) {
        score += matches.length * 10; // マッチ回数 × 10点
      }
    });

    return { section, score };
  });

  // スコアが0より大きいセクションのみ取得し、スコア順にソート
  const relevantSections = scoredSections
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 15) // 上位15セクションに制限
    .map(item => item.section);

  const filteredData = relevantSections.join('========================================\n');

  console.log(`  ✂️  フィルタリング結果: ${sections.length}件 → ${relevantSections.length}件`);
  console.log(`  📊 データ削減: ${allData.length.toLocaleString()}文字 → ${filteredData.length.toLocaleString()}文字 (${Math.round((1 - filteredData.length / allData.length) * 100)}%削減)`);

  return filteredData;
}

/**
 * 3つのアプリからデータを取得して統合（キーワードフィルタリング付き）
 */
export async function fetchAllKintoneData(question?: string): Promise<string> {
  console.log('🔗 Kintone APIから全データを取得します');

  try {
    // 1. JM記録アプリから全レコード取得
    console.log('  📥 JM記録アプリ（全体ミーティング）取得中...');
    const jmRecords = await fetchJMRecords();
    console.log(`  ✅ JM記録: ${jmRecords.length}件`);

    // 2. 年間スケジュールアプリから22期レコード取得
    console.log('  📥 年間スケジュールアプリ（22期）取得中...');
    const scheduleRecord = await fetchScheduleRecord();
    console.log(`  ✅ 年間スケジュール: 取得完了`);

    // 3. ルールブックアプリから全レコード取得
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

    // 6. キーワードフィルタリング（質問が提供された場合）
    if (question) {
      console.log('  🔍 キーワードフィルタリング実行中...');
      const filteredText = filterRelevantData(question, combinedText);
      return filteredText;
    }

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
