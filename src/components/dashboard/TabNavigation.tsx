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

const EXECUTIVE_TABS: { id: TabId; label: string }[] = [
	{ id: "executive", label: "経営サマリー" },
];

const INQUIRY_TABS: { id: TabId; label: string }[] = [
	{ id: "weeklyReport", label: "週次レポート" },
	{ id: "recent", label: "直近30日-園別" },
	{ id: "annual", label: `FY${fyShort} 年度集計-園別` },
	{ id: "fyMonthly", label: `FY${fyShort} 年度集計-月次別` },
	{ id: "comparison", label: "年度比較" },
	{ id: "report", label: "ブランド別" },
	{ id: "googleAds", label: "Google広告" },
	{ id: "ga4", label: "GA4" },
	{ id: "reviews", label: "Google口コミ" },
];

const OPERATIONS_TABS: { id: TabId; label: string }[] = [
	{ id: "occupancy", label: "定員充足率" },
	{ id: "staff", label: "正社員比率" },
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
	const [mobileOpen, setMobileOpen] = useState(false);
	const [inquiryOpen, setInquiryOpen] = useState(true);
	const [opsOpen, setOpsOpen] = useState(true);
	const [recruitOpen, setRecruitOpen] = useState(true);

	// モバイルメニュー選択時の自動クローズ
	const handleMobileTabChange = (tab: TabId) => {
		onTabChange(tab);
		setMobileOpen(false);
	};

	// デスクトップ（折りたたみ状態）
	if (collapsed) {
		return (
			<>
				{/* モバイルハンバーガー */}
				<MobileHamburger onOpen={() => setMobileOpen(true)} />
				{mobileOpen && (
					<MobileDrawer
						activeTab={activeTab}
						onTabChange={handleMobileTabChange}
						onClose={() => setMobileOpen(false)}
						inquiryOpen={inquiryOpen}
						setInquiryOpen={setInquiryOpen}
						opsOpen={opsOpen}
						setOpsOpen={setOpsOpen}
						recruitOpen={recruitOpen}
						setRecruitOpen={setRecruitOpen}
					/>
				)}
				<nav
					data-sidebar
					className="hidden md:flex w-10 shrink-0 border-r border-gray-200 bg-white flex-col items-center pt-2"
				>
					<button
						onClick={() => setCollapsed(false)}
						className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded"
						title="メニューを開く"
						aria-label="メニューを開く"
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
			</>
		);
	}

	return (
		<>
			{/* モバイルハンバーガー */}
			<MobileHamburger onOpen={() => setMobileOpen(true)} />
			{mobileOpen && (
				<MobileDrawer
					activeTab={activeTab}
					onTabChange={handleMobileTabChange}
					onClose={() => setMobileOpen(false)}
					inquiryOpen={inquiryOpen}
					setInquiryOpen={setInquiryOpen}
					opsOpen={opsOpen}
					setOpsOpen={setOpsOpen}
					recruitOpen={recruitOpen}
					setRecruitOpen={setRecruitOpen}
				/>
			)}
			<nav
				data-sidebar
				className="hidden md:flex w-48 shrink-0 border-r border-gray-200 bg-white flex-col print:hidden"
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

				{/* 経営パート（常時展開） */}
				<div>
					<ul>
						{EXECUTIVE_TABS.map((tab) => (
							<li key={tab.id}>
								<button
									onClick={() => onTabChange(tab.id)}
									className={`w-full text-left px-4 py-2.5 text-sm font-bold transition-colors ${
										activeTab === tab.id
											? "bg-brand-50 text-brand-700 border-l-[3px] border-brand-500"
											: "text-gray-700 hover:bg-gray-50 border-l-[3px] border-transparent"
									}`}
								>
									{tab.label}
								</button>
							</li>
						))}
					</ul>
				</div>

				{/* 集客パート */}
				<div className="border-t border-gray-200">
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

				{/* 運営パート */}
				<div className="border-t border-gray-200 mt-1">
					<button
						onClick={() => setOpsOpen(!opsOpen)}
						className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-bold text-brand-700 tracking-wider hover:bg-brand-50 border-b border-gray-100"
					>
						<span className="flex items-center gap-1.5">
							<span className="w-1.5 h-4 bg-brand-500 rounded-full" />
							運営
						</span>
						<svg
							className={`w-3.5 h-3.5 transition-transform ${
								opsOpen ? "" : "-rotate-90"
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
					{opsOpen && (
						<ul>
							{OPERATIONS_TABS.map((tab) => (
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
		</>
	);
}

/** モバイル用ハンバーガーボタン（md未満のみ表示） */
function MobileHamburger({ onOpen }: { onOpen: () => void }) {
	return (
		<button
			onClick={onOpen}
			className="md:hidden fixed top-3 left-3 z-40 p-2 bg-white shadow-sm border border-gray-200"
			aria-label="メニューを開く"
		>
			<svg
				className="w-5 h-5 text-gray-700"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={2}
					d="M4 6h16M4 12h16M4 18h16"
				/>
			</svg>
		</button>
	);
}

/** モバイル用ドロワー（md未満で表示） */
interface MobileDrawerProps {
	activeTab: TabId;
	onTabChange: (tab: TabId) => void;
	onClose: () => void;
	inquiryOpen: boolean;
	setInquiryOpen: (v: boolean) => void;
	opsOpen: boolean;
	setOpsOpen: (v: boolean) => void;
	recruitOpen: boolean;
	setRecruitOpen: (v: boolean) => void;
}

function MobileDrawer({
	activeTab,
	onTabChange,
	onClose,
	inquiryOpen,
	setInquiryOpen,
	opsOpen,
	setOpsOpen,
	recruitOpen,
	setRecruitOpen,
}: MobileDrawerProps) {
	return (
		<div
			className="md:hidden fixed inset-0 z-50 bg-black/40"
			onClick={onClose}
			role="dialog"
			aria-modal="true"
		>
			<nav
				onClick={(e) => e.stopPropagation()}
				className="w-64 max-w-[80vw] h-full bg-white flex flex-col overflow-y-auto"
			>
				<div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
					<span className="font-bold text-gray-800">メニュー</span>
					<button
						onClick={onClose}
						className="p-2 text-gray-500 hover:bg-gray-100"
						aria-label="メニューを閉じる"
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
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</button>
				</div>

				{/* 経営 */}
				<ul>
					{EXECUTIVE_TABS.map((tab) => (
						<li key={tab.id}>
							<button
								onClick={() => onTabChange(tab.id)}
								className={`w-full text-left px-4 py-3 text-sm font-bold min-h-11 ${
									activeTab === tab.id
										? "bg-brand-50 text-brand-700 border-l-[3px] border-brand-500"
										: "text-gray-700 hover:bg-gray-50 border-l-[3px] border-transparent"
								}`}
							>
								{tab.label}
							</button>
						</li>
					))}
				</ul>

				{/* 集客 */}
				<DrawerSection
					title="集客"
					isOpen={inquiryOpen}
					setIsOpen={setInquiryOpen}
					tabs={INQUIRY_TABS}
					activeTab={activeTab}
					onTabChange={onTabChange}
				/>

				{/* 運営 */}
				<DrawerSection
					title="運営"
					isOpen={opsOpen}
					setIsOpen={setOpsOpen}
					tabs={OPERATIONS_TABS}
					activeTab={activeTab}
					onTabChange={onTabChange}
				/>

				{/* 採用 */}
				<DrawerSection
					title="採用"
					isOpen={recruitOpen}
					setIsOpen={setRecruitOpen}
					tabs={RECRUIT_TABS}
					activeTab={activeTab}
					onTabChange={onTabChange}
				/>
			</nav>
		</div>
	);
}

function DrawerSection({
	title,
	isOpen,
	setIsOpen,
	tabs,
	activeTab,
	onTabChange,
}: {
	title: string;
	isOpen: boolean;
	setIsOpen: (v: boolean) => void;
	tabs: { id: TabId; label: string }[];
	activeTab: TabId;
	onTabChange: (tab: TabId) => void;
}) {
	return (
		<div className="border-t border-gray-200 mt-1">
			<button
				onClick={() => setIsOpen(!isOpen)}
				className="w-full flex items-center justify-between px-4 py-3 text-sm font-bold text-brand-700 hover:bg-brand-50 min-h-11"
			>
				<span className="flex items-center gap-1.5">
					<span className="w-1.5 h-4 bg-brand-500 rounded-full" />
					{title}
				</span>
				<svg
					className={`w-3.5 h-3.5 transition-transform ${isOpen ? "" : "-rotate-90"}`}
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
			{isOpen && (
				<ul>
					{tabs.map((tab) => (
						<li key={tab.id}>
							<button
								onClick={() => onTabChange(tab.id)}
								className={`w-full text-left px-4 py-3 text-sm min-h-11 ${
									activeTab === tab.id
										? "bg-brand-50 text-brand-700 border-l-[3px] border-brand-500 font-semibold"
										: "text-gray-600 hover:bg-gray-50 border-l-[3px] border-transparent"
								}`}
							>
								{tab.label}
							</button>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
