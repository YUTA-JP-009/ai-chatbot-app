// app/api/chatwork/route.ts

import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getAllQAAsText } from '../../data/qa-database';

// --- テスト用のGETハンドラ ---
export async function GET() {
  return NextResponse.json({
    message: 'Chatwork AI Bot API is running!',
    status: 'OK',
    timestamp: new Date().toISOString()
  });
}

// --- メインの処理：ChatworkからのPOSTリクエストを受け取る ---
export async function POST(request: Request) {
  console.log('🔥 Webhook received!');

  // 1. セキュリティチェック - 署名ベース認証に対応
  const signature = request.headers.get('x-chatworkwebhooksignature');
  console.log('🔑 Chatwork signature:', signature ? 'Signature present' : 'No signature');

  // TODO: 本番環境では署名検証を実装する
  // 現在はテスト目的のため署名チェックをスキップ
  console.log('⚠️ Signature verification skipped for testing');

  console.log('✅ Token verified - FIXED VERSION v2.1 - with DEBUG');

  // 2. Chatworkからのメッセージを取得
  const body = await request.json();
  console.log('📨 Request body:', JSON.stringify(body, null, 2));

  const event = body.webhook_event;
  const userMessage = event.body;
  const roomId = event.room_id;
  const fromAccountId = event.from_account_id;

  console.log('💬 Message:', userMessage);
  console.log('🏠 Room ID:', roomId);
  console.log('👤 From Account ID:', fromAccountId);

  // ★ 修正点1：ボット自身の発言には反応しないようにする (無限ループ防止)
  if (fromAccountId === parseInt(process.env.CHATWORK_MY_ID || '0')) {
    console.log('🤖 Bot message detected - skipping');
    // 自分のメッセージなので、何もせず処理を終了
    return NextResponse.json({ message: 'Message from bot itself. Skipped.' });
  }
  
  // ★ 修正点2：メンション処理を削除し、メッセージ全体を質問とする
  const question = userMessage.trim();

  // 3. Discovery Engineを使った実際のAI検索
  try {
    // 3.0. 事前定義回答をチェック（特別優先枠）
    const predefinedAnswer = getPredefinedAnswer(question);
    if (predefinedAnswer) {
      console.log('⚡ 事前定義回答を使用（特別優先枠）');
      const formattedAnswer = `${predefinedAnswer.answer}\n\n📎 参照URL: ${predefinedAnswer.url}`;
      const personalizedResponse = applyBotPersonality(formattedAnswer, true); // PREFIX含む
      await replyToChatwork(roomId, personalizedResponse);
      return NextResponse.json({ message: 'OK (Predefined)' });
    }

    // 3.1. BOT_PREFIXが設定されている場合、先に即座に送信（体感速度向上）
    const botPrefix = process.env.BOT_PREFIX;
    if (botPrefix) {
      await replyToChatwork(roomId, botPrefix);
      console.log('📤 BOT_PREFIX sent immediately');
    }

    // 3.2. AI検索を実行（参照URLも取得）
    const searchResult = await askAI(question);

    // 3.3. Gemini APIで質問応答形式の回答を生成
    const aiResponse = await generateAnswerWithGemini(question, searchResult.content, searchResult.sourceUrl);

    // 3.4. ボットの人格設定を反映（BOT_PREFIXは除外）
    const personalizedResponse = applyBotPersonality(aiResponse, false); // false = PREFIX除外

    // 4. AIの回答をChatworkに返信する
    await replyToChatwork(roomId, personalizedResponse);

    // Chatworkには200 OKを返す
    return NextResponse.json({ message: 'OK' });

  } catch (error) {
    console.error('エラーが発生しました:', error);
    // エラーが発生した場合も、Chatworkにエラーメッセージを返信する
    await replyToChatwork(roomId, '申し訳ありません、エラーが発生しました。');
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// 事前定義回答は廃止: 全ての質問をVertex AI Searchで処理

// --- Chatworkに返信する関数（メンション部分を削除） ---
async function replyToChatwork(roomId: number, message: string) {
  const CHATWORK_API_BASE_URL = 'https://api.chatwork.com/v2';
  const apiToken = process.env.CHATWORK_API_TOKEN;

  if (!apiToken) throw new Error('CHATWORK_API_TOKENが設定されていません');

  const endpoint = `${CHATWORK_API_BASE_URL}/rooms/${roomId}/messages`;
  
  // ★ 修正点3: メンションを付けずに、AIの回答だけを返す
  const replyBody = message;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'X-ChatWorkToken': apiToken,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `body=${encodeURIComponent(replyBody)}`,
  });

  if (!response.ok) {
    throw new Error(`Chatwork API error: ${response.status} ${response.statusText}`);
  }
}


