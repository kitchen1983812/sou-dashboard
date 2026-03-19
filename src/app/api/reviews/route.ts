import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import {
	NURSERIES,
	COMPETITORS,
	NURSERY_COMPETITORS,
	getMonthlyGoal,
	BASELINE_CONFIG,
} from "@/config/reviewConfig";

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

/** スナップショットファイルを読み込む汎用関数 */
function loadSnapshot(
	fileName: string,
): { date: string; counts: Record<string, number> } | null {
	const filePath = path.join(
		process.cwd(),
		"public",
		"snapshots",
		`${fileName}.json`,
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

/** 直前月のスナップショットを読み込む */
function loadPreviousSnapshot() {
	const now = new Date();
	const prevYear =
		now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
	const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth();
	const key = `${prevYear}-${String(prevMonth).padStart(2, "0")}`;
	return loadSnapshot(key);
}

/** ベースラインスナップショットを読み込む（施策起点） */
function loadBaselineSnapshot() {
	return loadSnapshot(BASELINE_CONFIG.snapshotName);
}

export interface ReviewData {
	name: string;
	area: string;
	placeId: string;
	rating: number | null;
	reviewCount: number;
	monthlyIncrease: number | null;
	monthlyGoal: number;
	/** 施策開始後（ベースライン比）の増加数 */
	baselineIncrease: number | null;
	compAvgRating: number | null;
	nurseryCompetitors: CompetitorReviewData[];
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

	// スナップショット読み込み
	const snapshot = loadPreviousSnapshot();
	const baseline = loadBaselineSnapshot();

	// 自園データ取得
	const reviews: ReviewData[] = await Promise.all(
		NURSERIES.map(async (n) => {
			const detail = await fetchPlaceDetails(n.placeId);
			const snapshotCount = snapshot?.counts[n.placeId] ?? null;
			const monthlyIncrease =
				snapshotCount !== null ? detail.userRatingCount - snapshotCount : null;
			const baselineCount = baseline?.counts[n.placeId] ?? null;
			const baselineIncrease =
				baselineCount !== null ? detail.userRatingCount - baselineCount : null;
			return {
				name: n.name,
				area: n.area,
				placeId: n.placeId,
				rating: detail.rating,
				reviewCount: detail.userRatingCount,
				monthlyIncrease,
				monthlyGoal: getMonthlyGoal(n.placeId),
				baselineIncrease,
				compAvgRating: null,
				nurseryCompetitors: [],
			};
		}),
	);

	// 競合データ取得 → placeId でルックアップできるMapを作成
	const competitorResults = await Promise.all(
		COMPETITORS.map(async (c) => {
			const detail = await fetchPlaceDetails(c.placeId);
			return {
				placeId: c.placeId,
				name: c.name,
				area: c.area,
				rating: detail.rating,
				reviewCount: detail.userRatingCount,
			};
		}),
	);
	const competitorMap = new Map(competitorResults.map((c) => [c.placeId, c]));
	const competitors: CompetitorReviewData[] = competitorResults.map(
		({ placeId: _pid, ...rest }) => rest,
	);

	// 園別競合データを付加（NURSERY_COMPETITORSからcompetitorMapを参照）
	for (const r of reviews) {
		const compIds = NURSERY_COMPETITORS[r.placeId] ?? [];
		const comps = compIds
			.map((id) => competitorMap.get(id))
			.filter((c): c is (typeof competitorResults)[0] => c !== undefined)
			.map(({ placeId: _pid, ...rest }) => rest);
		r.nurseryCompetitors = comps;
		const ratings = comps
			.filter((c) => c.rating !== null)
			.map((c) => c.rating as number);
		r.compAvgRating =
			ratings.length > 0
				? Math.round(
						(ratings.reduce((s, v) => s + v, 0) / ratings.length) * 100,
					) / 100
				: null;
	}

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
		baselineDate: baseline?.date ?? null,
		baselineStartDate: baseline ? BASELINE_CONFIG.startDate : null,
		halfYearGoal: BASELINE_CONFIG.halfYearGoal,
		goalDeadline: BASELINE_CONFIG.goalDeadline,
		fetchedAt: new Date().toISOString(),
	});
}
