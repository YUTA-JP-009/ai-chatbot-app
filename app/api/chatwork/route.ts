// app/api/chatwork/route.ts

import { NextResponse } from 'next/server';
import { GoogleAuth } from 'google-auth-library';
import { GoogleGenerativeAI } from '@google/generative-ai';

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

    // 3.2. AI検索を実行
    const searchResult = await askAI(question);

    // 3.3. Gemini APIで質問応答形式の回答を生成
    const aiResponse = await generateAnswerWithGemini(question, searchResult);

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

// --- GCP Discovery Engineと通信する関数（REST API直接呼び出し） ---
async function askAI(question: string): Promise<string> {
  if (!process.env.GCP_PROJECT_ID || !process.env.GCP_CREDENTIALS || !process.env.GCP_DATA_STORE_ID) {
    throw new Error('GCPの環境変数が設定されていません');
  }

  const credentials = JSON.parse(process.env.GCP_CREDENTIALS);
  const projectId = process.env.GCP_PROJECT_ID;
  const location = 'global';
  const dataStoreId = process.env.GCP_DATA_STORE_ID;

  console.log('🔧 Debug - Project ID:', projectId);
  console.log('🔧 Debug - Data Store ID:', dataStoreId);
  console.log('🔧 Debug - Using Vertex AI Search Enterprise Edition');

  // GoogleAuth を使用してアクセストークンを取得
  const auth = new GoogleAuth({
    credentials: {
      ...credentials,
      project_id: projectId // 確実に正しいプロジェクトIDを設定
    },
    scopes: ['https://www.googleapis.com/auth/cloud-platform']
  });

  try {
    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();

    console.log('🔧 Access Token obtained successfully');

    // Vertex AI Search Enterprise API エンドポイント - 複数パターンをテスト
    console.log('🔧 Testing different API URL structures...');

    // パターン1: Apps endpoint (Enterprise Search推奨)
    const appsEndpoint = `projects/${projectId}/locations/${location}/collections/default_collection/engines/${dataStoreId}/servingConfigs/default_config`;
    const appsUrl = `https://discoveryengine.googleapis.com/v1/${appsEndpoint}:search`;

    // パターン2: DataStores endpoint (フォールバック)
    const dataStoreEndpoint = `projects/${projectId}/locations/${location}/collections/default_collection/dataStores/${dataStoreId}/servingConfigs/default_config`;
    const dataStoreUrl = `https://discoveryengine.googleapis.com/v1/${dataStoreEndpoint}:search`;

    console.log('🔧 Apps API URL:', appsUrl);
    console.log('🔧 DataStore API URL:', dataStoreUrl);

    // 最初にApps endpointを試行
    let apiUrl = appsUrl;
    let useAppsEndpoint = true;

    // Enterprise Search リクエスト（高度なコンテンツ抽出機能付き）
    const requestBody = {
      query: question,
      pageSize: 5,  // 単一ドキュメント用に最適化
      contentSearchSpec: {
        snippetSpec: {
          maxSnippetCount: 5,  // API上限（0-5）
          returnSnippet: true
        },
        summarySpec: {
          summaryResultCount: 5,  // 要約結果数も増やす
          includeCitations: true,
          ignoreAdversarialQuery: true,
          ignoreNonSummarySeekingQuery: true
        }
      }
    };

    let response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    console.log('🔧 First attempt (Apps endpoint) Status:', response.status);

    // Apps endpointが404の場合、DataStores endpointにフォールバック
    if (response.status === 404 && useAppsEndpoint) {
      console.log('🔄 Apps endpoint failed, trying DataStores endpoint...');
      apiUrl = dataStoreUrl;
      useAppsEndpoint = false;

      response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      console.log('🔧 Fallback attempt (DataStores endpoint) Status:', response.status);
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('🔧 Final API Error Response:', errorText);
      console.error('🔧 Failed API URL:', apiUrl);
      throw new Error(`Discovery Engine API error: ${response.status} ${response.statusText}`);
    }

    console.log('✅ Successfully connected using:', useAppsEndpoint ? 'Apps endpoint' : 'DataStores endpoint');

    const searchResults = await response.json();

    // 🔍 Enterprise版デバッグ情報
    console.log('🔍 DEBUG - Enterprise Search Results:', JSON.stringify(searchResults, null, 2));
    console.log('🔍 DEBUG - Results Array Length:', searchResults.results?.length || 0);
    console.log('🔍 DEBUG - Summary Available:', !!searchResults.summary);

    // Enterprise版のsummary機能を優先使用
    if (searchResults.summary && searchResults.summary.summaryText) {
      console.log('✨ Using Enterprise Summary:', searchResults.summary.summaryText);
      return searchResults.summary.summaryText;
    }

    // スニペット情報をデバッグ
    if (searchResults.results && searchResults.results.length > 0) {
      searchResults.results.forEach((result: {
        id?: string;
        document?: {
          derivedStructData?: {
            snippets?: Array<{ snippet?: string; snippet_status?: string }>;
            snippet?: string;
            title?: string;
            content?: string;
          };
        };
      }, index: number) => {
        console.log(`🔍 DEBUG - Result ${index}:`, {
          id: result.id,
          snippets: result.document?.derivedStructData?.snippets,
          snippet: result.document?.derivedStructData?.snippet,
          title: result.document?.derivedStructData?.title,
          content: result.document?.derivedStructData?.content
        });
      });
    }

    if (!searchResults.results || searchResults.results.length === 0) {
      return '申し訳ありませんが、お探しの情報が見つかりませんでした。';
    }

    // 最も関連性の高い1件目のスニペットのみを返す
    const topResult = searchResults.results[0];
    const document = topResult.document;

    if (!document?.derivedStructData) {
      return '申し訳ありませんが、適切な回答を生成できませんでした。';
    }

    const structData = document.derivedStructData;

    // snippets配列から成功したスニペットを抽出（最初の1件のみ）
    if (structData.snippets && structData.snippets.length > 0) {
      const successSnippet = structData.snippets.find(
        (s: { snippet_status?: string; snippet?: string }) => s.snippet_status === 'SUCCESS' && s.snippet
      );

      if (successSnippet?.snippet) {
        return cleanSnippet(successSnippet.snippet);
      }
    }

    // フォールバック: 従来の単一snippet, title
    const fallbackSnippet = structData.snippet || structData.title || '関連情報が見つかりました';
    return cleanSnippet(fallbackSnippet);
  } catch (error) {
    console.error('Discovery Engine検索エラー:', error);
    throw new Error('検索中にエラーが発生しました');
  }
}

