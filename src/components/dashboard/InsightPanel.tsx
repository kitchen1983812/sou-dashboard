"use client";

import { Inquiry } from "@/types/inquiry";
import { STATUS, computeScoreCards } from "@/lib/dashboardUtils";

export interface InsightPanelProps {
	inquiries: Inquiry[];
	prevInquiries?: Inquiry[] | null;
	reviewData?: { area: string; ourAvg: number; compAvg: number }[];
}

type InsightLevel = "critical" | "warning" | "success" | "info";

interface Insight {
	level: InsightLevel;
	message: string;
}

const LEVEL_PRIORITY: Record<InsightLevel, number> = {
	critical: 0,
	warning: 1,
	success: 2,
	info: 3,
};

const LEVEL_STYLES: Record<
	InsightLevel,
	{ border: string; bg: string; iconColor: string }
> = {
	critical: {
		border: "border-red-500",
		bg: "bg-red-50",
		iconColor: "text-red-600",
	},
	warning: {
		border: "border-amber-500",
		bg: "bg-amber-50",
		iconColor: "text-amber-600",
	},
	success: {
		border: "border-green-500",
		bg: "bg-green-50",
		iconColor: "text-green-600",
	},
	info: {
		border: "border-blue-500",
		bg: "bg-blue-50",
		iconColor: "text-blue-600",
	},
};

/* --- SVG Icons --- */
const IconCritical = ({ className }: { className?: string }) => (
	<svg
		className={className}
		viewBox="0 0 20 20"
		fill="currentColor"
		width="16"
		height="16"
	>
		<path
			fillRule="evenodd"
			d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
			clipRule="evenodd"
		/>
	</svg>
);

const IconWarning = ({ className }: { className?: string }) => (
	<svg
		className={className}
		viewBox="0 0 20 20"
		fill="currentColor"
		width="16"
		height="16"
	>
		<path
			fillRule="evenodd"
			d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
			clipRule="evenodd"
		/>
	</svg>
);

const IconSuccess = ({ className }: { className?: string }) => (
	<svg
		className={className}
		viewBox="0 0 20 20"
		fill="currentColor"
		width="16"
		height="16"
	>
		<path
			fillRule="evenodd"
			d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
			clipRule="evenodd"
		/>
	</svg>
);

const IconInfo = ({ className }: { className?: string }) => (
	<svg
		className={className}
		viewBox="0 0 20 20"
		fill="currentColor"
		width="16"
		height="16"
	>
		<path
			fillRule="evenodd"
			d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
			clipRule="evenodd"
		/>
	</svg>
);

const LEVEL_ICONS: Record<
	InsightLevel,
	React.ComponentType<{ className?: string }>
> = {
	critical: IconCritical,
	warning: IconWarning,
	success: IconSuccess,
	info: IconInfo,
};

const MAX_INSIGHTS = 5;

function generateInsights(
	inquiries: Inquiry[],
	prevInquiries: Inquiry[] | null | undefined,
	reviewData: InsightPanelProps["reviewData"],
): Insight[] {
	const insights: Insight[] = [];
	const current = computeScoreCards(inquiries);

	// --- Critical: nursery-level unanswered rate > 50% ---
	const nurseryMap = new Map<string, { total: number; unanswered: number }>();
	for (const inq of inquiries) {
		const name = inq.sheetName || inq.nursery || "";
		if (!name) continue;
		if (!nurseryMap.has(name)) {
			nurseryMap.set(name, { total: 0, unanswered: 0 });
		}
		const entry = nurseryMap.get(name)!;
		entry.total++;
		const s = inq.status || "";
		if (s === STATUS.UNANSWERED || s === "") {
			entry.unanswered++;
		}
	}
	nurseryMap.forEach((data, nursery) => {
		if (data.total === 0) return;
		const rate = Math.round((data.unanswered / data.total) * 100);
		if (rate > 50) {
			insights.push({
				level: "critical",
				message: `${nursery}: 未対応${data.unanswered}件（${rate}%）→ フォローアップ優先`,
			});
		}
	});

	// --- Warning: enrollment rate < 5% when total > 10 ---
	if (current.totalInquiries > 10 && current.enrollmentRate < 5) {
		const prevRate =
			prevInquiries && prevInquiries.length > 0
				? computeScoreCards(prevInquiries).enrollmentRate
				: null;
		const prevLabel =
			prevRate !== null ? `前期${Math.round(prevRate * 10) / 10}%` : "---";
		insights.push({
			level: "warning",
			message: `入園率${Math.round(current.enrollmentRate * 10) / 10}%（${prevLabel}）→ 見学促進策の検討を`,
		});
	}

	// --- Warning: overall unanswered rate > 30% ---
	if (current.unansweredRate > 30) {
		insights.push({
			level: "warning",
			message: `全体未対応率${Math.round(current.unansweredRate)}% → 対応スピード改善が必要`,
		});
	}

	// --- Warning: review scores below competitors ---
	if (reviewData) {
		for (const item of reviewData) {
			if (item.ourAvg < item.compAvg) {
				const diff = (item.ourAvg - item.compAvg).toFixed(1);
				insights.push({
					level: "warning",
					message: `${item.area}: 口コミ★が競合比${diff} → 口コミ獲得施策を強化`,
				});
			}
		}
	}

	// --- Success: > 20% improvement vs previous period ---
	if (prevInquiries && prevInquiries.length > 0) {
		const prev = computeScoreCards(prevInquiries);
		if (prev.totalInquiries > 0) {
			const diff = current.totalInquiries - prev.totalInquiries;
			const rate = Math.round((diff / prev.totalInquiries) * 100);
			if (rate > 20) {
				insights.push({
					level: "success",
					message: `問い合わせ数+${diff}件（前期比+${rate}%）→ 好調`,
				});
			}
		}
	}

	// --- Info: period summary ---
	insights.push({
		level: "info",
		message: `期間内 問い合わせ${current.totalInquiries}件 / 入園${current.enrollments}件`,
	});

	// Sort by priority, limit to MAX_INSIGHTS
	insights.sort((a, b) => LEVEL_PRIORITY[a.level] - LEVEL_PRIORITY[b.level]);
	return insights.slice(0, MAX_INSIGHTS);
}

export default function InsightPanel({
	inquiries,
	prevInquiries,
	reviewData,
}: InsightPanelProps) {
	const insights = generateInsights(inquiries, prevInquiries, reviewData);

	if (insights.length === 0) return null;

	return (
		<div className="mb-4">
			<h3 className="text-sm font-semibold text-gray-600 mb-2 flex items-center gap-1.5">
				<svg
					className="w-4 h-4 text-yellow-500"
					viewBox="0 0 20 20"
					fill="currentColor"
				>
					<path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM4 11a1 1 0 100-2H3a1 1 0 000 2h1zM10 17a1 1 0 001-1v-1a1 1 0 10-2 0v1a1 1 0 001 1zm0-4a3 3 0 100-6 3 3 0 000 6z" />
				</svg>
				インサイト
			</h3>
			<div className="space-y-2">
				{insights.map((insight, i) => {
					const style = LEVEL_STYLES[insight.level];
					const Icon = LEVEL_ICONS[insight.level];
					return (
						<div
							key={i}
							className={`border-l-4 ${style.border} ${style.bg} px-3 py-2 rounded-r flex items-start gap-2`}
						>
							<Icon className={`w-4 h-4 mt-0.5 shrink-0 ${style.iconColor}`} />
							<span className="text-sm text-gray-700">{insight.message}</span>
						</div>
					);
				})}
			</div>
		</div>
	);
}
