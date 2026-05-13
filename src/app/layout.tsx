import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mokgong — 브라우저에서 끝내는 파일 작업",
  description:
    "파일을 업로드 없이 브라우저에서 바로 처리하는 도구 모음. Image, PDF, Video 무료.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full">
      <body className="min-h-full flex flex-col antialiased">{children}</body>
    </html>
  );
}
