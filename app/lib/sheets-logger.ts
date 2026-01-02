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
  timestamp: string;        // A列: タイムスタンプ
  questionerId: string;     // B列: 質問者（Chatwork Account ID）
  question: string;         // C列: 質問文
  answer: string;           // D列: 回答
  processingTime: number;   // E列: 処理時間（秒）
  promptTokenCount?: number; // F列: promptTokenCount
  usedTagIds?: string[];    // G列: 使用タグID（カンマ区切り）
  error?: string;           // H列: エラー（あれば）
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
    const sheets = await getSheetsClient();

    // スプレッドシートに追加する行データ
    const row = [
      entry.timestamp,
      entry.questionerId,
      entry.question,
      entry.answer,
      entry.processingTime,
      entry.promptTokenCount || '',
      entry.usedTagIds?.join(', ') || '',
      entry.error || '',
    ];

    // スプレッドシートに行を追加
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:H`,
      valueInputOption: 'RAW',
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
