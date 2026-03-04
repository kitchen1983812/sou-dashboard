"use client";

import { useState, useMemo } from "react";
import { Inquiry, TabId, FilterState } from "@/types/inquiry";
import { AdKeywordRow, AdSearchQueryRow } from "@/types/ads";
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
} from "@/lib/dashboardUtils";
import TabNavigation from "./TabNavigation";
import Filters from "./Filters";
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

interface DashboardClientProps {
  inquiries: Inquiry[];
  adKeywords: AdKeywordRow[];
  adSearchQueries: AdSearchQueryRow[];
}

function formatDateRange(start: Date, end: Date): string {
  const fmt = (d: Date) =>
    `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(
      d.getDate()
    ).padStart(2, "0")}`;
  return `${fmt(start)} - ${fmt(end)}`;
}

export default function DashboardClient({ inquiries, adKeywords, adSearchQueries }: DashboardClientProps) {
  const [activeTab, setActiveTab] = useState<TabId>("recent");
  const [filters, setFilters] = useState<FilterState>({
    company: "",
    nursery: "",
    area: "",
    contactMethod: "",
    status: "",
    duplicateCheck: "-",
  });

  // Filter options
  const companies = useMemo(
    () => getUniqueValues(inquiries, "company"),
    [inquiries]
  );
  const nurseries = useMemo(
    () => getUniqueValues(inquiries, "sheetName"),
    [inquiries]
  );
  const areas = useMemo(
    () => getUniqueValues(inquiries, "area"),
    [inquiries]
  );
  const contactMethods = useMemo(
    () => getUniqueValues(inquiries, "contact"),
    [inquiries]
  );
  const statuses = useMemo(
    () => getUniqueValues(inquiries, "status"),
    [inquiries]
  );
  const duplicateChecks = useMemo(
    () => getUniqueValues(inquiries, "duplicateCheck"),
    [inquiries]
  );

  // Apply filters (non-date)
  const filteredInquiries = useMemo(() => {
    return inquiries.filter((inq) => {
      if (filters.company && inq.company !== filters.company) return false;
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

  // Date range for current tab
  const dateRange = useMemo(() => getDateRangeForTab(activeTab), [activeTab]);

  // Date-filtered data
  const dateFiltered = useMemo(
    () => filterByDateRange(filteredInquiries, dateRange.start, dateRange.end),
    [filteredInquiries, dateRange]
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
    [dateFiltered, prevDateFiltered]
  );

  // Tab title
  const currentTab = TABS.find((t) => t.id === activeTab);
  const dateLabel = formatDateRange(dateRange.start, dateRange.end);

  // Show contact method filter for pages 1&2, show status filter for pages 3-6
  const showContactMethod = activeTab === "recent" || activeTab === "annual";
  const showStatus = !showContactMethod;

  return (
    <div className="flex min-h-screen">
      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="flex-1 overflow-auto">
        <div className="p-5 space-y-5">
          {/* Title */}
          <h2 className="text-xl font-bold text-gray-800">
            {currentTab?.title}
          </h2>

          {/* Filters */}
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
            dateLabel={dateLabel}
          />

          {/* Content based on active tab */}
          {activeTab === "googleAds" ? (
            <GoogleAdsView
              inquiries={filteredInquiries}
              adKeywords={adKeywords}
              adSearchQueries={adSearchQueries}
            />
          ) : activeTab === "comparison" ? (
            <ComparisonView inquiries={filteredInquiries} />
          ) : activeTab === "report" ? (
            <CompanyReportView inquiries={filteredInquiries} />
          ) : activeTab === "fyMonthly" ? (
            <MonthlyTabContent inquiries={filteredInquiries} />
          ) : (
            <>
              {/* Score Cards */}
              <ScoreCards data={scoreCards} />

              {/* Summary views (pages 1 & 2) */}
              <SummaryTabContent
                data={dateFiltered}
                prevData={prevDateFiltered}
                isDaily={activeTab === "recent"}
              />

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
    [data, prevData, isDaily]
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
    [inquiries, selectedFY]
  );

  const monthlyData = useMemo(
    () => computeMonthlyStatusData(fyData, selectedFY),
    [fyData, selectedFY]
  );

  return (
    <>
      <div className="flex items-center gap-2">
        {availableFYs.map((fy) => (
          <button
            key={fy}
            onClick={() => setSelectedFY(fy)}
            className={`px-3 py-1.5 text-xs rounded border transition-colors ${
              selectedFY === fy
                ? "bg-red-600 text-white border-red-600"
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
