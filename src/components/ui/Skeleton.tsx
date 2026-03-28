/**
 * Reusable skeleton components for loading states.
 * Mirrors the layout of real components to minimize CLS.
 */

function Shimmer({
	className,
	style,
}: {
	className?: string;
	style?: React.CSSProperties;
}) {
	return (
		<div
			className={`bg-gray-200 rounded animate-pulse ${className || ""}`}
			style={style}
		/>
	);
}

/** ScoreCard skeleton — matches compact variant */
export function ScoreCardSkeleton() {
	return (
		<div className="bg-white rounded-xl border border-gray-200 p-3">
			<Shimmer className="h-3 w-20 mb-2" />
			<Shimmer className="h-6 w-24 mb-2" />
			<Shimmer className="h-3 w-16" />
		</div>
	);
}

/** Row of ScoreCard skeletons */
export function ScoreCardsRowSkeleton({ count = 7 }: { count?: number }) {
	return (
		<div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
			{Array.from({ length: count }).map((_, i) => (
				<ScoreCardSkeleton key={i} />
			))}
		</div>
	);
}

/** Chart card skeleton: title + chart area */
export function ChartCardSkeleton({ height = 260 }: { height?: number }) {
	return (
		<div className="bg-white rounded-xl border border-gray-200 p-4">
			<Shimmer className="h-4 w-36 mb-4" />
			<Shimmer className="w-full" style={{ height }} />
		</div>
	);
}

/** Two ChartCards side by side */
export function ChartRowSkeleton() {
	return (
		<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
			<ChartCardSkeleton />
			<ChartCardSkeleton />
		</div>
	);
}

/** DataTable skeleton */
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
	return (
		<div className="bg-white rounded-xl border border-gray-200 p-4">
			<Shimmer className="h-4 w-40 mb-4" />
			<div className="space-y-2">
				<Shimmer className="h-8 w-full" />
				{Array.from({ length: rows }).map((_, i) => (
					<Shimmer key={i} className="h-6 w-full" />
				))}
			</div>
		</div>
	);
}

/** Full dashboard view skeleton */
export function DashboardViewSkeleton() {
	return (
		<div className="space-y-4">
			<ScoreCardsRowSkeleton />
			<ChartRowSkeleton />
			<TableSkeleton />
		</div>
	);
}
