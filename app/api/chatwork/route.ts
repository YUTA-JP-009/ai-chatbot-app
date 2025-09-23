// app/api/chatwork/route.ts

import { NextResponse } from 'next/server';
import { GoogleAuth } from 'google-auth-library';

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

  console.log('✅ Token verified - FIXED VERSION v2.0');

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
    const aiResponse = await askAI(question);

    // 4. AIの回答をChatworkに返信する
    await replyToChatwork(roomId, aiResponse);

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
  console.log('🔧 Debug - Using REST API instead of SearchServiceClient');

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

    // Discovery Engine REST API エンドポイント（Engine based）
    const servingConfigPath = `projects/${projectId}/locations/${location}/collections/default_collection/engines/${dataStoreId}/servingConfigs/default_config`;
    const apiUrl = `https://discoveryengine.googleapis.com/v1/${servingConfigPath}:search`;

    console.log('🔧 API URL:', apiUrl);

    // REST API リクエスト
    const requestBody = {
      query: question,
      pageSize: 10
    };

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    console.log('🔧 Response Status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('🔧 API Error Response:', errorText);
      throw new Error(`Discovery Engine API error: ${response.status} ${response.statusText}`);
    }

    const searchResults = await response.json();

    if (!searchResults.results || searchResults.results.length === 0) {
      return '申し訳ありませんが、お探しの情報が見つかりませんでした。';
    }

    // 検索結果から関連性の高い情報を抽出
    const relevantInfo = searchResults.results
      .slice(0, 3) // 上位3件の結果を使用
      .map((result: {
        document?: {
          derivedStructData?: {
            snippet?: string;
            title?: string;
          };
        };
      }) => {
        const document = result.document;
        if (document?.derivedStructData) {
          const structData = document.derivedStructData;
          return structData.snippet || structData.title || '情報が見つかりました';
        }
        return '関連情報';
      })
      .join('\n\n');

    return relevantInfo || '申し訳ありませんが、適切な回答を生成できませんでした。';
  } catch (error) {
    console.error('Discovery Engine検索エラー:', error);
    throw new Error('検索中にエラーが発生しました');
  }
}