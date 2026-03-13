/**
 * 競合保育園候補探索スクリプト
 *
 * 各フェリーチェ園の座標を取得し、半径1km以内の保育園を検索して
 * 評価が近い順に候補5園を出力する。
 *
 * 使い方:
 *   GOOGLE_PLACES_API_KEY=xxx node scripts/discover-competitors.js
 *   GOOGLE_PLACES_API_KEY=xxx node scripts/discover-competitors.js --radius=1500
 *
 * 出力: scripts/competitor-candidates.json
 */

const fs = require("fs");
const path = require("path");

// ======= 設定 =======
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

// 自社全Place IDセット（除外用）
const OWN_PLACE_IDS = new Set(NURSERIES.map((n) => n.placeId));

// コマンドライン引数で半径変更可能（デフォルト1000m）
const args = process.argv.slice(2);
const radiusArg = args.find((a) => a.startsWith("--radius="));
const RADIUS_METERS = radiusArg ? parseInt(radiusArg.split("=")[1]) : 1000;

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
if (!API_KEY) {
	console.error(
		"Error: GOOGLE_PLACES_API_KEY environment variable is not set.",
	);
	process.exit(1);
}

/** 自園の詳細（座標 + 評価）を取得 */
async function fetchOwnDetails(placeId) {
	const url = `https://places.googleapis.com/v1/places/${placeId}`;
	const res = await fetch(url, {
		headers: {
			"X-Goog-Api-Key": API_KEY,
			"X-Goog-FieldMask": "location,rating,userRatingCount,displayName",
		},
	});
	if (!res.ok) throw new Error(`HTTP ${res.status} for ${placeId}`);
	const data = await res.json();
	return {
		lat: data.location?.latitude ?? null,
		lng: data.location?.longitude ?? null,
		rating: data.rating ?? null,
		reviewCount: data.userRatingCount ?? 0,
	};
}

/**
 * 近隣保育園を検索（Places API Nearby Search）
 * child_care_agency = 保育園・幼稚園系施設
 */
async function searchNearbyNurseries(lat, lng) {
	const url = "https://places.googleapis.com/v1/places:searchNearby";
	const body = {
		includedTypes: ["child_care_agency", "preschool"],
		maxResultCount: 20,
		locationRestriction: {
			circle: {
				center: { latitude: lat, longitude: lng },
				radius: RADIUS_METERS,
			},
		},
	};
	const res = await fetch(url, {
		method: "POST",
		headers: {
			"X-Goog-Api-Key": API_KEY,
			"X-Goog-FieldMask":
				"places.id,places.displayName,places.rating,places.userRatingCount,places.location",
			"Content-Type": "application/json",
		},
		body: JSON.stringify(body),
	});
	if (!res.ok) {
		console.warn(`  Nearby search failed: HTTP ${res.status}`);
		return [];
	}
	const data = await res.json();
	return data.places ?? [];
}

/** 2点間の距離（m）を計算（Haversine公式） */
function distanceMeters(lat1, lng1, lat2, lng2) {
	const R = 6371000;
	const dLat = ((lat2 - lat1) * Math.PI) / 180;
	const dLng = ((lng2 - lng1) * Math.PI) / 180;
	const a =
		Math.sin(dLat / 2) ** 2 +
		Math.cos((lat1 * Math.PI) / 180) *
			Math.cos((lat2 * Math.PI) / 180) *
			Math.sin(dLng / 2) ** 2;
	return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function main() {
	console.log(
		`Searching competitors within ${RADIUS_METERS}m of each nursery...`,
	);
	console.log(`Total nurseries: ${NURSERIES.length}\n`);

	const results = [];

	for (const nursery of NURSERIES) {
		process.stdout.write(`[${nursery.name}] Getting details...`);
		const own = await fetchOwnDetails(nursery.placeId);

		if (own.lat === null) {
			console.log(" No location data, skipping.");
			results.push({
				nursery: nursery.name,
				area: nursery.area,
				ownRating: null,
				candidates: [],
			});
			await new Promise((r) => setTimeout(r, 200));
			continue;
		}

		console.log(
			` ★${own.rating ?? "-"} (${own.reviewCount}件) @ ${own.lat.toFixed(4)},${own.lng.toFixed(4)}`,
		);

		process.stdout.write(`  Searching nearby...`);
		const nearby = await searchNearbyNurseries(own.lat, own.lng);
		console.log(` ${nearby.length}件ヒット`);

		// 自社除外 + 距離・評価差で候補整理
		const candidates = nearby
			.filter((p) => !OWN_PLACE_IDS.has(p.id))
			.map((p) => {
				const dist = distanceMeters(
					own.lat,
					own.lng,
					p.location?.latitude ?? own.lat,
					p.location?.longitude ?? own.lng,
				);
				const ratingDiff =
					own.rating !== null && p.rating != null
						? Math.abs(own.rating - p.rating)
						: 99;
				return {
					placeId: p.id,
					name: p.displayName?.text ?? "不明",
					rating: p.rating ?? null,
					reviewCount: p.userRatingCount ?? 0,
					distanceM: Math.round(dist),
					ratingDiff: Math.round(ratingDiff * 10) / 10,
				};
			})
			// 評価差が近い順（同評価差の場合は距離が近い順）
			.sort((a, b) => a.ratingDiff - b.ratingDiff || a.distanceM - b.distanceM)
			.slice(0, 5);

		results.push({
			nursery: nursery.name,
			area: nursery.area,
			placeId: nursery.placeId,
			ownRating: own.rating,
			ownReviewCount: own.reviewCount,
			candidates,
		});

		// レート制限対策
		await new Promise((r) => setTimeout(r, 300));
	}

	// 結果を保存
	const outPath = path.join(
		process.cwd(),
		"scripts",
		"competitor-candidates.json",
	);
	fs.writeFileSync(outPath, JSON.stringify(results, null, 2), "utf-8");

	console.log(`\n✅ Saved: scripts/competitor-candidates.json`);

	// サマリー表示
	console.log("\n=== サマリー ===");
	for (const r of results) {
		console.log(`\n${r.nursery}（${r.area}）★${r.ownRating ?? "-"}`);
		if (r.candidates.length === 0) {
			console.log("  候補なし");
		} else {
			for (const c of r.candidates) {
				console.log(
					`  ${c.name} | ★${c.rating ?? "-"} ${c.reviewCount}件 | ${c.distanceM}m | 評価差±${c.ratingDiff}`,
				);
			}
		}
	}
}

main().catch((err) => {
	console.error("Fatal error:", err);
	process.exit(1);
});
