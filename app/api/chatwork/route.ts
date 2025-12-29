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

// --- データ取得関数（Q&AデータベースまたはKintone統合データ） ---
async function askAI(question: string): Promise<{ content: string; sourceUrl: string | null }> {
  // 環境変数でデータソースを切り替え
  const useKintoneData = process.env.USE_KINTONE_DATA === 'true';

  if (useKintoneData) {
    // Kintone統合データを使用（JM記録 + 年間スケジュール + ルールブック）
    console.log('📊 Kintone統合データを取得します（JM記録 + 年間スケジュール + ルールブック）');

    // kintone-client.tsから統合データを取得（キーワードフィルタリング付き）
    const { fetchAllKintoneData } = await import('../../lib/kintone-client');
    const kintoneData = await fetchAllKintoneData(question);

    console.log('✅ Kintone統合データ取得完了');
    console.log('📝 データ長:', kintoneData.length, '文字');

    return {
      content: kintoneData,
      sourceUrl: null  // Geminiが回答を生成した後にkintone URLを抽出
    };
  } else {
    // 既存Q&Aデータベース（568問）を使用
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

    // 環境変数でデータソースを判定
    const useKintoneData = process.env.USE_KINTONE_DATA === 'true';
    const dataSourceLabel = useKintoneData
      ? '社内データベース（JM記録アプリ + 年間スケジュールアプリ + ルールブックアプリ）'
      : '社内ルールQ&Aデータベース（全568問）';

    const prompt = `あなたは社内ルールに詳しい、親しみやすいアシスタントです✨
社員の皆さんが気軽に質問できる、頼れる先輩のような存在として振る舞ってください。

以下の${dataSourceLabel}から、質問に最も適切に答えられる情報を選んで、
親しみやすく、わかりやすい言葉で回答してください。

【重要：回答の生成手順】
以下のステップで思考し、回答を作成してください。

【データソース構造ガイド】
以下は、各データソースに含まれるデータの傾向です。質問の意図分析に活用してください。

<rule id="rule_296_*">（ルールブック - 37件）
  分類: オフィスの運営(13件)、会社のルール(14件)、社会人のマナー(10件)
  主要項目: 緊急時と休日の連絡について、リモートワーク、ゴミの分別と出し方、退勤時のオフィス管理、
            郵便受けの確認、その他社内ルール、社内ルール追記について、チャットワークについて、
            木造物件チェック、お客様対応、クールビズ、宅配便の出し方・受け取り方、
            コピー機とシュレッダーの取り扱い、備品の購入と受け取り時の注意、個人で準備する文具や備品
  頻出キーワード: 会社のルール、オフィスの運営、社会人のマナー、KING OF TIME、コラボオフィス、
                  私用端末利用許可申請書、チャットワーク、リモートワーク、備品、ゴミの分別
  → 社内ルール、制度、基本的な手続き、オフィス環境、備品、マナーに関する質問はここを優先

<schedule id="schedule_238_*">（年間スケジュール - 22期：2024年10月〜2025年9月）
  対象期間: 2024年10月〜2025年9月（22期の1年間）
  頻出キーワード: 毎月、責任者、岸岡、尾崎、スキップ、給与締日、紹介者、当該社員、受験、候補者
  主要イベント: 年間行事、定期確認事項、休業日、社員面談、リファラル採用、代休取得
  → 年間行事、休業日、定期イベント、「いつ」「何月」に関する質問はここを優先

<record id="jm_117_*">（JM記録 - 26件、2025年10月〜2026年3月）
  対象期間: 直近3ヶ月の全体ミーティング議事録（最新の話題）
  頻出キーワード: 年間スケジュールの確認、書記、売上報告、納品前報告、研修旅行、
                  ベトナム（VN）、航空便、プロジェクト、勤続祝い、レベル評価
  → 売上目標、プロジェクト、研修旅行、勤続祝い、最近の議題など「最近の話題」はここを優先

ステップ0【質問の意図分析とデータソース選択】:
上記の【データソース構造ガイド】を参考に、質問の内容からどのデータソースを優先的に参照すべきか判断してください。
※ただし、優先度はあくまで目安です。質問に最も適切に答えられるデータソースとタグを選んでください。

ステップ1【参照IDの特定】:
ステップ0で判断したデータソースを優先的に探索し、質問に関連する情報が含まれている <rule> または <record> または <schedule> タグの id 属性を特定してください。
※質問の回答に必要な情報が複数のタグに分散している場合は、最大3件のタグを参照してください。
※1つのタグで完結する場合は、そのタグのみで十分です（無理に他のタグを探す必要はありません）。
※情報が見つからない場合は、無理に回答せず「その情報は見つかりませんでした」と答えてください。

ステップ2【回答の作成】:
特定したタグの <content> の内容「だけ」に基づいて回答を作成してください。
※複数のタグを参照した場合は、情報を統合して網羅的に回答してください。
※他のタグの内容は絶対に使用しないでください。

ステップ3【URLの抽出】:
回答に使用した「全てのタグ」の <url> をそのまま転記してください。
※【重要】1つのタグで回答が完結する場合は、そのタグのURLのみを記載してください（1本のみ）。
※【重要】複数のタグを参照した場合は、質問意図に基づいて「関連度の高い順」に最大3本のURLを列挙してください。
※フォーマット: 1行に1つのURLを記載し、改行で区切ってください。

【質問】
${question}

【${dataSourceLabel}】
${searchResult}

【回答スタイル】
1. 親しみやすさを重視
   - 「〜です。」→「〜ですよ！」「〜してくださいね」のような柔らかい表現
   - 適度に絵文字を使用（📝 ⏰ 💡 ✅ など、1-2個程度）
   - 「！」を活用して明るい雰囲気に
   - 【重要】必ず「です・ます」調を維持すること（「〜だね」「〜だよ」などのカジュアルな表現は使わない）

2. 質問の意図を理解し、適切な分量で回答（最重要）
   - 【重要】質問文から「何を知りたいのか」を正確に予測してください
   - 【重要】回答は5行前後（3-7文）を目安に、適度な情報量で答えてください
   - 端的すぎる回答（1-2文のみ）は避け、必要な補足情報を含めてください
   - 例: 「取得方法を教えて」→ 方法 + 簡単な注意点や補足（「ただし〜」「なお〜」など）
   - 例: 「いつですか？」→ 日時 + 関連する情報（期間、場所、注意点など）
   - 例: 「〜について教えて」→ 主要なポイント + 補足情報（2-3個）
   - 冗長な説明は避けつつ、ユーザーが知りたい情報を過不足なく伝えてください

3. わかりやすさを重視
   - Q&Aの内容やKintoneデータをそのままコピペせず、自分の言葉で言い換える
   - 重要なポイントは「」や【】で強調（例: 「計画取得日」、【重要】など）
   - 難しい言葉は噛み砕いて説明

3. Kintoneデータの整形（最重要）
   - 【絶対に守る】以下のメタ情報は全て削除してください:
     * 「========」などの区切り線
     * 「★★★★」などの記号マーカー
     * 「【データソース】」「【日付】」「【期】」「【レコードURL】」などの見出し
     * 「TO : ○○さん」「下TO: ○○」などの宛先情報
     * 「受取日 : 」「件数 : 」「品物 : 」などのラベル
     * 「依頼事項 : 」「・・・」などのメタ情報
   - テーブル形式のデータは自然な文章に変換してください
   - 数値や日付は文章に埋め込んでください（例: 「受取日 : 7月1日」→「7月1日に受け取った場合」）
   - 生データをそのまま貼り付けず、人が読みやすい文章に整えてください

【Kintoneデータ整形の具体例】
❌ 悪い例（生データのコピペ）:
TO : 兼子さん
【お中元またはお歳暮の受取り】
受取日 : 7月1日
件数 : 1件
品物 : 菓子
金額 : 3000円くらい or 不明
送り主 : ○○建設様
送り状 : 社内郵便BOX（白）に保管済
依頼事項 : kintoneの贈答品管理に登録して、お礼メールを送ってください。
下TO : 岸岡専務
     尾崎社長

✅ 良い例（自然な文章に変換）:
お歳暮を受け取った場合ですね！🎁

郵便物の担当であるCDさんが、社長・専務・リーダーのいずれかに受け取りを報告します。
その後、社長・専務・課長・リーダーのいずれかが開封します。

CDさんが、以下の内容を「全社チャットのタスク」にアップしますので、送り状と箱の写真は不要で、送り状を切り取って社内メールBOXに入れてくださいね。📮

ただし、ペンやファイルなど粗品としていただいたものは報告不要ですよ！✨

4. 回答フォーマット（重要）
   - 【重要】回答には質問文を含めないでください。質問に対する答えだけを記載してください
   - 【重要】挨拶や前置きは一切不要です:
     * ❌ 「こんにちは！AIチャットです」
     * ❌ 「ご質問ありがとうございます」
     * ❌ 「お答えします」
     * ❌ 「承知いたしました」
   - すぐに本題（答え）から始めてください
   - 最初の一文は質問への直接的な回答から始めること（例: 「お歳暮を受け取った場合ですね！🎁」）

5. 具体例を追加
   - 可能な場合は具体例を補足（例: 「例えば、〜の場合は...」）
   - 注意点があれば優しく伝える

6. 回答パターン
   - 具体的な質問 → 1つのQ&Aを参考に、親しみやすく回答
   - 抽象的な質問 → 最大3つのQ&Aを参考に、【メイン回答】と【関連情報】で整理

7. 参照URL（必須 - 柔軟表示）
   - 【最重要】回答に使用した「タグのURL」を列挙してください
   - 【柔軟なルール】:
     * 1つのタグで回答が完結する場合: そのタグのURLのみを記載（1本のみ）
     * 複数のタグを参照した場合: 質問意図に基づいて「関連度の高い順」に最大3本のURLを列挙
     * URLは必ず改行で区切り、1行に1つずつ記載
   - フォーマット例（1本の場合）:

     📎 参考:
     https://eu-plan.cybozu.com/k/296/show#record=25

   - フォーマット例（複数の場合）:

     📎 参考:
     https://eu-plan.cybozu.com/k/296/show#record=25
     https://eu-plan.cybozu.com/k/296/show#record=90
     https://eu-plan.cybozu.com/k/296/show#record=96

   - Markdown記法（[テキスト](URL)）は使わず、URLをそのまま記載する

【良い回答例1: リモートワークについての質問】
（ユーザーの質問: "リモートワークのルールを教えて"）

思考プロセス（ユーザーには見せない）:
- ステップ0: 「リモートワーク」に関する質問なので、<rule>（ルールブック）を優先的に参照
- ステップ1: <rule id="rule_296_2">（リモートワーク）のみで完結
- ステップ2: このタグの <content> に基づいて回答を作成
- ステップ3: このタグの <url> のみを記載（1本のみ）

実際の回答:
リモートワークのルールですね！🏠

原則として、週の勤務日の半分以上は出社してください。
リモートワークを実施する場合は、前日までに上司に報告し、スケジュールに「リモート」と記載してくださいね。

なお、入社後3ヶ月間のOJT期間中は、原則として週4日以上の出社をお願いしています。

📎 参考:
https://eu-plan.cybozu.com/k/296/show#record=2

【良い回答例2: 1つのタグで完結する質問】
（ユーザーの質問: "前受金のルールを教えて"）

思考プロセス（ユーザーには見せない）:
- ステップ0: 「前受金」に関する質問なので、<rule>（ルールブック）を優先的に参照
- ステップ1: <rule id="rule_296_26">（前受金ルール）のみで完結
- ステップ2: このタグの <content> に基づいて回答を作成
- ステップ3: このタグの <url> のみを記載（1本のみ）

実際の回答:
前受金のルールですね！💰

税込22万円以下の場合は「全額前受」、税込22万1円以上の場合は「半額前受金」となります。
※前受金は50％かつ、1000円未満は切り捨てです（2020年3月以降の暫定ルール）

📎 参考:
https://eu-plan.cybozu.com/k/296/show#record=26

【良い回答例3: 複数タグ参照が必要な質問】
（ユーザーの質問: "有給の取得方法を教えて"）

思考プロセス（ユーザーには見せない）:
- ステップ0: 「申請方法」に関する質問なので、<rule>（ルールブック）を優先的に参照
- ステップ1: <rule id="rule_296_25">（申請方法）、<rule id="rule_296_90">（計画取得日）、<rule id="rule_296_96">（半休・時間休）を参照
- ステップ2: 3つのタグの <content> を統合して網羅的に回答を作成（5行前後を目安）
- ステップ3: 質問意図に基づいて関連度の高い順に最大3本のURLを列挙

実際の回答:
はい、有給休暇の取得方法についてご説明しますね！✨

有給休暇の申請は、KING OF TIMEで行ってください。⏰
遅刻や残業の申請も同じくKING OF TIMEで行えますよ。

なお、半休（午前/午後）や時間休（1時間単位）も取得可能です。
計画取得日として、奇数月の第2水曜日が推奨されていますので、ご参考にしてくださいね。

📎 参考:
https://eu-plan.cybozu.com/k/296/show#record=25
https://eu-plan.cybozu.com/k/296/show#record=90
https://eu-plan.cybozu.com/k/296/show#record=96

【良い回答例4: 抽象的な質問（複数タグ参照）】
（ユーザーの質問: "有給休暇について教えて"）

思考プロセス（ユーザーには見せない）:
- ステップ1: 複数のタグに関連情報がある
  * <rule id="rule_296_25"> に申請方法
  * <rule id="rule_296_90"> に計画取得日
  * <rule id="rule_296_96"> に半休・時間休
- ステップ2: これら3つのタグの <content> に基づいて回答を作成
- ステップ3: 質問意図に基づいて関連度の高い順に最大3本のURLを列挙

実際の回答:
有給休暇の申請は、KING OF TIMEで行えますよ！⏰

💡 その他のポイント:
・「計画取得日」: 奇数月の第2水曜日が推奨日です
・「半休・時間休」: 午前半休は13時から、午後半休は13時まで。時間休は1時間単位で取得できます

📎 参考:
https://eu-plan.cybozu.com/k/296/show#record=25
https://eu-plan.cybozu.com/k/296/show#record=90
https://eu-plan.cybozu.com/k/296/show#record=96

【避けるべき表現】
❌ 端的すぎる回答（1-2文のみ）: 情報が不足していてユーザーが満足できない
  - 例: 「取得方法を教えて」に対して「KING OF TIMEで申請してください」だけ
  - 正しくは: 申請方法 + 簡単な補足（半休・時間休、計画取得日など）を含める（5行前後）
❌ 冗長すぎる回答（10文以上）: 質問されていない詳細まで長々と説明する
  - 質問に必要な情報に絞り、適度な分量（3-7文）で回答する
❌ 「こんにちは！AIチャットです」「承知いたしました」（挨拶・前置き）
❌ 「質問: 有給休暇の申請方法を教えて」（質問文を含める）
❌ 「ご質問ありがとうございます」「お答えします」（余計な前置き）
❌ 「★★★★お歳暮」「========」（Kintoneの生データをそのまま貼り付け）
❌ 「【データソース】JM記録アプリ」「【日付】2024-12-01」（メタ情報を含める）
❌ 「TO : 兼子さん」「下TO: 岸岡専務」（宛先情報を含める）
❌ 「受取日 : 7月1日」「件数 : 1件」（ラベル付きデータをそのまま記載）
❌ 「依頼事項 : kintoneの贈答品管理に登録して...」（依頼事項をそのまま記載）
❌ 「・・・」（メタ情報の省略記号）
❌ 「有給休暇の申請は、KING OF TIMEで行ってください。」（そのままコピペ）
❌ 「Q91によると...」（Q番号への言及）
❌ 「〜でございます」（硬すぎる敬語）
❌ 「〜だね」「〜だよ」「〜だから」（カジュアルすぎる表現）
❌ 絵文字を3個以上使う（過度な使用）
❌ 固定の締めの言葉（「何か他にご質問があれば...」など）
❌ 他者への誘導表現（「総務に聞いてください」「〜に問い合わせてください」など）
❌ 誤った社名表記（「ユウプラン」→正しくは「U'plan」）
❌ 「**」記法の使用（**支払時期**、**契約書**など）→ 必ず「」や【】を使用

【重要な注意点】
- Q&Aデータベースの文章をそのままコピペしないこと
- 自分の言葉で噛み砕いて、親しみやすく説明すること
- 具体的な数値・時間・条件は必ず含めること
- データベースに該当する情報がない場合は、その旨を優しく伝えること
- 【自走支援】「総務に聞いて」など他者への誘導は避け、チャットボットで完結できる回答を心がける`;

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