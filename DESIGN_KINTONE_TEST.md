# Kintone API統合 テスト環境設計書

**作成日**: 2025年12月27日
**目的**: 既存のハードコードQ&Aシステムを保護しながら、Kintone API統合を安全にテストできる環境を構築

---

## 1. 推奨アプローチ: 環境変数フラグ方式（Option 1）

### 1-1. 概要

環境変数で「本番モード（ハードコード）」と「テストモード（Kintone API）」を切り替える方式。

**メリット**:
- ✅ 既存コード完全保護（qa-database.tsは一切変更なし）
- ✅ ワンクリックで即座に戻せる（環境変数の変更のみ）
- ✅ Vercelのプレビューデプロイで本番に影響なくテスト可能
- ✅ 実装シンプル（2-3時間）
- ✅ 段階的ロールアウト可能

**デメリット**:
- ⚠️ 両方のコードを同じファイルに共存させる必要がある

### 1-2. 実装詳細

#### ステップ1: 環境変数の追加

**Vercel環境変数:**
```
# 本番環境（Production）
USE_KINTONE_API=false
KINTONE_GAS_ENDPOINT=（未設定）

# プレビュー環境（Preview - 特定ブランチ）
USE_KINTONE_API=true
KINTONE_GAS_ENDPOINT=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
```

#### ステップ2: route.tsの改修

**既存の`askAI()`関数を保護し、新しい`askAIFromKintone()`関数を追加:**

```typescript
// --- 【既存】Q&Aデータベースから全件取得する関数（完全保護） ---
async function askAIFromDatabase(_question: string): Promise<{ content: string; sourceUrl: string | null }> {
  console.log('📚 Q&Aデータベースから全568問を取得します');
  const allQAText = getAllQAAsText();
  console.log('✅ Q&Aデータベース取得完了（568問）');
  return {
    content: allQAText,
    sourceUrl: null
  };
}

// --- 【新規】Kintone APIから全件取得する関数 ---
async function askAIFromKintone(_question: string): Promise<{ content: string; sourceUrl: string | null }> {
  console.log('🔗 Kintone APIから最新Q&Aを取得します');

  const gasEndpoint = process.env.KINTONE_GAS_ENDPOINT;
  if (!gasEndpoint) {
    console.error('❌ KINTONE_GAS_ENDPOINT が設定されていません');
    throw new Error('Kintone API endpoint not configured');
  }

  try {
    // GAS APIを呼び出し（キャッシュ機能は後で実装）
    const response = await fetch(gasEndpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`GAS API error: ${response.status}`);
    }

    const allQAText = await response.text();  // テキスト形式で取得
    console.log('✅ Kintone Q&A取得完了');
    console.log('📝 データ長:', allQAText.length, '文字');

    return {
      content: allQAText,
      sourceUrl: null
    };

  } catch (error) {
    console.error('❌ Kintone API呼び出しエラー:', error);
    // フォールバック: ハードコードQ&Aを使用
    console.log('🔄 フォールバック: ハードコードQ&Aを使用');
    return askAIFromDatabase(_question);
  }
}

// --- フラグによる切り替え関数 ---
async function askAI(question: string): Promise<{ content: string; sourceUrl: string | null }> {
  const useKintone = process.env.USE_KINTONE_API === 'true';

  if (useKintone) {
    console.log('🌐 Kintoneモード: API経由で取得');
    return askAIFromKintone(question);
  } else {
    console.log('💾 ハードコードモード: qa-database.tsから取得');
    return askAIFromDatabase(question);
  }
}
```

#### ステップ3: POSTハンドラーは変更なし

**既存のPOSTハンドラーはそのまま使用:**
```typescript
export async function POST(request: Request) {
  // ... 既存コード（変更なし）

  // askAI()を呼ぶだけ（内部で自動切り替え）
  const aiResponse = await askAI(body.webhook_event.body);

  // ... 既存コード（変更なし）
}
```

