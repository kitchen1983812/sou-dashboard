import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { NURSERIES, COMPETITORS, getMonthlyGoal } from "@/config/reviewConfig";

const API_KEY = process.env.GOOGLE_PLACES_API_KEY || "";

/** スナップショットファイルの型 */
interface SnapshotEntry {
	name: string;
	area: string;
	count: number;
	rating: number | null;
}
interface SnapshotFile {
	date: string;
	counts: Record<string, SnapshotEntry>;
}

/** 直前月のスナップショットを読み込む */
function loadPreviousSnapshot(): {
	date: string;
	counts: Record<string, number>;
} | null {
	const now = new Date();
	// 前月を計算
	const prevYear =
		now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
	const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth();
	const key = `${prevYear}-${String(prevMonth).padStart(2, "0")}`;

	const filePath = path.join(
		process.cwd(),
		"public",
		"snapshots",
		`${key}.json`,
	);
	try {
		const raw = fs.readFileSync(filePath, "utf-8");
		const data: SnapshotFile = JSON.parse(raw);
		const counts: Record<string, number> = {};
		for (const [placeId, entry] of Object.entries(data.counts)) {
			counts[placeId] = entry.count;
		}
		return { date: data.date, counts };
	} catch {
		return null;
	}
}

export interface ReviewData {
	name: string;
	area: string;
	placeId: string;
	rating: number | null;
	reviewCount: number;
	monthlyIncrease: number | null;
	monthlyGoal: number;
}

export interface CompetitorReviewData {
	name: string;
	area: string;
	rating: number | null;
	reviewCount: number;
}

async function fetchPlaceDetails(placeId: string): Promise<{
	rating: number | null;
	userRatingCount: number;
}> {
	const url = `https://places.googleapis.com/v1/places/${placeId}`;
	const res = await fetch(url, {
		headers: {
			"X-Goog-Api-Key": API_KEY,
			"X-Goog-FieldMask": "rating,userRatingCount",
		},
		next: { revalidate: 86400 }, // 24h cache
	});
	if (!res.ok) {
		return { rating: null, userRatingCount: 0 };
	}
	const data = await res.json();
	return {
		rating: data.rating ?? null,
		userRatingCount: data.userRatingCount ?? 0,
	};
}

export async function GET() {
	if (!API_KEY) {
		return NextResponse.json(
			{ error: "GOOGLE_PLACES_API_KEY not configured" },
			{ status: 500 },
		);
	}

	// スナップショット読み込み（前月末時点のデータ）
	const snapshot = loadPreviousSnapshot();

	// 自園データ取得
	const reviews: ReviewData[] = await Promise.all(
		NURSERIES.map(async (n) => {
			const detail = await fetchPlaceDetails(n.placeId);
			const snapshotCount = snapshot?.counts[n.placeId] ?? null;
			const monthlyIncrease =
				snapshotCount !== null ? detail.userRatingCount - snapshotCount : null;
			return {
				name: n.name,
				area: n.area,
				placeId: n.placeId,
				rating: detail.rating,
				reviewCount: detail.userRatingCount,
				monthlyIncrease,
				monthlyGoal: getMonthlyGoal(n.placeId),
			};
		}),
	);

	// 競合データ取得
	const competitors: CompetitorReviewData[] = await Promise.all(
		COMPETITORS.map(async (c) => {
			const detail = await fetchPlaceDetails(c.placeId);
			return {
				name: c.name,
				area: c.area,
				rating: detail.rating,
				reviewCount: detail.userRatingCount,
			};
		}),
	);

	// エリア→園名順でソート
	reviews.sort((a, b) => {
		const ac = a.area.localeCompare(b.area);
		if (ac !== 0) return ac;
		return a.name.localeCompare(b.name);
	});

	return NextResponse.json({
		reviews,
		competitors,
		snapshotDate: snapshot?.date ?? null,
		fetchedAt: new Date().toISOString(),
	});
}
