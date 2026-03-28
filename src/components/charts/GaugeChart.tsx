"use client";

interface GaugeChartProps {
	/** 0〜100の充足率（%） */
	value: number;
	label?: string;
	height?: number;
}

function getGaugeColor(value: number): string {
	if (value > 100) return "#dc2626"; // 定員超過: red-600
	if (value >= 95) return "#16a34a"; // 高充足: green-600
	if (value >= 80) return "#008cc9"; // 良好: brand-500
	if (value >= 60) return "#f59e0b"; // やや低: amber-500
	return "#dc2626"; // 低充足: red-600
}

function describeArc(
	cx: number,
	cy: number,
	radius: number,
	startPct: number,
	endPct: number,
): string {
	const sAngle = Math.PI - (startPct / 100) * Math.PI;
	const eAngle = Math.PI - (endPct / 100) * Math.PI;
	const x1 = cx + radius * Math.cos(sAngle);
	const y1 = cy - radius * Math.sin(sAngle);
	const x2 = cx + radius * Math.cos(eAngle);
	const y2 = cy - radius * Math.sin(eAngle);
	const largeArc = Math.abs(endPct - startPct) > 50 ? 1 : 0;
	return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 0 ${x2} ${y2}`;
}

const SEGMENTS = [
	{ start: 0, end: 60, color: "#fca5a5" }, // 低充足: red-300
	{ start: 60, end: 80, color: "#fcd34d" }, // やや低: amber-300
	{ start: 80, end: 100, color: "#86efac" }, // 良好: green-300
];

export default function GaugeChart({
	value,
	label,
	height = 180,
}: GaugeChartProps) {
	const clampedValue = Math.min(110, Math.max(0, value)); // 110% まで表示
	const displayPct = Math.min(100, clampedValue); // アーク描画は100%まで

	const svgWidth = 240;
	const svgHeight = 150;
	const cx = svgWidth / 2;
	const cy = 130;
	const outerRadius = 95;
	const innerRadius = 68;
	const strokeWidth = outerRadius - innerRadius;

	const valueAngle = Math.PI - (displayPct / 100) * Math.PI;
	const needleLength = outerRadius - 8;
	const needleX = cx + needleLength * Math.cos(valueAngle);
	const needleY = cy - needleLength * Math.sin(valueAngle);
	const gaugeColor = getGaugeColor(value);

	return (
		<div
			className="flex flex-col items-center justify-center"
			style={{ height }}
		>
			<svg
				viewBox={`0 0 ${svgWidth} ${svgHeight}`}
				width="100%"
				height={height - 44}
				style={{ maxWidth: `${svgWidth}px` }}
			>
				{/* 背景セグメント */}
				{SEGMENTS.map((seg) => (
					<path
						key={seg.start}
						d={describeArc(cx, cy, outerRadius, seg.start, seg.end)}
						fill="none"
						stroke={seg.color}
						strokeWidth={strokeWidth}
						strokeOpacity={0.4}
					/>
				))}

				{/* アクティブアーク */}
				<path
					d={describeArc(cx, cy, outerRadius, 0, displayPct)}
					fill="none"
					stroke={gaugeColor}
					strokeWidth={strokeWidth}
					strokeOpacity={0.75}
					strokeLinecap="round"
				/>

				{/* 針 */}
				<line
					x1={cx}
					y1={cy}
					x2={needleX}
					y2={needleY}
					stroke="#374151"
					strokeWidth={2.5}
					strokeLinecap="round"
				/>
				<circle cx={cx} cy={cy} r={6} fill="#374151" />
				<circle cx={cx} cy={cy} r={3} fill="#fff" />

				{/* スケールラベル */}
				{(
					[
						{ pct: 0, x: cx - outerRadius - 4, y: cy + 16 },
						{ pct: 50, x: cx, y: cy - outerRadius - 6 },
						{ pct: 100, x: cx + outerRadius + 4, y: cy + 16 },
					] as const
				).map(({ pct, x, y }) => (
					<text
						key={pct}
						x={x}
						y={y}
						textAnchor="middle"
						fontSize={10}
						fill="#9ca3af"
					>
						{pct}%
					</text>
				))}
			</svg>

			<div className="text-center -mt-1">
				<div className="text-xl font-bold" style={{ color: gaugeColor }}>
					{value > 100 ? (
						<span>
							{value.toFixed(0)}%
							<span className="text-xs ml-1 text-red-500">超過</span>
						</span>
					) : (
						`${value.toFixed(0)}%`
					)}
				</div>
				{label && <div className="text-xs text-gray-400 mt-0.5">{label}</div>}
			</div>
		</div>
	);
}
