"use client";

import { useEffect, useState, useMemo } from "react";
import type { ReviewData, CompetitorReviewData } from "@/app/api/reviews/route";

interface ReviewsResponse {
	reviews: ReviewData[];
	competitors: CompetitorReviewData[];
	snapshotDate: string | null;
	fetchedAt: string;
}

/** ★バーの色を評価に応じて返す */
function ratingColor(rating: number | null): string {
	if (rating === null) return "bg-gray-200";
	if (rating >= 4.5) return "bg-green-500";
	if (rating >= 4.0) return "bg-brand-500";
	if (rating >= 3.0) return "bg-amber-400";
	return "bg-red-400";
}

/** 今月増加数の表示色 */
function increaseColor(n: number): string {
	if (n >= 5) return "text-green-600 font-bold";
	if (n >= 1) return "text-brand-600 font-semibold";
	return "text-gray-400";
}

type SortKey = "name" | "area" | "rating" | "reviewCount" | "increase";
type SortDir = "asc" | "desc";

export default function ReviewsView() {
	const [data, setData] = useState<ReviewsResponse | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [sortKey, setSortKey] = useState<SortKey>("rating");
	const [sortDir, setSortDir] = useState<SortDir>("desc");
	const [areaFilter, setAreaFilter] = useState("all");

	useEffect(() => {
		fetch("/api/reviews")
			.then((res) => res.json())
			.then((d) => {
				setData(d);
				setLoading(false);
			})
			.catch((e) => {
				setError(String(e));
				setLoading(false);
			});
	}, []);

	const areas = useMemo(() => {
		if (!data) return [];
		return Array.from(new Set(data.reviews.map((r) => r.area))).sort();
	}, [data]);

	const filtered = useMemo(() => {
		if (!data) return [];
		let list = data.reviews;
		if (areaFilter !== "all") {
			list = list.filter((r) => r.area === areaFilter);
		}
		return [...list].sort((a, b) => {
			const dir = sortDir === "asc" ? 1 : -1;
			if (sortKey === "name") return a.name.localeCompare(b.name) * dir;
			if (sortKey === "area") return a.area.localeCompare(b.area) * dir;
			if (sortKey === "increase") {
				const ai = a.monthlyIncrease ?? -1;
				const bi = b.monthlyIncrease ?? -1;
				return (ai - bi) * dir;
			}
			const av = sortKey === "rating" ? (a.rating ?? -1) : a.reviewCount;
			const bv = sortKey === "rating" ? (b.rating ?? -1) : b.reviewCount;
			return (av - bv) * dir;
		});
	}, [data, sortKey, sortDir, areaFilter]);

	// --- KPI計算 ---
	const kpi = useMemo(() => {
		if (!data) return null;
		const reviews = data.reviews;
		const withRating = reviews.filter((r) => r.rating !== null);
		const avgRating =
			withRating.length > 0
				? withRating.reduce((s, r) => s + (r.rating ?? 0), 0) /
					withRating.length
				: 0;
		const totalReviews = reviews.reduce((s, r) => s + r.reviewCount, 0);
		const above4 = reviews.filter(
			(r) => r.rating !== null && r.rating >= 4.0,
		).length;
		const noReviews = reviews.filter((r) => r.reviewCount === 0).length;

		// 今月の増加合計（スナップショットある場合のみ）
		const withIncrease = reviews.filter((r) => r.monthlyIncrease !== null);
		const totalIncrease =
			withIncrease.length > 0
				? withIncrease.reduce((s, r) => s + (r.monthlyIncrease ?? 0), 0)
				: null;

		// 目標達成率（今月増加 >= monthlyGoal の園数）
		const achievedCount =
			withIncrease.length > 0
				? withIncrease.filter((r) => (r.monthlyIncrease ?? 0) >= r.monthlyGoal)
						.length
				: null;

		return {
			avgRating,
			totalReviews,
			above4,
			noReviews,
			total: reviews.length,
			totalIncrease,
			achievedCount,
		};
	}, [data]);

	// --- MVPランキング（今月増加数 top 3）---
	const ranking = useMemo(() => {
		if (!data) return [];
		return [...data.reviews]
			.filter((r) => r.monthlyIncrease !== null && r.monthlyIncrease > 0)
			.sort((a, b) => (b.monthlyIncrease ?? 0) - (a.monthlyIncrease ?? 0))
			.slice(0, 3);
	}, [data]);

	// --- エリア別ベンチマーク ---
	const areaBenchmark = useMemo(() => {
		if (!data) return [];
		const areaMap: Record<
			string,
			{
				ourRatings: number[];
				ourCount: number;
				compRatings: number[];
				compCount: number;
			}
		> = {};

		for (const r of data.reviews) {
			if (!areaMap[r.area]) {
				areaMap[r.area] = {
					ourRatings: [],
					ourCount: 0,
					compRatings: [],
					compCount: 0,
				};
			}
			if (r.rating !== null) areaMap[r.area].ourRatings.push(r.rating);
			areaMap[r.area].ourCount++;
		}

		for (const c of data.competitors) {
			if (!areaMap[c.area]) {
				areaMap[c.area] = {
					ourRatings: [],
					ourCount: 0,
					compRatings: [],
					compCount: 0,
				};
			}
			if (c.rating !== null) areaMap[c.area].compRatings.push(c.rating);
			areaMap[c.area].compCount++;
		}

		return Object.entries(areaMap)
			.map(([area, stats]) => ({
				area,
				ourAvg:
					stats.ourRatings.length > 0
						? stats.ourRatings.reduce((s, v) => s + v, 0) /
							stats.ourRatings.length
						: null,
				ourCount: stats.ourCount,
				compAvg:
					stats.compRatings.length > 0
						? stats.compRatings.reduce((s, v) => s + v, 0) /
							stats.compRatings.length
						: null,
				compCount: stats.compCount,
			}))
			.sort((a, b) => a.area.localeCompare(b.area));
	}, [data]);

	// --- 評価分布 ---
	const distribution = useMemo(() => {
		if (!data) return [];
		const buckets: { label: string; count: number; color: string }[] = [
			{ label: "★5", count: 0, color: "bg-green-500" },
			{ label: "★4", count: 0, color: "bg-brand-500" },
			{ label: "★3", count: 0, color: "bg-amber-400" },
			{ label: "★2以下", count: 0, color: "bg-red-400" },
			{ label: "未評価", count: 0, color: "bg-gray-300" },
		];
		for (const r of data.reviews) {
			if (r.rating === null || r.reviewCount === 0) buckets[4].count++;
			else if (r.rating >= 4.5) buckets[0].count++;
			else if (r.rating >= 3.5) buckets[1].count++;
			else if (r.rating >= 2.5) buckets[2].count++;
			else buckets[3].count++;
		}
		return buckets;
	}, [data]);

	const handleSort = (key: SortKey) => {
		if (sortKey === key) {
			setSortDir(sortDir === "asc" ? "desc" : "asc");
		} else {
			setSortKey(key);
			setSortDir(key === "name" || key === "area" ? "asc" : "desc");
		}
	};

	const sortIcon = (key: SortKey) => {
		if (sortKey !== key) return "↕";
		return sortDir === "asc" ? "↑" : "↓";
	};

	const rankMedal = (i: number) => {
		if (i === 0) return "🥇";
		if (i === 1) return "🥈";
		return "🥉";
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center py-20">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
				<span className="ml-3 text-gray-500">口コミデータを取得中...</span>
			</div>
		);
	}

	if (error) {
		return (
			<div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
				エラー: {error}
			</div>
		);
	}

	if (!data || !kpi) return null;

	const hasSnapshot = data.snapshotDate !== null;

	return (
		<div className="space-y-5">
			{/* スコアカード */}
			<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
				<div className="bg-white border border-gray-200 rounded-xl p-4">
					<div className="text-sm text-gray-500">全園平均</div>
					<div className="text-3xl font-bold text-brand-700 mt-1">
						★ {kpi.avgRating.toFixed(2)}
					</div>
				</div>
				<div className="bg-white border border-gray-200 rounded-xl p-4">
					<div className="text-sm text-gray-500">口コミ総数</div>
					<div className="text-3xl font-bold text-gray-800 mt-1">
						{kpi.totalReviews}
						<span className="text-base font-normal text-gray-500 ml-1">件</span>
					</div>
				</div>
				<div className="bg-white border border-gray-200 rounded-xl p-4">
					<div className="text-sm text-gray-500">今月の増加数</div>
					<div className="text-3xl font-bold text-green-600 mt-1">
						{kpi.totalIncrease !== null ? (
							<>
								+{kpi.totalIncrease}
								<span className="text-base font-normal text-gray-500 ml-1">
									件
								</span>
							</>
						) : (
							<span className="text-xl text-gray-400">データなし</span>
						)}
					</div>
				</div>
				<div className="bg-white border border-gray-200 rounded-xl p-4">
					<div className="text-sm text-gray-500">目標達成園数</div>
					<div className="text-3xl font-bold text-amber-600 mt-1">
						{kpi.achievedCount !== null ? (
							<>
								{kpi.achievedCount}
								<span className="text-base font-normal text-gray-500 ml-1">
									/ {kpi.total}園
								</span>
							</>
						) : (
							<span className="text-xl text-gray-400">データなし</span>
						)}
					</div>
				</div>
			</div>

			{/* 今月のMVPランキング */}
			{hasSnapshot && (
				<div className="bg-white border border-gray-200 rounded-xl p-4">
					<h3 className="text-base font-bold text-gray-700 mb-3">
						今月の口コミ獲得ランキング
						<span className="text-xs font-normal text-gray-400 ml-2">
							（{data.snapshotDate} 比較）
						</span>
					</h3>
					{ranking.length === 0 ? (
						<p className="text-sm text-gray-400">
							今月の増加がある園はまだありません
						</p>
					) : (
						<div className="space-y-2">
							{ranking.map((r, i) => (
								<div
									key={r.placeId}
									className={`flex items-center gap-3 rounded-lg px-3 py-2.5 ${i === 0 ? "bg-amber-50 border border-amber-200" : "bg-gray-50"}`}
								>
									<span className="text-2xl w-8 text-center">
										{rankMedal(i)}
									</span>
									<div className="flex-1">
										<div className="font-semibold text-gray-800">{r.name}</div>
										<div className="text-xs text-gray-500">{r.area}</div>
									</div>
									<div className="text-right">
										<div className="text-lg font-bold text-green-600">
											+{r.monthlyIncrease}件
										</div>
										<div className="text-xs text-gray-400">
											目標 {r.monthlyGoal}件
										</div>
									</div>
									{/* 目標達成率バー */}
									<div className="w-24">
										<div className="bg-gray-200 rounded-full h-2">
											<div
												className="bg-green-500 h-2 rounded-full"
												style={{
													width: `${Math.min(
														((r.monthlyIncrease ?? 0) / r.monthlyGoal) * 100,
														100,
													)}%`,
												}}
											/>
										</div>
										<div className="text-xs text-gray-400 text-right mt-0.5">
											{Math.round(
												((r.monthlyIncrease ?? 0) / r.monthlyGoal) * 100,
											)}
											%
										</div>
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			)}

			{/* 評価分布 */}
			<div className="bg-white border border-gray-200 rounded-xl p-4">
				<h3 className="text-base font-bold text-gray-700 mb-3">評価分布</h3>
				<div className="space-y-2">
					{distribution.map((b) => (
						<div key={b.label} className="flex items-center gap-3">
							<span className="w-16 text-sm text-gray-600 text-right">
								{b.label}
							</span>
							<div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
								<div
									className={`${b.color} h-full rounded-full transition-all`}
									style={{
										width: `${kpi.total > 0 ? (b.count / kpi.total) * 100 : 0}%`,
										minWidth: b.count > 0 ? "2rem" : "0",
									}}
								/>
							</div>
							<span className="w-12 text-sm text-gray-600">{b.count}園</span>
						</div>
					))}
				</div>
			</div>

			{/* エリア別ベンチマーク */}
			<div className="bg-white border border-gray-200 rounded-xl p-4">
				<h3 className="text-base font-bold text-gray-700 mb-3">
					エリア別ベンチマーク
					{data.competitors.length === 0 && (
						<span className="text-xs font-normal text-gray-400 ml-2">
							（競合Place IDを reviewConfig.ts に追加すると比較が表示されます）
						</span>
					)}
				</h3>
				<table className="w-full text-sm">
					<thead>
						<tr className="border-b-2 border-gray-200 text-gray-600">
							<th className="text-left px-3 py-2">エリア</th>
							<th className="text-right px-3 py-2">自園数</th>
							<th className="text-right px-3 py-2">自園平均★</th>
							{data.competitors.length > 0 && (
								<>
									<th className="text-right px-3 py-2">競合数</th>
									<th className="text-right px-3 py-2">競合平均★</th>
									<th className="text-right px-3 py-2">差分</th>
								</>
							)}
						</tr>
					</thead>
					<tbody>
						{areaBenchmark.map((row) => {
							const diff =
								row.ourAvg !== null && row.compAvg !== null
									? row.ourAvg - row.compAvg
									: null;
							return (
								<tr
									key={row.area}
									className="border-b border-gray-100 hover:bg-gray-50"
								>
									<td className="px-3 py-2.5 font-medium">{row.area}</td>
									<td className="px-3 py-2.5 text-right tabular-nums">
										{row.ourCount}
									</td>
									<td className="px-3 py-2.5 text-right tabular-nums font-semibold">
										{row.ourAvg !== null ? `★${row.ourAvg.toFixed(2)}` : "-"}
									</td>
									{data.competitors.length > 0 && (
										<>
											<td className="px-3 py-2.5 text-right tabular-nums">
												{row.compCount > 0 ? row.compCount : "-"}
											</td>
											<td className="px-3 py-2.5 text-right tabular-nums">
												{row.compAvg !== null
													? `★${row.compAvg.toFixed(2)}`
													: "-"}
											</td>
											<td
												className={`px-3 py-2.5 text-right tabular-nums font-semibold ${
													diff === null
														? "text-gray-400"
														: diff >= 0
															? "text-green-600"
															: "text-red-500"
												}`}
											>
												{diff !== null
													? `${diff >= 0 ? "+" : ""}${diff.toFixed(2)}`
													: "-"}
											</td>
										</>
									)}
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>

			{/* フィルタ + テーブル */}
			<div className="bg-white border border-gray-200 rounded-xl p-4 overflow-x-auto">
				<div className="flex items-center justify-between mb-3">
					<h3 className="text-base font-bold text-gray-700">園別口コミ一覧</h3>
					<div className="flex items-center gap-2">
						<span className="text-sm text-gray-500">エリア:</span>
						<select
							value={areaFilter}
							onChange={(e) => setAreaFilter(e.target.value)}
							className="text-sm border border-gray-300 rounded-md px-2 py-1"
						>
							<option value="all">全て</option>
							{areas.map((a) => (
								<option key={a} value={a}>
									{a}
								</option>
							))}
						</select>
					</div>
				</div>

				<table className="w-full text-sm">
					<thead>
						<tr className="border-b-2 border-gray-200 text-gray-600">
							<th
								className="text-left px-3 py-2 cursor-pointer hover:text-brand-600"
								onClick={() => handleSort("name")}
							>
								園名 {sortIcon("name")}
							</th>
							<th
								className="text-left px-3 py-2 cursor-pointer hover:text-brand-600"
								onClick={() => handleSort("area")}
							>
								エリア {sortIcon("area")}
							</th>
							<th
								className="text-right px-3 py-2 cursor-pointer hover:text-brand-600"
								onClick={() => handleSort("rating")}
							>
								★評価 {sortIcon("rating")}
							</th>
							<th
								className="text-right px-3 py-2 cursor-pointer hover:text-brand-600"
								onClick={() => handleSort("reviewCount")}
							>
								累計 {sortIcon("reviewCount")}
							</th>
							{hasSnapshot && (
								<th
									className="text-right px-3 py-2 cursor-pointer hover:text-brand-600"
									onClick={() => handleSort("increase")}
								>
									今月 {sortIcon("increase")}
								</th>
							)}
							{hasSnapshot && (
								<th className="px-3 py-2 w-32 text-center">目標進捗</th>
							)}
							<th className="px-3 py-2 w-36 text-center">評価バー</th>
						</tr>
					</thead>
					<tbody>
						{filtered.map((r) => {
							const goalPct =
								r.monthlyIncrease !== null
									? Math.min((r.monthlyIncrease / r.monthlyGoal) * 100, 100)
									: 0;
							const achieved =
								r.monthlyIncrease !== null &&
								r.monthlyIncrease >= r.monthlyGoal;
							return (
								<tr
									key={r.placeId}
									className="border-b border-gray-100 hover:bg-gray-50"
								>
									<td className="px-3 py-2.5 font-medium">{r.name}</td>
									<td className="px-3 py-2.5 text-gray-600">{r.area}</td>
									<td className="px-3 py-2.5 text-right tabular-nums font-semibold">
										{r.rating !== null ? `★${r.rating.toFixed(1)}` : "-"}
									</td>
									<td className="px-3 py-2.5 text-right tabular-nums">
										{r.reviewCount}
									</td>
									{hasSnapshot && (
										<td
											className={`px-3 py-2.5 text-right tabular-nums ${
												r.monthlyIncrease !== null
													? increaseColor(r.monthlyIncrease)
													: "text-gray-300"
											}`}
										>
											{r.monthlyIncrease !== null
												? r.monthlyIncrease > 0
													? `+${r.monthlyIncrease}`
													: String(r.monthlyIncrease)
												: "-"}
										</td>
									)}
									{hasSnapshot && (
										<td className="px-3 py-2.5">
											<div className="flex items-center gap-1">
												<div className="flex-1 bg-gray-100 rounded-full h-2">
													<div
														className={`${achieved ? "bg-green-500" : "bg-brand-400"} h-2 rounded-full`}
														style={{ width: `${goalPct}%` }}
													/>
												</div>
												<span className="text-xs text-gray-400 w-8 text-right">
													{r.monthlyIncrease !== null
														? `${r.monthlyIncrease}/${r.monthlyGoal}`
														: "-"}
												</span>
											</div>
										</td>
									)}
									<td className="px-3 py-2.5">
										<div className="bg-gray-100 rounded-full h-4 overflow-hidden">
											<div
												className={`${ratingColor(r.rating)} h-full rounded-full`}
												style={{
													width: `${r.rating !== null ? (r.rating / 5) * 100 : 0}%`,
												}}
											/>
										</div>
									</td>
								</tr>
							);
						})}
					</tbody>
					{/* 合計行 */}
					<tfoot>
						<tr className="bg-brand-50 font-bold border-t-2 border-brand-300">
							<td className="px-3 py-2.5 text-brand-800" colSpan={2}>
								合計 / 平均
							</td>
							<td className="px-3 py-2.5 text-right text-brand-800">
								★ {kpi.avgRating.toFixed(2)}
							</td>
							<td className="px-3 py-2.5 text-right text-brand-800 tabular-nums">
								{kpi.totalReviews}
							</td>
							{hasSnapshot && (
								<td className="px-3 py-2.5 text-right text-green-700 tabular-nums font-bold">
									{kpi.totalIncrease !== null ? `+${kpi.totalIncrease}` : "-"}
								</td>
							)}
							{hasSnapshot && <td />}
							<td />
						</tr>
					</tfoot>
				</table>
			</div>

			{/* 更新時刻 */}
			<div className="text-xs text-gray-400 text-right space-y-0.5">
				{data.snapshotDate && (
					<div>基準スナップショット: {data.snapshotDate}</div>
				)}
				<div>最終更新: {new Date(data.fetchedAt).toLocaleString("ja-JP")}</div>
			</div>
		</div>
	);
}
