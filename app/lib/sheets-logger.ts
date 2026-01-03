/**
 * Google Sheets ログ記録モジュール
 *
 * Q&Aログをスプレッドシートに非同期で記録します。
 * 書き込み失敗時はコンソールにエラーログを出力します。
 *
 * スプレッドシートID: 1lo0AvDdsVgb2jK3fMpos4TtLr5Whcp6uQ5KSQLayzxE
 */

import { google } from 'googleapis';

const SPREADSHEET_ID = '1lo0AvDdsVgb2jK3fMpos4TtLr5Whcp6uQ5KSQLayzxE';
const SHEET_NAME = 'シート1'; // デフォルトシート名（必要に応じて変更）

interface LogEntry {
  timestamp: string;         // A列: タイムスタンプ（ISO形式）
  questionerId: string;      // B列: 質問者ID（Chatwork Account ID）
  questionerName?: string;   // B列: 質問者名（取得できた場合）
  question: string;          // C列: 質問文
  answer: string;            // D列: 回答
  processingTime: number;    // E列: 処理時間（秒）
  promptTokenCount?: number; // F列: promptTokenCount
  usedTagIds?: string[];     // G列: 使用タグID（カンマ区切り）
  error?: string;            // H列: エラー（あれば）
}

/**
 * ISO形式のタイムスタンプを日本時間（JST）の読みやすい形式に変換
 * 例: "2026-01-03 16:08:13"
 */
function formatTimestampJST(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  // JSTはUTC+9時間
  const jstDate = new Date(date.getTime() + 9 * 60 * 60 * 1000);

  const year = jstDate.getUTCFullYear();
  const month = String(jstDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(jstDate.getUTCDate()).padStart(2, '0');
  const hours = String(jstDate.getUTCHours()).padStart(2, '0');
  const minutes = String(jstDate.getUTCMinutes()).padStart(2, '0');
  const seconds = String(jstDate.getUTCSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Google Sheets APIクライアントを取得
 */
async function getSheetsClient() {
  // サービスアカウント認証（環境変数から取得）
  const credentials = process.env.GOOGLE_SHEETS_CREDENTIALS;

  if (!credentials) {
    throw new Error('GOOGLE_SHEETS_CREDENTIALS environment variable is not set');
  }

  // JSONパース（.env.localの場合、改行やエスケープが正しくない可能性があるため処理）
  let parsedCredentials;
  try {
    parsedCredentials = JSON.parse(credentials);
  } catch (firstError) {
    try {
      // 先頭と末尾の引用符を削除（.env.localで二重引用符になっている場合）
      let cleaned = credentials.trim();
      if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
        cleaned = cleaned.slice(1, -1);
      }
      // 実際の改行文字を\\nにエスケープ
      cleaned = cleaned.replace(/\n/g, '\\n');
      // エスケープされたダブルクォートを修正
      cleaned = cleaned.replace(/\\"/g, '"');
      parsedCredentials = JSON.parse(cleaned);
    } catch (secondError) {
      throw new Error(`Failed to parse GOOGLE_SHEETS_CREDENTIALS: ${secondError}`);
    }
  }

  const auth = new google.auth.GoogleAuth({
    credentials: parsedCredentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  return sheets;
}

/**
 * ログエントリをスプレッドシートに追加（非同期、Fire-and-Forget）
 *
 * @param entry ログエントリ
 */
export async function logToSheets(entry: LogEntry): Promise<void> {
  try {
    console.log('🔍 [sheets-logger] logToSheets開始:', {
      questionerId: entry.questionerId,
      questionerName: entry.questionerName,
    });

    console.log('🔍 [sheets-logger] getSheetsClient呼び出し...');
    const sheets = await getSheetsClient();
    console.log('✓ [sheets-logger] Sheetsクライアント取得成功');

    // タイムスタンプを日本時間（JST）に変換
    const formattedTimestamp = formatTimestampJST(entry.timestamp);
    console.log('✓ [sheets-logger] タイムスタンプ変換完了:', formattedTimestamp);

    // 質問者表示（名前がある場合は「名前 (ID)」、ない場合はIDのみ）
    const questionerDisplay = entry.questionerName
      ? `${entry.questionerName} (${entry.questionerId})`
      : entry.questionerId;

    // スプレッドシートに追加する行データ
    const row = [
      formattedTimestamp,        // A列: 日本時間のタイムスタンプ
      questionerDisplay,          // B列: 質問者名 (ID) または ID
      entry.question,             // C列: 質問文
      entry.answer,               // D列: 回答
      entry.processingTime,       // E列: 処理時間
      entry.promptTokenCount || '', // F列: promptTokenCount
      entry.usedTagIds?.join(', ') || '', // G列: 使用タグID
      entry.error || '',          // H列: エラー
    ];

    console.log('🔍 [sheets-logger] スプレッドシート書き込み開始:', {
      spreadsheetId: SPREADSHEET_ID,
      sheetName: SHEET_NAME,
      rowLength: row.length,
    });

    // スプレッドシートに行を追加（A列から開始）
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A1:H1`, // A1から開始を明示
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS', // 新しい行を挿入
      requestBody: {
        values: [row],
      },
    });

    console.log('✅ スプレッドシートにログを記録しました', {
      timestamp: entry.timestamp,
      questionerId: entry.questionerId,
      processingTime: entry.processingTime,
    });
  } catch (error) {
    // エラーはコンソールに記録するのみ（メイン処理には影響させない）
    console.error('❌ スプレッドシートへのログ記録に失敗しました:', error);
    console.error('❌ エラー詳細:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    console.error('失敗したログエントリ:', {
      timestamp: entry.timestamp,
      questionerId: entry.questionerId,
      question: entry.question.substring(0, 50) + '...',
    });
  }
}

/**
 * 非同期でログを記録（Fire-and-Forget）
 * メイン処理の応答速度に影響を与えません
 *
 * @param entry ログエントリ
 */
export function logToSheetsAsync(entry: LogEntry): void {
  // Promiseを作成するがawaitしない（Fire-and-Forget）
  logToSheets(entry).catch((error) => {
    console.error('❌ 非同期ログ記録エラー:', error);
  });
}
