"use client";

import { useMemo, useState } from "react";
import { Inquiry } from "@/types/inquiry";
import {
	parseDate,
	getFiscalYear,
	getCurrentFY,
	filterByDateRange,
	getFYRange,
	STATUS,
	normalizeBrandName,
} from "@/lib/dashboardUtils";

interface CompanyReportViewProps {
	inquiries: Inquiry[];
}

/** ステータス列の定義（画像の列順） */
const STATUS_COLS = [
	{ key: "未対応", label: "未対応", status: [STATUS.UNANSWERED, ""] },
	{
		key: "諸事情",
		label: "諸事情により受入不可",
		status: [STATUS.CANNOT_ACCEPT],
	},
	{ key: "連絡つかない", label: "連絡つかない", status: [STATUS.CANNOT_REACH] },
	{ key: "対応中", label: "対応中", status: [STATUS.IN_PROGRESS] },
	{ key: "案内済", label: "ご案内済", status: [STATUS.GUIDED] },
	{ key: "検討中", label: "保護者様検討中", status: [STATUS.CONSIDERING] },
	{ key: "待ち", label: "待ちリスト登録済み", status: [STATUS.WAITLISTED] },
	{ key: "入園", label: "入園", status: [STATUS.ENROLLED] },
	{ key: "辞退", label: "辞退", status: [STATUS.DECLINED] },
];

/** エリア→色マッピング（色数削減: 統一グレー系バッジ） */
const AREA_COLOR = { bg: "bg-gray-100", text: "text-gray-600" };

function getAreaColor(_area: string) {
	return AREA_COLOR;
}

interface NurseryRow {
	nurseryName: string;
	area: string;
	total: number;
	enrolled: number;
	enrollmentRate: number;
	counts: Record<string, number>;
}

interface CompanySummary {
	company: string;
	rows: NurseryRow[];
	total: number;
	enrolled: number;
	enrollmentRate: number;
	totalCounts: Record<string, number>;
}

interface PrevData {
	byNursery: Map<
		string,
		{
			total: number;
			enrolled: number;
			enrollmentRate: number;
			counts: Record<string, number>;
		}
	>;
	total: number;
	enrolled: number;
	enrollmentRate: number;
	totalCounts: Record<string, number>;
}

function computeCompanyReport(inquiries: Inquiry[]): CompanySummary[] {
	const companyMap = new Map<string, Map<string, Inquiry[]>>();

	for (const inq of inquiries) {
		const company = normalizeBrandName(inq.company || "不明");
		if (!companyMap.has(company)) companyMap.set(company, new Map());
		const nurseryMap = companyMap.get(company)!;
		const nursery = inq.sheetName || "不明";
		if (!nurseryMap.has(nursery)) nurseryMap.set(nursery, []);
		nurseryMap.get(nursery)!.push(inq);
	}

	const result: CompanySummary[] = [];

	companyMap.forEach((nurseryMap, company) => {
		const rows: NurseryRow[] = [];
		const totalCounts: Record<string, number> = {};
		STATUS_COLS.forEach((col) => {
			totalCounts[col.key] = 0;
		});
		let companyTotal = 0;
		let companyEnrolled = 0;

		nurseryMap.forEach((inqs, nurseryName) => {
			const counts: Record<string, number> = {};
			STATUS_COLS.forEach((col) => {
				counts[col.key] = 0;
			});

			let enrolled = 0;
			for (const inq of inqs) {
				const s = inq.status || "";
				for (const col of STATUS_COLS) {
					if (col.status.includes(s)) {
						counts[col.key]++;
						totalCounts[col.key]++;
						break;
					}
				}
				if (s === STATUS.ENROLLED) enrolled++;
			}

			const total = inqs.length;
			companyTotal += total;
			companyEnrolled += enrolled;

			const area = inqs[0]?.area || "-";

			rows.push({
				nurseryName,
				area,
				total,
				enrolled,
				enrollmentRate:
					total > 0 ? Math.round((enrolled / total) * 10000) / 100 : 0,
				counts,
			});
		});

		rows.sort((a, b) => {
			const ac = a.area.localeCompare(b.area);
			if (ac !== 0) return ac;
			return a.nurseryName.localeCompare(b.nurseryName);
		});

		result.push({
			company,
			rows,
			total: companyTotal,
			enrolled: companyEnrolled,
			enrollmentRate:
				companyTotal > 0
					? Math.round((companyEnrolled / companyTotal) * 10000) / 100
					: 0,
			totalCounts,
		});
	});

	result.sort((a, b) => b.total - a.total);
	return result;
}

