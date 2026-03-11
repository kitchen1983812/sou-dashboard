"use client";

import { useState } from "react";
import { TabId } from "@/types/inquiry";

interface TabNavigationProps {
	activeTab: TabId;
	onTabChange: (tab: TabId) => void;
}

const currentFY = (() => {
	const now = new Date();
	return now.getMonth() < 3 ? now.getFullYear() - 1 : now.getFullYear();
})();
const fyShort = String(currentFY).slice(2);

const INQUIRY_TABS: { id: TabId; label: string }[] = [
	{ id: "weeklyReport", label: "週次レポート" },
	{ id: "recent", label: "直近30日-園別" },
	{ id: "annual", label: `FY${fyShort} 年度集計-園別` },
	{ id: "fyMonthly", label: `FY${fyShort} 年度集計-月次別` },
	{ id: "comparison", label: "年度比較" },
	{ id: "report", label: "ブランド別" },
	{ id: "googleAds", label: "Google広告" },
	{ id: "ga4", label: "GA4" },
];

const RECRUIT_TABS: { id: TabId; label: string }[] = [
	{ id: "recruitReport", label: "採用レポート" },
	{ id: "recruitCost", label: "採用費分析" },
];

export default function TabNavigation({
	activeTab,
	onTabChange,
}: TabNavigationProps) {
	const [collapsed, setCollapsed] = useState(false);
	const [inquiryOpen, setInquiryOpen] = useState(true);
	const [recruitOpen, setRecruitOpen] = useState(true);

	if (collapsed) {
		return (
			<nav
				data-sidebar
				className="w-10 shrink-0 border-r border-gray-200 bg-white flex flex-col items-center pt-2"
			>
				<button
					onClick={() => setCollapsed(false)}
					className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded"
					title="メニューを開く"
				>
					<svg
						className="w-5 h-5"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M13 5l7 7-7 7M5 5l7 7-7 7"
						/>
					</svg>
				</button>
			</nav>
		);
	}

	return (
		<nav
			data-sidebar
			className="w-48 shrink-0 border-r border-gray-200 bg-white flex flex-col print:hidden"
		>
			{/* 折りたたみボタン */}
			<div className="flex justify-end px-2 pt-2">
				<button
					onClick={() => setCollapsed(true)}
					className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded"
					title="メニューを閉じる"
				>
					<svg
						className="w-4 h-4"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M11 19l-7-7 7-7M19 19l-7-7 7-7"
						/>
					</svg>
				</button>
			</div>

			{/* 集客パート */}
			<div>
				<button
					onClick={() => setInquiryOpen(!inquiryOpen)}
					className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-bold text-brand-700 tracking-wider hover:bg-brand-50 border-b border-gray-100"
				>
					<span className="flex items-center gap-1.5">
						<span className="w-1.5 h-4 bg-brand-500 rounded-full" />
						集客
					</span>
					<svg
						className={`w-3.5 h-3.5 transition-transform ${
							inquiryOpen ? "" : "-rotate-90"
						}`}
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M19 9l-7 7-7-7"
						/>
					</svg>
				</button>
				{inquiryOpen && (
					<ul>
						{INQUIRY_TABS.map((tab) => (
							<li key={tab.id}>
								<button
									onClick={() => onTabChange(tab.id)}
									className={`w-full text-left px-4 py-2 text-sm transition-colors ${
										activeTab === tab.id
											? "bg-brand-50 text-brand-700 border-l-[3px] border-brand-500 font-semibold"
											: "text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-l-[3px] border-transparent"
									}`}
								>
									{tab.label}
								</button>
							</li>
						))}
					</ul>
				)}
			</div>

			{/* 採用パート */}
			<div className="border-t border-gray-200 mt-1">
				<button
					onClick={() => setRecruitOpen(!recruitOpen)}
					className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-bold text-brand-700 tracking-wider hover:bg-brand-50 border-b border-gray-100"
				>
					<span className="flex items-center gap-1.5">
						<span className="w-1.5 h-4 bg-brand-500 rounded-full" />
						採用
					</span>
					<svg
						className={`w-3.5 h-3.5 transition-transform ${
							recruitOpen ? "" : "-rotate-90"
						}`}
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M19 9l-7 7-7-7"
						/>
					</svg>
				</button>
				{recruitOpen && (
					<ul>
						{RECRUIT_TABS.map((tab) => (
							<li key={tab.id}>
								<button
									onClick={() => onTabChange(tab.id)}
									className={`w-full text-left px-4 py-2 text-sm transition-colors ${
										activeTab === tab.id
											? "bg-brand-50 text-brand-700 border-l-[3px] border-brand-500 font-semibold"
											: "text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-l-[3px] border-transparent"
									}`}
								>
									{tab.label}
								</button>
							</li>
						))}
					</ul>
				)}
			</div>
		</nav>
	);
}
