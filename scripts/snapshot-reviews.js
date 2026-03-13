/**
 * Google口コミ スナップショット取得スクリプト
 * GitHub Actionsから毎月1日に実行し、各園の口コミ件数を記録する。
 *
 * 使い方:
 *   GOOGLE_PLACES_API_KEY=xxx node scripts/snapshot-reviews.js
 */

const fs = require("fs");
const path = require("path");

// ======= 設定 (src/config/reviewConfig.ts と同期して管理) =======
const NURSERIES = [
	{
		name: "稲城長沼園",
		area: "東京都",
		placeId: "ChIJAT_un8j6GGARRJDWMAye3XE",
	},
	{
		name: "京成八幡園",
		area: "千葉県",
		placeId: "ChIJq30EnM-GGGARwtXJOrPeADY",
	},
	{ name: "行徳園", area: "千葉県", placeId: "ChIJc2MR3muHGGARhHtG6RP1dKU" },
	{ name: "新座園", area: "埼玉県", placeId: "ChIJt9t-ubLpGGARbSs4iZCwOMU" },
	{
		name: "相武台前園",
		area: "神奈川県",
		placeId: "ChIJmfaEZpz_GGARzgWS_10r0o8",
	},
	{
		name: "相模原園",
		area: "神奈川県",
		placeId: "ChIJq9CYz9kDGWARvC3WXdkbKpA",
	},
	{
		name: "大田馬込園",
		area: "東京都",
		placeId: "ChIJ0QP_5KGKGGAR2U-hrZrUCZA",
	},
	{ name: "大和園", area: "神奈川県", placeId: "ChIJsbeGEa34GGARRaVauXzbF0g" },
	{
		name: "中央林間園",
		area: "神奈川県",
		placeId: "ChIJWVLe3xP_GGARPjPg9pKfdsM",
	},
	{
		name: "中野新橋園",
		area: "東京都",
		placeId: "ChIJ-7i0-efyGGAR2Zm6giP_Fdc",
	},
	{ name: "朝霞園", area: "埼玉県", placeId: "ChIJgbwKmXfpGGARsTdBJiV-YpU" },
	{ name: "東川口園", area: "埼玉県", placeId: "ChIJ6XMEHgaVGGARGzFHI1-Ly_o" },
	{ name: "南行徳園", area: "千葉県", placeId: "ChIJxfYClqmHGGARNxWFyGrt2Mg" },
	{ name: "柏II園", area: "千葉県", placeId: "ChIJYf0QStOdGGARaQzhDXeDgiA" },
	{ name: "鳩ヶ谷園", area: "埼玉県", placeId: "ChIJ02cMqmOUGGARQmncmaR1mXE" },
	{
		name: "武蔵中原園",
		area: "神奈川県",
		placeId: "ChIJTVVcNZ71GGARS1eDY7Ubf8A",
	},
	{ name: "目黒園", area: "東京都", placeId: "ChIJ7akCmzyLGGARdDt5sc19MYQ" },
	{
		name: "練馬中村橋園",
		area: "東京都",
		placeId: "ChIJF5cU6rHtGGARE3OZgLrHKBs",
	},
	{ name: "和光園", area: "埼玉県", placeId: "ChIJ21XWI-DrGGARJjwrKXbBVx8" },
	{ name: "和光II園", area: "埼玉県", placeId: "ChIJUboxFebrGGAR4wU8-2A2zno" },
	{ name: "蕨園", area: "埼玉県", placeId: "ChIJm_dqt2_rGGARZOwV9-OkTxQ" },
	{ name: "蕨II園", area: "埼玉県", placeId: "ChIJlzqtUpfrGGARUsZBMphXEXA" },
	{
		name: "ふぇりーちぇほいくえん",
		area: "千葉県",
		placeId: "ChIJ80xh1ceEImARJ_hE_nHvtvM",
	},
	{
		name: "病児保育室にじのへや",
		area: "埼玉県",
		placeId: "ChIJK9MxgKLrGGARUiRQk2GgMaU",
	},
	{
		name: "座間II園",
		area: "神奈川県",
		placeId: "ChIJLZnrOpn_GGARulv_-cYUkSM",
	},
];
// ===============================================================

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;

if (!API_KEY) {
	console.error(
		"Error: GOOGLE_PLACES_API_KEY environment variable is not set.",
	);
	process.exit(1);
}

async function fetchReviewCount(placeId) {
	const url = `https://places.googleapis.com/v1/places/${placeId}`;
	const res = await fetch(url, {
		headers: {
			"X-Goog-Api-Key": API_KEY,
			"X-Goog-FieldMask": "userRatingCount,rating",
		},
	});
	if (!res.ok) {
		console.warn(`  Warning: ${placeId} → HTTP ${res.status}`);
		return { count: 0, rating: null };
	}
	const data = await res.json();
	return {
		count: data.userRatingCount ?? 0,
		rating: data.rating ?? null,
	};
}

async function main() {
	const now = new Date();
	// 月初スナップショット: 当月YYYY-MMとして保存
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, "0");
	const yearMonth = `${year}-${month}`;
	const dateStr = `${year}-${month}-${String(now.getDate()).padStart(2, "0")}`;

	console.log(`Taking snapshot for ${yearMonth} (${dateStr})...`);

	const counts = {};
	for (const nursery of NURSERIES) {
		process.stdout.write(`  Fetching: ${nursery.name}...`);
		const { count, rating } = await fetchReviewCount(nursery.placeId);
		counts[nursery.placeId] = {
			name: nursery.name,
			area: nursery.area,
			count,
			rating,
		};
		console.log(` ${count}件 ★${rating ?? "-"}`);
		// API レート制限を避けるため少し待機
		await new Promise((r) => setTimeout(r, 100));
	}

	const snapshotDir = path.join(process.cwd(), "public", "snapshots");
	if (!fs.existsSync(snapshotDir)) {
		fs.mkdirSync(snapshotDir, { recursive: true });
	}

	const outputPath = path.join(snapshotDir, `${yearMonth}.json`);
	const snapshot = { date: dateStr, counts };
	fs.writeFileSync(outputPath, JSON.stringify(snapshot, null, 2), "utf-8");

	const total = Object.values(counts).reduce((s, v) => s + v.count, 0);
	console.log(`\nSnapshot saved: public/snapshots/${yearMonth}.json`);
	console.log(`Total reviews across all nurseries: ${total}`);
}

main().catch((err) => {
	console.error("Fatal error:", err);
	process.exit(1);
});
