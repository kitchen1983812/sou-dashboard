"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";
import { MonthlyStatusData } from "@/types/inquiry";
import { ALL_STATUSES, STATUS_COLORS } from "@/lib/dashboardUtils";

interface MonthlyStackedBarProps {
  data: MonthlyStatusData[];
}

export default function MonthlyStackedBar({ data }: MonthlyStackedBarProps) {
  const activeStatuses = ALL_STATUSES.filter((status) =>
    data.some((d) => (d[status] as number) > 0)
  );

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex flex-wrap gap-3 mb-3 text-xs">
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
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={data} barSize={40}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "#e5e7eb" }}
          />
          <YAxis
            tick={{ fontSize: 10 }}
            tickLine={false}
            axisLine={{ stroke: "#e5e7eb" }}
          />
          <Tooltip contentStyle={{ fontSize: 12 }} />
          {activeStatuses.map((status, i) => (
            <Bar
              key={status}
              dataKey={status}
              stackId="a"
              fill={STATUS_COLORS[status] || "#999"}
              name={status}
            >
              {i === activeStatuses.length - 1 && (
                <LabelList
                  dataKey="total"
                  position="top"
                  style={{ fontSize: 11, fill: "#374151" }}
                />
              )}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
