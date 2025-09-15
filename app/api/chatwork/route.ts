// app/api/chatwork/route.ts

import { NextResponse } from 'next/server';
import { VertexAI } from '@google-cloud/vertexai';

// ----------------------------------------------------------------
// メインの処理：ChatworkからのPOSTリクエストを受け取る
// ----------------------------------------------------------------
export async function POST(request: Request) {
  // --- 1. セキュリティチェック ---
  // Chatworkからの正当なリクエストか検証する
  const chatworkToken = request.headers.get('X-ChatWorkWebhookToken');
  if (chatworkToken !== process.env.CHATWORK_WEBHOOK_TOKEN) {
    // トークンが一致しない場合は、403 Forbiddenエラーを返す
    return new NextResponse('Forbidden', { status: 403 });
  }

  // --- 2. Chatworkからのメッセージを取得 ---
  const body = await request.json();
  const userMessage = body.webhook_event.body;

  // メンションなどを除外した、純粋な質問文だけを抽出（簡易的な処理）
  const question = userMessage.replace(/\[To:\d+\]\n/g, '').trim();

  // --- 3. GCPのAIに質問を投げる ---
  try {
    const aiResponse = await askAI(question);

    // --- 4. Chatworkに返信する（今回はまず、コンソールに結果表示） ---
    // 本来はこのAIの回答をChatwork APIを使って返信する
    console.log('AIからの回答:', aiResponse);

    // Chatworkには、まず「受け取ったよ」という合図の200 OKを返す
    return NextResponse.json({ message: 'OK' });

  } catch (error) {
    console.error('AIへの問い合わせ中にエラーが発生しました:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// ----------------------------------------------------------------
// GCP Vertex AIと通信する関数
// ----------------------------------------------------------------
async function askAI(question: string): Promise<string> {
  // --- Vercelの環境変数から認証情報を読み込む ---
  if (!process.env.GCP_PROJECT_ID || !process.env.GCP_CREDENTIALS) {
    throw new Error('GCPの環境変数が設定されていません');
  }

  const credentials = JSON.parse(process.env.GCP_CREDENTIALS);

  // --- VertexAIクライアントの初期化 ---
  const vertexAI = new VertexAI({
    project: process.env.GCP_PROJECT_ID,
    location: 'asia-northeast1', // 東京リージョン
    credentials,
  });

  // --- 使用するAIモデルを指定 ---
  const model = vertexAI.getGenerativeModel({
    model: 'gemini-1.5-flash-001', // 高速なモデル
  });

  // --- AIに質問を送信し、回答を待つ ---
  const result = await model.generateContent(question);
  const responseText = result.response.candidates?.[0]?.content.parts[0]?.text || '';

  return responseText;
}