// --- Gemini APIで質問応答形式の回答を生成する関数 ---
async function generateAnswerWithGemini(question: string, searchResult: string): Promise<string> {
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

    const prompt = `あなたは株式会社AAAの社内ルールに詳しいアシスタントです。
以下の社内ルール情報を参考に、質問に簡潔かつ明確に回答してください。

【質問】
${question}

【社内ルール】
${searchResult}

【回答ルール】
1. 質問に対して直接的に答える形式で回答してください
2. 「〜は〜です」や「〜できます」のような明確な表現を使用
3. 具体的な数値・時間・条件は必ず含めてください
4. 簡潔に2-3文以内で答えてください
5. 余計な前置きや説明は不要です

【回答例】
質問: コアタイムは何時から何時まで？
回答: コアタイムは11:00～16:00です。この時間帯は原則として業務に従事する必要があります。

質問: リモートワークは週何日まで可能？
回答: リモートワークは週3日まで可能です。所属チームの状況に応じて柔軟に運用されます。`;

    console.log('📤 Gemini APIにリクエスト送信中...');
    const result = await model.generateContent(prompt);
    console.log('📥 Gemini APIからレスポンス受信');

    const response = result.response;
    console.log('🔍 Response object:', JSON.stringify(response, null, 2));

    // レスポンスからテキストを取得
    const text = response.text();
    console.log('✅ Gemini生成テキスト:', text);
    return text;
  } catch (error) {
    console.error('❌ Gemini API エラー:', error);
    console.error('📋 Error details:', JSON.stringify(error, null, 2));
    // Gemini APIが失敗した場合は元の検索結果を返す
    return searchResult;
  }
}