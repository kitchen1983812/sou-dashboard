"use client";

import { useMemo, useState } from "react";
import { Inquiry } from "@/types/inquiry";
import { AdKeywordRow, AdSearchQueryRow } from "@/types/ads";
import {
	getWeekStart,
	getWeekEnd,
	getPrevWeekStart,
	formatWeekLabel,
	getRecentWeeks,
	computeWeeklyDiff,
	computeChildAge,
	filterByDateRange,
	computeScoreCards,
	computeScoreCardsWithComparison,
	computeChannelData,
	computeDailyTimeline,
	computeAreaStatusData,
	computeMonthlyStatusData,
	computeNurseryStatusData,
	computeBrandSummary,
	normalizeArea,
	getFiscalYear,
	parseDate,
	STATUS,
	ALL_STATUSES,
	STATUS_COLORS,
} from "@/lib/dashboardUtils";
import ScoreCards from "./ScoreCards";
import ChannelDonut from "./ChannelDonut";
import TimelineChart from "./TimelineChart";
import AreaStackedBar from "./AreaStackedBar";
import MonthlyStackedBar from "./MonthlyStackedBar";

interface WeeklyReportViewProps {
	inquiries: Inquiry[];
	adKeywords: AdKeywordRow[];
	adSearchQueries: AdSearchQueryRow[];
}

// --- セクション1: 今週のサマリーカード ---
interface WeeklySummaryCardProps {
	label: string;
	value: number;
	prev: number;
	highlight?: boolean;
}

function WeeklySummaryCard({
	label,
	value,
	prev,
	highlight,
}: WeeklySummaryCardProps) {
	const { diff, direction } = computeWeeklyDiff(value, prev);
	return (
		<div
			className={`rounded-xl border px-4 py-3 ${
				highlight ? "bg-brand-50 border-brand-200" : "bg-white border-gray-200"
			}`}
		>
			<div className="text-sm text-gray-500 mb-1">{label}</div>
			<div className="text-2xl font-bold text-gray-900">
				{value.toLocaleString()}
			</div>
			<div
				className={`text-sm mt-1 font-medium ${
					direction === "up"
						? "text-green-600"
						: direction === "down"
							? "text-red-600"
							: "text-gray-400"
				}`}
			>
				{direction === "up" && "↑"}
				{direction === "down" && "↓"}
				{direction !== "none" ? ` ${diff > 0 ? "+" : ""}${diff}件` : "±0"}
			</div>
			<div className="text-[10px] text-gray-400 mt-0.5">
				前週: {prev.toLocaleString()}
			</div>
		</div>
	);
}

// --- セクション5: 0歳児エリア別テーブル ---
interface AgeAreaRow {
	area: string;
	thisWeek: number;
	prevWeek: number;
	diff: number;
	direction: "up" | "down" | "none";
}

function compute0saiAreaData(
	thisWeekData: Inquiry[],
	prevWeekData: Inquiry[],
): AgeAreaRow[] {
	const AREA_ORDER = ["東京都", "神奈川県", "千葉県", "埼玉県"];

	function filter0sai(data: Inquiry[]): Inquiry[] {
		return data.filter((inq) => {
			const age = computeChildAge(inq.birthYear, inq.birthMonth, inq.postDate);
			return age === 0;
		});
	}

	function countByArea(data: Inquiry[]): Map<string, number> {
		const counts = new Map<string, number>();
		for (const inq of data) {
			const area = normalizeArea(inq.area || "", inq.sheetName);
			counts.set(area, (counts.get(area) || 0) + 1);
		}
		return counts;
	}

	const thisWeek0 = filter0sai(thisWeekData);
	const prevWeek0 = filter0sai(prevWeekData);
	const thisCounts = countByArea(thisWeek0);
	const prevCounts = countByArea(prevWeek0);

	// すべてのエリアを収集
	const allAreas = new Set<string>();
	thisCounts.forEach((_, k) => allAreas.add(k));
	prevCounts.forEach((_, k) => allAreas.add(k));

	const rows: AgeAreaRow[] = [];
	Array.from(allAreas).forEach((area) => {
		const tw = thisCounts.get(area) || 0;
		const pw = prevCounts.get(area) || 0;
		const d = computeWeeklyDiff(tw, pw);
		rows.push({
			area,
			thisWeek: tw,
			prevWeek: pw,
			diff: d.diff,
			direction: d.direction,
		});
	});

	// 既知エリア順 → その他
	rows.sort((a, b) => {
		const ai = AREA_ORDER.indexOf(a.area);
		const bi = AREA_ORDER.indexOf(b.area);
		if (ai !== -1 && bi !== -1) return ai - bi;
		if (ai !== -1) return -1;
		if (bi !== -1) return 1;
		return a.area.localeCompare(b.area);
	});

	return rows;
}

