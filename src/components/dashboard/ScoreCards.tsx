"use client";

import { ScoreCardWithComparison } from "@/types/inquiry";
import { calcChangeRate } from "@/lib/dashboardUtils";
import ScoreCard from "@/components/ui/ScoreCard";

interface ScoreCardsProps {
	data: ScoreCardWithComparison;
	fyLabel?: string;
}

/* --- SVG Icons (inline, lightweight) --- */
const IconInquiry = () => (
	<svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
		<path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
		<path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
	</svg>
);
const IconEnroll = () => (
	<svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
		<path
			fillRule="evenodd"
			d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
			clipRule="evenodd"
		/>
	</svg>
);
const IconPending = () => (
	<svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
		<path
			fillRule="evenodd"
			d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z"
			clipRule="evenodd"
		/>
	</svg>
);
const IconProgress = () => (
	<svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
		<path
			fillRule="evenodd"
			d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
			clipRule="evenodd"
		/>
	</svg>
);
const IconConsider = () => (
	<svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
		<path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
		<path
			fillRule="evenodd"
			d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z"
			clipRule="evenodd"
		/>
	</svg>
);
const IconWaitlist = () => (
	<svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
		<path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
		<path
			fillRule="evenodd"
			d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm5.707 4.293a1 1 0 00-1.414 1.414L9.586 12l-1.293 1.293a1 1 0 101.414 1.414L11 13.414l1.293 1.293a1 1 0 001.414-1.414L12.414 12l1.293-1.293a1 1 0 00-1.414-1.414L11 10.586l-1.293-1.293z"
			clipRule="evenodd"
		/>
	</svg>
);
const IconDecline = () => (
	<svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
		<path
			fillRule="evenodd"
			d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
			clipRule="evenodd"
		/>
	</svg>
);

function toChangeNum(value: number, prevValue?: number): number | undefined {
	const result = calcChangeRate(value, prevValue);
	if (!result || result.direction === "none") return undefined;
	return result.direction === "up" ? result.rate : -result.rate;
}

function RateChip({
	label,
	value,
	warn,
}: {
	label: string;
	value: number;
	warn?: boolean;
}) {
	return (
		<span
			className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${
				warn ? "bg-gray-100 text-red-600" : "bg-gray-100 text-gray-700"
			}`}
		>
			{label}
			<span className="text-sm">{value.toFixed(1)}%</span>
		</span>
	);
}

export default function ScoreCards({ data, fyLabel }: ScoreCardsProps) {
	return (
		<div className="space-y-3">
			{fyLabel && (
				<div className="text-sm text-gray-500 font-medium">{fyLabel}</div>
			)}
			<div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
				<ScoreCard
					title="問い合わせ数"
					value={data.totalInquiries.toLocaleString()}
					change={toChangeNum(data.totalInquiries, data.prevTotalInquiries)}
					changeLabel="前期比"
					icon={<IconInquiry />}
					size="compact"
				/>
				<ScoreCard
					title="入園数"
					value={data.enrollments.toLocaleString()}
					change={toChangeNum(data.enrollments, data.prevEnrollments)}
					changeLabel="前期比"
					variant="ok"
					icon={<IconEnroll />}
					size="compact"
				/>
				<ScoreCard
					title="未対応"
					value={data.unanswered.toLocaleString()}
					change={toChangeNum(data.unanswered, data.prevUnanswered)}
					changeLabel="前期比"
					variant={data.unansweredRate > 20 ? "ng" : "warn"}
					invertColor
					icon={<IconPending />}
					size="compact"
				/>
				<ScoreCard
					title="対応中"
					value={data.inProgress.toLocaleString()}
					change={toChangeNum(data.inProgress, data.prevInProgress)}
					changeLabel="前期比"
					icon={<IconProgress />}
					size="compact"
				/>
				<ScoreCard
					title="検討中"
					value={data.underConsideration.toLocaleString()}
					change={toChangeNum(
						data.underConsideration,
						data.prevUnderConsideration,
					)}
					changeLabel="前期比"
					icon={<IconConsider />}
					size="compact"
				/>
				<ScoreCard
					title="待ちリスト"
					value={data.waitlisted.toLocaleString()}
					change={toChangeNum(data.waitlisted, data.prevWaitlisted)}
					changeLabel="前期比"
					variant="accent"
					icon={<IconWaitlist />}
					size="compact"
				/>
				<ScoreCard
					title="辞退数"
					value={data.declined.toLocaleString()}
					change={toChangeNum(data.declined, data.prevDeclined)}
					changeLabel="前期比"
					icon={<IconDecline />}
					size="compact"
				/>
			</div>
			<div className="flex flex-wrap gap-3">
				<RateChip label="入園率" value={data.enrollmentRate} />
				<RateChip
					label="未対応率"
					value={data.unansweredRate}
					warn={data.unansweredRate > 20}
				/>
				<RateChip label="辞退率" value={data.declineRate} />
			</div>
		</div>
	);
}
