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

interface FunnelViewProps {
	inquiries: Inquiry[];
}

/** 現在利用可能なデータからファネルを構成 */
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

	return {
		total,
		responded: total - unanswered,
		guided,
		considering,
		waitlisted,
		enrolled,
		declined,
		unanswered,
		inProgress,
	};
}

function FunnelBar({
	label,
	value,
	maxValue,
	color,
	subLabel,
}: {
	label: string;
	value: number;
	maxValue: number;
	color: string;
	subLabel?: string;
}) {
	const pct = maxValue > 0 ? Math.max((value / maxValue) * 100, 3) : 0;

	return (
		<div className="flex items-center gap-3">
			<span className="text-sm text-gray-600 w-24 shrink-0 text-right">
				{label}
			</span>
			<div className="flex-1 h-8 bg-gray-100 rounded overflow-hidden">
				<div
					className={`h-full ${color} rounded flex items-center px-2 transition-all`}
					style={{ width: `${pct}%` }}
				>
					{pct > 10 && (
						<span className="text-xs text-white font-bold">{value}</span>
					)}
				</div>
			</div>
			{pct <= 10 && (
				<span className="text-sm font-bold text-gray-700 w-8">{value}</span>
			)}
			<span className="text-xs text-gray-400 w-16 text-right">
				{subLabel || ""}
			</span>
		</div>
	);
}

export default function FunnelView({ inquiries }: FunnelViewProps) {
	const fyRange = useMemo(() => getFYRange(getCurrentFY()), []);
	const fyData = useMemo(
		() => filterByDateRange(inquiries, fyRange.start, fyRange.end),
		[inquiries, fyRange],
	);

	const funnel = useMemo(() => computeBasicFunnel(fyData), [fyData]);

	return (
		<div className="space-y-6">
			{/* インサイト */}
			<InsightPanel inquiries={fyData} />

			{/* 説明 */}
			<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
				<p className="text-sm text-blue-700">
					現在のステータスデータから問い合わせ→入園のフローを可視化しています。
					「見学日」「見学結果」列をGoogle
					Sheetsに追加すると、見学ステップを含む完全なファネルが表示されます。
				</p>
			</div>

			{/* 現行データファネル */}
			<section>
				<h3 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
					<span className="w-1 h-5 bg-brand-500 rounded-full" />
					ステータス別フロー（FY{String(getCurrentFY()).slice(2)}）
				</h3>
				<div className="space-y-2 bg-white border border-gray-200 rounded-lg p-4">
					<FunnelBar
						label="問い合わせ"
						value={funnel.total}
						maxValue={funnel.total}
						color="bg-gray-500"
						subLabel="100%"
					/>
					<FunnelBar
						label="対応済"
						value={funnel.responded}
						maxValue={funnel.total}
						color="bg-brand-500"
						subLabel={
							funnel.total > 0
								? `${Math.round((funnel.responded / funnel.total) * 100)}%`
								: ""
						}
					/>
					<FunnelBar
						label="ご案内済"
						value={funnel.guided}
						maxValue={funnel.total}
						color="bg-sky-500"
						subLabel={
							funnel.total > 0
								? `${Math.round((funnel.guided / funnel.total) * 100)}%`
								: ""
						}
					/>
					<FunnelBar
						label="検討中"
						value={funnel.considering}
						maxValue={funnel.total}
						color="bg-green-500"
						subLabel={
							funnel.total > 0
								? `${Math.round((funnel.considering / funnel.total) * 100)}%`
								: ""
						}
					/>
					<FunnelBar
						label="待ちリスト"
						value={funnel.waitlisted}
						maxValue={funnel.total}
						color="bg-violet-500"
						subLabel={
							funnel.total > 0
								? `${Math.round((funnel.waitlisted / funnel.total) * 100)}%`
								: ""
						}
					/>
					<FunnelBar
						label="入園"
						value={funnel.enrolled}
						maxValue={funnel.total}
						color="bg-brand-600"
						subLabel={
							funnel.total > 0
								? `${Math.round((funnel.enrolled / funnel.total) * 100)}%`
								: ""
						}
					/>
					<div className="border-t border-gray-100 pt-2 mt-2">
						<FunnelBar
							label="未対応"
							value={funnel.unanswered}
							maxValue={funnel.total}
							color="bg-red-500"
							subLabel={
								funnel.total > 0
									? `${Math.round((funnel.unanswered / funnel.total) * 100)}%`
									: ""
							}
						/>
						<div className="mt-2">
							<FunnelBar
								label="辞退"
								value={funnel.declined}
								maxValue={funnel.total}
								color="bg-gray-400"
								subLabel={
									funnel.total > 0
										? `${Math.round((funnel.declined / funnel.total) * 100)}%`
										: ""
								}
							/>
						</div>
					</div>
				</div>
			</section>

			{/* 転換率サマリー */}
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
							className="bg-white border border-gray-200 rounded-lg p-3 text-center"
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

			{/* 見学ファネル（プレースホルダー） */}
			<section>
				<h3 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
					<span className="w-1 h-5 bg-brand-500 rounded-full" />
					見学ファネル（準備中）
				</h3>
				<div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-6">
					<p className="text-sm text-gray-500 mb-4">
						見学データの追加後に以下が表示されます：
					</p>
					<ul className="text-sm text-gray-600 space-y-1 list-disc list-inside mb-4">
						<li>問い合わせ → 見学予約率</li>
						<li>見学予約 → 見学実施率（キャンセル率）</li>
						<li>見学実施 → 申込率</li>
						<li>申込 → 入園率</li>
						<li>園別ファネル比較</li>
					</ul>
					<div className="space-y-2 opacity-40">
						{[
							{ label: "問い合わせ", pct: 100 },
							{ label: "見学予約", pct: 54 },
							{ label: "見学実施", pct: 42 },
							{ label: "申込", pct: 23 },
							{ label: "入園", pct: 15 },
						].map((step) => (
							<div key={step.label} className="flex items-center gap-3">
								<span className="text-sm text-gray-600 w-24 shrink-0 text-right">
									{step.label}
								</span>
								<div className="flex-1 h-6 bg-gray-200 rounded overflow-hidden">
									<div
										className="h-full bg-brand-300 rounded"
										style={{ width: `${step.pct}%` }}
									/>
								</div>
								<span className="text-xs text-gray-400 w-10 text-right">
									{step.pct}%
								</span>
							</div>
						))}
					</div>
					<p className="text-xs text-gray-400 mt-3 text-center">
						※ サンプル表示（実データではありません）
					</p>
				</div>
			</section>
		</div>
	);
}
