"use client";

import { useState, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Inquiry, TabId, FilterState } from "@/types/inquiry";
import { AdKeywordRow, AdSearchQueryRow } from "@/types/ads";
import { Applicant, RecruitCost } from "@/types/recruit";
import {
	TABS,
	getDateRangeForTab,
	getPrevDateRange,
	filterByDateRange,
	filterByFY,
	computeScoreCardsWithComparison,
	computeChannelData,
	computeDailyTimeline,
	computeMonthlyTimeline,
	computeAreaStatusData,
	computeStatusAreaCrosstab,
	computeMonthlyStatusData,
	getUniqueValues,
	getCurrentFY,
	parseDate,
	getFiscalYear,
	normalizeBrandName,
} from "@/lib/dashboardUtils";
import TabNavigation from "./TabNavigation";
import Filters from "./Filters";
import PeriodFilter from "@/components/ui/PeriodFilter";
import ScoreCards from "./ScoreCards";
import ChannelDonut from "./ChannelDonut";
import TimelineChart from "./TimelineChart";
import AreaStackedBar from "./AreaStackedBar";
import MonthlyStackedBar from "./MonthlyStackedBar";
import InquiryDetailTable from "./InquiryDetailTable";
import StatusBreakdownTable from "./StatusBreakdownTable";
import ComparisonView from "./ComparisonView";
import CompanyReportView from "./CompanyReportView";
import GoogleAdsView from "./GoogleAdsView";
import WeeklyReportView from "./WeeklyReportView";
import RecruitReportView from "./RecruitReportView";
import RecruitCostView from "./RecruitCostView";
import GA4View from "./GA4View";
import ReviewsView from "./ReviewsView";
import ExecutiveSummaryView from "./ExecutiveSummaryView";
import OccupancyView from "./OccupancyView";
import FunnelView from "./FunnelView";
import InsightPanel from "./InsightPanel";
import SectionErrorBoundary from "@/components/ui/SectionErrorBoundary";

interface DashboardClientProps {
	inquiries: Inquiry[];
	adKeywords: AdKeywordRow[];
	adSearchQueries: AdSearchQueryRow[];
	applicants: Applicant[];
	recruitCosts: RecruitCost[];
}

