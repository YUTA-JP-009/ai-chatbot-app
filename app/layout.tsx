import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '社内ルール対応AIチャットボット',
  description: 'ChatworkからのWebhookを受け取り、AIが社内規程に基づいて回答します。',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  )
}