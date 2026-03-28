"use client";

// Brand colors（SOU ダッシュボード共通）
const SERIES_COLORS = [
	"#008cc9", // brand-500
	"#0ea5e9", // sky-500
	"#16a34a", // green-600
	"#8b5cf6", // violet-500
	"#f59e0b", // amber-500
];

interface FunnelDataItem {
	stage: string;
	count: number;
	/** 任意ラベル（例: 転換率） */
	subLabel?: string;
}

interface FunnelChartProps {
	data: FunnelDataItem[];
	height?: number;
}

export default function FunnelChart({ data, height = 250 }: FunnelChartProps) {
	if (!data || data.length === 0) {
		return (
			<div
				className="flex items-center justify-center text-gray-400 text-sm"
				style={{ height }}
			>
				データなし
			</div>
		);
	}

	const maxCount = Math.max(...data.map((d) => d.count));

	return (
		<div style={{ height }} className="flex flex-col justify-center gap-2 px-4">
			{data.map((item, index) => {
				const widthPercent = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
				const color = SERIES_COLORS[index % SERIES_COLORS.length];
				const textOutside = widthPercent < 15;

				return (
					<div key={item.stage} className="flex items-center gap-3">
						<div
							className="text-sm font-medium text-gray-600 text-right shrink-0"
							style={{ width: "100px" }}
						>
							{item.stage}
						</div>
						<div className="flex-1 relative">
							<div
								className="h-7 rounded-r-md flex items-center transition-all duration-300"
								style={{
									width: `${Math.max(widthPercent, 2)}%`,
									background: `linear-gradient(90deg, ${color}, ${color}cc)`,
								}}
							>
								{!textOutside && (
									<span className="text-white text-xs font-bold px-2 whitespace-nowrap">
										{item.count.toLocaleString("ja-JP")}
									</span>
								)}
							</div>
							{textOutside && (
								<span
									className="absolute text-xs font-bold whitespace-nowrap"
									style={{
										left: `${Math.max(widthPercent, 2) + 1}%`,
										top: "50%",
										transform: "translateY(-50%)",
										color,
									}}
								>
									{item.count.toLocaleString("ja-JP")}
								</span>
							)}
						</div>
						{item.subLabel && (
							<span className="text-xs text-gray-400 shrink-0 w-12 text-right">
								{item.subLabel}
							</span>
						)}
					</div>
				);
			})}
		</div>
	);
}
