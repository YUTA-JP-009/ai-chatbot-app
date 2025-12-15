// GCP Data Storeのドキュメント一覧を取得するスクリプト
import { GoogleAuth } from 'google-auth-library';

async function listDocuments() {
  // Vercelの環境変数から直接取得（または.env.localから）
  const projectId = process.env.GCP_PROJECT_ID || 'ai-chatbot-prod-472104';
  const dataStoreId = process.env.GCP_DATA_STORE_ID || 'internal-rules-cloudstorage_1758630923408';
  const location = 'global';

  console.log('📋 GCP Data Store ドキュメント一覧取得中...');
  console.log('プロジェクトID:', projectId);
  console.log('データストアID:', dataStoreId);

  if (!process.env.GCP_CREDENTIALS) {
    console.error('❌ GCP_CREDENTIALS環境変数が設定されていません');
    console.log('💡 ヒント: 以下のコマンドで環境変数を設定してから実行してください:');
    console.log('export GCP_CREDENTIALS=\'{"type":"service_account",...}\'');
    process.exit(1);
  }

  const credentials = JSON.parse(process.env.GCP_CREDENTIALS);

  const auth = new GoogleAuth({
    credentials: {
      ...credentials,
      project_id: projectId
    },
    scopes: ['https://www.googleapis.com/auth/cloud-platform']
  });

  const client = await auth.getClient();
  const accessToken = await client.getAccessToken();

  // ドキュメント一覧取得API
  const endpoint = `projects/${projectId}/locations/${location}/collections/default_collection/dataStores/${dataStoreId}/branches/default_branch/documents`;
  const apiUrl = `https://discoveryengine.googleapis.com/v1/${endpoint}`;

  console.log('API URL:', apiUrl);

  const response = await fetch(apiUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken.token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ API Error:', errorText);
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();

  console.log('\n📄 ドキュメント一覧:');
  console.log(JSON.stringify(result, null, 2));

  if (result.documents) {
    console.log(`\n合計: ${result.documents.length}件`);
    result.documents.forEach((doc: any, index: number) => {
      console.log(`\n--- ドキュメント ${index + 1} ---`);
      console.log('ID:', doc.id || doc.name);
      console.log('名前:', doc.name);
      if (doc.structData) {
        console.log('タイトル:', doc.structData.title);
        console.log('カテゴリ:', doc.structData.category);
      }
    });
  }
}

listDocuments().catch(console.error);
