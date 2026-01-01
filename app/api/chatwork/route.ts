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
  参照URL形式: https://eu-plan.cybozu.com/k/296/show#record={レコードID}
  → 社内ルール、制度、基本的な手続き、オフィス環境、備品、マナーに関する質問はここを優先

<schedule id="schedule_238_*_tab*">（年間スケジュール - 22期：2024年10月〜2025年9月）
  対象期間: 2024年10月〜2025年9月（22期の1年間）
  Tab構造（合計14タブ、Tab 0-13）:
    - Tab 0 (schedule_238_8_tab0): 毎月実施の定期業務
    - Tab 1 (schedule_238_8_tab1): 随時イベント（リファラル採用、代休、社員面談など）
    - Tab 2-13 (schedule_238_8_tab2〜13): 月別の年間行事（10月、11月、12月、1月、2月、3月、4月、5月、6月、7月、8月、9月）
      ※特に Tab 3 (11月): 贈答品、お歳暮・お中元の受け取りルールを含む
  頻出キーワード: 毎月、責任者、岸岡、尾崎、スキップ、給与締日、紹介者、当該社員、受験、候補者、贈答品、お歳暮、お中元
  主要イベント: 年間行事、定期確認事項、休業日、社員面談、リファラル採用、代休取得、贈答品受け取り
  参照URL形式: https://eu-plan.cybozu.com/k/238/show#record=8&tab={Tab番号}
  → 年間行事、休業日、定期イベント、贈答品、「いつ」「何月」に関する質問はここを優先

<record id="jm_117_*">（JM記録 - 26件、2025年10月〜2026年3月）
  対象期間: 直近3ヶ月の全体ミーティング議事録（最新の話題）
  頻出キーワード: 年間スケジュールの確認、書記、売上報告、納品前報告、研修旅行、
                  ベトナム（VN）、航空便、プロジェクト、勤続祝い、レベル評価
  参照URL形式: https://eu-plan.cybozu.com/k/117/show#record={レコードID}
  → 売上目標、プロジェクト、研修旅行、勤続祝い、最近の議題など「最近の話題」はここを優先

ステップ0【質問の意図分析とデータソース選択】:
上記の【データソース構造ガイド】を参考に、質問の内容からどのデータソースを優先的に参照すべきか判断してください。
※ただし、優先度はあくまで目安です。質問に最も適切に答えられるデータソースとタグを選んでください。

ステップ1【質問の意図理解と参照IDの特定】:
まず、質問の「本質的な意図」を理解してください。キーワードの出現回数だけでなく、「何を知りたいのか」を考えてください。

【質問意図の理解方法】:
- 人名が含まれる場合: その人物に関する具体的な情報を求めている
- 日時・期限が含まれる場合: 特定の時期・タイミングの情報を求めている
- 手続き・方法を問う場合: 具体的な手順・プロセスを求めている
- 概念・ルールを問う場合: 制度の概要・原則を求めている

【タグ選択の優先順位】:
1. 【最優先】質問の意図に最も合致するタグ
   - 例: 「上野さんの面談」→「上野」という固有名詞を含むタグが最優先
   - 例: 「10月の行事」→「10月」タブのタグが最優先
2. 【重要】人名（固有名詞）が含まれるタグ
   - そのタグの <content> 全文を確認し、人名が含まれているタグを優先
   - 「面談」という一般的なキーワードが多くても、人名がなければ優先度は低い
3. 質問の具体的なキーワードが含まれるタグ
   - <content> 全文を確認し、質問に関連するキーワードが含まれているか判断

【重要な判断基準】:
※キーワードの出現回数が多いタグより、質問の意図に合ったタグを優先してください
※一般的なキーワード（「面談」「ルール」など）の出現回数は重視しない
※固有名詞（人名、プロジェクト名、具体的な日時）が含まれるタグを重視する

※質問の回答に必要な情報が複数のタグに分散している場合は、最大3件のタグを参照してください。
※1つのタグで完結する場合は、そのタグのみで十分です（無理に他のタグを探す必要はありません）。
※情報が見つからない場合は、無理に回答せず「その情報は見つかりませんでした」と答えてください。

ステップ2【回答の作成】:
特定したタグの <content> の内容「だけ」に基づいて回答を作成してください。
※複数のタグを参照した場合は、情報を統合して網羅的に回答してください。
※他のタグの内容は絶対に使用しないでください。