// --- セクション6: Google広告週次 ---
interface WeeklyAdSummary {
	adSpend: number;
	conversions: number;
	inquiryCount: number;
	unitCost: number;
}

function computeWeeklyAdSummary(
	adKeywords: AdKeywordRow[],
	inquiries: Inquiry[],
	monday: Date,
	sunday: Date,
): WeeklyAdSummary {
	// 広告費・CV数
	const weekAds = adKeywords.filter((row) => {
		const d = parseDate(row.date);
		if (!d) return false;
		return d >= monday && d <= sunday;
	});
	const adSpend = Math.round(weekAds.reduce((s, r) => s + r.cost, 0));
	const conversions = Math.round(
		weekAds.reduce((s, r) => s + r.conversions, 0),
	);

	// Google経由の問い合わせ
	const googleInqs = inquiries.filter((inq) => {
		if (inq.utmSource?.toLowerCase() !== "google") return false;
		const d = parseDate(inq.postDate);
		if (!d) return false;
		return d >= monday && d <= sunday;
	});
	const inquiryCount = googleInqs.length;
	const unitCost = inquiryCount > 0 ? Math.round(adSpend / inquiryCount) : 0;

	return { adSpend, conversions, inquiryCount, unitCost };
}

// --- FY月次累計テーブル ---
interface MonthlyAdRow {
	month: string;
	adSpend: number;
	conversions: number;
	inquiryCount: number;
	unitCost: number;
}

function computeMonthlyAdCumulative(
	adKeywords: AdKeywordRow[],
	inquiries: Inquiry[],
	fy: number,
): MonthlyAdRow[] {
	const fyStart = new Date(fy, 3, 1);
	const fyEnd = new Date(fy + 1, 2, 31, 23, 59, 59);

	const fyAds = adKeywords.filter((row) => {
		const d = parseDate(row.date);
		if (!d) return false;
		return d >= fyStart && d <= fyEnd;
	});

	const googleInqs = inquiries.filter((inq) => {
		if (inq.utmSource?.toLowerCase() !== "google") return false;
		const d = parseDate(inq.postDate);
		if (!d) return false;
		return d >= fyStart && d <= fyEnd;
	});

	const FY_MONTHS = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3];

	return FY_MONTHS.map((m) => {
		const year = m >= 4 ? fy : fy + 1;
		const monthAds = fyAds.filter((r) => {
			const d = parseDate(r.date);
			return d && d.getFullYear() === year && d.getMonth() + 1 === m;
		});
		const monthInqs = googleInqs.filter((inq) => {
			const d = parseDate(inq.postDate);
			return d && d.getFullYear() === year && d.getMonth() + 1 === m;
		});

		const adSpend = Math.round(monthAds.reduce((s, r) => s + r.cost, 0));
		const conversions = Math.round(
			monthAds.reduce((s, r) => s + r.conversions, 0),
		);
		const inquiryCount = monthInqs.length;
		const unitCost = inquiryCount > 0 ? Math.round(adSpend / inquiryCount) : 0;

		return {
			month: `${m}月`,
			adSpend,
			conversions,
			inquiryCount,
			unitCost,
		};
	}).filter((row) => row.adSpend > 0 || row.inquiryCount > 0);
}

