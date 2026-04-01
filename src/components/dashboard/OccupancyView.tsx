"use client";

import { useEffect, useState, useMemo } from "react";
import type { OccupancyNursery } from "@/app/api/occupancy/route";
import GaugeChart from "@/components/charts/GaugeChart";

interface OccupancyResponse {
	nurseries: OccupancyNursery[];
	yearMonth: string | null;
	fetchedAt: string;
}

const AGE_LABELS = ["0歳", "1歳", "2歳", "3歳", "4歳", "5歳"] as const;

function rateColor(enrolled: number, capacity: number): string {
	if (capacity === 0) return "text-gray-400";
	const rate = enrolled / capacity;
	if (rate > 1) return "bg-red-100 text-red-800 font-bold";
	if (rate >= 0.95) return "bg-green-100 text-green-800";
	if (rate >= 0.8) return "bg-blue-50 text-blue-800";
	if (rate >= 0.6) return "bg-amber-50 text-amber-800";
	return "bg-red-50 text-red-800 font-bold";
}

function cellDisplay(enrolled: number, capacity: number): string {
	if (capacity === 0 && enrolled === 0) return "-";
	if (capacity === 0) return `${enrolled}`;
	return `${enrolled}/${capacity}`;
}

type SortKey = "nursery" | "area" | "total" | "rate";