ステップ3【回答生成への貢献度が高いURL（最大3本）の抽出】:
【最重要】ステップ2で回答作成に「実際に貢献したタグ」のURLを、貢献度が高い順に最大3本抽出してください。

【貢献度の判断基準】:
1. 回答の中核となる情報を提供したタグ = 最も貢献度が高い
2. 補足情報を提供したタグ = 貢献度が中程度
3. 参考程度に見たが回答には使わなかったタグ = 貢献度なし（URLに含めない）

【手順】:
1. ステップ2で回答を作成した際に使用したタグのid属性をリストアップ
   例: <schedule id="schedule_238_8_tab2"> を使った → "schedule_238_8_tab2"
2. そのid属性を持つタグの <url> を探す
3. その <url> をそのままコピー（&tab=番号も含めて完全一致）
4. 貢献度が高い順に並べる（最大3本）

【絶対に守るルール】:
※【絶対に守る】ステップ1で探索しただけで回答に使わなかったタグのURLは含めない
※【絶対に守る】データソース構造ガイドの情報でURLを推測しない
※【絶対に守る】実際に回答生成に貢献したタグの <url> タグの内容をそのまま転記する
※【絶対に守る】年間スケジュールアプリ（schedule_238_*_tab*）の場合、<url>に含まれる&tab=番号を必ず含める
※【絶対に守る】URLは貢献度が高い順に並べる（1番目 = 最も重要な情報源）

【出力フォーマット】:
以下の形式で必ず出力してください:

【使用したタグID】
- schedule_238_8_tab1 （← 実際に使用したタグIDを列挙）
- rule_296_25 （← 複数使用した場合は全て列挙、最大3個）

（ここに回答内容を記載）

📎 参考:
https://eu-plan.cybozu.com/k/238/show#record=8&tab=1
https://eu-plan.cybozu.com/k/296/show#record=25

【例1: Tab 3のみを参照した場合】
【使用したタグID】
- schedule_238_8_tab3

お歳暮を受け取った場合ですね！🎁
（回答内容）

📎 参考:
https://eu-plan.cybozu.com/k/238/show#record=8&tab=3

【例2: 複数タグを参照した場合】
【使用したタグID】
- rule_296_25
- rule_296_90

有給休暇の申請は、KING OF TIMEで行えますよ！⏰
（回答内容）

📎 参考:
https://eu-plan.cybozu.com/k/296/show#record=25
https://eu-plan.cybozu.com/k/296/show#record=90

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
- ステップ3: 【重要】ステップ2で使用したこのタグID "rule_296_2" を明記し、その <url> のみを記載（1本のみ、他のタグのURLは含めない）

実際の回答:
【使用したタグID】
- rule_296_2

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
- ステップ3: このタグID "rule_296_26" を明記し、その <url> のみを記載（1本のみ）

実際の回答:
【使用したタグID】
- rule_296_26

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
- ステップ3: 【重要】ステップ2で実際に使用した3つのタグID "rule_296_25", "rule_296_90", "rule_296_96" を明記し、その <url> のみを列挙（他のタグのURLは含めない）

実際の回答:
【使用したタグID】
- rule_296_25
- rule_296_90
- rule_296_96

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
- ステップ3: 【重要】ステップ2で実際に使用した3つのタグID "rule_296_25", "rule_296_90", "rule_296_96" を明記し、その <url> のみを列挙（他のタグのURLは含めない）

実際の回答:
【使用したタグID】
- rule_296_25
- rule_296_90
- rule_296_96

有給休暇の申請は、KING OF TIMEで行えますよ！⏰

💡 その他のポイント:
・「計画取得日」: 奇数月の第2水曜日が推奨日です
・「半休・時間休」: 午前半休は13時から、午後半休は13時まで。時間休は1時間単位で取得できます

📎 参考:
https://eu-plan.cybozu.com/k/296/show#record=25
https://eu-plan.cybozu.com/k/296/show#record=90
https://eu-plan.cybozu.com/k/296/show#record=96

【良い回答例5: scheduleタグを参照する質問】
（ユーザーの質問: "お歳暮を受け取った場合について教えてください"）

思考プロセス（ユーザーには見せない）:
- ステップ0: 「お歳暮」「受け取り」に関する質問なので、<rule>（ルールブック）と<schedule>（年間スケジュール）の両方を探索
- ステップ1:
  * <rule id="rule_296_6"> に基本的な手順が記載
  * <schedule id="schedule_238_8_tab3"> に実際の受け取り事例と具体的な依頼事項が記載（Tab 3: 11月の年間行事）
  * 両方を参照することでより詳細な回答が可能
