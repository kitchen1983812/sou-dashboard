"use client";

import {
	LineChart,
	Line,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
	Legend,
} from "recharts";
import { TimelinePoint } from "@/lib/dashboardUtils";

interface TimelineChartProps {
	data: TimelinePoint[];
	title?: string;
	prevLabel?: string;
}

export default function TimelineChart({
	data,
	title = "経時",
	prevLabel = "前期",
}: TimelineChartProps) {
	const hasPrev = data.some((d) => d.prevCount !== undefined);

	return (
		<div className="bg-white rounded-xl shadow-sm p-5">
			<h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
				<span className="w-1 h-4 bg-brand-500 rounded-full" />
				{title}
			</h3>
			<ResponsiveContainer width="100%" height={280}>
				<LineChart data={data}>
					<CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
					<XAxis
						dataKey="date"
						tick={{ fontSize: 10 }}
						tickLine={false}
						axisLine={{ stroke: "#e5e7eb" }}
					/>
					<YAxis
						tick={{ fontSize: 10 }}
						tickLine={false}
						axisLine={{ stroke: "#e5e7eb" }}
					/>
					<Tooltip
						contentStyle={{
							fontSize: 12,
							borderRadius: 8,
							border: "1px solid #e5e7eb",
						}}
						formatter={(value: number, name: string) => [
							`${value}件`,
							name === "prevCount" ? prevLabel : "当期",
						]}
					/>
					{hasPrev && (
						<>
							<Legend
								formatter={(value: string) =>
									value === "prevCount" ? prevLabel : "当期"
								}
								wrapperStyle={{ fontSize: 11 }}
							/>
							<Line
								type="monotone"
								dataKey="prevCount"
								stroke="#80caeb"
								strokeWidth={1.5}
								strokeOpacity={0.35}
								strokeDasharray="4 3"
								dot={false}
								connectNulls
							/>
						</>
					)}
					<Line
						type="monotone"
						dataKey="count"
						stroke="#008cc9"
						strokeWidth={2}
						dot={{ r: 3, fill: "#008cc9" }}
						activeDot={{ r: 5, fill: "#005f8a" }}
					/>
				</LineChart>
			</ResponsiveContainer>
		</div>
	);
}
