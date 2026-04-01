"use client";

import { useMemo, useState, useEffect } from "react";
import { Applicant, RecruitCost, RecruitFilterState } from "@/types/recruit";
import {
	filterApplicantsByFY,
	filterCostsByFY,
	getUniqueValues,
	computeRecruitFunnel,
	computeRouteBreakdown,
	computeNurseryApplications,
	computeMonthlyRecruitTrend,
	computeRouteCost,
	computeAgencyCost,
	computeNurseryStatusCrosstab,
	computeAgencyStatusCrosstab,
} from "@/lib/recruitUtils";
import { getCurrentFY, parseDate, getFiscalYear } from "@/lib/dashboardUtils";
import {
	PieChart,
	Pie,
	Cell,
	BarChart,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	Legend,
	LineChart,
	Line,
	ResponsiveContainer,
} from "recharts";

// Unified 8-color palette
const COLORS = [
	"#2563EB", // blue-600
	"#008cc9", // brand-500
	"#16A34A", // green-600
	"#F59E0B", // amber-500
	"#8B5CF6", // violet-500
	"#94A3B8", // slate-400
	"#0EA5E9", // sky-500
	"#6B7280", // gray-500
];

const STATUS_GROUP_COLORS: Record<string, string> = {
	応募: "#94A3B8", // slate-400
	面接見学: "#0EA5E9", // sky-500
	合格: "#16A34A", // green-600
	内定: "#8B5CF6", // violet-500
	入社: "#2563EB", // blue-600
	辞退: "#F59E0B", // amber-500
	不採用: "#DC2626", // red-600
	その他: "#6B7280", // gray-500
};

interface RecruitReportViewProps {
	applicants: Applicant[];
	recruitCosts: RecruitCost[];
}

