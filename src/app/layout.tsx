import type { Metadata } from "next";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "問い合わせ分析ダッシュボード",
  description:
    "コーポレートサイト問い合わせデータを可視化する分析ダッシュボード",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
