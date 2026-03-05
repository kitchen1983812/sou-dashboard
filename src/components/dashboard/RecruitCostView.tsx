"use client";

import { useMemo, useState } from "react";
import { Applicant, RecruitCost } from "@/types/recruit";
import {
  filterApplicantsByFY,
  filterCostsByFY,
  computeCostSummaryGrid,
  computeMonthlyCostTrend,
} from "@/lib/recruitUtils";
import { getCurrentFY, parseDate, getFiscalYear } from "@/lib/dashboardUtils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  ComposedChart,
  ResponsiveContainer,
} from "recharts";

const CATEGORY_COLORS: Record<string, string> = {
  "保育:正社員": "#2563EB",
  "保育:パート": "#60A5FA",
  "他:正社員": "#16A34A",
  "他:パート": "#86EFAC",
  合計: "#6B7280",
};

interface RecruitCostViewProps {
  applicants: Applicant[];
  recruitCosts: RecruitCost[];
}

export default function RecruitCostView({
  applicants,
  recruitCosts,
}: RecruitCostViewProps) {
  const currentFY = getCurrentFY();
  const [selectedFY, setSelectedFY] = useState(currentFY);

  // FY一覧
  const availableFYs = useMemo(() => {
    const fySet = new Set<number>();
    recruitCosts.forEach((c) => {
      const d = parseDate(c.aggregateYearMonth);
      if (d) {
        fySet.add(getFiscalYear(d));
      } else {
        const y = Number(c.year);
        const m = Number(c.month);
        if (!isNaN(y) && !isNaN(m)) {
          fySet.add(m >= 4 ? y : y - 1);
        }
      }
    });
    return Array.from(fySet).sort((a, b) => b - a);
  }, [recruitCosts]);

  // FYフィルタ適用
  const fyApplicants = useMemo(
    () => filterApplicantsByFY(applicants, selectedFY),
    [applicants, selectedFY]
  );
  const fyCosts = useMemo(
    () => filterCostsByFY(recruitCosts, selectedFY),
    [recruitCosts, selectedFY]
  );

  // サマリーグリッド
  const summaryGrid = useMemo(
    () => computeCostSummaryGrid(fyApplicants, fyCosts),
    [fyApplicants, fyCosts]
  );

  // カテゴリ別月次推移
  const categories = ["保育:正社員", "保育:パート", "他:正社員", "他:パート"];
  const monthlyTrends = useMemo(() => {
    const result: Record<string, ReturnType<typeof computeMonthlyCostTrend>> = {};
    categories.forEach((cat) => {
      result[cat] = computeMonthlyCostTrend(
        fyCosts,
        fyApplicants,
        selectedFY,
        cat
      );
    });
    result["合計"] = computeMonthlyCostTrend(
      fyCosts,
      fyApplicants,
      selectedFY
    );
    return result;
  }, [fyCosts, fyApplicants, selectedFY]);

  // 採用単価推移（4系列比較）
  const unitCostTrend = useMemo(() => {
    const months = monthlyTrends["合計"];
    return months.map((m, i) => {
      const row: Record<string, string | number> = { month: m.month };
      categories.forEach((cat) => {
        row[cat] = monthlyTrends[cat][i]?.unitCost || 0;
      });
      return row;
    });
  }, [monthlyTrends]);

  return (
    <div className="space-y-5">
      {/* FYセレクター */}
      <div className="flex flex-wrap items-center gap-2">
        {availableFYs.map((fy) => (
          <button
            key={fy}
            onClick={() => setSelectedFY(fy)}
            className={`px-3 py-1.5 text-xs rounded border transition-colors ${
              selectedFY === fy
                ? "bg-red-600 text-white border-red-600"
                : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
            }`}
          >
            FY{String(fy).slice(2)}
          </button>
        ))}
      </div>

      {/* サマリーグリッド */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          採用費サマリー（FY{String(selectedFY).slice(2)}）
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {summaryGrid.map((row) => (
            <div
              key={row.category}
              className={`rounded-lg p-3 border ${
                row.category === "合計"
                  ? "border-gray-400 bg-gray-50"
                  : "border-gray-200 bg-white"
              }`}
            >
              <div className="text-xs text-gray-500 mb-1">
                {row.category === "合計" ? (
                  <span className="font-bold">合計</span>
                ) : (
                  row.category
                )}
              </div>
              <div className="text-lg font-bold text-gray-800">
                ¥{row.cost.toLocaleString()}
              </div>
              <div className="flex justify-between mt-1 text-xs text-gray-500">
                <span>入社: {row.hires}名</span>
                <span>
                  単価:{" "}
                  {row.unitCost > 0
                    ? `¥${row.unitCost.toLocaleString()}`
                    : "-"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 採用単価推移 */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          カテゴリ別 採用単価推移
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={unitCostTrend}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis
              tick={{ fontSize: 11 }}
              tickFormatter={(v) =>
                v >= 10000 ? `${Math.round(v / 10000)}万` : `${v}`
              }
            />
            <Tooltip
              formatter={(value: number) => `¥${value.toLocaleString()}`}
            />
            <Legend />
            {categories.map((cat) => (
              <Line
                key={cat}
                type="monotone"
                dataKey={cat}
                stroke={CATEGORY_COLORS[cat]}
                strokeWidth={2}
                dot={{ r: 3 }}
                name={cat}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 全体月次推移 */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          全体 — 月次推移
        </h3>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={monthlyTrends["合計"]}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis
              yAxisId="cost"
              tick={{ fontSize: 11 }}
              tickFormatter={(v) =>
                v >= 10000 ? `${Math.round(v / 10000)}万` : `${v}`
              }
            />
            <YAxis
              yAxisId="hires"
              orientation="right"
              tick={{ fontSize: 11 }}
            />
            <Tooltip
              formatter={(value: number, name: string) =>
                name === "費用"
                  ? `¥${value.toLocaleString()}`
                  : name === "採用単価"
                  ? `¥${value.toLocaleString()}`
                  : `${value}名`
              }
            />
            <Legend />
            <Bar
              yAxisId="cost"
              dataKey="cost"
              fill="#6B7280"
              name="費用"
              opacity={0.7}
            />
            <Line
              yAxisId="hires"
              type="monotone"
              dataKey="hires"
              stroke="#DC2626"
              strokeWidth={2}
              dot={{ r: 3 }}
              name="入社数"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* カテゴリ別月次チャート（4パネル） */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {categories.map((cat) => (
          <div
            key={cat}
            className="bg-white border border-gray-200 rounded-lg p-4"
          >
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              {cat} — 月次推移
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={monthlyTrends[cat]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis
                  yAxisId="cost"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v) =>
                    v >= 10000 ? `${Math.round(v / 10000)}万` : `${v}`
                  }
                />
                <YAxis
                  yAxisId="hires"
                  orientation="right"
                  tick={{ fontSize: 10 }}
                />
                <Tooltip
                  formatter={(value: number, name: string) =>
                    name === "費用"
                      ? `¥${value.toLocaleString()}`
                      : `${value}名`
                  }
                />
                <Legend />
                <Bar
                  yAxisId="cost"
                  dataKey="cost"
                  fill={CATEGORY_COLORS[cat]}
                  name="費用"
                  opacity={0.7}
                />
                <Line
                  yAxisId="hires"
                  type="monotone"
                  dataKey="hires"
                  stroke="#DC2626"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="入社数"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ))}
      </div>
    </div>
  );
}
