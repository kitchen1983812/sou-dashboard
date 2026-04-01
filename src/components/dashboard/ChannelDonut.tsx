"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { ChannelData } from "@/types/inquiry";

interface ChannelDonutProps {
	data: ChannelData[];
}

// brand系グラデーション + グレー（色数を抑えて視覚的ノイズを軽減）
const COLORS = [
	"#008cc9", // brand-500
	"#4db5e3", // brand-300
	"#0078ab", // brand-600
	"#80caeb", // brand-200
	"#005f8a", // brand-700
	"#b3dff3", // brand-100
	"#9ca3af", // gray-400
	"#d1d5db", // gray-300
];

export default function ChannelDonut({ data }: ChannelDonutProps) {
	const total = data.reduce((sum, d) => sum + d.count, 0);
	const chartData = data.map((d) => ({
		name: d.channel,
		value: d.count,
		percentage: total > 0 ? ((d.count / total) * 100).toFixed(1) : "0",
	}));

	return (
		<div className="bg-white shadow-sm p-5">
			<h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
				<span className="w-1 h-4 bg-brand-500 rounded-full" />
				経路
			</h3>
			<div className="flex items-start gap-4">
				<div className="w-48 h-48">
					<ResponsiveContainer width="100%" height="100%">
						<PieChart>
							<Pie
								data={chartData}
								cx="50%"
								cy="50%"
								innerRadius={50}
								outerRadius={80}
								paddingAngle={1}
								dataKey="value"
							>
								{chartData.map((_, i) => (
									<Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
								))}
							</Pie>
							<Tooltip
								formatter={(value: number, name: string) => [
									`${value}件 (${
										total > 0 ? ((value / total) * 100).toFixed(1) : 0
									}%)`,
									name,
								]}
								contentStyle={{
									fontSize: 11,
									borderRadius: 8,
									border: "1px solid #e5e7eb",
								}}
							/>
						</PieChart>
					</ResponsiveContainer>
				</div>
				<div className="flex-1 text-sm space-y-1 max-h-48 overflow-y-auto">
					{chartData.map((d, i) => (
						<div key={d.name} className="flex items-center gap-2">
							<span
								className="w-2.5 h-2.5 rounded-full shrink-0"
								style={{
									backgroundColor: COLORS[i % COLORS.length],
								}}
							/>
							<span className="text-gray-600 truncate">
								{d.name} ({d.percentage}%)
							</span>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
