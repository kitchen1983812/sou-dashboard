/**
 * Google口コミ スナップショット取得スクリプト
 *
 * 使い方:
 *   # 月次スナップショット（自園のみ → YYYY-MM.json）
 *   GOOGLE_PLACES_API_KEY=xxx node scripts/snapshot-reviews.js
 *
 *   # カスタム名で保存（ベースライン等）
 *   SNAPSHOT_NAME=baseline-20260327 GOOGLE_PLACES_API_KEY=xxx node scripts/snapshot-reviews.js
 *
 *   # 全データ取得（自園+競合 → current.json）※週次更新用
 *   INCLUDE_COMPETITORS=true GOOGLE_PLACES_API_KEY=xxx node scripts/snapshot-reviews.js
 */

const fs = require("fs");
const path = require("path");

// 共有データファイルからPlace IDを読み込む
const placesPath = path.join(__dirname, "review-places.json");
const { nurseries: NURSERIES, competitors: COMPETITORS } = JSON.parse(
	fs.readFileSync(placesPath, "utf-8"),
);

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const INCLUDE_COMPETITORS = process.env.INCLUDE_COMPETITORS === "true";

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

async function fetchAll(places, label) {
	const counts = {};
	for (const place of places) {
		process.stdout.write(`  [${label}] ${place.name}...`);
		const { count, rating } = await fetchReviewCount(place.placeId);
		counts[place.placeId] = {
			name: place.name,
			area: place.area,
			count,
			rating,
		};
		console.log(` ${count}件 ★${rating ?? "-"}`);
		await new Promise((r) => setTimeout(r, 100));
	}
	return counts;
}

async function main() {
	const now = new Date();
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, "0");
	const dateStr = `${year}-${month}-${String(now.getDate()).padStart(2, "0")}`;

	const snapshotDir = path.join(process.cwd(), "public", "snapshots");
	if (!fs.existsSync(snapshotDir)) {
		fs.mkdirSync(snapshotDir, { recursive: true });
	}

	if (INCLUDE_COMPETITORS) {
		// --- current.json モード（自園+競合） ---
		console.log(`Fetching full data for current.json (${dateStr})...`);
		console.log(
			`  Nurseries: ${NURSERIES.length}, Competitors: ${COMPETITORS.length}`,
		);

		const nurseryCounts = await fetchAll(NURSERIES, "自園");
		const competitorCounts = await fetchAll(COMPETITORS, "競合");

		const current = {
			date: dateStr,
			nurseries: nurseryCounts,
			competitors: competitorCounts,
		};
		const outputPath = path.join(snapshotDir, "current.json");
		fs.writeFileSync(outputPath, JSON.stringify(current, null, 2), "utf-8");

		const totalN = Object.values(nurseryCounts).reduce(
			(s, v) => s + v.count,
			0,
		);
		const totalC = Object.values(competitorCounts).reduce(
			(s, v) => s + v.count,
			0,
		);
		console.log(`\nSaved: public/snapshots/current.json`);
		console.log(`  Nursery reviews: ${totalN}, Competitor reviews: ${totalC}`);
	} else {
		// --- 月次/ベースライン スナップショットモード（自園のみ） ---
		const snapshotName = process.env.SNAPSHOT_NAME || dateStr;
		console.log(`Taking snapshot "${snapshotName}" (${dateStr})...`);

		const counts = await fetchAll(NURSERIES, "自園");

		const outputPath = path.join(snapshotDir, `${snapshotName}.json`);
		const snapshot = { date: dateStr, counts };
		fs.writeFileSync(outputPath, JSON.stringify(snapshot, null, 2), "utf-8");

		const total = Object.values(counts).reduce((s, v) => s + v.count, 0);
		console.log(`\nSnapshot saved: public/snapshots/${snapshotName}.json`);
		console.log(`Total reviews across all nurseries: ${total}`);
	}
}

main().catch((err) => {
	console.error("Fatal error:", err);
	process.exit(1);
});
