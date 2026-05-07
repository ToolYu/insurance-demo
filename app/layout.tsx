import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "保险计划书分析工具",
  description: "上传或输入保险计划书，提取核心保障、缴费、现金价值和风险提示。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
