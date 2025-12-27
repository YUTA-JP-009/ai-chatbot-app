// Kintone API統合テスト専用エンドポイント
// 既存の /api/chatwork には一切影響なし
// VS CodeのブラウザプレビューまたはcURLでテスト可能

import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { fetchAllKintoneData } from '../../lib/kintone-client';

// --- Kintone APIから全データを取得する関数（テスト用） ---
async function fetchAllDataFromKintone(question: string): Promise<string> {
  try {
    // 2つのアプリから全データを取得（キーワードフィルタリング付き）
    const allData = await fetchAllKintoneData(question);
    return allData;

  } catch (error) {
    console.error('❌ Kintone API呼び出しエラー:', error);
    throw error;
  }
}

// --- Gemini APIで回答生成（既存コードと同じロジック） ---
async function generateAnswerWithGemini(question: string, searchResult: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('❌ GEMINI_API_KEY が設定されていません');
  }

  console.log('🤖 Gemini API 呼び出し開始...');

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash-exp',  // 既存と同じモデル
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 500,
    }
  });

  const prompt = `あなたは社内ルールに詳しい、親しみやすいアシスタントです✨
社員の皆さんが気軽に質問できる、頼れる先輩のような存在として振る舞ってください。

以下の全体ミーティング議事録から、質問に最も適切に答えられる情報を探して、
親しみやすく、わかりやすい言葉で回答してください。

【質問】
${question}

【社内データベース（JM記録アプリ + 年間スケジュールアプリ）】
${searchResult}

【回答スタイル】
1. 親しみやすさを重視
   - 「〜です。」→「〜ですよ！」「〜してくださいね」のような柔らかい表現
   - 適度に絵文字を使用（📝 ⏰ 💡 ✅ など、1-2個程度）
   - 「！」を活用して明るい雰囲気に
   - 【重要】必ず「です・ます」調を維持すること（「〜だね」「〜だよ」などのカジュアルな表現は使わない）

2. わかりやすさを重視
   - 議事録の内容をそのままコピペせず、自分の言葉で言い換える
   - 重要なポイントは「」や【】で強調（例: 「1667万円/月/名」、【重要】など）
   - 難しい言葉は噛み砕いて説明

3. 具体的な情報を優先
   - 数値（金額、日時、パーセンテージなど）は正確に抽出
   - 日時は「11/20（水）18:30～」のように具体的に記載
   - 場所や人名も議事録に記載されている通りに伝える

4. 複数の関連情報がある場合
   - 最も質問に近い情報をメインで回答
   - 関連する情報があれば【関連情報】として追記

5. 参照URL
   - 必ず最後に「📎 参考:」として、該当する議事録のレコードURLを含める
   - Markdown記法（[テキスト](URL)）は使わず、URLをそのまま記載する

【良い回答例：具体的な質問】
質問: "毎月の売り上げ目標は？"
回答:
毎月の売り上げ目標は「1667万円/月/名」ですよ！💡
この目標達成に向けて、みんなで頑張りましょう。

📎 参考: https://eu-plan.cybozu.com/k/117/show#record=379

【NGルール】
❌ 社名誤記（「ユウプラン」）→ 正しくは「U'plan」
❌ 「総務に聞いて」「〜さんに確認して」などの丸投げ表現 → 自己解決を促す言い回しに
❌ 「**」記法の使用（**支払時期**、**契約書**など）→ 必ず「」や【】を使用
❌ 数値や日時の省略 → 議事録に記載されている通りに正確に伝える

【回答を生成してください】`;

  const result = await model.generateContent(prompt);
  const response = result.response;
  const text = response.text();

  console.log('✅ Gemini回答生成完了');
  return text;
}

// --- GETリクエスト: ブラウザでテスト可能 ---
export async function GET(request: Request) {
  try {
    // URLパラメータから質問を取得
    // 例: http://localhost:3000/api/chatwork-test?q=有給休暇の申請方法
    const { searchParams } = new URL(request.url);
    const question = searchParams.get('q');

    if (!question) {
      return NextResponse.json({
        error: '質問パラメータ（q）が必要です',
        usage: 'GET /api/chatwork-test?q=有給休暇の申請方法'
      }, { status: 400 });
    }

    console.log('📝 テスト質問:', question);

    // 1. Kintone APIから全データを取得（キーワードフィルタリング付き）
    const startFetch = Date.now();
    const allData = await fetchAllDataFromKintone(question);
    const fetchTime = Date.now() - startFetch;

    // 2. Geminiで回答生成
    const startGemini = Date.now();
    const answer = await generateAnswerWithGemini(question, allData);
    const geminiTime = Date.now() - startGemini;

    const totalTime = Date.now() - startFetch;

    // 3. 結果を返す
    return NextResponse.json({
      success: true,
      question,
      answer,
      performance: {
        kintone_fetch_ms: fetchTime,
        gemini_generation_ms: geminiTime,
        total_ms: totalTime,
        total_seconds: (totalTime / 1000).toFixed(2)
      },
      metadata: {
        data_length: allData.length,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ テストエンドポイントエラー:', error);
    return NextResponse.json({
      error: 'テスト実行エラー',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// --- POSTリクエスト: cURLやPostmanでテスト可能 ---
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const question = body.question;

    if (!question) {
      return NextResponse.json({
        error: '質問（question）が必要です',
        usage: 'POST /api/chatwork-test with JSON body: {"question": "有給休暇の申請方法"}'
      }, { status: 400 });
    }

    console.log('📝 テスト質問:', question);

    // 1. Kintone APIから全データを取得（キーワードフィルタリング付き）
    const startFetch = Date.now();
    const allData = await fetchAllDataFromKintone(question);
    const fetchTime = Date.now() - startFetch;

    // 2. Geminiで回答生成
    const startGemini = Date.now();
    const answer = await generateAnswerWithGemini(question, allData);
    const geminiTime = Date.now() - startGemini;

    const totalTime = Date.now() - startFetch;

    // 3. 結果を返す
    return NextResponse.json({
      success: true,
      question,
      answer,
      performance: {
        kintone_fetch_ms: fetchTime,
        gemini_generation_ms: geminiTime,
        total_ms: totalTime,
        total_seconds: (totalTime / 1000).toFixed(2)
      },
      metadata: {
        data_length: allData.length,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ テストエンドポイントエラー:', error);
    return NextResponse.json({
      error: 'テスト実行エラー',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
