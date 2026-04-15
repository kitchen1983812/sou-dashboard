"use client";

import { useMemo, useEffect, useState } from "react";
import { Inquiry } from "@/types/inquiry";
import {
	STATUS,
	computeScoreCards,
	computeScoreCardsWithComparison,
	filterByDateRange,
	getCurrentFY,
	getFYRange,
	normalizeArea,
} from "@/lib/dashboardUtils";
import InsightPanel from "./InsightPanel";

interface ExecutiveSummaryViewProps {
	inquiries: Inquiry[];
}

/** 直近30日のデータを計算 */
function getRecent30Days(inquiries: Inquiry[]) {
	const now = new Date();
	const start = new Date(now);
	start.setDate(start.getDate() - 30);
	start.setHours(0, 0, 0, 0);
	const current = inquiries.filter((inq) => {
		const d = inq.postDate ? new Date(inq.postDate) : null;
		return d && d >= start && d <= now;
	});
	const prevEnd = new Date(start);
	const prevStart = new Date(start);
	prevStart.setDate(prevStart.getDate() - 30);
	const prev = inquiries.filter((inq) => {
		const d = inq.postDate ? new Date(inq.postDate) : null;
		return d && d >= prevStart && d < prevEnd;
	});
	return { current, prev };
}

/** エリア別サマリー */
function computeAreaSummary(inquiries: Inquiry[]) {
	const map = new Map<
		string,
		{ total: number; enrolled: number; unanswered: number }
	>();
	for (const inq of inquiries) {
		const area = normalizeArea(inq.area, inq.sheetName || inq.nursery);
		if (!map.has(area)) map.set(area, { total: 0, enrolled: 0, unanswered: 0 });
		const entry = map.get(area)!;
		entry.total++;
		if (inq.status === STATUS.ENROLLED) entry.enrolled++;
		if (inq.status === STATUS.UNANSWERED || !inq.status) entry.unanswered++;
	}
	return Array.from(map.entries())
		.map(([area, data]) => ({
			area,
			...data,
			enrollmentRate: data.total > 0 ? (data.enrolled / data.total) * 100 : 0,
			unansweredRate: data.total > 0 ? (data.unanswered / data.total) * 100 : 0,
		}))
		.sort((a, b) => b.total - a.total);
}

/** ミニKPIカード */
function MiniKPI({
	label,
	value,
	prevValue,
	suffix,
	highlight,
}: {
	label: string;
	value: number;
	prevValue?: number;
	suffix?: string;
	highlight?: "brand" | "danger" | "success";
}) {
	const diff = prevValue !== undefined ? value - prevValue : null;
	const bgClass =
		highlight === "brand"
			? "bg-white border-gray-200"
			: highlight === "danger"
				? "bg-white border-gray-200"
				: highlight === "success"
					? "bg-white border-gray-200"
					: "bg-white border-gray-200";

	return (
		<div className={`rounded border px-4 py-3 ${bgClass}`}>
			<div className="text-xs text-gray-500 font-medium mb-1">{label}</div>
			<div className="text-2xl font-bold text-gray-900">
				{value.toLocaleString()}
				{suffix && (
					<span className="text-sm font-normal text-gray-500 ml-0.5">
						{suffix}
					</span>
				)}
			</div>
			{diff !== null && (
				<div
					className={`text-xs mt-0.5 font-medium ${diff > 0 ? "text-green-600" : diff < 0 ? "text-red-500" : "text-gray-400"}`}
				>
					{diff > 0 ? "+" : ""}
					{diff}件 vs 前期
				</div>
			)}
		</div>
	);
}

/** ゲージバー */
function GaugeBar({
	label,
	value,
	max,
	warn,
}: {
	label: string;
	value: number;
	max: number;
	warn?: boolean;
}) {
	const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
	const color = warn
		? "bg-red-500"
		: pct >= 90
			? "bg-brand-500"
			: "bg-brand-500";

	return (
		<div className="flex items-center gap-3">
			<span className="text-sm text-gray-600 w-16 shrink-0">{label}</span>
			<div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
				<div
					className={`h-full rounded-full transition-all ${color}`}
					style={{ width: `${pct}%` }}
				/>
			</div>
			<span className="text-sm font-semibold text-gray-700 w-14 text-right">
				{pct.toFixed(0)}%
			</span>
		</div>
	);
}

