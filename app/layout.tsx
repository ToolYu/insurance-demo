import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Insurance Plan Analyzer",
  description: "Upload or paste an insurance proposal to extract coverage, costs, cash value, and risk notes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