### 1-3. テスト手順

**Phase 1: ローカル開発環境でテスト（1日目）**
```bash
# .env.localに追加
USE_KINTONE_API=true
KINTONE_GAS_ENDPOINT=https://script.google.com/.../exec

# ローカル起動
npm run dev

# Chatworkからテスト質問を送信
# ログで「🌐 Kintoneモード」が表示されることを確認
```

**Phase 2: Vercelプレビュー環境でテスト（2日目）**
```bash
# 新しいブランチを作成
git checkout -b test/kintone-integration

# コードをプッシュ
git add .
git commit -m "Kintone API統合テスト環境を追加"
git push origin test/kintone-integration

# Vercelで自動プレビューデプロイ
# プレビュー環境の環境変数を設定:
#   USE_KINTONE_API=true
#   KINTONE_GAS_ENDPOINT=https://script.google.com/.../exec
```

**Phase 3: 本番環境への段階的ロールアウト（3-5日目）**
```bash
# 本番環境の環境変数を変更
# USE_KINTONE_API=false → true

# 数時間監視
# 問題なければ継続
# 問題あれば即座に USE_KINTONE_API=false に戻す
```

### 1-4. ロールバック手順（緊急時）

**最速30秒でロールバック:**
1. Vercel Dashboardにアクセス
2. Settings → Environment Variables
3. `USE_KINTONE_API` を `true` → `false` に変更
4. Redeploy（自動）
5. 完了（既存のハードコードQ&Aに戻る）

**既存コードは完全保護されているため、データロスなし。**

---

## 2. 代替案: 専用テストエンドポイント方式（Option 2）

### 2-1. 概要

`/api/chatwork-kintone-test` という別エンドポイントを作成し、テスト専用Chatworkルームで動作させる。

**メリット**:
- ✅ 本番コードと完全分離
- ✅ 本番への影響ゼロ
- ✅ 両方のシステムを同時稼働可能

**デメリット**:
- ⚠️ Chatworkの別Webhook設定が必要
- ⚠️ テスト用Chatworkルームが必要
- ⚠️ 実装やや複雑（3-4時間）

### 2-2. 実装詳細

**新規ファイル作成:**
```
app/api/chatwork-kintone-test/route.ts  ← 新規作成
app/api/chatwork/route.ts                ← 既存（変更なし）
```

**route.tsの内容を複製し、`askAI()`をKintone版に差し替え。**

### 2-3. テスト手順

1. テスト用Chatworkルームを作成
2. テスト用Webhookを設定（URL: `https://your-app.vercel.app/api/chatwork-kintone-test`）
3. テストルームで質問を送信
4. 本番ルームは既存のまま動作

---

## 3. 代替案: ユーザーベース切り替え方式（Option 3）

### 3-1. 概要

特定のChatworkユーザーIDだけKintone APIを使用し、他のユーザーはハードコードQ&Aを使用。

**メリット**:
- ✅ 本番環境で少数ユーザーのみテスト可能
- ✅ 段階的ロールアウトが容易

**デメリット**:
- ⚠️ ユーザーIDリストの管理が必要
- ⚠️ 実装やや複雑（3-4時間）

### 3-2. 実装詳細

```typescript
async function askAI(question: string, userId: string): Promise<{ content: string; sourceUrl: string | null }> {
  // テスト対象ユーザーリスト（環境変数）
  const testUserIds = (process.env.KINTONE_TEST_USER_IDS || '').split(',');

  if (testUserIds.includes(userId)) {
    console.log(`🧪 テストユーザー（${userId}）: Kintone APIを使用`);
    return askAIFromKintone(question);
  } else {
    console.log(`💾 通常ユーザー（${userId}）: ハードコードQ&Aを使用`);
    return askAIFromDatabase(question);
  }
}
```

**環境変数:**
```
KINTONE_TEST_USER_IDS=10686206,12345678  # テスト対象ユーザーID（カンマ区切り）
```

---

