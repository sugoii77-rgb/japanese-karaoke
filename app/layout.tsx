import type { Metadata } from 'next';
import './globals.css';
import Navigation from '@/components/Navigation';

export const metadata: Metadata = {
  title: 'マイの日本語カラオケ ☕',
  description: 'マイの日本語ポッドキャストで日本語を楽しく学ぼう！',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ background: '#faf3e0', minHeight: '100vh' }}>
        <Navigation />
        <main style={{ paddingTop: '60px' }}>
          {children}
        </main>
      </body>
    </html>
  );
}
