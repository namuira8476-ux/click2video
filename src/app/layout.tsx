import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "Click2Video — 클릭 한 번으로 프리미엄 영상",
  description: "MiniMax H3-Max 템플릿으로 사진·영상 하나만 올리면 프리미엄 영상이 완성됩니다.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css" />
      </head>
      <body className="min-h-full flex flex-col bg-bg text-text">
        <Header />
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 pb-24">{children}</main>
        <footer className="border-t border-border text-muted text-xs py-6 text-center">
          © 2026 Click2Video · Powered by MiniMax H3-Max on fal.ai
        </footer>
      </body>
    </html>
  );
}