## 4. 代替案: 時間帯ベース切り替え方式（Option 4）

### 4-1. 概要

深夜時間帯（例: 2:00-4:00）だけKintone APIを使用し、それ以外はハードコードQ&Aを使用。

**メリット**:
- ✅ 本番環境で影響の少ない時間帯にテスト可能
- ✅ 自動切り替え

**デメリット**:
- ⚠️ テスト時間が限られる
- ⚠️ 深夜に質問が来ないとテストできない
- ⚠️ 実装中程度（2-3時間）

**推奨度**: 低（テストが非効率）

---

## 5. パーセンテージベースロールアウト（Option 5）

### 5-1. 概要

全リクエストの10%だけKintone APIを使用し、段階的に30% → 50% → 100%へ増やす。

**メリット**:
- ✅ カナリアデプロイ方式
- ✅ 段階的リスク分散

**デメリット**:
- ⚠️ 同じユーザーでも回答が変わる可能性
- ⚠️ デバッグが複雑
- ⚠️ 実装複雑（4-5時間）

**推奨度**: 中（大規模運用向け）

---

## 最終推奨: Option 1（環境変数フラグ方式）

### 選定理由

1. **最もシンプル**: 実装2-3時間、既存コード完全保護
2. **ロールバック最速**: 30秒で環境変数変更のみ
3. **Vercelプレビュー活用**: 本番に影響なくテスト可能
4. **段階的移行可能**: プレビュー → 本番と段階的に進められる
5. **フォールバック機能**: Kintone APIエラー時は自動でハードコードに戻る

### 実装スケジュール（3日間）

**Day 1: 実装＆ローカルテスト（2-3時間）**
- `askAIFromDatabase()`, `askAIFromKintone()`, `askAI()` 関数を実装
- .env.localでローカルテスト
- GAS APIエンドポイントの動作確認

**Day 2: プレビュー環境テスト（2-3時間）**
- `test/kintone-integration` ブランチ作成
- Vercelプレビュー環境で実際のChatworkと連携テスト
- 応答速度・精度を検証
- 問題があればコード修正

**Day 3: 本番環境ロールアウト（監視）**
- 本番環境の `USE_KINTONE_API=true` に変更
- 数時間監視
- 問題なければ `test/kintone-integration` を `main` にマージ

---

## コード構造（最終形）

```
app/
├── api/
│   └── chatwork/
│       └── route.ts  ← 改修（既存コード保護）
│           ├── askAIFromDatabase()  ← 既存の askAI() をリネーム
│           ├── askAIFromKintone()   ← 新規追加
│           └── askAI()              ← フラグで切り替え
├── data/
│   └── qa-database.ts  ← 完全保護（変更なし）
└── lib/
    └── kintone-cache.ts  ← 将来追加（Vercel KVキャッシュ）

環境変数（Vercel）:
  USE_KINTONE_API=false/true
  KINTONE_GAS_ENDPOINT=https://script.google.com/.../exec
```

---

## リスク管理

### リスク1: Kintone APIエラー
**対策**: 自動フォールバック機能（`askAIFromKintone()`内の`catch`ブロック）

### リスク2: GAS APIレート制限
**対策**:
- 初期はキャッシュなしで様子見
- 問題あればVercel KV（Redis）を追加

### リスク3: 応答速度低下
**対策**:
- BOT_PREFIX先行送信で体感速度改善
- 4秒以上かかる場合はキャッシュ追加を検討

### リスク4: データ不整合
**対策**:
- GAS APIのレスポンス形式をハードコードQ&Aと完全一致させる
- `Q1: 質問\nA1: 回答\nURL1: https://...` 形式

---

## 次のステップ

1. **GAS APIエンドポイントの作成**（仕様書に基づく）
2. **Option 1の実装**（route.ts改修）
3. **ローカルテスト**
4. **プレビュー環境デプロイ**
5. **本番ロールアウト**

この設計で進めてよろしいでしょうか？
