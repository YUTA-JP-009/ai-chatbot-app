import { logToSheets } from '../app/lib/sheets-logger';

async function testSheetsConnection() {
  console.log('🧪 Google Sheets接続テストを開始します...');

  try {
    await logToSheets({
      timestamp: new Date().toISOString(),
      questionerId: '99999999',
      question: '[テスト] Google Sheets API接続テスト',
      answer: 'このメッセージはCLIからのテストログです。正常に接続できています！',
      processingTime: 0.5,
      promptTokenCount: 12345,
      usedTagIds: ['test_001', 'test_002'],
    });

    console.log('✅ テスト成功！スプレッドシートにログが記録されました。');
    console.log('📊 スプレッドシートを確認してください:');
    console.log('   https://docs.google.com/spreadsheets/d/1lo0AvDdsVgb2jK3fMpos4TtLr5Whcp6uQ5KSQLayzxE/edit');
  } catch (error) {
    console.error('❌ テスト失敗:', error);
    process.exit(1);
  }
}

testSheetsConnection();
