import type { Metadata } from "next";
import { Noto_Sans_JP, Zen_Kaku_Gothic_New } from "next/font/google";
import "@/styles/globals.css";

// 本文: Noto Sans JP (デザインガイド Ver.1.0 — 可読性最優先)
const notoSansJP = Noto_Sans_JP({
	subsets: ["latin"],
	weight: ["400", "500", "700"],
	display: "swap",
	variable: "--font-body",
});

// 見出し: Zen角ゴシック (デザインガイド Ver.1.0 — 力強く安定した骨格で信頼感を担う)
const zenKaku = Zen_Kaku_Gothic_New({
	subsets: ["latin"],
	weight: ["700", "900"],
	display: "swap",
	variable: "--font-display",
});

export const metadata: Metadata = {
	title: "経営ダッシュボード",
	description:
		"コーポレートサイト問い合わせデータを可視化する分析ダッシュボード",
	icons: {
		icon: [
			{ url: "/favicon.ico", sizes: "32x32" },
			{ url: "/favicon.png", type: "image/png", sizes: "150x150" },
		],
		apple: "/favicon.png",
	},
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html
			lang="ja"
			className={`${notoSansJP.variable} ${zenKaku.variable} ${notoSansJP.className}`}
		>
			<body>{children}</body>
		</html>
	);
}
