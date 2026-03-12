"use client";

import { useEffect, useState, useMemo } from "react";

interface ReviewData {
	name: string;
	area: string;
	placeId: string;
	rating: number | null;
	reviewCount: number;
}

interface ReviewsResponse {
	reviews: ReviewData[];
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

/** ★表示 */
function StarDisplay({ rating }: { rating: number | null }) {
	if (rating === null) return <span className="text-gray-400">-</span>;
	return (
		<span className="font-semibold tabular-nums">{rating.toFixed(1)}</span>
	);
}

type SortKey = "name" | "area" | "rating" | "reviewCount";
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
		return [...new Set(data.reviews.map((r) => r.area))].sort();
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
		return {
			avgRating,
			totalReviews,
			above4,
			noReviews,
			total: reviews.length,
		};
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
					<div className="text-sm text-gray-500">★4以上</div>
					<div className="text-3xl font-bold text-green-600 mt-1">
						{kpi.above4}
						<span className="text-base font-normal text-gray-500 ml-1">
							/ {kpi.total}園
						</span>
					</div>
				</div>
				<div className="bg-white border border-gray-200 rounded-xl p-4">
					<div className="text-sm text-gray-500">口コミ0件</div>
					<div className="text-3xl font-bold text-amber-600 mt-1">
						{kpi.noReviews}
						<span className="text-base font-normal text-gray-500 ml-1">園</span>
					</div>
				</div>
			</div>

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
								件数 {sortIcon("reviewCount")}
							</th>
							<th className="px-3 py-2 w-40">評価バー</th>
						</tr>
					</thead>
					<tbody>
						{filtered.map((r) => (
							<tr
								key={r.placeId}
								className="border-b border-gray-100 hover:bg-gray-50"
							>
								<td className="px-3 py-2.5 font-medium">{r.name}</td>
								<td className="px-3 py-2.5 text-gray-600">{r.area}</td>
								<td className="px-3 py-2.5 text-right">
									<StarDisplay rating={r.rating} />
								</td>
								<td className="px-3 py-2.5 text-right tabular-nums">
									{r.reviewCount}
								</td>
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
						))}
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
							<td />
						</tr>
					</tfoot>
				</table>
			</div>

			{/* 更新時刻 */}
			<div className="text-xs text-gray-400 text-right">
				最終更新: {new Date(data.fetchedAt).toLocaleString("ja-JP")}
			</div>
		</div>
	);
}
