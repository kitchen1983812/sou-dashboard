"use client";

import { useMemo, useState, useEffect } from "react";
import { Applicant, RecruitCost } from "@/types/recruit";
import {
	filterApplicantsByFY,
	filterCostsByFY,
	computeCostSummaryGrid,
	computeMonthlyCostTrend,
	computeAgencyCost,
	computeNurseryEmploymentCost,
} from "@/lib/recruitUtils";
import { getCurrentFY, parseDate, getFiscalYear } from "@/lib/dashboardUtils";
import {
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	Legend,
	LineChart,
	Line,
	ComposedChart,
	ResponsiveContainer,
} from "recharts";
import DualAxisChart from "@/components/charts/DualAxisChart";

const CATEGORY_COLORS: Record<string, string> = {
	"保育:正社員": "#008cc9", // brand-500
	"保育:パート": "#4db5e3", // brand-300
	"他:正社員": "#0078ab", // brand-600
	"他:パート": "#80caeb", // brand-200
	合計: "#6B7280", // gray-500
};

interface RecruitCostViewProps {
	applicants: Applicant[];
	recruitCosts: RecruitCost[];
}

export default function RecruitCostView({
	applicants,
	recruitCosts,
}: RecruitCostViewProps) {
	const currentFY = getCurrentFY();
	const [selectedFY, setSelectedFY] = useState(currentFY);

	// FY一覧
	const availableFYs = useMemo(() => {
		const fySet = new Set<number>();
		recruitCosts.forEach((c) => {
			const d = parseDate(c.aggregateYearMonth);
			if (d) {
				fySet.add(getFiscalYear(d));
			} else {
				const y = Number(c.year);
				const m = Number(c.month);
				if (!isNaN(y) && !isNaN(m)) {
					fySet.add(m >= 4 ? y : y - 1);
				}
			}
		});
		return Array.from(fySet).sort((a, b) => b - a);
	}, [recruitCosts]);

	// データに選択FYが存在しない場合、最新の有効FYに切り替え
	useEffect(() => {
		if (availableFYs.length > 0 && !availableFYs.includes(selectedFY)) {
			setSelectedFY(availableFYs[0]);
		}
	}, [availableFYs, selectedFY]);

	// FYフィルタ適用
	const fyApplicants = useMemo(
		() => filterApplicantsByFY(applicants, selectedFY),
		[applicants, selectedFY],
	);
	const fyCosts = useMemo(
		() => filterCostsByFY(recruitCosts, selectedFY),
		[recruitCosts, selectedFY],
	);

	// サマリーグリッド
	const summaryGrid = useMemo(
		() => computeCostSummaryGrid(fyApplicants, fyCosts),
		[fyApplicants, fyCosts],
	);

	// カテゴリ別月次推移
	const categories = ["保育:正社員", "保育:パート", "他:正社員", "他:パート"];
	const monthlyTrends = useMemo(() => {
		const result: Record<
			string,
			ReturnType<typeof computeMonthlyCostTrend>
		> = {};
		categories.forEach((cat) => {
			result[cat] = computeMonthlyCostTrend(
				fyCosts,
				fyApplicants,
				selectedFY,
				cat,
			);
		});
		result["合計"] = computeMonthlyCostTrend(fyCosts, fyApplicants, selectedFY);
		return result;
	}, [fyCosts, fyApplicants, selectedFY]);

	// 媒体別コスト
	const agencyCosts = useMemo(
		() => computeAgencyCost(fyApplicants, fyCosts),
		[fyApplicants, fyCosts],
	);

	// 園×雇用形態別コスト
	const nurseryEmpCosts = useMemo(
		() => computeNurseryEmploymentCost(fyApplicants, fyCosts),
		[fyApplicants, fyCosts],
	);

	// 園別小計（ピボット表示用）
	const nurseryPivot = useMemo(() => {
		const map = new Map<
			string,
			{
				nursery: string;
				byType: Record<string, number>;
				total: number;
				hires: number;
			}
		>();
		for (const row of nurseryEmpCosts) {
			if (!map.has(row.nursery)) {
				map.set(row.nursery, {
					nursery: row.nursery,
					byType: {},
					total: 0,
					hires: 0,
				});
			}
			const entry = map.get(row.nursery)!;
			entry.byType[row.employmentType] =
				(entry.byType[row.employmentType] || 0) + row.cost;
			entry.total += row.cost;
			entry.hires += row.hires;
		}
		return Array.from(map.values()).sort((a, b) => b.total - a.total);
	}, [nurseryEmpCosts]);

	// 雇用形態のユニーク一覧
	const empTypes = useMemo(() => {
		const set = new Set<string>();
		for (const row of nurseryEmpCosts) set.add(row.employmentType);
		return Array.from(set).sort();
	}, [nurseryEmpCosts]);

	// 採用単価推移（4系列比較）
	const unitCostTrend = useMemo(() => {
		const months = monthlyTrends["合計"];
		return months.map((m, i) => {
			const row: Record<string, string | number> = { month: m.month };
			categories.forEach((cat) => {
				row[cat] = monthlyTrends[cat][i]?.unitCost || 0;
			});
			return row;
		});
	}, [monthlyTrends]);

	return (
		<div className="space-y-5">
			{/* FYセレクター */}
			<div className="flex flex-wrap items-center gap-2">
				{availableFYs.map((fy) => (
					<button
						key={fy}
						onClick={() => setSelectedFY(fy)}
						className={`px-3 py-1.5 text-sm rounded border transition-colors ${
							selectedFY === fy
								? "bg-brand-500 text-white border-brand-500"
								: "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
						}`}
					>
						FY{String(fy).slice(2)}
					</button>
				))}
			</div>

			{/* サマリーグリッド */}
			<div className="bg-white shadow-sm p-5">
				<h3 className="text-sm font-semibold text-gray-700 mb-3">
					採用費サマリー（FY{String(selectedFY).slice(2)}）
				</h3>
				<div className="grid grid-cols-2 md:grid-cols-5 gap-3">
					{summaryGrid.map((row) => (
						<div
							key={row.category}
							className={`p-3 shadow-sm ${
								row.category === "合計" ? "bg-gray-50" : "bg-white"
							}`}
						>
							<div className="text-sm text-gray-500 mb-1">
								{row.category === "合計" ? (
									<span className="font-bold">合計</span>
								) : (
									row.category
								)}
							</div>
							<div className="text-lg font-bold text-gray-800">
								¥{row.cost.toLocaleString()}
							</div>
							<div className="flex justify-between mt-1 text-sm text-gray-500">
								<span>入社: {row.hires}名</span>
								<span>
									単価:{" "}
									{row.unitCost > 0 ? `¥${row.unitCost.toLocaleString()}` : "-"}
								</span>
							</div>
						</div>
					))}
				</div>
			</div>

			{/* 月次コスト × 採用人数（二軸チャート） */}
			<div className="bg-white shadow-sm p-5">
				<h3 className="text-sm font-semibold text-gray-700 mb-3">
					月次採用コスト × 採用人数
				</h3>
				<DualAxisChart
					data={monthlyTrends["合計"]}
					xKey="month"
					leftSeries={[
						{
							key: "cost",
							name: "採用コスト",
							color: "#008cc9",
							type: "bar",
						},
					]}
					rightSeries={[
						{
							key: "hires",
							name: "採用人数",
							color: "#16a34a",
							type: "line",
						},
					]}
					leftLabel="コスト（円）"
					rightLabel="採用人数（名）"
					height={280}
				/>
			</div>

			{/* 採用単価推移 */}
			<div className="bg-white shadow-sm p-5">
				<h3 className="text-sm font-semibold text-gray-700 mb-3">
					カテゴリ別 採用単価推移
				</h3>
				<ResponsiveContainer width="100%" height={300}>
					<LineChart data={unitCostTrend}>
						<CartesianGrid strokeDasharray="3 3" />
						<XAxis dataKey="month" tick={{ fontSize: 11 }} />
						<YAxis
							tick={{ fontSize: 11 }}
							tickFormatter={(v) =>
								v >= 10000 ? `${Math.round(v / 10000)}万` : `${v}`
							}
						/>
						<Tooltip
							formatter={(value: number) => `¥${value.toLocaleString()}`}
						/>
						<Legend />
						{categories.map((cat) => (
							<Line
								key={cat}
								type="monotone"
								dataKey={cat}
								stroke={CATEGORY_COLORS[cat]}
								strokeWidth={2}
								dot={{ r: 3 }}
								name={cat}
								connectNulls
							/>
						))}
					</LineChart>
				</ResponsiveContainer>
			</div>

			{/* 全体月次推移 */}
			<div className="bg-white shadow-sm p-5">
				<h3 className="text-sm font-semibold text-gray-700 mb-3">
					全体 — 月次推移
				</h3>
				<ResponsiveContainer width="100%" height={280}>
					<ComposedChart data={monthlyTrends["合計"]}>
						<CartesianGrid strokeDasharray="3 3" />
						<XAxis dataKey="month" tick={{ fontSize: 11 }} />
						<YAxis
							yAxisId="cost"
							tick={{ fontSize: 11 }}
							tickFormatter={(v) =>
								v >= 10000 ? `${Math.round(v / 10000)}万` : `${v}`
							}
						/>
						<YAxis
							yAxisId="hires"
							orientation="right"
							tick={{ fontSize: 11 }}
						/>
						<Tooltip
							formatter={(value: number, name: string) =>
								name === "費用"
									? `¥${value.toLocaleString()}`
									: name === "採用単価"
										? `¥${value.toLocaleString()}`
										: `${value}名`
							}
						/>
						<Legend />
						<Bar
							yAxisId="cost"
							dataKey="cost"
							fill="#6B7280"
							name="費用"
							opacity={0.7}
						/>
						<Line
							yAxisId="hires"
							type="monotone"
							dataKey="hires"
							stroke="#008cc9"
							strokeWidth={2}
							dot={{ r: 3 }}
							name="入社数"
						/>
					</ComposedChart>
				</ResponsiveContainer>
			</div>

			{/* 媒体別コスト */}
			{agencyCosts.length > 0 && (
				<div className="bg-white shadow-sm p-5 overflow-x-auto">
					<h3 className="text-sm font-semibold text-gray-700 mb-3">
						媒体別コスト（FY{String(selectedFY).slice(2)}）
					</h3>
					<table className="w-full text-sm">
						<thead>
							<tr className="border-b-2 border-gray-200 text-gray-600">
								<th className="text-left px-3 py-2">媒体/会社</th>
								<th className="text-right px-3 py-2">費用（税抜）</th>
								<th className="text-right px-3 py-2">入社数</th>
								<th className="text-right px-3 py-2">採用単価</th>
							</tr>
						</thead>
						<tbody>
							{agencyCosts.map((row) => (
								<tr
									key={row.agency}
									className="border-b border-gray-100 hover:bg-gray-50"
								>
									<td className="px-3 py-2 font-medium">{row.agency}</td>
									<td className="px-3 py-2 text-right tabular-nums">
										¥{row.cost.toLocaleString()}
									</td>
									<td className="px-3 py-2 text-right tabular-nums">
										{row.hires}名
									</td>
									<td className="px-3 py-2 text-right tabular-nums">
										{row.unitCost > 0
											? `¥${row.unitCost.toLocaleString()}`
											: "-"}
									</td>
								</tr>
							))}
						</tbody>
						<tfoot>
							<tr className="bg-gray-50 font-bold border-t-2 border-gray-300">
								<td className="px-3 py-2">合計</td>
								<td className="px-3 py-2 text-right tabular-nums">
									¥
									{agencyCosts.reduce((s, r) => s + r.cost, 0).toLocaleString()}
								</td>
								<td className="px-3 py-2 text-right tabular-nums">
									{agencyCosts.reduce((s, r) => s + r.hires, 0)}名
								</td>
								<td className="px-3 py-2 text-right tabular-nums">
									{(() => {
										const tc = agencyCosts.reduce((s, r) => s + r.cost, 0);
										const th = agencyCosts.reduce((s, r) => s + r.hires, 0);
										return th > 0
											? `¥${Math.round(tc / th).toLocaleString()}`
											: "-";
									})()}
								</td>
							</tr>
						</tfoot>
					</table>
				</div>
			)}

			{/* 園×雇用形態別コスト */}
			{nurseryPivot.length > 0 && (
				<div className="bg-white shadow-sm p-5 overflow-x-auto">
					<h3 className="text-sm font-semibold text-gray-700 mb-3">
						園×雇用形態別コスト（FY{String(selectedFY).slice(2)}）
					</h3>
					<table className="w-full text-sm">
						<thead>
							<tr className="border-b-2 border-gray-200 text-gray-600">
								<th className="text-left px-3 py-2">園名</th>
								{empTypes.map((et) => (
									<th key={et} className="text-right px-3 py-2">
										{et}
									</th>
								))}
								<th className="text-right px-3 py-2">合計</th>
								<th className="text-right px-3 py-2">入社</th>
							</tr>
						</thead>
						<tbody>
							{nurseryPivot.map((row) => (
								<tr
									key={row.nursery}
									className="border-b border-gray-100 hover:bg-gray-50"
								>
									<td className="px-3 py-2 font-medium">{row.nursery}</td>
									{empTypes.map((et) => (
										<td key={et} className="px-3 py-2 text-right tabular-nums">
											{row.byType[et]
												? `¥${row.byType[et].toLocaleString()}`
												: "-"}
										</td>
									))}
									<td className="px-3 py-2 text-right tabular-nums font-semibold">
										¥{row.total.toLocaleString()}
									</td>
									<td className="px-3 py-2 text-right tabular-nums">
										{row.hires > 0 ? `${row.hires}名` : "-"}
									</td>
								</tr>
							))}
						</tbody>
						<tfoot>
							<tr className="bg-gray-50 font-bold border-t-2 border-gray-300">
								<td className="px-3 py-2">合計</td>
								{empTypes.map((et) => {
									const etTotal = nurseryPivot.reduce(
										(s, r) => s + (r.byType[et] || 0),
										0,
									);
									return (
										<td key={et} className="px-3 py-2 text-right tabular-nums">
											¥{etTotal.toLocaleString()}
										</td>
									);
								})}
								<td className="px-3 py-2 text-right tabular-nums">
									¥
									{nurseryPivot
										.reduce((s, r) => s + r.total, 0)
										.toLocaleString()}
								</td>
								<td className="px-3 py-2 text-right tabular-nums">
									{nurseryPivot.reduce((s, r) => s + r.hires, 0)}名
								</td>
							</tr>
						</tfoot>
					</table>
				</div>
			)}

			{/* カテゴリ別月次チャート（4パネル） */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
				{categories.map((cat) => (
					<div key={cat} className="bg-white shadow-sm p-5">
						<h3 className="text-sm font-semibold text-gray-700 mb-3">
							{cat} — 月次推移
						</h3>
						<ResponsiveContainer width="100%" height={220}>
							<ComposedChart data={monthlyTrends[cat]}>
								<CartesianGrid strokeDasharray="3 3" />
								<XAxis dataKey="month" tick={{ fontSize: 10 }} />
								<YAxis
									yAxisId="cost"
									tick={{ fontSize: 10 }}
									tickFormatter={(v) =>
										v >= 10000 ? `${Math.round(v / 10000)}万` : `${v}`
									}
								/>
								<YAxis
									yAxisId="hires"
									orientation="right"
									tick={{ fontSize: 10 }}
								/>
								<Tooltip
									formatter={(value: number, name: string) =>
										name === "費用"
											? `¥${value.toLocaleString()}`
											: `${value}名`
									}
								/>
								<Legend />
								<Bar
									yAxisId="cost"
									dataKey="cost"
									fill={CATEGORY_COLORS[cat]}
									name="費用"
									opacity={0.7}
								/>
								<Line
									yAxisId="hires"
									type="monotone"
									dataKey="hires"
									stroke="#008cc9"
									strokeWidth={2}
									dot={{ r: 3 }}
									name="入社数"
								/>
							</ComposedChart>
						</ResponsiveContainer>
					</div>
				))}
			</div>
		</div>
	);
}
