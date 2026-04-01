import { ReactNode, useState } from "react";

/** Size: "default" (full) or "compact" (reduced padding, no annotation) */
export type ScoreCardSize = "default" | "compact";

export interface ScoreCardProps {
	title: string;
	value: string;
	change?: number;
	changeLabel?: string;
	/** "percent" → +N.N%, "absolute" → +N.N */
	changeFormat?: "percent" | "absolute";
	/** Previous period value shown for context */
	previousValue?: string;
	icon?: ReactNode;
	annotation?: string;
	/** Hover tooltip text (shown on hover instead of cluttering the card surface) */
	tooltip?: string;
	/** Invert colors: negative → green, positive → red (e.g. unanswered rate) */
	invertColor?: boolean;
	/** @deprecated variant is no longer used (flat card design) */
	variant?: string;
	size?: ScoreCardSize;
}

export default function ScoreCard({
	title,
	value,
	change,
	changeLabel,
	changeFormat = "percent",
	previousValue,
	icon,
	annotation,
	tooltip,
	invertColor = false,
	size = "default",
}: ScoreCardProps) {
	const [showTooltip, setShowTooltip] = useState(false);
	const isCompact = size === "compact";
	const isPositive = change !== undefined && change >= 0;

	const positiveColor = invertColor ? "text-red-500" : "text-green-600";
	const negativeColor = invertColor ? "text-green-600" : "text-red-500";
	const suffix = changeFormat === "percent" ? "%" : "";

	return (
		<div
			className={`bg-white shadow-sm relative group ${
				isCompact ? "px-3 py-2.5" : "p-4 sm:p-5"
			}`}
			onMouseEnter={() => tooltip && setShowTooltip(true)}
			onMouseLeave={() => setShowTooltip(false)}
		>
			<div className="flex items-center gap-1.5">
				{icon && <div className="text-gray-400 shrink-0">{icon}</div>}
				<p className={`text-gray-500 ${isCompact ? "text-xs" : "text-sm"}`}>
					{title}
				</p>
			</div>
			{showTooltip && tooltip && (
				<div className="absolute z-20 left-1/2 -translate-x-1/2 bottom-full mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded shadow-md whitespace-pre-wrap max-w-[220px] pointer-events-none">
					{tooltip}
				</div>
			)}
			<p
				className={`font-bold text-gray-900 ${
					isCompact ? "text-lg mt-0.5" : "text-xl sm:text-2xl mt-1.5"
				}`}
			>
				{value}
			</p>
			{change !== undefined && (
				<p className="mt-1">
					<span
						className={`text-xs font-medium ${
							isPositive ? positiveColor : negativeColor
						}`}
					>
						{isPositive ? "+" : ""}
						{change.toFixed(1)}
						{suffix}
					</span>
					{changeLabel && (
						<span className="text-xs text-gray-400 ml-1">{changeLabel}</span>
					)}
				</p>
			)}
			{previousValue && (
				<p className="text-xs text-gray-400 mt-0.5">前期間: {previousValue}</p>
			)}
			{annotation && !isCompact && (
				<p className="text-xs text-gray-500 mt-2">{annotation}</p>
			)}
		</div>
	);
}
