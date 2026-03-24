import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "@/styles/globals.css";

const notoSansJP = Noto_Sans_JP({
	subsets: ["latin"],
	weight: ["400", "500", "700"],
	display: "swap",
});

export const metadata: Metadata = {
	title: "問い合わせ分析ダッシュボード",
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
		<html lang="ja" className={notoSansJP.className}>
			<body>{children}</body>
		</html>
	);
}
