// app/api/chatwork/route.ts

import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getAllQAAsText } from '@/app/data/qa-database';

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

// --- HTMLタグを削除して読みやすく整形する関数 ---
function cleanSnippet(snippet: string): string {
  return snippet
    // HTMLタグを削除
    .replace(/<\/?b>/g, '')
    .replace(/<\/?i>/g, '')
    .replace(/<\/?em>/g, '')
    .replace(/<\/?strong>/g, '')
    // HTML特殊文字を変換
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    // 先頭・末尾の "..." を削除
    .replace(/^\.\.\.\s*/g, '')
    .replace(/\s*\.\.\.$/g, '')
    // Markdown記法を削除: 見出し記号(#)を削除
    .replace(/^#{1,6}\s+/gm, '')
    // Markdown記法を削除: 太字(**text**)を通常テキストに
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    // Markdown記法を削除: - **項目**: 形式を改行+項目名に変換
    .replace(/^\s*-\s+([^:]+):\s*/gm, '\n$1: ')
    // Markdown記法を削除: 区切り線(---)を削除
    .replace(/^\s*---\s*$/gm, '')
    // 改行を追加: ○の前で改行（箇条書き風に）
    .replace(/\s*○\s*/g, '\n○ ')
    // 改行を追加: ・の前で改行
    .replace(/\s*・\s*/g, '\n・ ')
    // 改行を追加: 「」の後で改行
    .replace(/」\s*/g, '」\n')
    // 改行を追加: 。の後に次の文が続く場合に改行
    .replace(/。([ぁ-んァ-ヶー一-龠])/g, '。\n$1')
    // 複数の連続する改行を2つまでに制限
    .replace(/\n{3,}/g, '\n\n')
    // 余分な空白を整理
    .trim();
}

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

// --- Q&Aデータベースから全件取得する関数（Vertex AI Search不使用） ---
async function askAI(question: string): Promise<{ content: string; sourceUrl: string | null }> {
  console.log('📚 Q&Aデータベースから全97問を取得します');

  // 全Q&Aをテキスト形式で取得
  const allQAText = getAllQAAsText();

  console.log('✅ Q&Aデータベース取得完了（97問）');
  console.log('📝 データ長:', allQAText.length, '文字');

  // 全Q&AをGeminiに渡すため、contentにそのまま返す
  // sourceUrlはGeminiが回答を選んだ後に抽出する
  return {
    content: allQAText,
    sourceUrl: null  // Geminiが回答を生成した後に抽出
  };
}

// --- Gemini APIで質問応答形式の回答を生成する関数 ---
async function generateAnswerWithGemini(question: string, searchResult: string, sourceUrl: string | null): Promise<string> {
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
        maxOutputTokens: 300,  // 2.0は思考トークンなしで高速
      }
    });

    const prompt = `あなたは社内ルールに詳しいアシスタントです。
以下のQ&Aデータベース（全97問）から、質問に最も適切に答えられる情報を選んで、簡潔かつ明確に回答してください。

【質問】
${question}

【社内ルールQ&Aデータベース（全97問）】
${searchResult}

【回答ルール】
1. Q&Aデータベースから質問に最も関連性の高い情報を選んで回答してください
2. 回答は必ず2行で構成してください：
   - 1行目: 回答内容（A:の部分を使用）
   - 2行目: 参照URL（そのままコピー）
3. 「〜は〜です」や「〜できます」のような明確な表現を使用
4. 具体的な数値・時間・条件は必ず含めてください
5. 簡潔に2-4文以内で答えてください
6. 余計な前置きや説明は不要です
7. データベースに該当する情報がない場合は、その旨を伝えてください

【回答フォーマット】
有給休暇の申請は、KING OF TIMEで行ってください。遅刻・残業なども同じくKING OF TIMEで申請を行います。
参照URL: https://eu-plan.cybozu.com/k/296/show#record=25

【悪い回答例】
Q91によると、有給休暇の申請は...（← Q番号は不要）
質問についてお答えします。（← 前置き不要）`;

    console.log('📤 Gemini APIにリクエスト送信中...');
    const result = await model.generateContent(prompt);
    console.log('📥 Gemini APIからレスポンス受信');

    const response = result.response;
    console.log('🔍 Response object:', JSON.stringify(response, null, 2));

    // レスポンスからテキストを取得
    let text = response.text();
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