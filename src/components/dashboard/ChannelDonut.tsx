"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { ChannelData } from "@/types/inquiry";

interface ChannelDonutProps {
  data: ChannelData[];
}

const COLORS = [
  "#06b6d4",
  "#f97316",
  "#10b981",
  "#eab308",
  "#a855f7",
  "#3b82f6",
  "#ec4899",
  "#f59e0b",
  "#64748b",
  "#ef4444",
  "#14b8a6",
  "#6366f1",
  "#84cc16",
  "#d946ef",
  "#8b5cf6",
];

export default function ChannelDonut({ data }: ChannelDonutProps) {
  const total = data.reduce((sum, d) => sum + d.count, 0);
  const chartData = data.map((d) => ({
    name: d.channel,
    value: d.count,
    percentage: total > 0 ? ((d.count / total) * 100).toFixed(1) : "0",
  }));

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">経路</h3>
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
                  <Cell
                    key={`cell-${i}`}
                    fill={COLORS[i % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, name: string) => [
                  `${value}件 (${
                    total > 0 ? ((value / total) * 100).toFixed(1) : 0
                  }%)`,
                  name,
                ]}
                contentStyle={{ fontSize: 11 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 text-xs space-y-1 max-h-48 overflow-y-auto">
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