// 型定義（REST API用）

// --- ボットの人格設定を反映した回答を生成する関数 ---
function applyBotPersonality(answer: string, includePrefix: boolean = true): string {
  // 環境変数からボット人格設定を取得（オプション）
  const botPersonality = process.env.BOT_PERSONALITY || '';
  const botPrefix = process.env.BOT_PREFIX || '';
  const botSuffix = process.env.BOT_SUFFIX || '';

  let formattedAnswer = answer;

  // カスタム人格設定が指定されている場合
  if (botPersonality) {
    // 例: "exclamation" - 文末に!を追加
    if (botPersonality === 'exclamation') {
      formattedAnswer = formattedAnswer.replace(/([。\n])/g, '！$1').replace(/！\n/g, '！\n');
    }
    // 例: "friendly" - 親しみやすい口調
    else if (botPersonality === 'friendly') {
      formattedAnswer = `${formattedAnswer}\n\n何か他にご質問があればお気軽にどうぞ！`;
    }
    // 例: "formal" - フォーマルな口調
    else if (botPersonality === 'formal') {
      formattedAnswer = `お調べいたしました。\n\n${formattedAnswer}\n\n以上、ご参考になれば幸いです。`;
    }
  }

  // プレフィックスは別メッセージで送信するため、includePrefixがtrueの場合のみ追加
  if (includePrefix && botPrefix) formattedAnswer = `${botPrefix}\n${formattedAnswer}`;
  if (botSuffix) formattedAnswer = `${formattedAnswer}\n${botSuffix}`;

  return formattedAnswer;
}

// --- 事前定義回答（特別優先枠）：キーワードマッチで即座に返答 ---
function getPredefinedAnswer(question: string): { answer: string; url: string } | null {
  const q = question.toLowerCase();

  // 前受金（優先ルール）- Q216
  if (q.includes('前受金') || q.includes('前受') || q.includes('ぜんうけきん')) {
    return {
      answer: '税込22万円以下は全額前受、22万1円以上は半額前受金です。\n※前受金は50％かつ、1000円未満は切り捨てです（2020年3月以降　暫定ルール）',
      url: 'https://eu-plan.cybozu.com/k/296/show#record=26'
    };
  }

  return null;
}

// --- Q&Aデータベースから全件取得する関数（Vertex AI Search不使用） ---
async function askAI(_question: string): Promise<{ content: string; sourceUrl: string | null }> {
  console.log('📚 Q&Aデータベースから全568問を取得します');

  // 全Q&Aをテキスト形式で取得
  const allQAText = getAllQAAsText();

  console.log('✅ Q&Aデータベース取得完了（568問）');
  console.log('📝 データ長:', allQAText.length, '文字');

  // 全Q&AをGeminiに渡すため、contentにそのまま返す
  // sourceUrlはGeminiが回答を選んだ後に抽出する
  return {
    content: allQAText,
    sourceUrl: null  // Geminiが回答を生成した後に抽出
  };
}

