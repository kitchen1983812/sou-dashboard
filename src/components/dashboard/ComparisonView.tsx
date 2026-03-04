"use client";

import { useMemo } from "react";
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
import { Inquiry, ScoreCardData } from "@/types/inquiry";
import {
  computeScoreCards,
  computeMonthlyStatusData,
  filterByDateRange,
  getFYRange,
  computeComparisonData,
  parseDate,
  getFiscalYear,
  getCurrentFY,
  STATUS_COLORS,
  ALL_STATUSES,
} from "@/lib/dashboardUtils";

interface ComparisonViewProps {
  inquiries: Inquiry[];
}

/** データから存在するFY一覧を自動算出（昇順） */
function useUniqueFYs(inquiries: Inquiry[]): number[] {
  return useMemo(() => {
    const set = new Set<number>();
    for (const inq of inquiries) {
      const d = parseDate(inq.postDate);
      if (d) set.add(getFiscalYear(d));
    }
    return Array.from(set).sort((a, b) => a - b);
  }, [inquiries]);
}

// --- 直近3年度 月次推移チャート ---

const FY_LINE_COLORS = ["#9CA3AF", "#F97316", "#DC2626"]; // oldest=gray, middle=orange, newest=red

type MonthlyComparisonPoint = {
  month: string;
  [key: string]: string | number;
};

function buildMonthlyComparison(
  inquiries: Inquiry[],
  fyList: number[]
): MonthlyComparisonPoint[] {
  const currentFY = getCurrentFY();
  const recentFYs = fyList.filter((fy) => fy >= currentFY - 2).slice(-3);
  if (recentFYs.length === 0) return [];

  const FY_MONTHS = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3];
  const dataByFY = new Map<number, Map<number, number>>();

  for (const fy of recentFYs) {
    const { start, end } = getFYRange(fy);
    const filtered = filterByDateRange(inquiries, start, end);
    const monthMap = new Map<number, number>();
    for (const inq of filtered) {
      const d = parseDate(inq.postDate);
      if (!d) continue;
      const m = d.getMonth() + 1;
      monthMap.set(m, (monthMap.get(m) || 0) + 1);
    }
    dataByFY.set(fy, monthMap);
  }

  return FY_MONTHS.map((m) => {
    const point: MonthlyComparisonPoint = { month: `${m}月` };
    for (const fy of recentFYs) {
      point[`FY${fy - 2000}`] = dataByFY.get(fy)?.get(m) || 0;
    }
    return point;
  });
}

