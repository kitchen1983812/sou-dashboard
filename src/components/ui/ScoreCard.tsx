import { ReactNode } from "react";

/** Top border color variant */
export type ScoreCardVariant = "default" | "accent" | "ok" | "ng" | "warn";

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
	/** Invert colors: negative → green, positive → red (e.g. unanswered rate) */
	invertColor?: boolean;
	variant?: ScoreCardVariant;
	size?: ScoreCardSize;
}

const VARIANT_BORDER: Record<ScoreCardVariant, string> = {
	default: "border-t-gray-700",
	accent: "border-t-brand-500",
	ok: "border-t-green-600",
	ng: "border-t-red-500",
	warn: "border-t-amber-400",
};

export default function ScoreCard({
	title,
	value,
	change,
	changeLabel,
	changeFormat = "percent",
	previousValue,
	icon,
	annotation,
	invertColor = false,
	variant = "default",
	size = "default",
}: ScoreCardProps) {
	const isCompact = size === "compact";
	const isPositive = change !== undefined && change >= 0;
	const isNegative = change !== undefined && change < 0;

	const positiveColor = invertColor ? "text-red-500" : "text-green-600";
	const negativeColor = invertColor ? "text-green-600" : "text-red-500";
	const arrowUpColor = invertColor ? "text-red-500" : "text-green-600";
	const arrowDownColor = invertColor ? "text-green-600" : "text-red-500";
	const suffix = changeFormat === "percent" ? "%" : "";

	return (
		<div
			className={`bg-white rounded-xl border border-gray-200 border-t-[3px] ${VARIANT_BORDER[variant]} shadow-sm ${
				isCompact ? "p-3" : "p-4 sm:p-5"
			}`}
		>
			<div className="flex items-center justify-between">
				<p className={`text-gray-500 ${isCompact ? "text-xs" : "text-sm"}`}>
					{title}
				</p>
				{icon && <div className="text-gray-400">{icon}</div>}
			</div>
			<p
				className={`font-bold text-gray-900 ${
					isCompact ? "text-lg mt-1" : "text-xl sm:text-2xl mt-2"
				}`}
			>
				{value}
			</p>
			{change !== undefined && (
				<div className="flex items-center gap-1 mt-2">
					{isPositive && (
						<svg
							className={`w-4 h-4 ${arrowUpColor}`}
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							strokeWidth={2}
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								d="M5 15l7-7 7 7"
							/>
						</svg>
					)}
					{isNegative && (
						<svg
							className={`w-4 h-4 ${arrowDownColor}`}
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							strokeWidth={2}
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								d="M19 9l-7 7-7-7"
							/>
						</svg>
					)}
					<span
						className={`text-sm font-medium ${
							isPositive ? positiveColor : negativeColor
						}`}
					>
						{isPositive ? "+" : ""}
						{change.toFixed(1)}
						{suffix}
					</span>
					{changeLabel && (
						<span className="text-xs text-gray-500 ml-1">{changeLabel}</span>
					)}
				</div>
			)}
			{previousValue && (
				<p className="text-xs text-gray-400 mt-1">前期間: {previousValue}</p>
			)}
			{annotation && !isCompact && (
				<p className="text-xs text-gray-500 mt-2">{annotation}</p>
			)}
		</div>
	);
}
