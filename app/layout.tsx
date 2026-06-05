import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI 女仔圖片生成器",
  description: "Google Drive 素材庫 + OpenAI Images API + Supabase 紀錄"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant-HK">
      <body>
        <header className="topbar">
          <Link href="/generate" className="brand">
            AI 女仔圖片生成器
          </Link>
          <nav>
            <Link href="/generate">生成</Link>
            <Link href="/gallery">圖庫</Link>
            <Link href="/settings">設定</Link>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
