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
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">{title}</h3>
      <ResponsiveContainer width="100%" height={200}>
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
            contentStyle={{ fontSize: 12 }}
            formatter={(value: number, name: string) => [
              value,
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
                stroke="#FF9800"
                strokeWidth={1.5}
                strokeOpacity={0.3}
                strokeDasharray="4 3"
                dot={false}
                connectNulls
              />
            </>
          )}
          <Line
            type="monotone"
            dataKey="count"
            stroke="#FF9800"
            strokeWidth={2}
            dot={{ r: 3, fill: "#FF9800" }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