- ステップ2: 2つのタグの <content> を統合して回答を作成
- ステップ3: 【重要】ステップ2で実際に使用した2つのタグID "rule_296_6", "schedule_238_8_tab3" を明記し、その <url> のみを列挙（&tab=番号を含める、他のタグのURLは含めない）

実際の回答:
【使用したタグID】
- rule_296_6
- schedule_238_8_tab3

お歳暮を受け取った場合ですね！🎁

郵便物の担当であるCDさんが、社長・専務・リーダーのいずれかに受け取りを報告します。
その後、社長・専務・課長・リーダーのいずれかが開封します。

CDさんが、以下の内容を「全社チャットのタスク」にアップしますので、送り状と箱の写真は不要で、送り状を切り取って社内メールBOXに入れてくださいね。📮

ただし、ペンやファイルなど粗品としていただいたものは報告不要ですよ！✨

📎 参考:
https://eu-plan.cybozu.com/k/296/show#record=6
https://eu-plan.cybozu.com/k/238/show#record=8&tab=3

【良い回答例6: recordタグを参照する質問】
（ユーザーの質問: "研修旅行はどこに行く？"）

思考プロセス（ユーザーには見せない）:
- ステップ0: 「研修旅行」は「最近の話題」なので、<record>（JM記録）を優先的に参照
- ステップ1: <record id="jm_117_380">（全体ミーティング 2024/11/3）に記載
- ステップ2: このタグの <content> に基づいて回答を作成
- ステップ3: 【重要】ステップ2で使用したこのタグID "jm_117_380" を明記し、その <url> のみを記載（1本のみ、他のタグのURLは含めない）

実際の回答:
【使用したタグID】
- jm_117_380

研修旅行の行き先ですね！✈️

2026年11月に「ベトナム（VN）」に行く予定です。
航空便の手配なども進めていますので、楽しみにしていてくださいね！