export default function ExecutiveSummaryView({
	inquiries,
}: ExecutiveSummaryViewProps) {
	// 定員充足率データ取得
	const [occupancyData, setOccupancyData] = useState<{
		nurseries: {
			nursery: string;
			area: string;
			capacity: number[];
			enrolled: number[];
		}[];
	} | null>(null);
	useEffect(() => {
		fetch("/api/occupancy")
			.then((res) => res.json())
			.then((d) => {
				if (!d.error && d.nurseries?.length) setOccupancyData(d);
			})
			.catch(() => {});
	}, []);

	const occupancySummary = useMemo(() => {
		if (!occupancyData) return null;
		let totalEnrolled = 0;
		let totalCapacity = 0;
		const ageTotals: { enrolled: number; capacity: number }[] = Array.from(
			{ length: 6 },
			() => ({ enrolled: 0, capacity: 0 }),
		);
		for (const n of occupancyData.nurseries) {
			const ne = n.enrolled.reduce((a, b) => a + b, 0);
			const nc = n.capacity.reduce((a, b) => a + b, 0);
			totalEnrolled += ne;
			totalCapacity += nc;
			n.enrolled.forEach((v, i) => {
				if (i < 6) ageTotals[i].enrolled += v;
			});
			n.capacity.forEach((v, i) => {
				if (i < 6) ageTotals[i].capacity += v;
			});
		}
		return { totalEnrolled, totalCapacity, ageTotals };
	}, [occupancyData]);

	// 今年度データ
	const fyRange = useMemo(() => getFYRange(getCurrentFY()), []);
	const fyData = useMemo(
		() => filterByDateRange(inquiries, fyRange.start, fyRange.end),
		[inquiries, fyRange],
	);
	const prevFyRange = useMemo(() => getFYRange(getCurrentFY() - 1), []);
	const prevFyData = useMemo(
		() => filterByDateRange(inquiries, prevFyRange.start, prevFyRange.end),
		[inquiries, prevFyRange],
	);

	// 直近30日
	const { current: recent, prev: prevRecent } = useMemo(
		() => getRecent30Days(inquiries),
		[inquiries],
	);

	const recentCards = useMemo(
		() => computeScoreCardsWithComparison(recent, prevRecent),
		[recent, prevRecent],
	);
	const fyCards = useMemo(() => computeScoreCards(fyData), [fyData]);
	const prevFyCards = useMemo(
		() => computeScoreCards(prevFyData),
		[prevFyData],
	);

	// エリア別（直近30日）
	const areaSummary = useMemo(() => computeAreaSummary(recent), [recent]);

	return (
		<div className="space-y-6">
			{/* インサイトパネル */}
			<InsightPanel inquiries={recent} prevInquiries={prevRecent} />

			{/* 直近30日 KPI */}
			<section>
				<h3 className="text-base font-bold text-gray-800 mb-3">直近30日 KPI</h3>
				<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-3">
					<MiniKPI
						label="問い合わせ"
						value={recentCards.totalInquiries}
						prevValue={recentCards.prevTotalInquiries}
					/>
					<MiniKPI
						label="入園"
						value={recentCards.enrollments}
						prevValue={recentCards.prevEnrollments}
						highlight="brand"
					/>
					<MiniKPI
						label="未対応"
						value={recentCards.unanswered}
						prevValue={recentCards.prevUnanswered}
						highlight={recentCards.unansweredRate > 30 ? "danger" : undefined}
					/>
					<MiniKPI
						label="対応中"
						value={recentCards.inProgress}
						prevValue={recentCards.prevInProgress}
					/>
					<MiniKPI
						label="入園率"
						value={Math.round(recentCards.enrollmentRate * 10) / 10}
						suffix="%"
					/>
					<MiniKPI
						label="未対応率"
						value={Math.round(recentCards.unansweredRate * 10) / 10}
						suffix="%"
						highlight={recentCards.unansweredRate > 30 ? "danger" : undefined}
					/>
				</div>
			</section>

			{/* 年度累計 vs 前年度 */}
			<section>
				<h3 className="text-base font-bold text-gray-800 mb-3">
					年度累計（FY{String(getCurrentFY()).slice(2)}）vs 前年度
				</h3>
				<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
					<MiniKPI
						label="問い合わせ"
						value={fyCards.totalInquiries}
						prevValue={prevFyCards.totalInquiries}
					/>
					<MiniKPI
						label="入園"
						value={fyCards.enrollments}
						prevValue={prevFyCards.enrollments}
						highlight="brand"
					/>
					<MiniKPI
						label="入園率"
						value={Math.round(fyCards.enrollmentRate * 10) / 10}
						suffix="%"
					/>
					<MiniKPI
						label="辞退"
						value={fyCards.declined}
						prevValue={prevFyCards.declined}
					/>
				</div>
			</section>

			{/* 定員充足率 */}
			<section>
				<h3 className="text-base font-bold text-gray-800 mb-3">定員充足率</h3>
				{occupancySummary ? (
					<div className="bg-white shadow-sm p-5">
						<div className="space-y-2">
							<GaugeBar
								label="全体"
								value={
									occupancySummary.totalCapacity > 0
										? Math.round(
												(occupancySummary.totalEnrolled /
													occupancySummary.totalCapacity) *
													100,
											)
										: 0
								}
								max={100}
								warn={
									occupancySummary.totalCapacity > 0 &&
									occupancySummary.totalEnrolled /
										occupancySummary.totalCapacity <
										0.8
								}
							/>
							{occupancySummary.ageTotals.map((age, i) => {
								if (age.capacity === 0 && age.enrolled === 0) return null;
								const pct =
									age.capacity > 0
										? Math.round((age.enrolled / age.capacity) * 100)
										: 0;
								return (
									<GaugeBar
										key={i}
										label={`${i}歳`}
										value={pct}
										max={100}
										warn={age.capacity > 0 && age.enrolled / age.capacity < 0.8}
									/>
								);
							})}
						</div>
					</div>
				) : (
					<div className="bg-white shadow-sm p-5">
						<p className="text-sm text-gray-500">
							定員充足率データを読み込み中...
						</p>
					</div>
				)}
			</section>

			{/* エリア別パフォーマンス */}
			<section>
				<h3 className="text-base font-bold text-gray-800 mb-3">
					エリア別パフォーマンス（直近30日）
				</h3>
				<div className="overflow-x-auto">
					<table className="w-full text-sm">
						<thead>
							<tr className="bg-gray-50 border-b border-gray-200">
								<th className="text-left px-3 py-2 font-semibold text-gray-600">
									エリア
								</th>
								<th className="text-right px-3 py-2 font-semibold text-gray-600">
									問い合わせ
								</th>
								<th className="text-right px-3 py-2 font-semibold text-gray-600">
									入園
								</th>
								<th className="text-right px-3 py-2 font-semibold text-gray-600">
									入園率
								</th>
								<th className="text-right px-3 py-2 font-semibold text-gray-600">
									未対応
								</th>
								<th className="text-right px-3 py-2 font-semibold text-gray-600">
									未対応率
								</th>
							</tr>
						</thead>
						<tbody>
							{areaSummary.map((row) => (
								<tr key={row.area} className="border-b border-gray-100">
									<td className="px-3 py-2 font-medium text-gray-800">
										{row.area}
									</td>
									<td className="px-3 py-2 text-right">{row.total}</td>
									<td className="px-3 py-2 text-right text-brand-600 font-medium">
										{row.enrolled}
									</td>
									<td className="px-3 py-2 text-right">
										{row.enrollmentRate.toFixed(1)}%
									</td>
									<td
										className={`px-3 py-2 text-right ${row.unansweredRate > 50 ? "text-red-600 font-bold" : ""}`}
									>
										{row.unanswered}
									</td>
									<td
										className={`px-3 py-2 text-right ${row.unansweredRate > 50 ? "text-red-600 font-bold" : row.unansweredRate > 30 ? "text-amber-600 font-medium" : ""}`}
									>
										{row.unansweredRate.toFixed(1)}%
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</section>
		</div>
	);
}
