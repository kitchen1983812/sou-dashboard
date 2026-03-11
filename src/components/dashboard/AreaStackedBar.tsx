"use client";

import {
	BarChart,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	Legend,
	ResponsiveContainer,
} from "recharts";
import { AreaStatusData } from "@/types/inquiry";
import { ALL_STATUSES, STATUS_COLORS } from "@/lib/dashboardUtils";

interface AreaStackedBarProps {
	data: AreaStatusData[];
}

export default function AreaStackedBar({ data }: AreaStackedBarProps) {
	// Find which statuses actually have data
	const activeStatuses = ALL_STATUSES.filter((status) =>
		data.some((d) => (d[status] as number) > 0),
	);

	return (
		<div className="bg-white rounded-xl border border-gray-200 p-4">
			<h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
				<span className="w-1 h-4 bg-brand-500 rounded-full" />
				エリア別ステータス
			</h3>
			<div className="flex flex-wrap gap-3 mb-3 text-sm">
				{activeStatuses.map((status) => (
					<div key={status} className="flex items-center gap-1">
						<span
							className="w-3 h-3 rounded-sm"
							style={{ backgroundColor: STATUS_COLORS[status] || "#999" }}
						/>
						<span className="text-gray-600">{status}</span>
					</div>
				))}
			</div>
			<ResponsiveContainer width="100%" height={280}>
				<BarChart data={data}>
					<CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
					<XAxis
						dataKey="area"
						tick={{ fontSize: 11 }}
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
					/>
					{activeStatuses.map((status) => (
						<Bar
							key={status}
							dataKey={status}
							stackId="a"
							fill={STATUS_COLORS[status] || "#999"}
							name={status}
						/>
					))}
				</BarChart>
			</ResponsiveContainer>
		</div>
	);
}
