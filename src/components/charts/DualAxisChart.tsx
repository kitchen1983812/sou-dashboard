"use client";

import {
	ResponsiveContainer,
	ComposedChart,
	Line,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	Legend,
} from "recharts";

export interface SeriesConfig {
	key: string;
	name: string;
	color: string;
	type: "line" | "bar";
	strokeDasharray?: string;
}

interface DualAxisChartProps {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	data: any[];
	xKey: string;
	/** 左Y軸（主軸） */
	leftSeries: SeriesConfig[];
	/** 右Y軸（副軸） */
	rightSeries: SeriesConfig[];
	leftLabel?: string;
	rightLabel?: string;
	height?: number;
}

function renderSeries(series: SeriesConfig, yAxisId: string) {
	if (series.type === "bar") {
		return (
			<Bar
				key={series.key}
				yAxisId={yAxisId}
				dataKey={series.key}
				name={series.name}
				fill={series.color}
				radius={[2, 2, 0, 0]}
			/>
		);
	}
	return (
		<Line
			key={series.key}
			yAxisId={yAxisId}
			type="monotone"
			dataKey={series.key}
			name={series.name}
			stroke={series.color}
			strokeWidth={2}
			strokeDasharray={series.strokeDasharray}
			dot={{ r: 3 }}
			activeDot={{ r: 5 }}
		/>
	);
}

export default function DualAxisChart({
	data,
	xKey,
	leftSeries,
	rightSeries,
	leftLabel,
	rightLabel,
	height = 300,
}: DualAxisChartProps) {
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

	return (
		<ResponsiveContainer width="100%" height={height}>
			<ComposedChart
				data={data}
				margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
			>
				<CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
				<XAxis dataKey={xKey} tick={{ fontSize: 12 }} stroke="#9ca3af" />
				<YAxis
					yAxisId="left"
					tick={{ fontSize: 12 }}
					stroke="#9ca3af"
					tickFormatter={(v: number) => v.toLocaleString("ja-JP")}
					label={
						leftLabel
							? {
									value: leftLabel,
									angle: -90,
									position: "insideLeft",
									style: { fontSize: 11, fill: "#9ca3af" },
								}
							: undefined
					}
				/>
				<YAxis
					yAxisId="right"
					orientation="right"
					tick={{ fontSize: 12 }}
					stroke="#9ca3af"
					tickFormatter={(v: number) => v.toLocaleString("ja-JP")}
					label={
						rightLabel
							? {
									value: rightLabel,
									angle: 90,
									position: "insideRight",
									style: { fontSize: 11, fill: "#9ca3af" },
								}
							: undefined
					}
				/>
				<Tooltip
					formatter={(value: number, name: string) => {
						if (name.includes("%") || name.includes("率")) {
							return [`${value}%`, name];
						}
						return [value.toLocaleString("ja-JP"), name];
					}}
					contentStyle={{
						backgroundColor: "#fff",
						border: "1px solid #e5e7eb",
						borderRadius: "8px",
						fontSize: 12,
					}}
				/>
				<Legend wrapperStyle={{ fontSize: 12 }} />
				{leftSeries.map((s) => renderSeries(s, "left"))}
				{rightSeries.map((s) => renderSeries(s, "right"))}
			</ComposedChart>
		</ResponsiveContainer>
	);
}