/** URL同期を行う内部コンポーネント（useSearchParams用にSuspense内で実行） */
function DashboardClientInner({
	inquiries,
	adKeywords,
	adSearchQueries,
	applicants,
	recruitCosts,
}: DashboardClientProps) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const tabFromUrl = searchParams.get("tab") as TabId | null;
	const validTabIds = TABS.map((t) => t.id);
	const initialTab: TabId =
		tabFromUrl && validTabIds.includes(tabFromUrl) ? tabFromUrl : "executive";

	const [activeTab, setActiveTab] = useState<TabId>(initialTab);
	const [customDateRange, setCustomDateRange] = useState<{
		from: string;
		to: string;
	} | null>(null);
	const [filters, setFilters] = useState<FilterState>({
		company: "",
		nursery: "",
		area: "",
		contactMethod: "",
		status: "",
		duplicateCheck: "-",
	});

	// Filter options — company uses brand names (normalized) as both label and filter key
	const companies = useMemo(() => {
		const seen = new Set<string>();
		for (const inq of inquiries) {
			const brand = normalizeBrandName(inq.company || "");
			if (brand) seen.add(brand);
		}
		return Array.from(seen).sort();
	}, [inquiries]);
	const nurseries = useMemo(
		() => getUniqueValues(inquiries, "sheetName"),
		[inquiries],
	);
	const areas = useMemo(() => getUniqueValues(inquiries, "area"), [inquiries]);
	const contactMethods = useMemo(
		() => getUniqueValues(inquiries, "contact"),
		[inquiries],
	);
	const statuses = useMemo(
		() => getUniqueValues(inquiries, "status"),
		[inquiries],
	);
	const duplicateChecks = useMemo(
		() => getUniqueValues(inquiries, "duplicateCheck"),
		[inquiries],
	);

	// Apply filters (non-date)
	const filteredInquiries = useMemo(() => {
		return inquiries.filter((inq) => {
			if (
				filters.company &&
				normalizeBrandName(inq.company || "") !== filters.company
			)
				return false;
			if (filters.nursery && inq.sheetName !== filters.nursery) return false;
			if (filters.area && inq.area !== filters.area) return false;
			if (filters.contactMethod && inq.contact !== filters.contactMethod)
				return false;
			if (filters.status && inq.status !== filters.status) return false;
			if (
				filters.duplicateCheck &&
				inq.duplicateCheck !== filters.duplicateCheck
			)
				return false;
			return true;
		});
	}, [inquiries, filters]);

	// Min/max months for PeriodFilter (derived from inquiry data)
	const minMonth = useMemo(() => {
		const dates = inquiries
			.map((i) => i.postDate)
			.filter(Boolean)
			.sort();
		if (!dates.length) return "2021-04";
		const d = new Date(dates[0]);
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
	}, [inquiries]);
	const maxMonth = useMemo(() => {
		const now = new Date();
		return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
	}, []);

	// Date range for current tab (custom range overrides tab default)
	const dateRange = useMemo(() => {
		if (customDateRange) {
			const [fy, fm] = customDateRange.from.split("-").map(Number);
			const [ty, tm] = customDateRange.to.split("-").map(Number);
			return {
				start: new Date(fy, fm - 1, 1),
				end: new Date(ty, tm, 0, 23, 59, 59),
			};
		}
		return getDateRangeForTab(activeTab);
	}, [activeTab, customDateRange]);

	// Date-filtered data
	const dateFiltered = useMemo(
		() => filterByDateRange(filteredInquiries, dateRange.start, dateRange.end),
		[filteredInquiries, dateRange],
	);

	// Previous period data (for comparison)
	const prevDateFiltered = useMemo(() => {
		const prev = getPrevDateRange(activeTab);
		if (!prev) return null;
		return filterByDateRange(filteredInquiries, prev.start, prev.end);
	}, [filteredInquiries, activeTab]);

	// Score cards
	const scoreCards = useMemo(
		() => computeScoreCardsWithComparison(dateFiltered, prevDateFiltered),
		[dateFiltered, prevDateFiltered],
	);

	// Tab title
	const currentTab = TABS.find((t) => t.id === activeTab);

	// Show contact method filter for pages 1&2, show status filter for pages 3-6
	const showContactMethod = activeTab === "recent" || activeTab === "annual";
	const showStatus = !showContactMethod;
	const isRecruitTab =
		activeTab === "executive" ||
		activeTab === "recruitReport" ||
		activeTab === "recruitCost" ||
		activeTab === "occupancy" ||
		activeTab === "funnel" ||
		activeTab === "ga4" ||
		activeTab === "reviews";

	const handleTabChange = (tab: TabId) => {
		setActiveTab(tab);
		setCustomDateRange(null);
		const params = new URLSearchParams(searchParams.toString());
		params.set("tab", tab);
		router.push(`/dashboard?${params.toString()}`, { scroll: false });
	};

	// Show period filter for inquiry data tabs (not recruit/ops/reviews)
	const showPeriodFilter = !isRecruitTab;
	const periodFilterFrom =
		customDateRange?.from ??
		`${dateRange.start.getFullYear()}-${String(dateRange.start.getMonth() + 1).padStart(2, "0")}`;
	const periodFilterTo =
		customDateRange?.to ??
		`${dateRange.end.getFullYear()}-${String(dateRange.end.getMonth() + 1).padStart(2, "0")}`;

	return (
		<div className="flex min-h-screen">
			<TabNavigation activeTab={activeTab} onTabChange={handleTabChange} />

			<div className="flex-1 overflow-auto bg-gray-50">
				<div className="p-5 sm:p-8 space-y-6">
					{/* Title */}
					<h2 className="text-lg font-bold text-gray-800">
						{currentTab?.title}
					</h2>

					{/* Filters (集客タブのみ表示) */}
					{!isRecruitTab && (
						<div className="flex flex-wrap items-center gap-3">
							<Filters
								filters={filters}
								onFilterChange={setFilters}
								companies={companies}
								nurseries={nurseries}
								areas={areas}
								contactMethods={contactMethods}
								statuses={statuses}
								duplicateChecks={duplicateChecks}
								showContactMethod={showContactMethod}
								showStatus={showStatus}
							/>
							{showPeriodFilter && (
								<PeriodFilter
									from={periodFilterFrom}
									to={periodFilterTo}
									minMonth={minMonth}
									maxMonth={maxMonth}
									onChange={(f, t) => setCustomDateRange({ from: f, to: t })}
								/>
							)}
						</div>
					)}

					{/* Content based on active tab */}
					{activeTab === "executive" ? (
						<SectionErrorBoundary sectionName="経営サマリー">
							<ExecutiveSummaryView inquiries={filteredInquiries} />
						</SectionErrorBoundary>
					) : activeTab === "occupancy" ? (
						<SectionErrorBoundary sectionName="定員充足率">
							<OccupancyView />
						</SectionErrorBoundary>
					) : activeTab === "funnel" ? (
						<SectionErrorBoundary sectionName="入園ファネル">
							<FunnelView inquiries={filteredInquiries} />
						</SectionErrorBoundary>
					) : activeTab === "reviews" ? (
						<SectionErrorBoundary sectionName="Google口コミ">
							<ReviewsView />
						</SectionErrorBoundary>
					) : activeTab === "ga4" ? (
						<SectionErrorBoundary sectionName="GA4">
							<GA4View />
						</SectionErrorBoundary>
					) : activeTab === "recruitReport" ? (
						<SectionErrorBoundary sectionName="採用レポート">
							<RecruitReportView
								applicants={applicants}
								recruitCosts={recruitCosts}
							/>
						</SectionErrorBoundary>
					) : activeTab === "recruitCost" ? (
						<SectionErrorBoundary sectionName="採用費分析">
							<RecruitCostView
								applicants={applicants}
								recruitCosts={recruitCosts}
							/>
						</SectionErrorBoundary>
					) : activeTab === "weeklyReport" ? (
						<SectionErrorBoundary sectionName="週次レポート">
							<WeeklyReportView
								inquiries={filteredInquiries}
								adKeywords={adKeywords}
								adSearchQueries={adSearchQueries}
							/>
						</SectionErrorBoundary>
					) : activeTab === "googleAds" ? (
						<SectionErrorBoundary sectionName="Google広告">
							<GoogleAdsView
								inquiries={filteredInquiries}
								adKeywords={adKeywords}
								adSearchQueries={adSearchQueries}
							/>
						</SectionErrorBoundary>
					) : activeTab === "comparison" ? (
						<SectionErrorBoundary sectionName="年度比較">
							<ComparisonView inquiries={filteredInquiries} />
						</SectionErrorBoundary>
					) : activeTab === "report" ? (
						<SectionErrorBoundary sectionName="ブランド別">
							<CompanyReportView inquiries={filteredInquiries} />
						</SectionErrorBoundary>
					) : activeTab === "fyMonthly" ? (
						<SectionErrorBoundary sectionName="年度集計-月次別">
							<MonthlyTabContent inquiries={filteredInquiries} />
						</SectionErrorBoundary>
					) : (
						<>
							{/* Insight Panel */}
							<InsightPanel
								inquiries={dateFiltered}
								prevInquiries={prevDateFiltered}
							/>

							{/* Score Cards */}
							<ScoreCards data={scoreCards} />

							{/* Summary views (pages 1 & 2) */}
							<SummaryTabContent
								data={dateFiltered}
								prevData={prevDateFiltered}
								isDaily={activeTab === "recent"}
							/>

							{/* Section divider */}
							<hr className="border-gray-200" />

							{/* Detail tables (shared) */}
							<div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
								<InquiryDetailTable data={dateFiltered} />
								<StatusBreakdownTable
									data={computeStatusAreaCrosstab(dateFiltered)}
								/>
							</div>
						</>
					)}
				</div>
			</div>
		</div>
	);
}

