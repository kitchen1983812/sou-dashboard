"use client";

import { useMemo } from "react";
import { Inquiry } from "@/types/inquiry";
import {
	STATUS,
	filterByDateRange,
	getCurrentFY,
	getFYRange,
} from "@/lib/dashboardUtils";
import InsightPanel from "./InsightPanel";
import FunnelChart from "@/components/charts/FunnelChart";

interface FunnelViewProps {
	inquiries: Inquiry[];
}

function computeBasicFunnel(inquiries: Inquiry[]) {
	const total = inquiries.length;
	const inProgress = inquiries.filter(
		(i) => i.status === STATUS.IN_PROGRESS,
	).length;
	const considering = inquiries.filter(
		(i) => i.status === STATUS.CONSIDERING,
	).length;
	const guided = inquiries.filter((i) => i.status === STATUS.GUIDED).length;
	const waitlisted = inquiries.filter(
		(i) => i.status === STATUS.WAITLISTED,
	).length;
	const enrolled = inquiries.filter((i) => i.status === STATUS.ENROLLED).length;
	const declined = inquiries.filter((i) => i.status === STATUS.DECLINED).length;
	const unanswered = inquiries.filter(
		(i) => i.status === STATUS.UNANSWERED || !i.status,
	).length;
	const responded = total - unanswered;

	return {
		total,
		responded,
		guided,
		considering,
		waitlisted,
		enrolled,
		declined,
		unanswered,
		inProgress,
	};
}

export default function FunnelView({ inquiries }: FunnelViewProps) {
	const fyRange = useMemo(() => getFYRange(getCurrentFY()), []);
	const fyData = useMemo(
		() => filterByDateRange(inquiries, fyRange.start, fyRange.end),
		[inquiries, fyRange],
	);

	const funnel = useMemo(() => computeBasicFunnel(fyData), [fyData]);

	const funnelData = useMemo(
		() => [
			{
				stage: "問い合わせ",
				count: funnel.total,
				subLabel: "100%",
			},
			{
				stage: "対応済",
				count: funnel.responded,
				subLabel:
					funnel.total > 0
						? `${Math.round((funnel.responded / funnel.total) * 100)}%`
						: "-",
			},
			{
				stage: "ご案内済",
				count: funnel.guided,
				subLabel:
					funnel.total > 0
						? `${Math.round((funnel.guided / funnel.total) * 100)}%`
						: "-",
			},
			{
				stage: "検討中",
				count: funnel.considering,
				subLabel:
					funnel.total > 0
						? `${Math.round((funnel.considering / funnel.total) * 100)}%`
						: "-",
			},
			{
				stage: "待ちリスト",
				count: funnel.waitlisted,
				subLabel:
					funnel.total > 0
						? `${Math.round((funnel.waitlisted / funnel.total) * 100)}%`
						: "-",
			},
			{
				stage: "入園",
				count: funnel.enrolled,
				subLabel:
					funnel.total > 0
						? `${Math.round((funnel.enrolled / funnel.total) * 100)}%`
						: "-",
			},
		],
		[funnel],
	);

	return (
		<div className="space-y-6">
			{/* インサイト */}
			<InsightPanel inquiries={fyData} />

			{/* ステータス別フロー */}
			<section>
				<h3 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
					<span className="w-1 h-5 bg-brand-500 rounded-full" />
					ステータス別フロー（FY{String(getCurrentFY()).slice(2)}）
				</h3>
				<div className="bg-white rounded-xl shadow-sm p-5">
					<FunnelChart data={funnelData} height={260} />
					{/* 未対応・辞退を下段に */}
					<div className="border-t border-gray-100 mt-3 pt-3 grid grid-cols-2 gap-2">
						{[
							{
								label: "未対応",
								count: funnel.unanswered,
								color: "#dc2626",
							},
							{ label: "辞退", count: funnel.declined, color: "#9ca3af" },
						].map((item) => (
							<div key={item.label} className="flex items-center gap-2 text-sm">
								<span
									className="w-2 h-2 rounded-full shrink-0"
									style={{ backgroundColor: item.color }}
								/>
								<span className="text-gray-500">{item.label}:</span>
								<span className="font-semibold text-gray-800">
									{item.count}
								</span>
								<span className="text-gray-400 text-xs">
									(
									{funnel.total > 0
										? `${Math.round((item.count / funnel.total) * 100)}%`
										: "-"}
									)
								</span>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* 主要転換率 */}
			<section>
				<h3 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
					<span className="w-1 h-5 bg-brand-500 rounded-full" />
					主要転換率
				</h3>
				<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
					{[
						{
							label: "対応率",
							value:
								funnel.total > 0 ? (funnel.responded / funnel.total) * 100 : 0,
							desc: "問合せ→対応",
						},
						{
							label: "案内率",
							value:
								funnel.responded > 0
									? (funnel.guided / funnel.responded) * 100
									: 0,
							desc: "対応→案内",
						},
						{
							label: "入園率",
							value:
								funnel.total > 0 ? (funnel.enrolled / funnel.total) * 100 : 0,
							desc: "問合せ→入園",
						},
						{
							label: "辞退率",
							value:
								funnel.total > 0 ? (funnel.declined / funnel.total) * 100 : 0,
							desc: "問合せ→辞退",
						},
					].map((item) => (
						<div
							key={item.label}
							className="bg-white rounded-xl shadow-sm p-3 text-center"
						>
							<div className="text-xs text-gray-500 mb-1">{item.label}</div>
							<div className="text-xl font-bold text-gray-900">
								{item.value.toFixed(1)}%
							</div>
							<div className="text-xs text-gray-400">{item.desc}</div>
						</div>
					))}
				</div>
			</section>
		</div>
	);
}
