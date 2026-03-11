export default function DashboardLoading() {
	return (
		<div className="p-6 space-y-6 animate-pulse">
			{/* スコアカード */}
			<div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
				{Array.from({ length: 4 }).map((_, i) => (
					<div
						key={i}
						className="bg-white rounded-xl border border-gray-200 p-4"
					>
						<div className="h-4 bg-gray-200 rounded w-20 mb-2" />
						<div className="h-8 bg-gray-200 rounded w-16" />
					</div>
				))}
			</div>
			{/* テーブル */}
			<div className="bg-white rounded-xl border border-gray-200 p-4">
				<div className="h-5 bg-gray-200 rounded w-40 mb-4" />
				{Array.from({ length: 8 }).map((_, i) => (
					<div key={i} className="h-4 bg-gray-100 rounded mb-3" />
				))}
			</div>
		</div>
	);
}
