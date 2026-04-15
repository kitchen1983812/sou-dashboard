/**
 * 全タブのスクリーンショットをモバイル/デスクトップ2ビューで取得
 *
 * 使い方:
 *   BASIC_AUTH_USER=xxx BASIC_AUTH_PASS=xxx npx tsx scripts/capture_screenshots.ts
 *   または .env の値を使うなら: npx tsx scripts/capture_screenshots.ts
 *
 * 出力:
 *   docs/screenshots/YYYY-MM-DD/{mobile,desktop}/<tabId>.png
 */
import { chromium, devices } from "playwright";
import fs from "fs";
import path from "path";

const BASE_URL =
	process.env.TARGET_URL ?? "https://sou-dashboard.vercel.app/dashboard";

// Basic認証情報: 環境変数から読み取り、なければ work/SouKidscare/.env を探す
function loadAuth(): { user: string; pass: string } {
	let user = process.env.BASIC_AUTH_USER ?? process.env.SOU_BASIC_USER ?? "";
	let pass = process.env.BASIC_AUTH_PASS ?? process.env.SOU_BASIC_PASS ?? "";
	if (!user || !pass) {
		// ../../.env を読む（SouKidscare root）
		const envPath = path.resolve(__dirname, "../../../.env");
		if (fs.existsSync(envPath)) {
			const content = fs.readFileSync(envPath, "utf-8");
			for (const line of content.split(/\r?\n/)) {
				const m = line.match(
					/^(SOU_BASIC_USER|SOU_BASIC_PASS|BASIC_AUTH_USER|BASIC_AUTH_PASS)=(.+)$/,
				);
				if (!m) continue;
				const [, key, val] = m;
				if ((key === "SOU_BASIC_USER" || key === "BASIC_AUTH_USER") && !user)
					user = val.trim();
				if ((key === "SOU_BASIC_PASS" || key === "BASIC_AUTH_PASS") && !pass)
					pass = val.trim();
			}
		}
	}
	if (!user || !pass) throw new Error("Basic認証情報が見つかりません");
	return { user, pass };
}

const TABS = [
	{ id: "executive", label: "経営サマリー" },
	{ id: "weeklyReport", label: "週次レポート" },
	{ id: "recent", label: "直近30日-園別" },
	{ id: "annual", label: "年度集計-園別" },
	{ id: "fyMonthly", label: "年度集計-月次" },
	{ id: "comparison", label: "年度比較" },
	{ id: "report", label: "ブランド別" },
	{ id: "googleAds", label: "Google広告" },
	{ id: "ga4", label: "GA4" },
	{ id: "reviews", label: "Google口コミ" },
	{ id: "occupancy", label: "定員充足率" },
	{ id: "staff", label: "正社員比率" },
	{ id: "recruitReport", label: "採用レポート" },
	{ id: "recruitCost", label: "採用費分析" },
];

async function run() {
	const auth = loadAuth();
	const today = new Date().toISOString().slice(0, 10);
	const outRoot = path.resolve(__dirname, "..", "docs", "screenshots", today);
	fs.mkdirSync(path.join(outRoot, "mobile"), { recursive: true });
	fs.mkdirSync(path.join(outRoot, "desktop"), { recursive: true });

	const browser = await chromium.launch();

	for (const viewport of ["mobile", "desktop"] as const) {
		console.log(`\n=== ${viewport} キャプチャ開始 ===`);
		const contextOpts =
			viewport === "mobile"
				? {
						...devices["iPhone 13"],
						httpCredentials: { username: auth.user, password: auth.pass },
					}
				: {
						viewport: { width: 1280, height: 800 },
						deviceScaleFactor: 2,
						httpCredentials: { username: auth.user, password: auth.pass },
					};
		const context = await browser.newContext(contextOpts);
		const page = await context.newPage();

		for (const tab of TABS) {
			const url = `${BASE_URL}?tab=${tab.id}`;
			try {
				await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
				// データ取得完了を待つ
				await page.waitForTimeout(2000);
				const out = path.join(outRoot, viewport, `${tab.id}.png`);
				await page.screenshot({ path: out, fullPage: true });
				console.log(`  ✓ ${tab.label} → ${path.basename(out)}`);
			} catch (e) {
				console.log(`  ✗ ${tab.label}: ${e instanceof Error ? e.message : e}`);
			}
		}

		await context.close();
	}

	await browser.close();
	console.log(`\n完了: ${outRoot}`);
}

run().catch((e) => {
	console.error(e);
	process.exit(1);
});
