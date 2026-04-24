"use client";

import { useEffect, useState, useMemo } from "react";
import type {
	GroupCapacityData,
	GroupCapacityNursery,
} from "@/app/api/group-capacity/route";
import type { BrandCategory } from "@/config/brandConfig";
import ScrollableTable from "@/components/ui/ScrollableTable";

type CategoryFilter = "all" | BrandCategory;
type SortKey = "brand" | "company" | "name" | "capacity" | "enrolled" | "rate";
type SortDir = "asc" | "desc";

function rateColor(rate: number): string {
	if (rate > 100) return "text-blue-600";
	if (rate === 100) return "text-gray-900";
	if (rate < 60) return "text-red-600";
	return "text-gray-700";
}

export default function GroupCapacityPanel() {
	const [data, setData] = useState<GroupCapacityData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
	const [brandFilter, setBrandFilter] = useState<string>("all");
	const [sortKey, setSortKey] = useState<SortKey>("rate");
	const [sortDir, setSortDir] = useState<SortDir>("asc");

	useEffect(() => {
		fetch("/api/group-capacity")
			.then((r) => r.json())
			.then((d) => {
				if (d.error) setError(d.error);
				else setData(d);
				setLoading(false);
			})
			.catch((e) => {
				setError(String(e));
				setLoading(false);
			});
	}, []);

	const brandOptions = useMemo(() => {
		if (!data) return [];
		const set = new Set<string>();
		for (const n of data.nurseries) {
			if (categoryFilter === "all" || n.category === categoryFilter) {
				set.add(n.brand);
			}
		}
		return Array.from(set).sort();
	}, [data, categoryFilter]);

	const filtered = useMemo(() => {
		if (!data) return [];
		let list = data.nurseries;
		if (categoryFilter !== "all") {
			list = list.filter((n) => n.category === categoryFilter);
		}
		if (brandFilter !== "all") {
			list = list.filter((n) => n.brand === brandFilter);
		}
		return [...list].sort((a, b) => {
			const dir = sortDir === "asc" ? 1 : -1;
			if (sortKey === "brand") return a.brand.localeCompare(b.brand) * dir;
			if (sortKey === "company")
				return a.company.localeCompare(b.company) * dir;
			if (sortKey === "name") return a.name.localeCompare(b.name) * dir;
			if (sortKey === "capacity")
				return (a.totalCapacity - b.totalCapacity) * dir;
			if (sortKey === "enrolled")
				return (a.totalEnrolled - b.totalEnrolled) * dir;
			const rateA = a.totalCapacity > 0 ? a.totalEnrolled / a.totalCapacity : 0;
			const rateB = b.totalCapacity > 0 ? b.totalEnrolled / b.totalCapacity : 0;
			return (rateA - rateB) * dir;
		});
	}, [data, categoryFilter, brandFilter, sortKey, sortDir]);

	const brandSummary = useMemo(() => {
		if (!data) return [];
		const map = new Map<
			string,
			{
				category: BrandCategory;
				brand: string;
				count: number;
				cap: number;
				enr: number;
			}
		>();
		for (const n of data.nurseries) {
			const key = `${n.category}|${n.brand}`;
			if (!map.has(key)) {
				map.set(key, {
					category: n.category,
					brand: n.brand,
					count: 0,
					cap: 0,
					enr: 0,
				});
			}
			const b = map.get(key)!;
			b.count += 1;
			b.cap += n.totalCapacity;
			b.enr += n.totalEnrolled;
		}
		return Array.from(map.values()).sort((a, b) => {
			if (a.category !== b.category) return a.category === "自社" ? -1 : 1;
			return b.count - a.count;
		});
	}, [data]);

	const handleSort = (key: SortKey) => {
		if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
		else {
			setSortKey(key);
			setSortDir(key === "rate" ? "asc" : "desc");
		}
	};
	const sortIcon = (key: SortKey) => {
		if (sortKey !== key) return "↕";
		return sortDir === "asc" ? "↑" : "↓";
	};

	if (loading) {
		return (
			<div className="bg-white shadow-sm p-6 text-center text-sm text-gray-500">
				グループ定員データを取得中...
			</div>
		);
	}
	if (error || !data) {
		return (
			<div className="bg-white shadow-sm p-5">
				<h3 className="text-base font-bold text-gray-700 mb-2">
					グループ定員充足率
				</h3>
				<p className="text-sm text-gray-500">{error ?? "データなし"}</p>
			</div>
		);
	}

	const totalCap = filtered.reduce((s, n) => s + n.totalCapacity, 0);
	const totalEnr = filtered.reduce((s, n) => s + n.totalEnrolled, 0);
	const totalRate = totalCap > 0 ? Math.round((totalEnr / totalCap) * 100) : 0;

	return (
		<div className="bg-white shadow-sm">
			{/* ヘッダー */}
			<div className="px-3 md:px-5 pt-4 pb-3 border-b border-gray-100 space-y-3">
				<div>
					<h3 className="text-base font-bold text-gray-700">
						グループ定員充足率
					</h3>
					<p className="text-xs text-gray-500 mt-0.5">
						データ取得日: {data.exportedAt} / 対象年月:{" "}
						{data.yearMonth
							? `${data.yearMonth.slice(0, 4)}/${data.yearMonth.slice(4)}`
							: "-"}
						／ ソース: SOU本部 enji_list.csv
					</p>
				</div>
				<div className="flex items-center gap-2 flex-wrap">
					<div className="flex items-center gap-2">
						<span className="text-xs text-gray-500 whitespace-nowrap">
							分類:
						</span>
						<select
							value={categoryFilter}
							onChange={(e) => {
								setCategoryFilter(e.target.value as CategoryFilter);
								setBrandFilter("all");
							}}
							className="text-sm border border-gray-300 rounded-md px-2 py-1.5 min-h-11"
						>
							<option value="all">全て</option>
							<option value="自社">自社運営</option>
							<option value="グループ">グループ他ブランド</option>
						</select>
					</div>
					<div className="flex items-center gap-2">
						<span className="text-xs text-gray-500 whitespace-nowrap">
							ブランド:
						</span>
						<select
							value={brandFilter}
							onChange={(e) => setBrandFilter(e.target.value)}
							className="text-sm border border-gray-300 rounded-md px-2 py-1.5 min-h-11"
						>
							<option value="all">全て</option>
							{brandOptions.map((b) => (
								<option key={b} value={b}>
									{b}
								</option>
							))}
						</select>
					</div>
				</div>
			</div>

			{/* サマリーKPI */}
			<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 p-3 md:p-5">
				<div className="text-center">
					<div className="text-xs text-gray-500 mb-1">園数</div>
					<div className="text-2xl font-bold text-gray-900">
						{filtered.length}園
					</div>
				</div>
				<div className="text-center">
					<div className="text-xs text-gray-500 mb-1">総定員 / 在籍</div>
					<div className="text-2xl font-bold text-gray-900 tabular-nums">
						{totalEnr}/{totalCap}
					</div>
				</div>
				<div className="text-center">
					<div className="text-xs text-gray-500 mb-1">充足率</div>
					<div
						className={`text-2xl font-bold tabular-nums ${rateColor(totalRate)}`}
					>
						{totalRate}%
					</div>
				</div>
			</div>

			{/* ブランド別サマリー */}
			<div className="border-t border-gray-100">
				<div className="px-3 md:px-5 py-3 text-sm font-semibold text-gray-700">
					ブランド別サマリー
				</div>
				<ScrollableTable minWidth={640} maxHeight={400} showScrollHint={false}>
					<table className="w-full text-sm">
						<thead className="sticky top-0 z-10 bg-gray-50 border-b-2 border-gray-200 text-gray-600">
							<tr>
								<th className="text-left px-4 py-2 whitespace-nowrap">
									カテゴリ
								</th>
								<th className="text-left px-4 py-2 whitespace-nowrap">
									ブランド
								</th>
								<th className="text-center px-4 py-2 whitespace-nowrap">
									園数
								</th>
								<th className="text-center px-4 py-2 whitespace-nowrap">
									総定員
								</th>
								<th className="text-center px-4 py-2 whitespace-nowrap">
									在籍
								</th>
								<th className="text-center px-4 py-2 whitespace-nowrap">
									充足率
								</th>
							</tr>
						</thead>
						<tbody>
							{brandSummary.map((b) => {
								const rate = b.cap > 0 ? Math.round((b.enr / b.cap) * 100) : 0;
								return (
									<tr
										key={`${b.category}|${b.brand}`}
										className="border-b border-gray-100 hover:bg-gray-50"
									>
										<td className="px-4 py-2">
											<span
												className={`inline-block px-2 py-0.5 text-xs ${b.category === "自社" ? "bg-brand-50 text-brand-700" : "bg-gray-100 text-gray-600"}`}
											>
												{b.category}
											</span>
										</td>
										<td className="px-4 py-2 font-medium text-gray-800 whitespace-nowrap">
											{b.brand}
										</td>
										<td className="px-4 py-2 text-center tabular-nums text-gray-700">
											{b.count}園
										</td>
										<td className="px-4 py-2 text-center tabular-nums text-gray-700">
											{b.cap}
										</td>
										<td className="px-4 py-2 text-center tabular-nums text-gray-700">
											{b.enr}
										</td>
										<td
											className={`px-4 py-2 text-center tabular-nums font-semibold ${rateColor(rate)}`}
										>
											{rate}%
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</ScrollableTable>
			</div>

			{/* 園別一覧 */}
			<div className="border-t border-gray-100 mt-2">
				<div className="px-3 md:px-5 py-3 text-sm font-semibold text-gray-700">
					園別一覧（{filtered.length}園）
				</div>
				<ScrollableTable minWidth={900} maxHeight={600}>
					<table className="w-full text-sm">
						<thead className="sticky top-0 z-10 bg-gray-50 border-b-2 border-gray-200 text-gray-600">
							<tr>
								<th className="text-left px-3 py-2 whitespace-nowrap">
									カテゴリ
								</th>
								<th
									className="text-left px-3 py-2 cursor-pointer hover:text-brand-600 whitespace-nowrap"
									onClick={() => handleSort("brand")}
								>
									ブランド {sortIcon("brand")}
								</th>
								<th
									className="text-left px-3 py-2 cursor-pointer hover:text-brand-600 whitespace-nowrap"
									onClick={() => handleSort("name")}
								>
									園名 {sortIcon("name")}
								</th>
								<th className="text-left px-3 py-2 whitespace-nowrap">区分</th>
								<th
									className="text-center px-3 py-2 cursor-pointer hover:text-brand-600 whitespace-nowrap"
									onClick={() => handleSort("capacity")}
								>
									定員 {sortIcon("capacity")}
								</th>
								<th
									className="text-center px-3 py-2 cursor-pointer hover:text-brand-600 whitespace-nowrap"
									onClick={() => handleSort("enrolled")}
								>
									在籍 {sortIcon("enrolled")}
								</th>
								<th
									className="text-center px-3 py-2 cursor-pointer hover:text-brand-600 whitespace-nowrap"
									onClick={() => handleSort("rate")}
								>
									充足率 {sortIcon("rate")}
								</th>
							</tr>
						</thead>
						<tbody>
							{filtered.map((n) => {
								const rate =
									n.totalCapacity > 0
										? Math.round((n.totalEnrolled / n.totalCapacity) * 100)
										: 0;
								return (
									<tr
										key={n.rawName}
										className="border-b border-gray-100 hover:bg-gray-50"
									>
										<td className="px-3 py-1.5">
											<span
												className={`inline-block px-2 py-0.5 text-xs ${n.category === "自社" ? "bg-brand-50 text-brand-700" : "bg-gray-100 text-gray-600"}`}
											>
												{n.category}
											</span>
										</td>
										<td className="px-3 py-1.5 text-gray-600 whitespace-nowrap">
											{n.brand}
										</td>
										<td className="px-3 py-1.5 text-gray-800 whitespace-nowrap">
											{n.name}
										</td>
										<td className="px-3 py-1.5 text-gray-500 text-xs whitespace-nowrap">
											{n.management}
											{n.form ? ` / ${n.form}` : ""}
										</td>
										<td className="px-3 py-1.5 text-center tabular-nums text-gray-700">
											{n.totalCapacity}
										</td>
										<td className="px-3 py-1.5 text-center tabular-nums text-gray-700">
											{n.totalEnrolled}
										</td>
										<td
											className={`px-3 py-1.5 text-center tabular-nums font-semibold ${rateColor(rate)}`}
										>
											{rate}%
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</ScrollableTable>
			</div>
		</div>
	);
}
