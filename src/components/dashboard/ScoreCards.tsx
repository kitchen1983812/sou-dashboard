"use client";

import { ScoreCardWithComparison } from "@/types/inquiry";
import { calcChangeRate } from "@/lib/dashboardUtils";

interface ScoreCardsProps {
  data: ScoreCardWithComparison;
  fyLabel?: string;
}

interface CardProps {
  label: string;
  value: number;
  prevValue?: number;
  highlight?: boolean;
  suffix?: string;
}

function Card({ label, value, prevValue, highlight, suffix }: CardProps) {
  const change = calcChangeRate(value, prevValue);

  return (
    <div
      className={`rounded-lg border px-4 py-3 ${
        highlight
          ? "bg-red-50 border-red-200"
          : "bg-white border-gray-200"
      }`}
    >
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="text-2xl font-bold text-gray-900">
        {value.toLocaleString()}
        {suffix && <span className="text-sm font-normal ml-1">{suffix}</span>}
      </div>
      {change !== null && (
        <div
          className={`text-xs mt-1 ${
            change.direction === "up"
              ? "text-green-600"
              : change.direction === "down"
              ? "text-red-600"
              : "text-gray-400"
          }`}
        >
          {change.direction === "up" && "↑"}
          {change.direction === "down" && "↓"}
          {change.direction !== "none"
            ? ` ${change.rate.toFixed(1)}%`
            : "該当せず"}
        </div>
      )}
      {change === null && prevValue !== undefined && (
        <div className="text-xs mt-1 text-gray-400">該当せず</div>
      )}
    </div>
  );
}

export default function ScoreCards({ data, fyLabel }: ScoreCardsProps) {
  return (
    <div>
      {fyLabel && (
        <div className="text-sm text-gray-500 mb-2 font-medium">{fyLabel}</div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <Card
          label="問い合わせ数"
          value={data.totalInquiries}
          prevValue={data.prevTotalInquiries}
        />
        <Card
          label="入園数"
          value={data.enrollments}
          prevValue={data.prevEnrollments}
          highlight
        />
        <Card
          label="未対応"
          value={data.unanswered}
          prevValue={data.prevUnanswered}
        />
        <Card
          label="対応中数"
          value={data.inProgress}
          prevValue={data.prevInProgress}
        />
        <Card
          label="検討中数"
          value={data.underConsideration}
          prevValue={data.prevUnderConsideration}
        />
        <Card
          label="待ちリスト数"
          value={data.waitlisted}
          prevValue={data.prevWaitlisted}
          highlight
        />
        <Card
          label="辞退数"
          value={data.declined}
          prevValue={data.prevDeclined}
        />
      </div>
      <div className="flex gap-8 mt-2 text-sm">
        <span>
          <span className="text-red-500">入園率</span>{" "}
          <span className="font-semibold">{data.enrollmentRate.toFixed(2)}%</span>
        </span>
        <span>
          <span className="text-red-500">未対応率</span>{" "}
          <span className="font-semibold">{data.unansweredRate.toFixed(2)}%</span>
        </span>
        <span className="ml-auto">
          <span className="text-red-500">辞退率</span>{" "}
          <span className="font-semibold">{data.declineRate.toFixed(2)}%</span>
        </span>
      </div>
    </div>
  );
}