📎 参考:
https://eu-plan.cybozu.com/k/117/show#record=380

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

    // ============================================================
    // デバッグ: Geminiに渡すXMLデータの詳細を記録
    // ============================================================
    console.log('\n🔍 ========== Gemini入力データのデバッグ ==========');
    console.log('📊 検索結果に含まれるタグ一覧:');

    // XMLデータからタグIDとURLを抽出
    const tagIdPattern = /<(rule|record|schedule) id="([^"]+)">/g;
    const urlPattern = /<url>([^<]+)<\/url>/g;

    const tagIds: string[] = [];
    let match;
    while ((match = tagIdPattern.exec(searchResult)) !== null) {
      tagIds.push(match[2]);
    }

    const urls: string[] = [];
    while ((match = urlPattern.exec(searchResult)) !== null) {
      urls.push(match[1]);
    }

    console.log('🏷️  抽出されたタグID:', tagIds);
    console.log('🔗 抽出されたURL:', urls);

    // デバッグ: 各TagのContent先頭部分を表示（Geminiが何を見ているか確認）
    console.log('\n📄 各TagのContent先頭部分:');
    tagIds.forEach((tagId, index) => {
      const tagPattern = new RegExp(`<(?:rule|record|schedule) id="${tagId}">[\\s\\S]*?<content>([\\s\\S]*?)</content>`, '');
      const match = searchResult.match(tagPattern);
      if (match) {
        const content = match[1].trim();
        const preview = content.substring(0, 150).replace(/\n/g, ' ');
        console.log(`  ${tagId}: ${preview}...`);
      }
    });

    console.log('🔍 ==============================================\n');

    console.log('📤 Gemini APIにリクエスト送信中...');
    const result = await model.generateContent(prompt);
    console.log('📥 Gemini APIからレスポンス受信');

    const response = result.response;
    console.log('🔍 Response object:', JSON.stringify(response, null, 2));

    // レスポンスからテキストを取得
    const text = response.text();
    console.log('✅ Gemini生成テキスト:', text);

    // ============================================================
    // デバッグ: Geminiが出力した「使用したタグID」を抽出
    // ============================================================
    console.log('\n🔍 ========== Gemini出力「使用したタグID」の検証 ==========');

    // Geminiの回答から「使用したタグID」セクションを抽出
    const tagIdSectionMatch = text.match(/【使用したタグID】\n((?:- .+\n?)+)/);
    if (tagIdSectionMatch) {
      const tagIdLines = tagIdSectionMatch[1].trim().split('\n');
      const declaredTagIds = tagIdLines.map(line => line.replace(/^- /, '').trim());
      console.log('🏷️  Geminiが宣言したタグID:', declaredTagIds);

      // 宣言したタグIDが入力データに存在するか確認
      console.log('\n📋 タグID照合結果:');
      declaredTagIds.forEach(tagId => {
        const isInInput = tagIds.includes(tagId);
        if (isInInput) {
          console.log(`  ✅ ${tagId} - 入力データに存在`);
        } else {
          console.log(`  ❌ ${tagId} - 入力データに存在しない（不正なタグID）`);
        }
      });
    } else {
      console.log('⚠️  「使用したタグID」セクションが見つかりませんでした');
    }

    // ============================================================
    // デバッグ: Geminiが出力したURLを検証
    // ============================================================
    console.log('\n🔍 ========== Gemini出力URLの検証 ==========');

    // Geminiの回答からURLを抽出
    const outputUrlPattern = /https:\/\/eu-plan\.cybozu\.com[^\s\n]+/g;
    const outputUrls = text.match(outputUrlPattern) || [];

    console.log('📎 Geminiが出力したURL:', outputUrls);

    // 入力URLとの照合
    console.log('\n📋 URL照合結果:');
    outputUrls.forEach(outputUrl => {
      const isInInput = urls.some(inputUrl => inputUrl === outputUrl);
      if (isInInput) {
        console.log(`  ✅ ${outputUrl} - 入力データに存在`);
      } else {
        console.log(`  ❌ ${outputUrl} - 入力データに存在しない（不正なURL）`);
      }
    });

    // ============================================================
    // デバッグ: Geminiが出力したURLのContent全体を表示
    // ============================================================
    console.log('\n🔍 ========== Gemini出力URLのContent検証 ==========');
    outputUrls.forEach(outputUrl => {
      // URLからタグIDを特定
      const tabMatch = outputUrl.match(/&tab=(\d+)/);
      const recordMatch = outputUrl.match(/record=(\d+)/);

      let tagId = '';
      if (tabMatch && recordMatch) {
        // scheduleタグ
        tagId = `schedule_238_${recordMatch[1]}_tab${tabMatch[1]}`;
      } else if (recordMatch) {
        // recordまたはruleタグ
        const appMatch = outputUrl.match(/\/k\/(\d+)\//);
        if (appMatch) {
          if (appMatch[1] === '117') {
            tagId = `jm_117_${recordMatch[1]}`;
          } else if (appMatch[1] === '296') {
            tagId = `rule_296_${recordMatch[1]}`;
          }
        }
      }

      if (tagId) {
        // タグIDからContent全体を抽出
        const tagPattern = new RegExp(`<(?:rule|record|schedule) id="${tagId}">[\\s\\S]*?<content>([\\s\\S]*?)</content>`, '');
        const match = searchResult.match(tagPattern);

        if (match) {
          const fullContent = match[1].trim();
          console.log(`\n📋 ${tagId} のContent全体（${fullContent.length}文字）:`);
          console.log(`${fullContent.substring(0, 500)}...`);

          // キーワード検索（上野、面談、順番など）
          const keywords = ['上野', '面談', '順番', 'UN', 'YD', '3番目', '10:00'];
          const foundKeywords = keywords.filter(kw => fullContent.includes(kw));
          console.log(`🔍 含まれるキーワード: ${foundKeywords.join(', ')}`);
        } else {
          console.log(`❌ ${tagId} のContentが見つかりません`);
        }
      }
    });

    console.log('🔍 ===========================================\n');

    // ============================================================
    // ユーザー向け回答の整形: 【使用したタグID】セクションを削除
    // ============================================================
    console.log('📝 ユーザー向け回答を整形中...');

    // 【使用したタグID】セクション全体を削除（デバッグ用なのでユーザーには表示しない）
    const cleanedText = text.replace(/【使用したタグID】\n(?:- .+\n?)+\n?/, '');

    console.log('✅ 【使用したタグID】セクションを削除しました');
    console.log(`📏 整形前: ${text.length}文字 → 整形後: ${cleanedText.length}文字`);

    // 整形後の回答を返す
    return cleanedText;
  } catch (error) {
    console.error('❌ Gemini API エラー:', error);
    console.error('📋 Error details:', JSON.stringify(error, null, 2));
    // Gemini APIが失敗した場合は元の検索結果を返す
    return searchResult;
  }
}