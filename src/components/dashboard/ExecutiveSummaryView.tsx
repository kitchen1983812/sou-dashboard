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
import type { ReviewData } from "@/app/api/reviews/route";
import type { GroupBrandSummary } from "@/app/api/group-reviews/route";
import type { GroupCapacityNursery } from "@/app/api/group-capacity/route";
import type { StaffNursery } from "@/app/api/staff/route";

interface ExecutiveSummaryViewProps {
	inquiries: Inquiry[];
}

interface OccupancyNurseryLite {
	nursery: string;
	area: string;
	capacity: number[];
	enrolled: number[];
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

/** エリア別サマリー（問合せ + 口コミ + 充足率 + 正社員率を統合） */
function computeAreaSummary(
	inquiries: Inquiry[],
	reviews: ReviewData[],
	occupancy: OccupancyNurseryLite[],
	staff: StaffNursery[],
) {
	const map = new Map<
		string,
		{
			total: number;
			enrolled: number;
			unanswered: number;
			gbpRatingSum: number;
			gbpRatingCount: number;
			capacity: number;
			occupied: number;
			staffTotal: number;
			seishain: number;
		}
	>();

	const ensure = (area: string) => {
		if (!map.has(area))
			map.set(area, {
				total: 0,
				enrolled: 0,
				unanswered: 0,
				gbpRatingSum: 0,
				gbpRatingCount: 0,
				capacity: 0,
				occupied: 0,
				staffTotal: 0,
				seishain: 0,
			});
		return map.get(area)!;
	};

	for (const inq of inquiries) {
		const area = normalizeArea(inq.area, inq.sheetName || inq.nursery);
		const entry = ensure(area);
		entry.total++;
		if (inq.status === STATUS.ENROLLED) entry.enrolled++;
		if (inq.status === STATUS.UNANSWERED || !inq.status) entry.unanswered++;
	}
	for (const r of reviews) {
		if (r.rating == null) continue;
		const area = normalizeArea(r.area, r.name);
		const entry = ensure(area);
		entry.gbpRatingSum += r.rating;
		entry.gbpRatingCount++;
	}
	for (const o of occupancy) {
		const area = normalizeArea(o.area, o.nursery);
		const entry = ensure(area);
		entry.capacity += o.capacity.reduce((a, b) => a + b, 0);
		entry.occupied += o.enrolled.reduce((a, b) => a + b, 0);
	}
	for (const s of staff) {
		const area = normalizeArea(s.area, s.name);
		const entry = ensure(area);
		entry.staffTotal += s.total;
		entry.seishain += s.seishain;
	}

	return Array.from(map.entries())
		.map(([area, d]) => ({
			area,
			total: d.total,
			enrolled: d.enrolled,
			unanswered: d.unanswered,
			enrollmentRate: d.total > 0 ? (d.enrolled / d.total) * 100 : 0,
			unansweredRate: d.total > 0 ? (d.unanswered / d.total) * 100 : 0,
			gbpRating:
				d.gbpRatingCount > 0
					? Math.round((d.gbpRatingSum / d.gbpRatingCount) * 100) / 100
					: null,
			fillRate: d.capacity > 0 ? (d.occupied / d.capacity) * 100 : null,
			seishainRate:
				d.staffTotal > 0
					? Math.round((d.seishain / d.staffTotal) * 1000) / 10
					: null,
		}))
		.sort((a, b) => b.total - a.total);
}

/** 入園ファネル簡易版（FYデータから派生） */
function computeFunnel(inquiries: Inquiry[]) {
	let total = 0;
	let enrolled = 0;
	let inProgress = 0;
	let dropped = 0;
	let unanswered = 0;
	for (const inq of inquiries) {
		const s = inq.status || "";
		if (s === STATUS.DUPLICATE) continue;
		total++;
		if (s === STATUS.ENROLLED) enrolled++;
		else if (
			s === STATUS.IN_PROGRESS ||
			s === STATUS.CONSIDERING ||
			s === STATUS.GUIDED ||
			s === STATUS.WAITLISTED
		)
			inProgress++;
		else if (
			s === STATUS.DECLINED ||
			s === STATUS.CANNOT_REACH ||
			s === STATUS.CANNOT_ACCEPT
		)
			dropped++;
		else if (s === STATUS.UNANSWERED || s === "") unanswered++;
	}
	return { total, enrolled, inProgress, dropped, unanswered };
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
	// 定員充足率データ取得（自社）
	const [occupancyData, setOccupancyData] = useState<{
		nurseries: OccupancyNurseryLite[];
	} | null>(null);
	// グループ定員（158園）
	const [groupCapacity, setGroupCapacity] = useState<{
		nurseries: GroupCapacityNursery[];
	} | null>(null);
	// 自社GBP（25園）
	const [reviewsData, setReviewsData] = useState<{
		reviews: ReviewData[];
		baselineDate?: string | null;
	} | null>(null);
	// グループGBP（211園）
	const [groupReviews, setGroupReviews] = useState<{
		brands: GroupBrandSummary[];
	} | null>(null);
	// 正社員データ
	const [staffData, setStaffData] = useState<{
		nurseries: StaffNursery[];
	} | null>(null);

	useEffect(() => {
		fetch("/api/occupancy")
			.then((res) => res.json())
			.then((d) => {
				if (!d.error && d.nurseries?.length) setOccupancyData(d);
			})
			.catch(() => {});
		fetch("/api/group-capacity")
			.then((res) => res.json())
			.then((d) => {
				if (!d.error && d.nurseries?.length) setGroupCapacity(d);
			})
			.catch(() => {});
		fetch("/api/reviews")
			.then((res) => res.json())
			.then((d) => {
				if (!d.error && d.reviews?.length) setReviewsData(d);
			})
			.catch(() => {});
		fetch("/api/group-reviews")
			.then((res) => res.json())
			.then((d) => {
				if (!d.error && d.brands?.length) setGroupReviews(d);
			})
			.catch(() => {});
		fetch("/api/staff")
			.then((res) => res.json())
			.then((d) => {
				if (!d.error && d.nurseries?.length) setStaffData(d);
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

	// エリア戦略マップ（直近30日 × 口コミ × 充足率 × 正社員率）
	const areaSummary = useMemo(
		() =>
			computeAreaSummary(
				recent,
				reviewsData?.reviews ?? [],
				occupancyData?.nurseries ?? [],
				staffData?.nurseries ?? [],
			),
		[recent, reviewsData, occupancyData, staffData],
	);

	// 入園ファネル（FY26）
	const funnel = useMemo(() => computeFunnel(fyData), [fyData]);
	const prevFunnel = useMemo(() => computeFunnel(prevFyData), [prevFyData]);

	// グループ内ポジショニング
	const healthScore = useMemo(() => {
		// 充足率: 自社（occupancyData）vs グループ全体（groupCapacity）
		let ownCap = 0,
			ownEnr = 0;
		if (occupancyData) {
			for (const n of occupancyData.nurseries) {
				ownCap += n.capacity.reduce((a, b) => a + b, 0);
				ownEnr += n.enrolled.reduce((a, b) => a + b, 0);
			}
		}
		const ownFillRate = ownCap > 0 ? (ownEnr / ownCap) * 100 : null;

		let groupCap = 0,
			groupEnr = 0;
		if (groupCapacity) {
			for (const n of groupCapacity.nurseries) {
				groupCap += n.totalCapacity;
				groupEnr += n.totalEnrolled;
			}
		}
		const groupFillRate = groupCap > 0 ? (groupEnr / groupCap) * 100 : null;

		// GBP評価: 自社 vs グループ
		let ownRSum = 0,
			ownRCnt = 0;
		if (reviewsData) {
			for (const r of reviewsData.reviews) {
				if (r.rating != null) {
					ownRSum += r.rating;
					ownRCnt++;
				}
			}
		}
		const ownAvgRating = ownRCnt > 0 ? ownRSum / ownRCnt : null;

		let grpRSum = 0,
			grpRCnt = 0,
			grpReviews = 0,
			grpNurseries = 0;
		if (groupReviews) {
			for (const b of groupReviews.brands) {
				grpNurseries += b.nurseryCount;
				grpReviews += b.totalReviews;
				for (const n of b.nurseries) {
					if (n.rating != null) {
						grpRSum += n.rating;
						grpRCnt++;
					}
				}
			}
		}
		const grpAvgRating = grpRCnt > 0 ? grpRSum / grpRCnt : null;

		// 件数密度（園あたり平均件数）
		const ownReviewsTotal = reviewsData
			? reviewsData.reviews.reduce((s, r) => s + r.reviewCount, 0)
			: 0;
		const ownNurseriesCount = reviewsData?.reviews.length ?? 0;
		const ownDensity =
			ownNurseriesCount > 0 ? ownReviewsTotal / ownNurseriesCount : null;
		const grpDensity = grpNurseries > 0 ? grpReviews / grpNurseries : null;

		return {
			ownFillRate,
			groupFillRate,
			ownAvgRating,
			grpAvgRating,
			ownDensity,
			grpDensity,
			ownNurseriesCount,
			grpNurseriesCount: grpNurseries,
			groupNurseryCountCapacity: groupCapacity?.nurseries.length ?? 0,
		};
	}, [occupancyData, groupCapacity, reviewsData, groupReviews]);

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

			{/* 入園ファネル（FY） */}
			<section>
				<h3 className="text-base font-bold text-gray-800 mb-3">
					入園ファネル（FY{String(getCurrentFY()).slice(2)}）
				</h3>
				<div className="bg-white shadow-sm p-5">
					{(() => {
						const t = funnel.total || 1;
						const inProgressPct = (funnel.inProgress / t) * 100;
						const enrolledPct = (funnel.enrolled / t) * 100;
						const droppedPct = (funnel.dropped / t) * 100;
						const unansweredPct = (funnel.unanswered / t) * 100;
						const prevEnrolledRate =
							prevFunnel.total > 0
								? (prevFunnel.enrolled / prevFunnel.total) * 100
								: null;
						return (
							<div className="space-y-3">
								{/* ステージバー */}
								<div className="space-y-2">
									<div className="flex items-center gap-3">
										<span className="text-sm text-gray-600 w-24 shrink-0">
											問い合わせ
										</span>
										<div className="flex-1 h-6 bg-brand-500 rounded-sm flex items-center px-2">
											<span className="text-xs text-white font-semibold">
												{funnel.total}件 (100%)
											</span>
										</div>
									</div>
									<div className="flex items-center gap-3">
										<span className="text-sm text-gray-600 w-24 shrink-0">
											対応中
										</span>
										<div className="flex-1 h-5 bg-gray-200 rounded-sm overflow-hidden">
											<div
												className="h-full bg-brand-300 flex items-center px-2"
												style={{ width: `${inProgressPct}%` }}
											>
												<span className="text-xs text-white font-semibold whitespace-nowrap">
													{funnel.inProgress}件 ({inProgressPct.toFixed(1)}%)
												</span>
											</div>
										</div>
									</div>
									<div className="flex items-center gap-3">
										<span className="text-sm text-gray-600 w-24 shrink-0">
											入園
										</span>
										<div className="flex-1 h-5 bg-gray-200 rounded-sm overflow-hidden">
											<div
												className="h-full bg-brand-600 flex items-center px-2"
												style={{ width: `${Math.max(enrolledPct, 2)}%` }}
											>
												<span className="text-xs text-white font-semibold whitespace-nowrap">
													{funnel.enrolled}件 ({enrolledPct.toFixed(1)}%)
												</span>
											</div>
										</div>
									</div>
									<div className="flex items-center gap-3">
										<span className="text-sm text-gray-600 w-24 shrink-0">
											離脱
										</span>
										<div className="flex-1 h-5 bg-gray-200 rounded-sm overflow-hidden">
											<div
												className="h-full bg-gray-400 flex items-center px-2"
												style={{ width: `${droppedPct}%` }}
											>
												<span className="text-xs text-white font-semibold whitespace-nowrap">
													{funnel.dropped}件 ({droppedPct.toFixed(1)}%)
												</span>
											</div>
										</div>
									</div>
									<div className="flex items-center gap-3">
										<span className="text-sm text-gray-600 w-24 shrink-0">
											未対応
										</span>
										<div className="flex-1 h-5 bg-gray-200 rounded-sm overflow-hidden">
											<div
												className="h-full bg-red-500 flex items-center px-2"
												style={{ width: `${unansweredPct}%` }}
											>
												<span className="text-xs text-white font-semibold whitespace-nowrap">
													{funnel.unanswered}件 ({unansweredPct.toFixed(1)}%)
												</span>
											</div>
										</div>
									</div>
								</div>
								{/* 前年度比 */}
								{prevEnrolledRate !== null && (
									<div className="text-xs text-gray-500 pt-2 border-t border-gray-100">
										入園率 前年度（FY
										{String(getCurrentFY() - 1).slice(2)}）:{" "}
										{prevEnrolledRate.toFixed(1)}%
										{enrolledPct > 0 && (
											<span className="ml-2">
												（差分: {(enrolledPct - prevEnrolledRate).toFixed(1)}
												pt）
											</span>
										)}
									</div>
								)}
							</div>
						);
					})()}
				</div>
			</section>

			{/* グループ内ポジショニング */}
			<section>
				<h3 className="text-base font-bold text-gray-800 mb-3">
					グループ内ポジショニング
				</h3>
				<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
					{/* 充足率 */}
					<div className="bg-white shadow-sm p-4">
						<div className="text-xs text-gray-500 mb-1">充足率</div>
						<div className="flex items-baseline gap-2">
							<span className="text-2xl font-bold text-gray-900">
								{healthScore.ownFillRate != null
									? `${healthScore.ownFillRate.toFixed(1)}%`
									: "-"}
							</span>
							<span className="text-xs text-gray-500">自社</span>
						</div>
						<div className="text-xs text-gray-500 mt-1">
							グループ:{" "}
							{healthScore.groupFillRate != null
								? `${healthScore.groupFillRate.toFixed(1)}%`
								: "-"}
							{healthScore.ownFillRate != null &&
								healthScore.groupFillRate != null && (
									<span
										className={`ml-2 font-semibold ${
											healthScore.ownFillRate >= healthScore.groupFillRate
												? "text-brand-600"
												: "text-red-600"
										}`}
									>
										{healthScore.ownFillRate >= healthScore.groupFillRate
											? "+"
											: ""}
										{(
											healthScore.ownFillRate - healthScore.groupFillRate
										).toFixed(1)}
										pt
									</span>
								)}
						</div>
						<div className="text-[11px] text-gray-400 mt-2">
							自社25園 / グループ{healthScore.groupNurseryCountCapacity}園
						</div>
					</div>
					{/* GBP評価 */}
					<div className="bg-white shadow-sm p-4">
						<div className="text-xs text-gray-500 mb-1">GBP平均評価</div>
						<div className="flex items-baseline gap-2">
							<span className="text-2xl font-bold text-gray-900">
								★
								{healthScore.ownAvgRating != null
									? healthScore.ownAvgRating.toFixed(2)
									: "-"}
							</span>
							<span className="text-xs text-gray-500">自社</span>
						</div>
						<div className="text-xs text-gray-500 mt-1">
							グループ: ★
							{healthScore.grpAvgRating != null
								? healthScore.grpAvgRating.toFixed(2)
								: "-"}
							{healthScore.ownAvgRating != null &&
								healthScore.grpAvgRating != null && (
									<span
										className={`ml-2 font-semibold ${
											healthScore.ownAvgRating >= healthScore.grpAvgRating
												? "text-brand-600"
												: "text-red-600"
										}`}
									>
										{healthScore.ownAvgRating >= healthScore.grpAvgRating
											? "+"
											: ""}
										{(
											healthScore.ownAvgRating - healthScore.grpAvgRating
										).toFixed(2)}
									</span>
								)}
						</div>
						<div className="text-[11px] text-gray-400 mt-2">
							自社{healthScore.ownNurseriesCount}園 / グループ
							{healthScore.grpNurseriesCount}園
						</div>
					</div>
					{/* GBP件数密度 */}
					<div className="bg-white shadow-sm p-4">
						<div className="text-xs text-gray-500 mb-1">園あたり口コミ数</div>
						<div className="flex items-baseline gap-2">
							<span className="text-2xl font-bold text-gray-900">
								{healthScore.ownDensity != null
									? healthScore.ownDensity.toFixed(1)
									: "-"}
							</span>
							<span className="text-xs text-gray-500">件 / 園（自社）</span>
						</div>
						<div className="text-xs text-gray-500 mt-1">
							グループ:{" "}
							{healthScore.grpDensity != null
								? `${healthScore.grpDensity.toFixed(1)}件`
								: "-"}
							{healthScore.ownDensity != null &&
								healthScore.grpDensity != null && (
									<span
										className={`ml-2 font-semibold ${
											healthScore.ownDensity >= healthScore.grpDensity
												? "text-brand-600"
												: "text-red-600"
										}`}
									>
										{healthScore.ownDensity >= healthScore.grpDensity
											? "+"
											: ""}
										{(healthScore.ownDensity - healthScore.grpDensity).toFixed(
											1,
										)}
										件
									</span>
								)}
						</div>
						<div className="text-[11px] text-gray-400 mt-2">
							施策効果の指標。グループ平均との比較
						</div>
					</div>
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

			{/* エリア戦略マップ */}
			<section>
				<h3 className="text-base font-bold text-gray-800 mb-3">
					エリア戦略マップ（直近30日 × 口コミ × 充足率 × 人材）
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
									未対応率
								</th>
								<th className="text-right px-3 py-2 font-semibold text-gray-600">
									GBP評価
								</th>
								<th className="text-right px-3 py-2 font-semibold text-gray-600">
									充足率
								</th>
								<th className="text-right px-3 py-2 font-semibold text-gray-600">
									正社員率
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
										className={`px-3 py-2 text-right ${row.unansweredRate > 50 ? "text-red-600 font-bold" : row.unansweredRate > 30 ? "text-amber-600 font-medium" : ""}`}
									>
										{row.unansweredRate.toFixed(1)}%
									</td>
									<td className="px-3 py-2 text-right text-gray-700">
										{row.gbpRating != null
											? `★${row.gbpRating.toFixed(2)}`
											: "-"}
									</td>
									<td
										className={`px-3 py-2 text-right ${row.fillRate != null && row.fillRate < 80 ? "text-red-600 font-medium" : "text-gray-700"}`}
									>
										{row.fillRate != null ? `${row.fillRate.toFixed(1)}%` : "-"}
									</td>
									<td
										className={`px-3 py-2 text-right ${row.seishainRate != null && row.seishainRate >= 60 ? "text-red-600 font-medium" : "text-gray-700"}`}
									>
										{row.seishainRate != null
											? `${row.seishainRate.toFixed(1)}%`
											: "-"}
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
