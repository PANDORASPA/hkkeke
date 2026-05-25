import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Girl Image Generator",
  description: "Simple Google Drive + OpenAI + Supabase image generator MVP"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant-HK">
      <body>
        <header className="topbar">
          <Link href="/generate" className="brand">
            AI Girl Image Generator
          </Link>
          <nav>
            <Link href="/generate">Generate</Link>
            <Link href="/gallery">Gallery</Link>
            <Link href="/settings">Settings</Link>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
