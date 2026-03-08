"use client";

import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { GA4Data, GA4Period } from "@/types/ga4";

const PERIOD_OPTIONS: { value: GA4Period; label: string }[] = [
  { value: "7d", label: "過去7日" },
  { value: "30d", label: "過去30日" },
  { value: "90d", label: "過去90日" },
  { value: "fy", label: "今年度" },
];

const CHANNEL_NAMES: Record<string, string> = {
  "Organic Search": "オーガニック検索",
  "Paid Search": "有料検索",
  "Direct": "ダイレクト",
  "Referral": "参照サイト",
  "Organic Social": "SNS",
  "Paid Social": "有料SNS",
  "Email": "メール",
  "Affiliates": "アフィリエイト",
  "Display": "ディスプレイ",
  "Unassigned": "未分類",
  "(other)": "その他",
};

const DEVICE_NAMES: Record<string, string> = {
  "mobile": "モバイル",
  "desktop": "PC",
  "tablet": "タブレット",
};

function mapChannel(name: string): string {
  return CHANNEL_NAMES[name] || name;
}

function mapDevice(name: string): string {
  return DEVICE_NAMES[name.toLowerCase()] || name;
}

function formatGA4Date(yyyymmdd: string): string {
  if (yyyymmdd.length !== 8) return yyyymmdd;
  return `${yyyymmdd.slice(4, 6)}/${yyyymmdd.slice(6, 8)}`;
}

function calcDiff(current: number, prev: number) {
  if (prev === 0) return { diff: current, pct: null };
  const diff = current - prev;
  const pct = Math.round((diff / prev) * 100);
  return { diff, pct };
}

interface SummaryCardProps {
  label: string;
  value: number;
  prev: number;
  unit?: string;
}

function SummaryCard({ label, value, prev, unit = "" }: SummaryCardProps) {
  const { diff, pct } = calcDiff(value, prev);
  const direction = diff > 0 ? "up" : diff < 0 ? "down" : "none";
  return (
    <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="text-2xl font-bold text-gray-900">
        {value.toLocaleString()}
        {unit && <span className="text-sm font-normal ml-1">{unit}</span>}
      </div>
      <div
        className={`text-xs mt-1 font-medium ${
          direction === "up"
            ? "text-green-600"
            : direction === "down"
            ? "text-red-600"
            : "text-gray-400"
        }`}
      >
        {direction === "up" && "↑ "}
        {direction === "down" && "↓ "}
        {direction !== "none"
          ? `${diff > 0 ? "+" : ""}${diff.toLocaleString()}${pct !== null ? ` (${pct > 0 ? "+" : ""}${pct}%)` : ""}`
          : "±0"}
      </div>
      <div className="text-[10px] text-gray-400 mt-0.5">
        前期: {prev.toLocaleString()}
      </div>
    </div>
  );
}