export default function OccupancyView() {
	const [data, setData] = useState<OccupancyResponse | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [sortKey, setSortKey] = useState<SortKey>("rate");
	const [sortAsc, setSortAsc] = useState(true);
	const [areaFilter, setAreaFilter] = useState("all");

	useEffect(() => {
		fetch("/api/occupancy")
			.then((res) => res.json())
			.then((d) => {
				if (d.error) {
					setError(d.error);
				} else {
					setData(d);
				}
				setLoading(false);
			})
			.catch((e) => {
				setError(String(e));
				setLoading(false);
			});
	}, []);

	const areas = useMemo(() => {
		if (!data) return [];
		return Array.from(new Set(data.nurseries.map((n) => n.area)))
			.filter(Boolean)
			.sort();
	}, [data]);

	const filtered = useMemo(() => {
		if (!data) return [];
		let list = data.nurseries;
		if (areaFilter !== "all") {
			list = list.filter((n) => n.area === areaFilter);
		}
		return [...list].sort((a, b) => {
			const dir = sortAsc ? 1 : -1;
			if (sortKey === "nursery")
				return a.nursery.localeCompare(b.nursery) * dir;
			if (sortKey === "area") return a.area.localeCompare(b.area) * dir;
			const totalA = a.enrolled.reduce((s, v) => s + v, 0);
			const totalB = b.enrolled.reduce((s, v) => s + v, 0);
			const capA = a.capacity.reduce((s, v) => s + v, 0);
			const capB = b.capacity.reduce((s, v) => s + v, 0);
			if (sortKey === "total") return (totalA - totalB) * dir;
			const rateA = capA > 0 ? totalA / capA : 0;
			const rateB = capB > 0 ? totalB / capB : 0;
			return (rateA - rateB) * dir;
		});
	}, [data, sortKey, sortAsc, areaFilter]);

	const handleSort = (key: SortKey) => {
		if (sortKey === key) {
			setSortAsc(!sortAsc);
		} else {
			setSortKey(key);
			setSortAsc(key === "nursery" || key === "area");
		}
	};

	const sortIcon = (key: SortKey) => {
		if (sortKey !== key) return "↕";
		return sortAsc ? "↑" : "↓";
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center py-20">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
				<span className="ml-3 text-gray-500">定員充足率データを取得中...</span>
			</div>
		);
	}

	if (error) {
		return (
			<div className="bg-red-50 border border-red-200 p-4 text-red-700">
				エラー: {error}
			</div>
		);
	}

	if (!data || data.nurseries.length === 0) {
		return (
			<div className="bg-gray-50 border border-gray-200 rounded p-4">
				<p className="text-sm text-gray-600">
					定員充足率データがありません。「園児数」シートにデータを追加してください。
				</p>
			</div>
		);
	}

	// 全体集計
	const totals = data.nurseries.reduce(
		(acc, n) => {
			for (let i = 0; i < 6; i++) {
				acc.capacity[i] += n.capacity[i];
				acc.enrolled[i] += n.enrolled[i];
			}
			return acc;
		},
		{ capacity: [0, 0, 0, 0, 0, 0], enrolled: [0, 0, 0, 0, 0, 0] },
	);
	const grandCap = totals.capacity.reduce((s, v) => s + v, 0);
	const grandEnr = totals.enrolled.reduce((s, v) => s + v, 0);

	// 異常値（充足率100%超の園）
	const alerts = data.nurseries
		.map((n) => {
			const cap = n.capacity.reduce((s, v) => s + v, 0);
			const enr = n.enrolled.reduce((s, v) => s + v, 0);
			return { nursery: n.nursery, cap, enr, rate: cap > 0 ? enr / cap : 0 };
		})
		.filter((a) => a.rate > 1);

	return (
		<div className="space-y-5">
			{/* サマリーゲージ */}
			<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
				{AGE_LABELS.map((label, i) => {
					const cap = totals.capacity[i];
					const enr = totals.enrolled[i];
					const pct = cap > 0 ? Math.round((enr / cap) * 100) : 0;
					return (
						<div
							key={label}
							className="bg-white rounded shadow-sm p-3 text-center"
						>
							<div className="text-xs text-gray-500 mb-1">{label}</div>
							<div className="text-xl font-bold text-gray-900">{pct}%</div>
							<div className="text-xs text-gray-400">
								{enr}/{cap}
							</div>
							<div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
								<div
									className={`h-full rounded-full ${pct >= 95 ? "bg-green-500" : pct >= 80 ? "bg-brand-500" : "bg-red-500"}`}
									style={{ width: `${Math.min(pct, 100)}%` }}
								/>
							</div>
						</div>
					);
				})}
				{/* 全体ゲージ */}
				<div className="bg-brand-50 border border-brand-200 p-3 text-center col-span-2 sm:col-span-1">
					<div className="text-xs text-brand-600 mb-0.5 font-semibold">
						全体
					</div>
					<GaugeChart
						value={grandCap > 0 ? Math.round((grandEnr / grandCap) * 100) : 0}
						label={`${grandEnr}/${grandCap}名`}
						height={140}
					/>
				</div>
			</div>

			{/* 超過アラート */}
			{alerts.length > 0 && (
				<div className="bg-red-50 border border-red-200 rounded p-3">
					<div className="text-sm font-semibold text-red-700 mb-1">
						定員超過の園
					</div>
					<div className="text-sm text-red-600 space-y-0.5">
						{alerts.map((a) => (
							<div key={a.nursery}>
								{a.nursery}: {a.enr}/{a.cap}名（
								{Math.round(a.rate * 100)}%）
							</div>
						))}
					</div>
				</div>
			)}

			{/* フィルタ + テーブル */}
			<div className="bg-white shadow-sm p-5 overflow-x-auto">
				<div className="flex items-center justify-between mb-3">
					<h3 className="text-base font-bold text-gray-700">
						園別×年齢クラス（{data.yearMonth}）
					</h3>
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
						<tr className="bg-gray-50 border-b-2 border-gray-200 text-gray-600">
							<th
								className="text-left px-3 py-2 cursor-pointer hover:text-brand-600"
								onClick={() => handleSort("nursery")}
							>
								園名 {sortIcon("nursery")}
							</th>
							<th
								className="text-left px-3 py-2 cursor-pointer hover:text-brand-600"
								onClick={() => handleSort("area")}
							>
								エリア {sortIcon("area")}
							</th>
							{AGE_LABELS.map((label) => (
								<th key={label} className="text-center px-3 py-2 font-semibold">
									{label}
								</th>
							))}
							<th
								className="text-center px-3 py-2 cursor-pointer hover:text-brand-600"
								onClick={() => handleSort("total")}
							>
								合計 {sortIcon("total")}
							</th>
							<th
								className="text-center px-3 py-2 cursor-pointer hover:text-brand-600"
								onClick={() => handleSort("rate")}
							>
								充足率 {sortIcon("rate")}
							</th>
						</tr>
					</thead>
					<tbody>
						{filtered.map((row) => {
							const totalCap = row.capacity.reduce((a, b) => a + b, 0);
							const totalEnr = row.enrolled.reduce((a, b) => a + b, 0);
							const rate =
								totalCap > 0 ? Math.round((totalEnr / totalCap) * 100) : 0;
							return (
								<tr
									key={row.nursery}
									className="border-b border-gray-100 hover:bg-gray-50"
								>
									<td className="px-3 py-2 font-medium text-gray-800">
										{row.nursery}
									</td>
									<td className="px-3 py-2 text-gray-500">{row.area}</td>
									{AGE_LABELS.map((_, i) => (
										<td
											key={i}
											className={`px-3 py-2 text-center tabular-nums ${rateColor(row.enrolled[i], row.capacity[i])}`}
										>
											{cellDisplay(row.enrolled[i], row.capacity[i])}
										</td>
									))}
									<td className="px-3 py-2 text-center tabular-nums font-semibold">
										{totalEnr}/{totalCap}
									</td>
									<td
										className={`px-3 py-2 text-center tabular-nums font-bold ${rateColor(totalEnr, totalCap)}`}
									>
										{totalCap > 0 ? `${rate}%` : "-"}
									</td>
								</tr>
							);
						})}
					</tbody>
					<tfoot>
						<tr className="bg-brand-50 font-bold border-t-2 border-brand-300">
							<td className="px-3 py-2 text-brand-800" colSpan={2}>
								合計（{filtered.length}園）
							</td>
							{AGE_LABELS.map((_, i) => {
								const cap = filtered.reduce((s, n) => s + n.capacity[i], 0);
								const enr = filtered.reduce((s, n) => s + n.enrolled[i], 0);
								return (
									<td
										key={i}
										className="px-3 py-2 text-center tabular-nums text-brand-800"
									>
										{enr}/{cap}
									</td>
								);
							})}
							{(() => {
								const fCap = filtered.reduce(
									(s, n) => s + n.capacity.reduce((a, b) => a + b, 0),
									0,
								);
								const fEnr = filtered.reduce(
									(s, n) => s + n.enrolled.reduce((a, b) => a + b, 0),
									0,
								);
								return (
									<>
										<td className="px-3 py-2 text-center tabular-nums text-brand-800">
											{fEnr}/{fCap}
										</td>
										<td className="px-3 py-2 text-center tabular-nums text-brand-800">
											{fCap > 0 ? `${Math.round((fEnr / fCap) * 100)}%` : "-"}
										</td>
									</>
								);
							})()}
						</tr>
					</tfoot>
				</table>
			</div>

			{/* 更新時刻 */}
			<div className="text-xs text-gray-400 text-right">
				データ年月: {data.yearMonth} / 最終取得:{" "}
				{new Date(data.fetchedAt).toLocaleString("ja-JP")}
			</div>
		</div>
	);
}
