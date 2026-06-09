import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "次世代掃除ロボットデモ",
  description: "次世代掃除ロボットのシミュレーションデモ",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <head>
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-C04W1XKS16" strategy="afterInteractive" />
        <Script id="ga-init" strategy="afterInteractive">{`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-C04W1XKS16');
        `}</Script>
      </head>
      <body className="bg-gray-50 text-gray-900 antialiased">
        {/* アンバーバナー */}
        <div className="bg-amber-400 text-amber-900 text-center text-sm font-medium py-2 px-4">
          これはデモ版です。データはサーバー再起動時にリセットされる場合があります。
        </div>

        {children}

        {/* 右下固定ご相談ボタン */}
        <a
          href="https://rictaworks.jp/"
          target="_blank"
          rel="noopener noreferrer"
          style={{ position: "fixed", bottom: "1.5rem", right: "1.5rem" }}
          className="bg-blue-600 text-white text-sm font-semibold px-4 py-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors duration-150"
        >
          💬 ご相談はこちら
        </a>
      </body>
    </html>
  );
}