export default function GA4View() {
  const [period, setPeriod] = useState<GA4Period>("30d");
  const [data, setData] = useState<GA4Data | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/ga4?period=${period}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.error) throw new Error(json.error);
        setData(json);
        setLoading(false);
      })
      .catch((e) => {
        setError(String(e));
        setLoading(false);
      });
  }, [period]);

  const channelChartData = (data?.channels || []).map((c) => ({
    name: mapChannel(c.channel),
    sessions: c.sessions,
    users: c.users,
    keyEvents: c.keyEvents,
  }));

  const dailyChartData = (data?.daily || []).map((d) => ({
    date: formatGA4Date(d.date),
    sessions: d.sessions,
    keyEvents: d.keyEvents,
  }));

  return (
    <div className="space-y-6">
      {/* 期間セレクター */}
      <div className="flex items-center gap-2">
        {PERIOD_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setPeriod(opt.value)}
            className={`px-3 py-1.5 text-xs rounded border transition-colors ${
              period === opt.value
                ? "bg-red-600 text-white border-red-600"
                : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
            }`}
          >
            {opt.label}
          </button>
        ))}
        {loading && (
          <span className="text-xs text-gray-400 ml-2">読み込み中...</span>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          データ取得エラー: {error}
          <div className="text-xs mt-1 text-red-500">
            サービスアカウントにGA4プロパティのアクセス権が付与されているか確認してください。
          </div>
        </div>
      )}

      {/* サマリーカード */}
      <section>
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <span className="w-1 h-4 bg-red-600 rounded-full inline-block" />
          サマリー
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <SummaryCard
            label="セッション"
            value={data?.summary.sessions ?? 0}
            prev={data?.summary.prevSessions ?? 0}
          />
          <SummaryCard
            label="ユーザー"
            value={data?.summary.users ?? 0}
            prev={data?.summary.prevUsers ?? 0}
          />
          <SummaryCard
            label="キーイベント"
            value={data?.summary.keyEvents ?? 0}
            prev={data?.summary.prevKeyEvents ?? 0}
          />
        </div>
      </section>

      {/* チャネル別セッション */}
      {channelChartData.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <span className="w-1 h-4 bg-red-600 rounded-full inline-block" />
            チャネル別セッション
          </h3>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={channelChartData}
                margin={{ top: 4, right: 16, left: 0, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  angle={-35}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis tick={{ fontSize: 11 }} width={40} />
                <Tooltip
                  formatter={(v: number, name: string) => [
                    v.toLocaleString(),
                    name === "sessions"
                      ? "セッション"
                      : name === "users"
                      ? "ユーザー"
                      : "キーイベント",
                  ]}
                />
                <Legend
                  formatter={(v) =>
                    v === "sessions"
                      ? "セッション"
                      : v === "users"
                      ? "ユーザー"
                      : "キーイベント"
                  }
                  wrapperStyle={{ fontSize: 11 }}
                />
                <Bar dataKey="sessions" fill="#ef4444" name="sessions" />
                <Bar dataKey="users" fill="#f97316" name="users" />
                <Bar dataKey="keyEvents" fill="#3b82f6" name="keyEvents" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* 日次セッション推移 */}
      {dailyChartData.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <span className="w-1 h-4 bg-red-600 rounded-full inline-block" />
            日次セッション推移
          </h3>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart
                data={dailyChartData}
                margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10 }}
                  interval={Math.floor(dailyChartData.length / 10)}
                />
                <YAxis tick={{ fontSize: 11 }} width={40} />
                <Tooltip
                  formatter={(v: number, name: string) => [
                    v.toLocaleString(),
                    name === "sessions" ? "セッション" : "キーイベント",
                  ]}
                />
                <Legend
                  formatter={(v) =>
                    v === "sessions" ? "セッション" : "キーイベント"
                  }
                  wrapperStyle={{ fontSize: 11 }}
                />
                <Line
                  type="monotone"
                  dataKey="sessions"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={false}
                  name="sessions"
                />
                <Line
                  type="monotone"
                  dataKey="keyEvents"
                  stroke="#3b82f6"
                  strokeWidth={1.5}
                  dot={false}
                  name="keyEvents"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* デバイス別 */}
      {(data?.devices || []).length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <span className="w-1 h-4 bg-red-600 rounded-full inline-block" />
            デバイス別セッション
          </h3>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="px-3 py-2 text-left font-semibold text-gray-600">
                    デバイス
                  </th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-600">
                    セッション
                  </th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-600">
                    割合
                  </th>
                </tr>
              </thead>
              <tbody>
                {(data?.devices || []).map((row) => {
                  const total = (data?.summary.sessions || 1);
                  const pct = Math.round((row.sessions / total) * 100);
                  return (
                    <tr
                      key={row.device}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="px-3 py-2 text-gray-700">
                        {mapDevice(row.device)}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-gray-900">
                        {row.sessions.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-500">
                        {pct}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