/** Suspenseラッパー — useSearchParamsはSuspense境界内で実行する必要がある */
export default function DashboardClient(props: DashboardClientProps) {
	return (
		<Suspense fallback={null}>
			<DashboardClientInner {...props} />
		</Suspense>
	);
}

/** 直近30日・年度集計ビュー */
function SummaryTabContent({
	data,
	prevData,
	isDaily,
}: {
	data: Inquiry[];
	prevData: Inquiry[] | null;
	isDaily: boolean;
}) {
	const channelData = useMemo(() => computeChannelData(data), [data]);
	const timeline = useMemo(
		() =>
			isDaily
				? computeDailyTimeline(data, prevData)
				: computeMonthlyTimeline(data, prevData),
		[data, prevData, isDaily],
	);
	const areaStatus = useMemo(() => computeAreaStatusData(data), [data]);

	return (
		<>
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
				<ChannelDonut data={channelData} />
				<TimelineChart
					data={timeline}
					prevLabel={isDaily ? "前30日間" : "前年同月"}
				/>
			</div>
			<AreaStackedBar data={areaStatus} />
		</>
	);
}

/** FY月次ビュー（FYセレクター付き） */
function MonthlyTabContent({ inquiries }: { inquiries: Inquiry[] }) {
	const currentFY = getCurrentFY();
	const [selectedFY, setSelectedFY] = useState(currentFY);

	// 利用可能なFY一覧
	const availableFYs = useMemo(() => {
		const fySet = new Set<number>();
		inquiries.forEach((inq) => {
			const d = parseDate(inq.postDate);
			if (d) fySet.add(getFiscalYear(d));
		});
		return Array.from(fySet).sort((a, b) => b - a);
	}, [inquiries]);

	// 選択FYでフィルタ
	const fyData = useMemo(
		() => filterByFY(inquiries, selectedFY),
		[inquiries, selectedFY],
	);

	const monthlyData = useMemo(
		() => computeMonthlyStatusData(fyData, selectedFY),
		[fyData, selectedFY],
	);

	return (
		<>
			<div className="flex items-center gap-2">
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
			<MonthlyStackedBar data={monthlyData} />
		</>
	);
}