function computePrevData(inquiries: Inquiry[]): Map<string, PrevData> {
	const reports = computeCompanyReport(inquiries);
	const map = new Map<string, PrevData>();
	for (const r of reports) {
		const byNursery = new Map<
			string,
			{
				total: number;
				enrolled: number;
				enrollmentRate: number;
				counts: Record<string, number>;
			}
		>();
		for (const row of r.rows) {
			byNursery.set(row.nurseryName, {
				total: row.total,
				enrolled: row.enrolled,
				enrollmentRate: row.enrollmentRate,
				counts: { ...row.counts },
			});
		}
		map.set(r.company, {
			byNursery,
			total: r.total,
			enrolled: r.enrolled,
			enrollmentRate: r.enrollmentRate,
			totalCounts: { ...r.totalCounts },
		});
	}
	return map;
}

/** 入園率ヒートマップ色（blue系に統一） */
function getEnrollmentBg(rate: number): string {
	if (rate >= 20) return "bg-blue-200";
	if (rate >= 10) return "bg-blue-100";
	if (rate >= 5) return "bg-blue-50";
	return "";
}

/** ステータス件数ヒートマップ色（gray系に統一） */
function getCountHeatBg(value: number, colMax: number): string {
	if (value === 0 || colMax === 0) return "";
	const ratio = value / colMax;
	if (ratio >= 0.6) return "bg-gray-200";
	if (ratio >= 0.3) return "bg-gray-100";
	if (ratio >= 0.1) return "bg-gray-50";
	return "";
}

/** 前年比インジケーター（括弧付き） */
function YoY({ current, prev }: { current: number; prev: number | undefined }) {
	if (prev === undefined) return null;
	const diff = current - prev;
	if (diff === 0 && prev === 0) return null;
	const arrow = diff > 0 ? "\u2191" : diff < 0 ? "\u2193" : "";
	const color =
		diff > 0 ? "text-red-400" : diff < 0 ? "text-blue-400" : "text-gray-400";
	return (
		<span className={`ml-0.5 text-[9px] ${color}`}>
			({prev}
			{arrow})
		</span>
	);
}

function YoYRate({
	current,
	prev,
}: {
	current: number;
	prev: number | undefined;
}) {
	if (prev === undefined) return null;
	const diff = current - prev;
	const arrow = diff > 0 ? "\u2191" : diff < 0 ? "\u2193" : "";
	const color =
		diff > 0 ? "text-red-400" : diff < 0 ? "text-blue-400" : "text-gray-400";
	return (
		<span className={`ml-0.5 text-[9px] ${color}`}>
			({prev.toFixed(1)}%{arrow})
		</span>
	);
}

/** ソートキー型 */
type SortKey = "nurseryName" | "area" | "total" | "enrollmentRate" | string;
type SortDir = "asc" | "desc";

/** ソート可能ヘッダー */
function SortableHeader({
	label,
	sortKey,
	currentSort,
	currentDir,
	onSort,
	className,
}: {
	label: string;
	sortKey: SortKey;
	currentSort: SortKey;
	currentDir: SortDir;
	onSort: (key: SortKey) => void;
	className?: string;
}) {
	const active = currentSort === sortKey;
	return (
		<th
			className={`px-1 py-1.5 font-semibold text-gray-600 cursor-pointer select-none hover:bg-gray-100 transition-colors ${className || ""}`}
			onClick={() => onSort(sortKey)}
		>
			<span className="inline-flex items-center gap-0.5">
				{label}
				<span
					className={`text-[9px] ${active ? "text-red-600" : "text-gray-300"}`}
				>
					{active ? (currentDir === "asc" ? "\u25B2" : "\u25BC") : "\u25B6"}
				</span>
			</span>
		</th>
	);
}

/** 統一横幅の定数 */
const COL_W = "w-[56px] min-w-[56px]";