// ======================
// メインコンポーネント
// ======================
export default function WeeklyReportView({
	inquiries,
	adKeywords,
	adSearchQueries,
}: WeeklyReportViewProps) {
	const recentWeeks = useMemo(() => getRecentWeeks(12), []);
	const [selectedWed, setSelectedWed] = useState<Date>(recentWeeks[0]);

	const today = new Date();
	const isCurrentWeek = getWeekStart(today).getTime() === selectedWed.getTime();

	// --- 週範囲 ---
	const thisTuesday = useMemo(() => getWeekEnd(selectedWed), [selectedWed]);
	const prevWed = useMemo(() => getPrevWeekStart(selectedWed), [selectedWed]);
	const prevTuesday = useMemo(() => getWeekEnd(prevWed), [prevWed]);

	// --- データフィルタ ---
	const thisWeekData = useMemo(
		() => filterByDateRange(inquiries, selectedWed, thisTuesday),
		[inquiries, selectedWed, thisTuesday],
	);
	const prevWeekData = useMemo(
		() => filterByDateRange(inquiries, prevWed, prevTuesday),
		[inquiries, prevWed, prevTuesday],
	);

	// 直近30日（選択週の火曜基準）
	const last30dStart = useMemo(() => {
		const d = new Date(thisTuesday);
		d.setDate(d.getDate() - 29);
		d.setHours(0, 0, 0, 0);
		return d;
	}, [thisTuesday]);
	const last30dData = useMemo(
		() => filterByDateRange(inquiries, last30dStart, thisTuesday),
		[inquiries, last30dStart, thisTuesday],
	);
	const prevLast30dStart = useMemo(() => {
		const d = new Date(prevTuesday);
		d.setDate(d.getDate() - 29);
		d.setHours(0, 0, 0, 0);
		return d;
	}, [prevTuesday]);
	const prevLast30dData = useMemo(
		() => filterByDateRange(inquiries, prevLast30dStart, prevTuesday),
		[inquiries, prevLast30dStart, prevTuesday],
	);

	// FY年度通年（火曜以前のみ）
	const currentFY = useMemo(() => {
		return getFiscalYear(thisTuesday);
	}, [thisTuesday]);
	const fyData = useMemo(() => {
		const fyRange = {
			start: new Date(currentFY, 3, 1),
			end: thisTuesday,
		};
		return filterByDateRange(inquiries, fyRange.start, fyRange.end);
	}, [inquiries, currentFY, thisTuesday]);
	const fyPrevWeekData = useMemo(() => {
		const fyRange = {
			start: new Date(currentFY, 3, 1),
			end: prevTuesday,
		};
		return filterByDateRange(inquiries, fyRange.start, fyRange.end);
	}, [inquiries, currentFY, prevTuesday]);

	// --- セクション1: サマリー ---
	const thisWeekScore = useMemo(
		() => computeScoreCards(thisWeekData),
		[thisWeekData],
	);
	const prevWeekScore = useMemo(
		() => computeScoreCards(prevWeekData),
		[prevWeekData],
	);

	// --- セクション2: 直近30日 ---
	const scoreCards30d = useMemo(
		() => computeScoreCardsWithComparison(last30dData, prevLast30dData),
		[last30dData, prevLast30dData],
	);
	const channelData30d = useMemo(
		() => computeChannelData(last30dData),
		[last30dData],
	);
	const timeline30d = useMemo(
		() => computeDailyTimeline(last30dData, prevLast30dData),
		[last30dData, prevLast30dData],
	);
	const areaStatus30d = useMemo(
		() => computeAreaStatusData(last30dData),
		[last30dData],
	);

	// --- セクション3: FY通年サマリー ---
	const fyScore = useMemo(() => computeScoreCards(fyData), [fyData]);
	const fyPrevScore = useMemo(
		() => computeScoreCards(fyPrevWeekData),
		[fyPrevWeekData],
	);

	// --- セクション4: FY月次推移 ---
	const monthlyData = useMemo(
		() => computeMonthlyStatusData(fyData, currentFY),
		[fyData, currentFY],
	);

	// --- セクション5: 0歳児エリア別 ---
	const ageAreaRows = useMemo(
		() => compute0saiAreaData(thisWeekData, prevWeekData),
		[thisWeekData, prevWeekData],
	);

	// --- セクション7: 各園×ステータス ---
	const nurseryStatusData = useMemo(
		() => computeNurseryStatusData(fyData),
		[fyData],
	);

	// --- セクション8: ブランド別サマリー ---
	const brandSummary = useMemo(() => computeBrandSummary(fyData), [fyData]);

	// --- セクション6: Google広告 ---
	const thisWeekAd = useMemo(
		() =>
			computeWeeklyAdSummary(adKeywords, inquiries, selectedWed, thisTuesday),
		[adKeywords, inquiries, selectedWed, thisTuesday],
	);
	const prevWeekAd = useMemo(
		() => computeWeeklyAdSummary(adKeywords, inquiries, prevWed, prevTuesday),
		[adKeywords, inquiries, prevWed, prevTuesday],
	);
	const monthlyAdData = useMemo(
		() => computeMonthlyAdCumulative(adKeywords, inquiries, currentFY),
		[adKeywords, inquiries, currentFY],
	);
	const adTotals = useMemo(() => {
		const totalSpend = monthlyAdData.reduce((s, r) => s + r.adSpend, 0);
		const totalCV = monthlyAdData.reduce((s, r) => s + r.conversions, 0);
		const totalInq = monthlyAdData.reduce((s, r) => s + r.inquiryCount, 0);
		return {
			adSpend: totalSpend,
			conversions: totalCV,
			inquiryCount: totalInq,
			unitCost: totalInq > 0 ? Math.round(totalSpend / totalInq) : 0,
		};
	}, [monthlyAdData]);

	return (
		<div className="space-y-6">
			{/* 週セレクター */}
			<div className="flex items-center gap-2 flex-wrap">
				{recentWeeks.map((wed) => {
					const label = formatWeekLabel(wed);
					const isSelected = wed.getTime() === selectedWed.getTime();
					const isCurrent = getWeekStart(today).getTime() === wed.getTime();
					return (
						<button
							key={wed.toISOString()}
							onClick={() => setSelectedWed(wed)}
							className={`px-3 py-1.5 text-sm rounded border transition-colors whitespace-nowrap ${
								isSelected
									? "bg-brand-500 text-white border-brand-500"
									: "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
							}`}
						>
							{label}
							{isCurrent && " (進行中)"}
						</button>
					);
				})}
			</div>

			{/* ======= セクション1: 今週のサマリー ======= */}
			<section>
				<h3 className="text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
					<span className="w-1 h-4 bg-brand-500 rounded-full inline-block" />
					今週のサマリー（{formatWeekLabel(selectedWed)}
					{isCurrentWeek && " 進行中"}）
				</h3>
				<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
					<WeeklySummaryCard
						label="問い合わせ数"
						value={thisWeekScore.totalInquiries}
						prev={prevWeekScore.totalInquiries}
					/>
					<WeeklySummaryCard
						label="入園数"
						value={thisWeekScore.enrollments}
						prev={prevWeekScore.enrollments}
						highlight
					/>
					<WeeklySummaryCard
						label="未対応"
						value={thisWeekScore.unanswered}
						prev={prevWeekScore.unanswered}
					/>
					<WeeklySummaryCard
						label="対応中"
						value={thisWeekScore.inProgress}
						prev={prevWeekScore.inProgress}
					/>
					<WeeklySummaryCard
						label="辞退"
						value={thisWeekScore.declined}
						prev={prevWeekScore.declined}
					/>
				</div>
			</section>

			{/* ======= セクション2: 直近30日 ======= */}
			<section>
				<h3 className="text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
					<span className="w-1 h-4 bg-brand-500 rounded-full inline-block" />
					直近30日 問い合わせ状況
				</h3>
				<ScoreCards data={scoreCards30d} />
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-4">
					<ChannelDonut data={channelData30d} />
					<TimelineChart data={timeline30d} prevLabel="前30日間" />
				</div>
				<div className="mt-4">
					<AreaStackedBar data={areaStatus30d} />
				</div>
			</section>

			{/* ======= セクション3: FY通年サマリー ======= */}
			<section>
				<h3 className="text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
					<span className="w-1 h-4 bg-brand-500 rounded-full inline-block" />
					FY{String(currentFY).slice(2)} 年度通年サマリー（今週の変動）
				</h3>
				<div className="bg-white rounded-xl border border-gray-200 p-4">
					<table className="w-full text-sm">
						<thead>
							<tr className="border-b-2 border-gray-200">
								<th className="px-3 py-2 text-left font-semibold text-gray-600">
									指標
								</th>
								<th className="px-3 py-2 text-right font-semibold text-gray-600">
									累計
								</th>
								<th className="px-3 py-2 text-right font-semibold text-gray-600">
									今週変動
								</th>
							</tr>
						</thead>
						<tbody>
							{[
								{
									label: "問い合わせ",
									val: fyScore.totalInquiries,
									prev: fyPrevScore.totalInquiries,
								},
								{
									label: "対応中",
									val: fyScore.inProgress,
									prev: fyPrevScore.inProgress,
								},
								{
									label: "検討中",
									val: fyScore.underConsideration,
									prev: fyPrevScore.underConsideration,
								},
								{
									label: "入園",
									val: fyScore.enrollments,
									prev: fyPrevScore.enrollments,
								},
								{
									label: "辞退",
									val: fyScore.declined,
									prev: fyPrevScore.declined,
								},
							].map((row) => {
								const d = computeWeeklyDiff(row.val, row.prev);
								return (
									<tr
										key={row.label}
										className="border-b border-gray-100 hover:bg-gray-50"
									>
										<td className="px-3 py-2 text-gray-700">{row.label}</td>
										<td className="px-3 py-2 text-right font-semibold text-gray-900">
											{row.val.toLocaleString()}
										</td>
										<td
											className={`px-3 py-2 text-right font-medium ${
												d.direction === "up"
													? "text-green-600"
													: d.direction === "down"
														? "text-red-600"
														: "text-gray-400"
											}`}
										>
											{d.direction === "up" && "↑ "}
											{d.direction === "down" && "↓ "}
											{d.diff > 0 ? `+${d.diff}` : d.diff === 0 ? "±0" : d.diff}
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			</section>

			{/* ======= セクション4: FY月次推移 ======= */}
			<section>
				<h3 className="text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
					<span className="w-1 h-4 bg-brand-500 rounded-full inline-block" />
					FY{String(currentFY).slice(2)} 月次推移
				</h3>
				<MonthlyStackedBar data={monthlyData} />
			</section>

			{/* ======= セクション5: 0歳児 エリア別 ======= */}
			<section>
				<h3 className="text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
					<span className="w-1 h-4 bg-brand-500 rounded-full inline-block" />
					0歳児 エリア別（前週比）
				</h3>
				<div className="bg-white rounded-xl border border-gray-200 p-4">
					{ageAreaRows.length > 0 ? (
						<table className="w-full text-sm">
							<thead>
								<tr className="border-b-2 border-gray-200">
									<th className="px-3 py-2 text-left font-semibold text-gray-600">
										エリア
									</th>
									<th className="px-3 py-2 text-right font-semibold text-gray-600">
										今週
									</th>
									<th className="px-3 py-2 text-right font-semibold text-gray-600">
										前週
									</th>
									<th className="px-3 py-2 text-right font-semibold text-gray-600">
										前週比
									</th>
								</tr>
							</thead>
							<tbody>
								{ageAreaRows.map((row) => (
									<tr
										key={row.area}
										className="border-b border-gray-100 hover:bg-gray-50"
									>
										<td className="px-3 py-2 text-gray-700">{row.area}</td>
										<td className="px-3 py-2 text-right font-semibold text-gray-900">
											{row.thisWeek}
										</td>
										<td className="px-3 py-2 text-right text-gray-500">
											{row.prevWeek}
										</td>
										<td
											className={`px-3 py-2 text-right font-medium ${
												row.direction === "up"
													? "text-green-600"
													: row.direction === "down"
														? "text-red-600"
														: "text-gray-400"
											}`}
										>
											{row.direction === "up" && "↑ "}
											{row.direction === "down" && "↓ "}
											{row.diff > 0
												? `+${row.diff}`
												: row.diff === 0
													? "±0"
													: row.diff}
										</td>
									</tr>
								))}
								{/* 合計行 */}
								<tr className="bg-brand-50 font-bold border-t-2 border-brand-300">
									<td className="px-3 py-2 text-brand-800">合計</td>
									<td className="px-3 py-2 text-right text-brand-800">
										{ageAreaRows.reduce((s, r) => s + r.thisWeek, 0)}
									</td>
									<td className="px-3 py-2 text-right text-brand-800">
										{ageAreaRows.reduce((s, r) => s + r.prevWeek, 0)}
									</td>
									<td
										className={`px-3 py-2 text-right font-medium ${
											ageAreaRows.reduce((s, r) => s + r.diff, 0) > 0
												? "text-green-700"
												: ageAreaRows.reduce((s, r) => s + r.diff, 0) < 0
													? "text-red-700"
													: "text-gray-500"
										}`}
									>
										{(() => {
											const total = ageAreaRows.reduce((s, r) => s + r.diff, 0);
											return total > 0
												? `+${total}`
												: total === 0
													? "±0"
													: total;
										})()}
									</td>
								</tr>
							</tbody>
						</table>
					) : (
						<div className="text-sm text-gray-400 text-center py-6">
							0歳児データがありません
						</div>
					)}
				</div>
			</section>

			{/* ======= セクション6: Google広告 週次 ======= */}
			<section>
				<h3 className="text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
					<span className="w-1 h-4 bg-brand-500 rounded-full inline-block" />
					Google広告 週次サマリー
				</h3>
				<div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
					{/* 今週 vs 前週 */}
					<div className="overflow-x-auto">
						<table className="w-full text-sm">
							<thead>
								<tr className="border-b-2 border-gray-200">
									<th className="px-3 py-2 text-left font-semibold text-gray-600">
										期間
									</th>
									<th className="px-3 py-2 text-right font-semibold text-gray-600">
										広告費
									</th>
									<th className="px-3 py-2 text-right font-semibold text-gray-600">
										CV数
									</th>
									<th className="px-3 py-2 text-right font-semibold text-gray-600">
										問い合わせ
									</th>
									<th className="px-3 py-2 text-right font-semibold text-gray-600">
										単価
									</th>
								</tr>
							</thead>
							<tbody>
								<tr className="border-b border-gray-100 bg-red-50">
									<td className="px-3 py-2 font-medium text-gray-700">
										今週（{formatWeekLabel(selectedWed)}）
									</td>
									<td className="px-3 py-2 text-right text-gray-900">
										¥{thisWeekAd.adSpend.toLocaleString()}
									</td>
									<td className="px-3 py-2 text-right text-gray-900">
										{thisWeekAd.conversions}
									</td>
									<td className="px-3 py-2 text-right text-gray-900">
										{thisWeekAd.inquiryCount}件
									</td>
									<td className="px-3 py-2 text-right text-gray-900">
										{thisWeekAd.unitCost > 0
											? `¥${thisWeekAd.unitCost.toLocaleString()}`
											: "-"}
									</td>
								</tr>
								<tr className="border-b border-gray-100">
									<td className="px-3 py-2 font-medium text-gray-500">
										前週（{formatWeekLabel(prevWed)}）
									</td>
									<td className="px-3 py-2 text-right text-gray-500">
										¥{prevWeekAd.adSpend.toLocaleString()}
									</td>
									<td className="px-3 py-2 text-right text-gray-500">
										{prevWeekAd.conversions}
									</td>
									<td className="px-3 py-2 text-right text-gray-500">
										{prevWeekAd.inquiryCount}件
									</td>
									<td className="px-3 py-2 text-right text-gray-500">
										{prevWeekAd.unitCost > 0
											? `¥${prevWeekAd.unitCost.toLocaleString()}`
											: "-"}
									</td>
								</tr>
							</tbody>
						</table>
					</div>

					{/* 月次累計テーブル */}
					{monthlyAdData.length > 0 && (
						<>
							<h4 className="text-sm font-semibold text-gray-500 mt-3">
								FY{String(currentFY).slice(2)} 月次累計
							</h4>
							<div className="overflow-x-auto">
								<table className="w-full text-sm">
									<thead>
										<tr className="border-b-2 border-gray-200">
											<th className="px-3 py-2 text-left font-semibold text-gray-600">
												月
											</th>
											<th className="px-3 py-2 text-right font-semibold text-gray-600">
												広告費
											</th>
											<th className="px-3 py-2 text-right font-semibold text-gray-600">
												CV数
											</th>
											<th className="px-3 py-2 text-right font-semibold text-gray-600">
												件数
											</th>
											<th className="px-3 py-2 text-right font-semibold text-gray-600">
												単価
											</th>
										</tr>
									</thead>
									<tbody>
										{monthlyAdData.map((row) => (
											<tr
												key={row.month}
												className="border-b border-gray-100 hover:bg-gray-50"
											>
												<td className="px-3 py-1.5 text-gray-700">
													{row.month}
												</td>
												<td className="px-3 py-1.5 text-right text-gray-700">
													¥{row.adSpend.toLocaleString()}
												</td>
												<td className="px-3 py-1.5 text-right text-gray-700">
													{row.conversions}
												</td>
												<td className="px-3 py-1.5 text-right text-gray-700">
													{row.inquiryCount}
												</td>
												<td className="px-3 py-1.5 text-right text-gray-700">
													{row.unitCost > 0
														? `¥${row.unitCost.toLocaleString()}`
														: "-"}
												</td>
											</tr>
										))}
									</tbody>
									<tfoot>
										<tr className="bg-brand-50 font-bold border-t-2 border-brand-300">
											<td className="px-3 py-2 text-brand-800">合計</td>
											<td className="px-3 py-2 text-right text-brand-800">
												¥{adTotals.adSpend.toLocaleString()}
											</td>
											<td className="px-3 py-2 text-right text-brand-800">
												{adTotals.conversions}
											</td>
											<td className="px-3 py-2 text-right text-brand-800">
												{adTotals.inquiryCount}
											</td>
											<td className="px-3 py-2 text-right text-brand-800">
												{adTotals.unitCost > 0
													? `¥${adTotals.unitCost.toLocaleString()}`
													: "-"}
											</td>
										</tr>
									</tfoot>
								</table>
							</div>
						</>
					)}
				</div>
			</section>

			{/* ======= セクション7: 各園×ステータス ======= */}
			<section>
				<h3 className="text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
					<span className="w-1 h-4 bg-brand-500 rounded-full inline-block" />
					FY{String(currentFY).slice(2)} 各園ステータス一覧
				</h3>
				<div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
					<table className="w-full text-sm">
						<thead>
							<tr className="border-b-2 border-gray-200 bg-gray-50">
								<th className="px-2 py-2 text-left font-semibold text-gray-600 sticky left-0 bg-gray-50">
									園名
								</th>
								<th className="px-2 py-2 text-right font-semibold text-gray-600">
									合計
								</th>
								<th className="px-2 py-2 text-right font-semibold text-gray-600">
									入園率
								</th>
								{ALL_STATUSES.map((s) => (
									<th
										key={s}
										className="px-2 py-2 text-right font-semibold text-gray-600 whitespace-nowrap"
									>
										<span
											className="inline-block w-2 h-2 rounded-full mr-1"
											style={{ backgroundColor: STATUS_COLORS[s] }}
										/>
										{s
											.replace("諸事情により受入不可", "受入不可")
											.replace("待ちリスト登録済み", "待ちリスト")}
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{nurseryStatusData.map((row) => {
								const enrolled = row.statuses[STATUS.ENROLLED] || 0;
								return (
									<tr
										key={row.nursery}
										className="border-b border-gray-100 hover:bg-gray-50"
									>
										<td className="px-2 py-1.5 text-gray-700 font-medium sticky left-0 bg-white whitespace-nowrap">
											{row.nursery}
										</td>
										<td className="px-2 py-1.5 text-right font-semibold text-gray-900">
											{row.total}
										</td>
										<td
											className={`px-2 py-1.5 text-right font-semibold ${row.enrollmentRate >= 50 ? "text-green-600" : row.enrollmentRate >= 30 ? "text-blue-600" : "text-gray-600"}`}
										>
											{row.enrollmentRate}%
										</td>
										{ALL_STATUSES.map((s) => (
											<td
												key={s}
												className="px-2 py-1.5 text-right text-gray-600"
											>
												{row.statuses[s] || 0}
											</td>
										))}
									</tr>
								);
							})}
							{/* 合計行 */}
							{nurseryStatusData.length > 0 &&
								(() => {
									const totals: Record<string, number> = {};
									let grandTotal = 0;
									for (const row of nurseryStatusData) {
										grandTotal += row.total;
										for (const s of ALL_STATUSES) {
											totals[s] = (totals[s] || 0) + (row.statuses[s] || 0);
										}
									}
									const grandEnrolled = totals[STATUS.ENROLLED] || 0;
									const grandRate =
										grandTotal > 0
											? Math.round((grandEnrolled / grandTotal) * 1000) / 10
											: 0;
									return (
										<tr className="bg-brand-50 font-bold border-t-2 border-brand-300">
											<td className="px-2 py-2 text-brand-800 sticky left-0 bg-red-50">
												合計
											</td>
											<td className="px-2 py-2 text-right text-brand-800">
												{grandTotal}
											</td>
											<td className="px-2 py-2 text-right text-brand-800">
												{grandRate}%
											</td>
											{ALL_STATUSES.map((s) => (
												<td
													key={s}
													className="px-2 py-2 text-right text-brand-800"
												>
													{totals[s] || 0}
												</td>
											))}
										</tr>
									);
								})()}
						</tbody>
					</table>
				</div>
			</section>

			{/* ======= セクション8: ブランド別サマリー ======= */}
			{brandSummary.length > 0 && (
				<section>
					<h3 className="text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
						<span className="w-1 h-4 bg-brand-500 rounded-full inline-block" />
						FY{String(currentFY).slice(2)} ブランド別入園数
					</h3>
					<div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
						{brandSummary.map((b) => (
							<div
								key={b.brand}
								className="bg-white rounded-xl border border-gray-200 px-4 py-3"
							>
								<div className="text-sm text-gray-500 mb-1">{b.brand}</div>
								<div className="text-2xl font-bold text-gray-900">
									{b.enrolled}
									<span className="text-sm font-normal text-gray-500 ml-1">
										名
									</span>
								</div>
								<div className="text-sm text-gray-400 mt-1">
									問い合わせ {b.total}件 / 入園率{" "}
									{b.total > 0
										? Math.round((b.enrolled / b.total) * 1000) / 10
										: 0}
									%
								</div>
							</div>
						))}
					</div>
				</section>
			)}
		</div>
	);
}
