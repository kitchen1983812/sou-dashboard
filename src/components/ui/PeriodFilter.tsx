"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface PeriodFilterProps {
	from: string;
	to: string;
	minMonth: string;
	maxMonth: string;
	onChange: (from: string, to: string) => void;
}

const MONTH_LABELS = [
	"1月",
	"2月",
	"3月",
	"4月",
	"5月",
	"6月",
	"7月",
	"8月",
	"9月",
	"10月",
	"11月",
	"12月",
];

function formatMonthLabel(month: string): string {
	const [year, m] = month.split("-");
	return `${year}年${m}月`;
}

function getCurrentMonthStr(): string {
	const now = new Date();
	return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getPrevMonthStr(): string {
	const now = new Date();
	let y = now.getFullYear();
	let m = now.getMonth();
	if (m === 0) {
		m = 12;
		y--;
	}
	return `${y}-${String(m).padStart(2, "0")}`;
}

function getFiscalYearRange(): { from: string; to: string } {
	const now = new Date();
	const currentMonth = now.getMonth() + 1;
	const currentYear = now.getFullYear();
	const fyStart = currentMonth >= 4 ? currentYear : currentYear - 1;
	return { from: `${fyStart}-04`, to: `${fyStart + 1}-03` };
}

export default function PeriodFilter({
	from,
	to,
	minMonth,
	maxMonth,
	onChange,
}: PeriodFilterProps) {
	const [localFrom, setLocalFrom] = useState(from);
	const [localTo, setLocalTo] = useState(to);
	const [isOpen, setIsOpen] = useState(false);
	const [selectingField, setSelectingField] = useState<"from" | "to">("from");
	const [calYear, setCalYear] = useState(() =>
		parseInt(from.split("-")[0], 10),
	);

	const popoverRef = useRef<HTMLDivElement>(null);
	const triggerRef = useRef<HTMLButtonElement>(null);

	const minYear = parseInt(minMonth.split("-")[0], 10);
	const maxYear = parseInt(maxMonth.split("-")[0], 10);

	// Sync external changes
	useEffect(() => {
		setLocalFrom(from);
	}, [from]);
	useEffect(() => {
		setLocalTo(to);
	}, [to]);

	useEffect(() => {
		function handleClickOutside(e: MouseEvent) {
			if (
				popoverRef.current &&
				!popoverRef.current.contains(e.target as Node) &&
				triggerRef.current &&
				!triggerRef.current.contains(e.target as Node)
			) {
				setIsOpen(false);
			}
		}
		if (isOpen) document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [isOpen]);

	const apply = useCallback(
		(f: string, t: string) => {
			setIsOpen(false);
			onChange(f, t);
		},
		[onChange],
	);

	const handleMonthClick = (month: string) => {
		if (selectingField === "from") {
			setLocalFrom(month);
			if (month > localTo) setLocalTo(month);
			setSelectingField("to");
		} else {
			setLocalTo(month);
			if (month < localFrom) setLocalFrom(month);
		}
	};

	const handlePresetThisMonth = () => {
		const cur = getCurrentMonthStr();
		const clamped = cur > maxMonth ? maxMonth : cur < minMonth ? minMonth : cur;
		apply(clamped, clamped);
	};

	const handlePresetLastMonth = () => {
		const m = getPrevMonthStr();
		const clamped = m > maxMonth ? maxMonth : m < minMonth ? minMonth : m;
		apply(clamped, clamped);
	};

	const handlePresetFiscalYear = () => {
		const { from: fyFrom, to: fyTo } = getFiscalYearRange();
		apply(
			fyFrom < minMonth ? minMonth : fyFrom,
			fyTo > maxMonth ? maxMonth : fyTo,
		);
	};

	const isMonthInRange = (m: string) => m >= localFrom && m <= localTo;
	const isMonthDisabled = (m: string) => m < minMonth || m > maxMonth;
	const isMonthSelected = (m: string) => m === localFrom || m === localTo;

	return (
		<div className="relative">
			<button
				ref={triggerRef}
				onClick={() => {
					setCalYear(parseInt(localFrom.split("-")[0], 10));
					setSelectingField("from");
					setIsOpen((o) => !o);
				}}
				className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-lg hover:border-gray-400 transition-colors text-sm font-medium text-gray-700"
			>
				<svg
					className="w-4 h-4 text-gray-500"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					strokeWidth={1.5}
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
					/>
				</svg>
				<span>{formatMonthLabel(from)}</span>
				<span className="text-gray-400">〜</span>
				<span>{formatMonthLabel(to)}</span>
				<svg
					className="w-4 h-4 text-gray-400"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					strokeWidth={2}
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						d="M19 9l-7 7-7-7"
					/>
				</svg>
			</button>

			{isOpen && (
				<div
					ref={popoverRef}
					className="absolute left-0 top-full mt-2 z-50 bg-white rounded-xl border border-gray-200 p-4 w-[320px]"
					style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.12)" }}
				>
					{/* プリセット */}
					<div className="flex gap-2 mb-3">
						{[
							{ label: "今月", handler: handlePresetThisMonth },
							{ label: "先月", handler: handlePresetLastMonth },
							{ label: "今年度", handler: handlePresetFiscalYear },
						].map(({ label, handler }) => (
							<button
								key={label}
								onClick={handler}
								className="flex-1 py-1.5 text-xs font-medium rounded-md border border-gray-200 text-gray-600 bg-gray-50 hover:bg-gray-100 transition-colors"
							>
								{label}
							</button>
						))}
					</div>

					{/* 開始 / 終了タブ */}
					<div className="flex gap-2 mb-4">
						{(["from", "to"] as const).map((field) => (
							<button
								key={field}
								onClick={() => {
									setSelectingField(field);
									setCalYear(
										parseInt(
											(field === "from" ? localFrom : localTo).split("-")[0],
											10,
										),
									);
								}}
								className={`flex-1 text-center py-1.5 text-sm font-medium rounded-md transition-colors ${
									selectingField === field
										? "bg-brand-500 text-white"
										: "bg-gray-100 text-gray-600 hover:bg-gray-200"
								}`}
							>
								{field === "from" ? "開始" : "終了"}:{" "}
								{formatMonthLabel(field === "from" ? localFrom : localTo)}
							</button>
						))}
					</div>

					{/* 年ナビゲーション */}
					<div className="flex items-center justify-between mb-3">
						<button
							onClick={() => setCalYear((y) => Math.max(minYear, y - 1))}
							disabled={calYear <= minYear}
							className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
						>
							<svg
								className="w-5 h-5 text-gray-600"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								strokeWidth={2}
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									d="M15 19l-7-7 7-7"
								/>
							</svg>
						</button>
						<span className="text-base font-bold text-gray-800">
							{calYear}年
						</span>
						<button
							onClick={() => setCalYear((y) => Math.min(maxYear, y + 1))}
							disabled={calYear >= maxYear}
							className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
						>
							<svg
								className="w-5 h-5 text-gray-600"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								strokeWidth={2}
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									d="M9 5l7 7-7 7"
								/>
							</svg>
						</button>
					</div>

					{/* 月グリッド */}
					<div className="grid grid-cols-4 gap-1">
						{MONTH_LABELS.map((label, idx) => {
							const monthStr = `${calYear}-${String(idx + 1).padStart(2, "0")}`;
							const disabled = isMonthDisabled(monthStr);
							const selected = isMonthSelected(monthStr);
							const inRange = isMonthInRange(monthStr);
							return (
								<button
									key={monthStr}
									disabled={disabled}
									onClick={() => handleMonthClick(monthStr)}
									className={`py-2 text-sm rounded-md text-center transition-all ${
										disabled
											? "text-gray-300 cursor-not-allowed"
											: selected
												? "bg-brand-500 text-white font-bold"
												: inRange
													? "bg-brand-50 text-brand-700 hover:bg-brand-100"
													: "text-gray-700 hover:bg-gray-100"
									}`}
								>
									{label}
								</button>
							);
						})}
					</div>

					{/* 適用ボタン */}
					<div className="mt-4 flex justify-end">
						<button
							onClick={() => apply(localFrom, localTo)}
							className="px-5 py-2 bg-brand-500 text-white text-sm font-medium rounded-lg hover:bg-brand-600 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
						>
							適用
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