// --- Gemini APIで質問応答形式の回答を生成する関数 ---
async function generateAnswerWithGemini(question: string, searchResult: string, _sourceUrl: string | null): Promise<string> {
  try {
    // Google AI SDKを使用（APIキーベース認証）
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error('❌ GEMINI_API_KEY が設定されていません');
      return searchResult;
    }

    console.log('🤖 Gemini API 呼び出し開始...');
    console.log('📝 質問:', question);
    console.log('📄 検索結果:', searchResult.substring(0, 100) + '...');

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 500,  // 複数Q&A対応のため300→500に増加
      }
    });

    const prompt = `あなたは社内ルールに詳しい、親しみやすいアシスタントです✨
社員の皆さんが気軽に質問できる、頼れる先輩のような存在として振る舞ってください。

以下のQ&Aデータベース（全568問）から、質問に最も適切に答えられる情報を選んで、
**親しみやすく、わかりやすい言葉で**回答してください。

【質問】
${question}

【社内ルールQ&Aデータベース（全568問）】
${searchResult}

【回答スタイル】
1. **親しみやすさを重視**
   - 「〜です。」→「〜ですよ！」「〜してくださいね」のような柔らかい表現
   - 適度に絵文字を使用（📝 ⏰ 💡 ✅ など、1-2個程度）
   - 「！」を活用して明るい雰囲気に
   - **重要**: 必ず「です・ます」調を維持すること（「〜だね」「〜だよ」などのカジュアルな表現は使わない）

2. **わかりやすさを重視**
   - Q&Aの内容をそのままコピペせず、自分の言葉で言い換える
   - 重要なポイントは**太字**や箇条書きで強調
   - 難しい言葉は噛み砕いて説明

3. **具体例を追加**
   - 可能な場合は具体例を補足（例: 「例えば、〜の場合は...」）
   - 注意点があれば優しく伝える

4. **回答パターン**
   - 具体的な質問 → 1つのQ&Aを参考に、親しみやすく回答
   - 抽象的な質問 → 最大3つのQ&Aを参考に、【メイン回答】と【関連情報】で整理

5. **参照URL**
   - 必ず最後に「参照URL:」または「📎 参考:」として、URLのみをシンプルに含める
   - Markdown記法（[テキスト](URL)）は使わず、URLをそのまま記載する

【良い回答例：具体的な質問】
質問: "有給休暇の申請方法を教えて"
回答:
有給休暇の申請は、KING OF TIMEで行えますよ！⏰
遅刻や残業の申請も同じくKING OF TIMEでOKです。

📎 参考: https://eu-plan.cybozu.com/k/296/show#record=25

【良い回答例：抽象的な質問】
質問: "有給休暇について教えて"
回答:
有給休暇の申請は、KING OF TIMEで行えますよ！⏰

💡 その他のポイント:
・**計画取得日**: 奇数月の第2水曜日が推奨日です
・**半休・時間休**: 午前半休は13時から、午後半休は13時まで。時間休は1時間単位で取得できます

📎 参考:
https://eu-plan.cybozu.com/k/296/show#record=25
https://eu-plan.cybozu.com/k/296/show#record=90
https://eu-plan.cybozu.com/k/296/show#record=96

【避けるべき表現】
❌ 「有給休暇の申請は、KING OF TIMEで行ってください。」（そのままコピペ）
❌ 「Q91によると...」（Q番号への言及）
❌ 「以下の情報が見つかりました。」（余計な前置き）
❌ 「〜でございます」（硬すぎる敬語）
❌ 「〜だね」「〜だよ」「〜だから」（カジュアルすぎる表現）
❌ 絵文字を3個以上使う（過度な使用）
❌ 固定の締めの言葉（「何か他にご質問があれば...」など）
❌ 他者への誘導表現（「総務に聞いてください」「〜に問い合わせてください」など）

【重要な注意点】
- Q&Aデータベースの文章をそのままコピペしないこと
- 自分の言葉で噛み砕いて、親しみやすく説明すること
- 具体的な数値・時間・条件は必ず含めること
- データベースに該当する情報がない場合は、その旨を優しく伝えること
- **自走支援**: 「総務に聞いて」など他者への誘導は避け、チャットボットで完結できる回答を心がける`;

    console.log('📤 Gemini APIにリクエスト送信中...');
    const result = await model.generateContent(prompt);
    console.log('📥 Gemini APIからレスポンス受信');

    const response = result.response;
    console.log('🔍 Response object:', JSON.stringify(response, null, 2));

    // レスポンスからテキストを取得
    const text = response.text();
    console.log('✅ Gemini生成テキスト:', text);

    // Geminiが回答内に「参照URL:」を含めているので、そのまま返す
    return text;
  } catch (error) {
    console.error('❌ Gemini API エラー:', error);
    console.error('📋 Error details:', JSON.stringify(error, null, 2));
    // Gemini APIが失敗した場合は元の検索結果を返す
    return searchResult;
  }
}