function MonthlyComparisonChart({
  inquiries,
  fyList,
}: {
  inquiries: Inquiry[];
  fyList: number[];
}) {
  const currentFY = getCurrentFY();
  const recentFYs = useMemo(
    () => fyList.filter((fy) => fy >= currentFY - 2).slice(-3),
    [fyList, currentFY]
  );
  const data = useMemo(
    () => buildMonthlyComparison(inquiries, fyList),
    [inquiries, fyList]
  );

  if (data.length === 0 || recentFYs.length === 0) return null;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">
        直近{recentFYs.length}年度 月次推移比較
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data}>
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
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {recentFYs.map((fy, i) => (
            <Line
              key={fy}
              type="monotone"
              dataKey={`FY${fy - 2000}`}
              stroke={FY_LINE_COLORS[i] || "#999"}
              strokeWidth={i === recentFYs.length - 1 ? 2.5 : 1.5}
              strokeOpacity={i === recentFYs.length - 1 ? 1 : 0.6}
              dot={{
                r: i === recentFYs.length - 1 ? 3 : 2,
                fill: FY_LINE_COLORS[i] || "#999",
              }}
              activeDot={{ r: 5 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// --- コンパクト スコアカード テーブル ---

interface FYRowData {
  fy: number;
  scores: ScoreCardData;
  prevScores: ScoreCardData | null;
}

/** 前年比の差分表示 */
function DiffBadge({ current, prev }: { current: number; prev?: number }) {
  if (prev === undefined || prev === 0) return null;
  const diff = current - prev;
  if (diff === 0) return null;
  const color = diff > 0 ? "text-green-600" : "text-red-600";
  return (
    <span className={`text-[9px] ${color}`}>
      {diff > 0 ? `↑${diff}` : `↓${Math.abs(diff)}`}
    </span>
  );
}

const SCORE_COLS: { key: keyof ScoreCardData; label: string; rate?: boolean }[] = [
  { key: "enrollmentRate", label: "入園率", rate: true },
  { key: "unansweredRate", label: "未対応率", rate: true },
  { key: "declineRate", label: "辞退率", rate: true },
  { key: "totalInquiries", label: "問い合わせ" },
  { key: "enrollments", label: "入園" },
  { key: "unanswered", label: "未対応" },
  { key: "inProgress", label: "対応中" },
  { key: "underConsideration", label: "検討中" },
  { key: "waitlisted", label: "待ちリスト" },
  { key: "declined", label: "辞退" },
];

function FYScoreTable({ rows }: { rows: FYRowData[] }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
      <table className="w-full text-xs border-collapse table-fixed">
        <thead>
          <tr className="border-b-2 border-gray-300 bg-gray-50">
            <th className="px-2 py-2 text-left font-semibold text-gray-600 w-[52px]">FY</th>
            {SCORE_COLS.map((col, i) => (
              <th
                key={col.key}
                className={`px-1 py-2 text-center font-semibold text-gray-600 ${
                  i === 3 ? "border-l border-gray-300" : ""
                }`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ fy, scores, prevScores }) => (
            <tr key={fy} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="px-2 py-2 font-bold text-gray-800">
                FY{fy - 2000}
              </td>
              {SCORE_COLS.map((col, i) => {
                const val = scores[col.key] as number;
                const prevVal = prevScores
                  ? (prevScores[col.key] as number)
                  : undefined;

                return (
                  <td
                    key={col.key}
                    className={`px-1 py-2 text-center ${
                      i === 3 ? "border-l border-gray-300" : ""
                    }`}
                  >
                    <div className="text-sm font-bold text-gray-900">
                      {col.rate ? `${val.toFixed(1)}%` : val.toLocaleString()}
                    </div>
                    {!col.rate && prevVal !== undefined && (
                      <DiffBadge current={val} prev={prevVal} />
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// --- 比較テーブル ---

function ComparisonTable({
  inquiries,
  fyList,
}: {
  inquiries: Inquiry[];
  fyList: number[];
}) {
  const rows = useMemo(
    () => computeComparisonData(inquiries, fyList),
    [inquiries, fyList]
  );

  const grouped = useMemo(() => {
    const groups = new Map<string, typeof rows>();
    for (const row of rows) {
      const area = row.area as string;
      if (!groups.has(area)) groups.set(area, []);
      groups.get(area)!.push(row);
    }
    return groups;
  }, [rows]);

  function getCellBg(value: number, max: number): string {
    if (value === 0 || max === 0) return "";
    const ratio = value / max;
    if (ratio > 0.6) return "bg-pink-300";
    if (ratio > 0.4) return "bg-pink-200";
    if (ratio > 0.2) return "bg-pink-100";
    if (ratio > 0.1) return "bg-orange-50";
    return "bg-gray-50";
  }

  const maxTotal = Math.max(
    ...rows.map((r) =>
      Math.max(
        ...fyList.map((fy) => (r[`fy${fy}_total`] as number) || 0)
      )
    ),
    1
  );

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 overflow-x-auto">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">
        FY / 総数 / 入園数 / 入園率
      </h3>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b-2 border-gray-300">
            <th className="px-2 py-1.5 text-left" rowSpan={2}>
              エリア
            </th>
            <th className="px-2 py-1.5 text-left" rowSpan={2}>
              シート名
            </th>
            {fyList.map((fy) => (
              <th
                key={fy}
                className="px-2 py-1 text-center border-l border-gray-200"
                colSpan={3}
              >
                FY{fy - 2000}
              </th>
            ))}
            <th
              className="px-2 py-1 text-center border-l border-gray-300"
              colSpan={3}
            >
              総計
            </th>
          </tr>
          <tr className="border-b border-gray-200">
            {[...fyList, "total"].map((fy) => (
              <React.Fragment key={`hdr-${fy}`}>
                <th className="px-1.5 py-1 text-center border-l border-gray-200">
                  総数
                </th>
                <th className="px-1.5 py-1 text-center">入園数</th>
                <th className="px-1.5 py-1 text-center">入園率</th>
              </React.Fragment>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from(grouped.entries()).map(([area, areaRows]) => (
            <React.Fragment key={area}>
              {areaRows.map((row, i) => (
                <tr
                  key={`${area}-${row.nurseryName}`}
                  className="border-b border-gray-100"
                >
                  {i === 0 && (
                    <td
                      className="px-2 py-1.5 font-medium text-gray-700"
                      rowSpan={areaRows.length + 1}
                    >
                      {area}
                    </td>
                  )}
                  <td className="px-2 py-1.5 text-gray-600">
                    {row.nurseryName}
                  </td>
                  {fyList.map((fy) => (
                    <React.Fragment key={`${row.nurseryName}-${fy}`}>
                      <td
                        className={`px-1.5 py-1.5 text-center border-l border-gray-100 ${getCellBg(
                          (row[`fy${fy}_total`] as number) || 0,
                          maxTotal
                        )}`}
                      >
                        {(row[`fy${fy}_total`] as number) || "-"}
                      </td>
                      <td
                        className={`px-1.5 py-1.5 text-center ${getCellBg(
                          (row[`fy${fy}_enrolled`] as number) || 0,
                          maxTotal * 0.3
                        )}`}
                      >
                        {(row[`fy${fy}_enrolled`] as number) || "-"}
                      </td>
                      <td className="px-1.5 py-1.5 text-center">
                        {(row[`fy${fy}_rate`] as number) > 0
                          ? `${row[`fy${fy}_rate`]}%`
                          : "-"}
                      </td>
                    </React.Fragment>
                  ))}
                  <td className="px-1.5 py-1.5 text-center border-l border-gray-300 font-medium">
                    {row.grandTotal || "-"}
                  </td>
                  <td className="px-1.5 py-1.5 text-center font-medium">
                    {row.grandEnrolled || "-"}
                  </td>
                  <td className="px-1.5 py-1.5 text-center font-medium">
                    {(row.grandRate as number) > 0
                      ? `${row.grandRate}%`
                      : "-"}
                  </td>
                </tr>
              ))}
              {/* Area subtotal */}
              <tr className="border-b border-gray-200 bg-gray-50 font-medium">
                <td className="px-2 py-1.5 text-gray-600">合計</td>
                {fyList.map((fy) => {
                  const total = areaRows.reduce(
                    (s, r) => s + ((r[`fy${fy}_total`] as number) || 0),
                    0
                  );
                  const enrolled = areaRows.reduce(
                    (s, r) => s + ((r[`fy${fy}_enrolled`] as number) || 0),
                    0
                  );
                  const rate =
                    total > 0
                      ? Math.round((enrolled / total) * 1000) / 10
                      : 0;
                  return (
                    <React.Fragment key={`sub-${area}-${fy}`}>
                      <td className="px-1.5 py-1.5 text-center border-l border-gray-200">
                        {total}
                      </td>
                      <td className="px-1.5 py-1.5 text-center">{enrolled}</td>
                      <td className="px-1.5 py-1.5 text-center">
                        {rate > 0 ? `${rate}%` : "-"}
                      </td>
                    </React.Fragment>
                  );
                })}
                {(() => {
                  const total = areaRows.reduce(
                    (s, r) => s + ((r.grandTotal as number) || 0),
                    0
                  );
                  const enrolled = areaRows.reduce(
                    (s, r) => s + ((r.grandEnrolled as number) || 0),
                    0
                  );
                  const rate =
                    total > 0
                      ? Math.round((enrolled / total) * 1000) / 10
                      : 0;
                  return (
                    <>
                      <td className="px-1.5 py-1.5 text-center border-l border-gray-300">
                        {total}
                      </td>
                      <td className="px-1.5 py-1.5 text-center">{enrolled}</td>
                      <td className="px-1.5 py-1.5 text-center">
                        {rate > 0 ? `${rate}%` : "-"}
                      </td>
                    </>
                  );
                })()}
              </tr>
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// --- メインコンポーネント ---

import React from "react";

export default function ComparisonView({ inquiries }: ComparisonViewProps) {
  const fyList = useUniqueFYs(inquiries);

  const fyRowData = useMemo(() => {
    return fyList.map((fy) => {
      const { start, end } = getFYRange(fy);
      const filtered = filterByDateRange(inquiries, start, end);
      const scores = computeScoreCards(filtered);

      const prevFy = fy - 1;
      const prevRange = getFYRange(prevFy);
      const prevFiltered = filterByDateRange(
        inquiries,
        prevRange.start,
        prevRange.end
      );
      const prevScores =
        prevFiltered.length > 0 ? computeScoreCards(prevFiltered) : null;

      return { fy, scores, prevScores };
    });
  }, [inquiries, fyList]);

  return (
    <div className="space-y-5">
      {/* 直近3年度 月次推移チャート */}
      <MonthlyComparisonChart inquiries={inquiries} fyList={fyList} />

      {/* FY スコアカードテーブル */}
      <FYScoreTable rows={fyRowData} />

      {/* 比較テーブル */}
      <ComparisonTable inquiries={inquiries} fyList={fyList} />
    </div>
  );
}
