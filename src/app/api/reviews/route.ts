import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import {
	NURSERIES,
	NURSERY_COMPETITORS,
	getMonthlyGoal,
	BASELINE_CONFIG,
} from "@/config/reviewConfig";
import { getSheetData } from "@/lib/googleSheets";
import { GROUP_REVIEWS_SHEET_NAME, classifyBrand } from "@/config/brandConfig";

export const dynamic = "force-dynamic";

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

/** current.json の型 */
interface CurrentFile {
	date: string;
	nurseries: Record<string, SnapshotEntry>;
	competitors: Record<string, SnapshotEntry>;
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

/** current.json を読み込む（フォールバック用） */
function loadCurrentData(): CurrentFile | null {
	const filePath = path.join(
		process.cwd(),
		"public",
		"snapshots",
		"current.json",
	);
	try {
		const raw = fs.readFileSync(filePath, "utf-8");
		return JSON.parse(raw);
	} catch {
		return null;
	}
}

/** group-reviewsデータからフェリーチェ自社データを構築 */
async function loadCurrentFromGroupReviews(): Promise<CurrentFile | null> {
	try {
		const rows = await getSheetData(
			GROUP_REVIEWS_SHEET_NAME,
			process.env.GOOGLE_SHEET_ID,
		);
		if (rows.length < 2) return null;
		const exportedAt = rows[1]?.[0] ?? new Date().toISOString().slice(0, 10);
		const nurseries: Record<string, SnapshotEntry> = {};
		// 列順: [取得日, 園名, Place ID, クチコミ数, 星評価, ブランド, カテゴリ]
		for (const row of rows.slice(1)) {
			const name = row[1] ?? "";
			const placeId = row[2] ?? "";
			if (!placeId) continue;
			const { brand, category } = classifyBrand(name);
			// 自社のみ（フェリーチェ・わくわく・ことり）
			if (category !== "自社") continue;
			void brand;
			nurseries[placeId] = {
				name,
				area: NURSERIES.find((n) => n.placeId === placeId)?.area ?? "",
				count: Number(row[3] ?? 0),
				rating: row[4] ? Number(row[4]) : null,
			};
		}
		if (Object.keys(nurseries).length === 0) return null;
		return { date: exportedAt, nurseries, competitors: {} };
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

export async function GET() {
	// 優先: group-reviews（Excel経由で更新）からフェリーチェデータを取得
	// フォールバック: 旧 current.json（Places API日次取得）
	const current = (await loadCurrentFromGroupReviews()) ?? loadCurrentData();
	if (!current) {
		return NextResponse.json(
			{
				error:
					"口コミデータがありません。GitHub Actionsでcurrent.jsonを生成してください。",
			},
			{ status: 500 },
		);
	}

	// スナップショット読み込み
	const snapshot = loadPreviousSnapshot();
	const baseline = loadBaselineSnapshot();

	// 自園データを current.json から構築
	const reviews: ReviewData[] = NURSERIES.map((n) => {
		const entry = current.nurseries[n.placeId];
		const reviewCount = entry?.count ?? 0;
		const rating = entry?.rating ?? null;

		const snapshotCount = snapshot?.counts[n.placeId] ?? null;
		const monthlyIncrease =
			snapshotCount !== null ? reviewCount - snapshotCount : null;

		const baselineCount = baseline?.counts[n.placeId] ?? null;
		const baselineIncrease =
			baselineCount !== null ? reviewCount - baselineCount : null;

		return {
			name: n.name,
			area: n.area,
			placeId: n.placeId,
			rating,
			reviewCount,
			monthlyIncrease,
			monthlyGoal: getMonthlyGoal(n.placeId),
			baselineIncrease,
			compAvgRating: null,
			nurseryCompetitors: [],
		};
	});

	// 競合データを current.json から構築
	const competitors: CompetitorReviewData[] = Object.entries(
		current.competitors,
	).map(([_placeId, entry]) => ({
		name: entry.name,
		area: entry.area,
		rating: entry.rating,
		reviewCount: entry.count,
	}));

	// 競合のplaceId → データのMap
	const competitorMap = new Map(
		Object.entries(current.competitors).map(([placeId, entry]) => [
			placeId,
			{
				name: entry.name,
				area: entry.area,
				rating: entry.rating,
				reviewCount: entry.count,
			},
		]),
	);

	// 園別競合データを付加
	for (const r of reviews) {
		const compIds = NURSERY_COMPETITORS[r.placeId] ?? [];
		const comps = compIds
			.map((id) => competitorMap.get(id))
			.filter((c): c is CompetitorReviewData => c !== undefined);
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
		currentDataDate: current.date,
		fetchedAt: new Date().toISOString(),
	});
}
