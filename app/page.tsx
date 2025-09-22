export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">
          社内ルール対応AIチャットボット
        </h1>
        <p className="text-gray-600">
          ChatworkからのWebhookを受け取り、AIが社内規程に基づいて回答します。
        </p>
        <div className="mt-4 p-4 bg-green-50 rounded">
          <p className="text-green-800 text-sm">
            API Endpoint: /api/chatwork
          </p>
        </div>
      </div>
    </div>
  );
}