export default function RecruitReportView({
	applicants,
	recruitCosts,
}: RecruitReportViewProps) {
	const currentFY = getCurrentFY();
	const [selectedFY, setSelectedFY] = useState(currentFY);
	const [filters, setFilters] = useState<RecruitFilterState>({
		nursery: "",
		recruitRoute: "",
		agency: "",
		jobType: "",
		employmentType: "",
	});

	// FY一覧
	const availableFYs = useMemo(() => {
		const fySet = new Set<number>();
		applicants.forEach((a) => {
			const d = parseDate(a.applicationDate);
			if (d) fySet.add(getFiscalYear(d));
		});
		return Array.from(fySet).sort((a, b) => b - a);
	}, [applicants]);

	// データに選択FYが存在しない場合、最新の有効FYに切り替え
	useEffect(() => {
		if (availableFYs.length > 0 && !availableFYs.includes(selectedFY)) {
			setSelectedFY(availableFYs[0]);
		}
	}, [availableFYs, selectedFY]);

	// フィルタ選択肢
	const nurseries = useMemo(
		() => getUniqueValues(applicants, "nursery"),
		[applicants],
	);
	const routes = useMemo(
		() => getUniqueValues(applicants, "recruitRoute"),
		[applicants],
	);
	const agencies = useMemo(
		() => getUniqueValues(applicants, "agency"),
		[applicants],
	);
	const jobTypes = useMemo(
		() => getUniqueValues(applicants, "jobType"),
		[applicants],
	);
	const empTypes = useMemo(
		() => getUniqueValues(applicants, "employmentType"),
		[applicants],
	);

	// FY + フィルター適用
	const filtered = useMemo(() => {
		let data = filterApplicantsByFY(applicants, selectedFY);
		if (filters.nursery)
			data = data.filter((a) => a.nursery === filters.nursery);
		if (filters.recruitRoute)
			data = data.filter((a) => a.recruitRoute === filters.recruitRoute);
		if (filters.agency) data = data.filter((a) => a.agency === filters.agency);
		if (filters.jobType)
			data = data.filter((a) => a.jobType === filters.jobType);
		if (filters.employmentType)
			data = data.filter((a) => a.employmentType === filters.employmentType);
		return data;
	}, [applicants, selectedFY, filters]);

	const filteredCosts = useMemo(
		() => filterCostsByFY(recruitCosts, selectedFY),
		[recruitCosts, selectedFY],
	);

	// 前年比較用
	const prevFiltered = useMemo(
		() => filterApplicantsByFY(applicants, selectedFY - 1),
		[applicants, selectedFY],
	);

	// 集計
	const funnel = useMemo(() => computeRecruitFunnel(filtered), [filtered]);
	const routeBreakdown = useMemo(
		() => computeRouteBreakdown(filtered),
		[filtered],
	);
	const nurseryApps = useMemo(
		() => computeNurseryApplications(filtered),
		[filtered],
	);
	const monthlyTrend = useMemo(
		() => computeMonthlyRecruitTrend(filtered, selectedFY, prevFiltered),
		[filtered, selectedFY, prevFiltered],
	);
	const routeCost = useMemo(
		() => computeRouteCost(filtered, filteredCosts),
		[filtered, filteredCosts],
	);
	const agencyCost = useMemo(
		() => computeAgencyCost(filtered, filteredCosts),
		[filtered, filteredCosts],
	);
	const nurseryCrosstab = useMemo(
		() => computeNurseryStatusCrosstab(filtered),
		[filtered],
	);
	const agencyCrosstab = useMemo(
		() => computeAgencyStatusCrosstab(filtered),
		[filtered],
	);

	const funnelRate = (n: number) =>
		funnel.total > 0 ? `${Math.round((n / funnel.total) * 1000) / 10}%` : "0%";

	const formatCurrency = (v: number) =>
		v >= 10000 ? `${Math.round(v / 10000)}万` : v.toLocaleString();

	return (
		<div className="space-y-5">
			{/* FYセレクター + フィルター */}
			<div className="flex flex-wrap items-center gap-2">
				{availableFYs.map((fy) => (
					<button
						key={fy}
						onClick={() => setSelectedFY(fy)}
						className={`px-3 py-1.5 text-sm rounded border transition-colors ${
							selectedFY === fy
								? "bg-brand-500 text-white border-brand-500"
								: "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
						}`}
					>
						FY{String(fy).slice(2)}
					</button>
				))}
			</div>

			{/* フィルター */}
			<div className="flex flex-wrap gap-2">
				<FilterSelect
					label="園"
					value={filters.nursery}
					options={nurseries}
					onChange={(v) => setFilters((f) => ({ ...f, nursery: v }))}
				/>
				<FilterSelect
					label="採用ルート"
					value={filters.recruitRoute}
					options={routes}
					onChange={(v) => setFilters((f) => ({ ...f, recruitRoute: v }))}
				/>
				<FilterSelect
					label="媒体/会社"
					value={filters.agency}
					options={agencies}
					onChange={(v) => setFilters((f) => ({ ...f, agency: v }))}
				/>
				<FilterSelect
					label="職種"
					value={filters.jobType}
					options={jobTypes}
					onChange={(v) => setFilters((f) => ({ ...f, jobType: v }))}
				/>
				<FilterSelect
					label="雇用形態"
					value={filters.employmentType}
					options={empTypes}
					onChange={(v) => setFilters((f) => ({ ...f, employmentType: v }))}
				/>
			</div>

			{/* ファネル */}
			<div className="bg-white shadow-sm p-5">
				<h3 className="text-sm font-semibold text-gray-700 mb-3">
					採用ファネル（FY{String(selectedFY).slice(2)}）
				</h3>
				<div className="flex items-end gap-1">
					{[
						{ label: "応募", value: funnel.total, color: "bg-slate-400" },
						{
							label: "書類選考通過",
							value: funnel.documentPass,
							color: "bg-sky-400",
						},
						{
							label: "見学・面接",
							value: funnel.tourInterview,
							color: "bg-sky-500",
						},
						{ label: "合格", value: funnel.passed, color: "bg-green-500" },
						{
							label: "内定承諾",
							value: funnel.offerAccepted,
							color: "bg-violet-500",
						},
						{ label: "入社", value: funnel.joined, color: "bg-blue-600" },
					].map((stage, i) => (
						<div key={i} className="flex-1 text-center">
							<div className="text-sm text-gray-500 mb-1">{stage.label}</div>
							<div
								className={`${stage.color} text-white rounded mx-auto flex items-center justify-center font-bold`}
								style={{
									height: `${Math.max(
										40,
										funnel.total > 0 ? (stage.value / funnel.total) * 120 : 40,
									)}px`,
								}}
							>
								{stage.value}
							</div>
							<div className="text-sm text-gray-400 mt-1">
								{funnelRate(stage.value)}
							</div>
						</div>
					))}
				</div>
			</div>

			{/* ドロップオフカード */}
			<div className="grid grid-cols-3 md:grid-cols-6 gap-2">
				{[
					{ label: "書類選考落ち", value: funnel.documentFail },
					{ label: "見学前辞退", value: funnel.preTourDecline },
					{ label: "見学後辞退", value: funnel.postTourDecline },
					{ label: "面接前辞退", value: funnel.preInterviewDecline },
					{ label: "面接後辞退", value: funnel.postInterviewDecline },
					{ label: "内定後辞退", value: funnel.postOfferDecline },
				].map((item, i) => (
					<div key={i} className="bg-white shadow-sm p-3 text-center">
						<div className="text-sm text-gray-500">{item.label}</div>
						<div className="text-lg font-bold text-red-600">{item.value}</div>
					</div>
				))}
			</div>

			{/* 不採用カード */}
			<div className="bg-white shadow-sm p-3 w-fit">
				<span className="text-sm text-gray-500 mr-2">不採用:</span>
				<span className="text-lg font-bold text-gray-700">
					{funnel.rejected}
				</span>
			</div>

			{/* 2列: 応募経路ドーナツ + 園別バー */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
				{/* 応募経路ドーナツ */}
				<div className="bg-white shadow-sm p-5">
					<h3 className="text-sm font-semibold text-gray-700 mb-3">
						応募経路別
					</h3>
					<ResponsiveContainer width="100%" height={280}>
						<PieChart>
							<Pie
								data={routeBreakdown}
								dataKey="count"
								nameKey="route"
								cx="50%"
								cy="50%"
								innerRadius={50}
								outerRadius={100}
								label={({ route, percentage }) => `${route} ${percentage}%`}
							>
								{routeBreakdown.map((_, i) => (
									<Cell key={i} fill={COLORS[i % COLORS.length]} />
								))}
							</Pie>
							<Tooltip />
						</PieChart>
					</ResponsiveContainer>
				</div>

				{/* 園別応募数バー */}
				<div className="bg-white shadow-sm p-5">
					<h3 className="text-sm font-semibold text-gray-700 mb-3">
						園別応募数
					</h3>
					<ResponsiveContainer width="100%" height={280}>
						<BarChart
							data={nurseryApps.slice(0, 15)}
							layout="vertical"
							margin={{ left: 80, right: 20 }}
						>
							<CartesianGrid strokeDasharray="3 3" />
							<XAxis type="number" />
							<YAxis
								type="category"
								dataKey="nursery"
								width={75}
								tick={{ fontSize: 11 }}
							/>
							<Tooltip />
							<Bar dataKey="count" fill="#2563EB" name="応募数" />
						</BarChart>
					</ResponsiveContainer>
				</div>
			</div>

			{/* 2列: 応募件数推移 + 採用件数推移 */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
				<div className="bg-white shadow-sm p-5">
					<h3 className="text-sm font-semibold text-gray-700 mb-3">
						月別応募数推移
					</h3>
					<ResponsiveContainer width="100%" height={250}>
						<LineChart data={monthlyTrend}>
							<CartesianGrid strokeDasharray="3 3" />
							<XAxis dataKey="month" tick={{ fontSize: 11 }} />
							<YAxis tick={{ fontSize: 11 }} />
							<Tooltip />
							<Legend />
							<Line
								type="monotone"
								dataKey="applications"
								stroke="#2563EB"
								strokeWidth={2}
								name={`FY${String(selectedFY).slice(2)}`}
								dot={{ r: 3 }}
							/>
							{prevFiltered.length > 0 && (
								<Line
									type="monotone"
									dataKey="prevApplications"
									stroke="#94A3B8"
									strokeDasharray="5 5"
									name={`FY${String(selectedFY - 1).slice(2)}`}
									dot={{ r: 2 }}
								/>
							)}
						</LineChart>
					</ResponsiveContainer>
				</div>

				<div className="bg-white shadow-sm p-5">
					<h3 className="text-sm font-semibold text-gray-700 mb-3">
						月別入社数推移
					</h3>
					<ResponsiveContainer width="100%" height={250}>
						<LineChart data={monthlyTrend}>
							<CartesianGrid strokeDasharray="3 3" />
							<XAxis dataKey="month" tick={{ fontSize: 11 }} />
							<YAxis tick={{ fontSize: 11 }} />
							<Tooltip />
							<Legend />
							<Line
								type="monotone"
								dataKey="hires"
								stroke="#16A34A"
								strokeWidth={2}
								name={`FY${String(selectedFY).slice(2)}`}
								dot={{ r: 3 }}
							/>
							{prevFiltered.length > 0 && (
								<Line
									type="monotone"
									dataKey="prevHires"
									stroke="#94A3B8"
									strokeDasharray="5 5"
									name={`FY${String(selectedFY - 1).slice(2)}`}
									dot={{ r: 2 }}
								/>
							)}
						</LineChart>
					</ResponsiveContainer>
				</div>
			</div>

			{/* 費用テーブル: ルート別 + 媒体別 */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
				<CostTable
					title="採用ルート別費用"
					data={routeCost.map((r) => ({
						name: r.route,
						cost: r.cost,
						hires: r.hires,
						unitCost: r.unitCost,
					}))}
					formatCurrency={formatCurrency}
				/>
				<CostTable
					title="媒体/会社別費用"
					data={agencyCost.map((r) => ({
						name: r.agency,
						cost: r.cost,
						hires: r.hires,
						unitCost: r.unitCost,
					}))}
					formatCurrency={formatCurrency}
				/>
			</div>

			{/* クロス集計: 園×ステータス */}
			<CrosstabTable
				title="園×ステータス"
				data={nurseryCrosstab}
				labelKey="nursery"
				labelHeader="園"
			/>

			{/* クロス集計: 媒体×ステータス */}
			<CrosstabTable
				title="媒体×ステータス"
				data={agencyCrosstab}
				labelKey="agency"
				labelHeader="媒体/会社"
			/>
		</div>
	);
}

/** フィルターセレクト */
function FilterSelect({
	label,
	value,
	options,
	onChange,
}: {
	label: string;
	value: string;
	options: string[];
	onChange: (v: string) => void;
}) {
	return (
		<select
			value={value}
			onChange={(e) => onChange(e.target.value)}
			className="px-2 py-1.5 text-sm border border-gray-300 rounded bg-white text-gray-700"
		>
			<option value="">全{label}</option>
			{options.map((opt) => (
				<option key={opt} value={opt}>
					{opt}
				</option>
			))}
		</select>
	);
}

/** 費用テーブル */
function CostTable({
	title,
	data,
	formatCurrency,
}: {
	title: string;
	data: { name: string; cost: number; hires: number; unitCost: number }[];
	formatCurrency: (v: number) => string;
}) {
	const total = data.reduce(
		(acc, d) => ({
			cost: acc.cost + d.cost,
			hires: acc.hires + d.hires,
		}),
		{ cost: 0, hires: 0 },
	);

	return (
		<div className="bg-white shadow-sm p-5">
			<h3 className="text-sm font-semibold text-gray-700 mb-3">{title}</h3>
			<div className="overflow-x-auto">
				<table className="w-full text-sm">
					<thead>
						<tr className="border-b border-gray-200 text-gray-500">
							<th className="text-left py-2 px-2">名称</th>
							<th className="text-right py-2 px-2">費用(税抜)</th>
							<th className="text-right py-2 px-2">入社</th>
							<th className="text-right py-2 px-2">採用単価</th>
						</tr>
					</thead>
					<tbody>
						{data.map((row, i) => (
							<tr key={i} className="border-b border-gray-100">
								<td className="py-1.5 px-2 text-gray-700">{row.name}</td>
								<td className="py-1.5 px-2 text-right text-gray-700">
									¥{row.cost.toLocaleString()}
								</td>
								<td className="py-1.5 px-2 text-right text-gray-700">
									{row.hires}
								</td>
								<td className="py-1.5 px-2 text-right text-gray-700">
									{row.unitCost > 0 ? `¥${row.unitCost.toLocaleString()}` : "-"}
								</td>
							</tr>
						))}
						<tr className="border-t-2 border-gray-300 font-bold">
							<td className="py-1.5 px-2 text-gray-700">合計</td>
							<td className="py-1.5 px-2 text-right text-gray-700">
								¥{total.cost.toLocaleString()}
							</td>
							<td className="py-1.5 px-2 text-right text-gray-700">
								{total.hires}
							</td>
							<td className="py-1.5 px-2 text-right text-gray-700">
								{total.hires > 0
									? `¥${Math.round(total.cost / total.hires).toLocaleString()}`
									: "-"}
							</td>
						</tr>
					</tbody>
				</table>
			</div>
		</div>
	);
}

/** クロス集計テーブル */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CrosstabTable({
	title,
	data,
	labelKey,
	labelHeader,
}: {
	title: string;
	data: any[];
	labelKey: string;
	labelHeader: string;
}) {
	const statusCols = [
		"応募",
		"面接見学",
		"合格",
		"内定",
		"入社",
		"辞退",
		"不採用",
		"その他",
	];

	// 合計行
	const totals: Record<string, number> = { total: 0 };
	statusCols.forEach((s) => (totals[s] = 0));
	data.forEach((row) => {
		statusCols.forEach((s) => {
			totals[s] += (row[s] as number) || 0;
		});
		totals.total += (row.total as number) || 0;
	});

	const maxVal = Math.max(
		...data.flatMap((row) => statusCols.map((s) => (row[s] as number) || 0)),
		1,
	);

	const cellBg = (val: number) => {
		if (val === 0) return "";
		const intensity = Math.min(val / maxVal, 1);
		const alpha = Math.round(intensity * 40 + 10);
		return `rgba(37, 99, 235, ${alpha / 100})`;
	};

	return (
		<div className="bg-white shadow-sm p-5">
			<h3 className="text-sm font-semibold text-gray-700 mb-3">{title}</h3>
			<div className="overflow-x-auto">
				<table className="w-full text-sm">
					<thead>
						<tr className="border-b border-gray-200 text-gray-500">
							<th className="text-left py-2 px-2 sticky left-0 bg-white">
								{labelHeader}
							</th>
							{statusCols.map((s) => (
								<th key={s} className="text-center py-2 px-1 min-w-[48px]">
									{s}
								</th>
							))}
							<th className="text-center py-2 px-2 font-bold">合計</th>
						</tr>
					</thead>
					<tbody>
						{data.slice(0, 30).map((row, i) => (
							<tr key={i} className="border-b border-gray-100">
								<td className="py-1.5 px-2 text-gray-700 sticky left-0 bg-white whitespace-nowrap">
									{row[labelKey]}
								</td>
								{statusCols.map((s) => {
									const val = (row[s] as number) || 0;
									return (
										<td
											key={s}
											className="py-1.5 px-1 text-center text-gray-700"
											style={{ backgroundColor: cellBg(val) }}
										>
											{val || ""}
										</td>
									);
								})}
								<td className="py-1.5 px-2 text-center font-bold text-gray-700">
									{row.total}
								</td>
							</tr>
						))}
						<tr className="border-t-2 border-gray-300 font-bold">
							<td className="py-1.5 px-2 text-gray-700 sticky left-0 bg-white">
								合計
							</td>
							{statusCols.map((s) => (
								<td key={s} className="py-1.5 px-1 text-center text-gray-700">
									{totals[s] || ""}
								</td>
							))}
							<td className="py-1.5 px-2 text-center text-gray-700">
								{totals.total}
							</td>
						</tr>
					</tbody>
				</table>
			</div>
		</div>
	);
}