function CompanyTable({
	summary,
	prevCompany,
}: {
	summary: CompanySummary;
	prevCompany: PrevData | undefined;
}) {
	const [sortKey, setSortKey] = useState<SortKey>("nurseryName");
	const [sortDir, setSortDir] = useState<SortDir>("asc");

	const handleSort = (key: SortKey) => {
		if (sortKey === key) {
			setSortDir((d) => (d === "asc" ? "desc" : "asc"));
		} else {
			setSortKey(key);
			setSortDir(key === "nurseryName" || key === "area" ? "asc" : "desc");
		}
	};

	// ステータス列ごとの最大値（ヒートマップ用）
	const colMaxes = useMemo(() => {
		const m: Record<string, number> = {};
		STATUS_COLS.forEach((col) => {
			m[col.key] = Math.max(
				...summary.rows.map((r) => r.counts[col.key] || 0),
				1,
			);
		});
		return m;
	}, [summary]);

	const brandRate = summary.enrollmentRate;

	// ソート済み行
	const sortedRows = useMemo(() => {
		const rows = [...summary.rows];
		rows.sort((a, b) => {
			let cmp = 0;
			if (sortKey === "nurseryName") {
				cmp = a.nurseryName.localeCompare(b.nurseryName);
			} else if (sortKey === "area") {
				cmp = a.area.localeCompare(b.area);
			} else if (sortKey === "total") {
				cmp = a.total - b.total;
			} else if (sortKey === "enrollmentRate") {
				cmp = a.enrollmentRate - b.enrollmentRate;
			} else {
				// ステータス列ソート
				cmp = (a.counts[sortKey] || 0) - (b.counts[sortKey] || 0);
			}
			return sortDir === "asc" ? cmp : -cmp;
		});
		return rows;
	}, [summary.rows, sortKey, sortDir]);

	return (
		<div className="mb-8">
			<table className="w-full text-sm border-collapse">
				<thead>
					<tr className="border-b-2 border-gray-300 bg-gray-50">
						<SortableHeader
							label="園"
							sortKey="nurseryName"
							currentSort={sortKey}
							currentDir={sortDir}
							onSort={handleSort}
							className="text-left w-[150px]"
						/>
						<SortableHeader
							label="エリア"
							sortKey="area"
							currentSort={sortKey}
							currentDir={sortDir}
							onSort={handleSort}
							className="text-left w-[55px]"
						/>
						<SortableHeader
							label="合計"
							sortKey="total"
							currentSort={sortKey}
							currentDir={sortDir}
							onSort={handleSort}
							className={`text-center ${COL_W}`}
						/>
						<SortableHeader
							label="入園率"
							sortKey="enrollmentRate"
							currentSort={sortKey}
							currentDir={sortDir}
							onSort={handleSort}
							className={`text-center ${COL_W}`}
						/>
						{STATUS_COLS.map((col) => (
							<SortableHeader
								key={`hdr-${col.key}`}
								label={col.key}
								sortKey={col.key}
								currentSort={sortKey}
								currentDir={sortDir}
								onSort={handleSort}
								className={`text-center ${COL_W} whitespace-nowrap`}
							/>
						))}
					</tr>
				</thead>
				<tbody>
					{sortedRows.map((row) => {
						const areaColor = getAreaColor(row.area);
						const prevNursery = prevCompany?.byNursery.get(row.nurseryName);

						// 入園率がブランド全体の10%以上低い/高い（相対比較）
						const threshold = brandRate * 0.1;
						const nameColor =
							row.enrollmentRate < brandRate - threshold
								? "text-red-600 font-semibold"
								: row.enrollmentRate > brandRate + threshold
									? "text-green-600 font-semibold"
									: "text-gray-700";

						return (
							<tr
								key={row.nurseryName}
								className="border-b border-gray-100 hover:bg-gray-50"
							>
								<td
									className={`px-2 py-1.5 truncate max-w-[150px] ${nameColor}`}
								>
									{row.nurseryName}
								</td>
								<td className="px-1 py-1.5">
									<span
										className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${areaColor.bg} ${areaColor.text}`}
									>
										{row.area}
									</span>
								</td>
								<td className={`px-1 py-1.5 text-center font-medium ${COL_W}`}>
									{row.total}
									<YoY current={row.total} prev={prevNursery?.total} />
								</td>
								<td
									className={`px-1 py-1.5 text-center ${COL_W} ${getEnrollmentBg(row.enrollmentRate)}`}
								>
									{row.enrollmentRate.toFixed(1)}%
									<YoYRate
										current={row.enrollmentRate}
										prev={prevNursery?.enrollmentRate}
									/>
								</td>
								{STATUS_COLS.map((col) => {
									const val = row.counts[col.key] || 0;
									return (
										<td
											key={`${row.nurseryName}-${col.key}`}
											className={`px-1 py-1.5 text-center ${COL_W} ${getCountHeatBg(val, colMaxes[col.key])}`}
										>
											{val}
											<YoY current={val} prev={prevNursery?.counts[col.key]} />
										</td>
									);
								})}
							</tr>
						);
					})}
				</tbody>
				<tfoot>
					{/* 割合行 */}
					<tr className="bg-gray-100 text-gray-500">
						<td className="px-2 py-1 font-medium" colSpan={2}></td>
						<td className={`px-1 py-1 text-center ${COL_W}`}></td>
						<td className={`px-1 py-1 text-center ${COL_W}`}></td>
						{STATUS_COLS.map((col) => {
							const pct =
								summary.total > 0
									? (
											(summary.totalCounts[col.key] / summary.total) *
											100
										).toFixed(1)
									: "0.0";
							return (
								<td
									key={`pct-${col.key}`}
									className={`px-1 py-1 text-center ${COL_W}`}
								>
									{pct}%
								</td>
							);
						})}
					</tr>
					{/* 合計行 */}
					<tr className="bg-red-50 font-bold border-t-2 border-red-300">
						<td className="px-2 py-1.5 text-red-800" colSpan={2}>
							{summary.company} 合計
						</td>
						<td className={`px-1 py-1.5 text-center text-red-800 ${COL_W}`}>
							{summary.total}
							<YoY current={summary.total} prev={prevCompany?.total} />
						</td>
						<td className={`px-1 py-1.5 text-center text-red-800 ${COL_W}`}>
							{summary.enrollmentRate.toFixed(2)}%
							<YoYRate
								current={summary.enrollmentRate}
								prev={prevCompany?.enrollmentRate}
							/>
						</td>
						{STATUS_COLS.map((col) => (
							<td
								key={`total-${col.key}`}
								className={`px-1 py-1.5 text-center text-red-800 ${COL_W}`}
							>
								{summary.totalCounts[col.key]}
								<YoY
									current={summary.totalCounts[col.key]}
									prev={prevCompany?.totalCounts[col.key]}
								/>
							</td>
						))}
					</tr>
				</tfoot>
			</table>
		</div>
	);
}

export default function CompanyReportView({
	inquiries,
}: CompanyReportViewProps) {
	const fyList = useMemo(() => {
		const set = new Set<number>();
		for (const inq of inquiries) {
			const d = parseDate(inq.postDate);
			if (d) set.add(getFiscalYear(d));
		}
		return Array.from(set).sort((a, b) => b - a);
	}, [inquiries]);

	const defaultFY = getCurrentFY();
	const [selectedFY, setSelectedFY] = useState<number | "all">(
		fyList.includes(defaultFY) ? defaultFY : "all",
	);
	const [selectedCompany, setSelectedCompany] = useState<string>("all");

	const fyFiltered = useMemo(() => {
		if (selectedFY === "all") return inquiries;
		const { start, end } = getFYRange(selectedFY);
		return filterByDateRange(inquiries, start, end);
	}, [inquiries, selectedFY]);

	const prevYearData = useMemo(() => {
		if (selectedFY === "all") return null;
		const prevFY = selectedFY - 1;
		const { start, end } = getFYRange(prevFY);
		const prev = filterByDateRange(inquiries, start, end);
		if (prev.length === 0) return null;
		return computePrevData(prev);
	}, [inquiries, selectedFY]);

	const companies = useMemo(() => {
		const set = new Set<string>();
		for (const inq of inquiries) {
			if (inq.company) set.add(normalizeBrandName(inq.company));
		}
		return Array.from(set).sort();
	}, [inquiries]);

	const reportData = useMemo(
		() => computeCompanyReport(fyFiltered),
		[fyFiltered],
	);

	const displayData = useMemo(() => {
		if (selectedCompany === "all") return reportData;
		return reportData.filter((s) => s.company === selectedCompany);
	}, [reportData, selectedCompany]);

	return (
		<div className="space-y-4">
			{/* コントロールバー */}
			<div className="flex items-center gap-4 flex-wrap">
				<div className="flex items-center gap-2">
					<span className="text-base font-medium text-gray-600">年度:</span>
					<div className="flex gap-1">
						<button
							onClick={() => setSelectedFY("all")}
							className={`px-3 py-2 text-sm rounded-md border transition-colors ${
								selectedFY === "all"
									? "bg-red-600 text-white border-red-600"
									: "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
							}`}
						>
							全期間
						</button>
						{fyList.map((fy) => (
							<button
								key={fy}
								onClick={() => setSelectedFY(fy)}
								className={`px-3 py-2 text-sm rounded-md border transition-colors ${
									selectedFY === fy
										? "bg-red-600 text-white border-red-600"
										: "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
								}`}
							>
								FY{fy - 2000}
							</button>
						))}
					</div>
				</div>

				<div className="flex items-center gap-2">
					<span className="text-base font-medium text-gray-600">ブランド:</span>
					<div className="flex gap-1">
						<button
							onClick={() => setSelectedCompany("all")}
							className={`px-3 py-2 text-sm rounded-md border transition-colors ${
								selectedCompany === "all"
									? "bg-red-600 text-white border-red-600"
									: "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
							}`}
						>
							全ブランド
						</button>
						{companies.map((c) => (
							<button
								key={c}
								onClick={() => setSelectedCompany(c)}
								className={`px-3 py-2 text-sm rounded-md border transition-colors ${
									selectedCompany === c
										? "bg-red-600 text-white border-red-600"
										: "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
								}`}
							>
								{c}
							</button>
						))}
					</div>
				</div>
			</div>

			{/* テーブル */}
			<div className="bg-white rounded-xl border border-gray-200 p-4 overflow-x-auto">
				{displayData.length === 0 ? (
					<p className="text-sm text-gray-500 text-center py-8">
						該当データがありません
					</p>
				) : (
					displayData.map((summary) => (
						<CompanyTable
							key={summary.company}
							summary={summary}
							prevCompany={prevYearData?.get(summary.company)}
						/>
					))
				)}
			</div>
		</div>
	);
}
