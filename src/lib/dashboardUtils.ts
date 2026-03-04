import {
  Inquiry,
  TabId,
  TabDef,
  ScoreCardData,
  ScoreCardWithComparison,
  ChannelData,
  MonthlyStatusData,
  AreaStatusData,
  StatusAreaCrosstab,
  ComparisonRow,
} from "@/types/inquiry";

// --- タブ定義 ---
export const TABS: TabDef[] = [
  { id: "recent", label: "直近30日-園別", title: "直近30日-園別" },
  { id: "annual", label: "年度集計-園別", title: "年度集計-園別" },
  { id: "fyMonthly", label: "年度集計-月次別", title: "年度集計-月次別" },
  { id: "comparison", label: "年度比較", title: "年度比較" },
  { id: "report", label: "ブランド別", title: "ブランド別" },
  { id: "googleAds", label: "Google広告", title: "Google広告パフォーマンス" },
];

// --- ステータス定数 ---
export const STATUS = {
  ENROLLED: "入園",
  UNANSWERED: "未対応",
  IN_PROGRESS: "対応中",
  CONSIDERING: "保護者様検討中",
  WAITLISTED: "待ちリスト登録済み",
  DECLINED: "辞退",
  CANNOT_REACH: "連絡つかない",
  GUIDED: "ご案内済",
  CANNOT_ACCEPT: "諸事情により受入不可",
  DUPLICATE: "重複",
} as const;

export const STATUS_COLORS: Record<string, string> = {
  [STATUS.GUIDED]: "#0EA5E9",
  [STATUS.UNANSWERED]: "#DC2626",
  [STATUS.CONSIDERING]: "#16A34A",
  [STATUS.IN_PROGRESS]: "#F59E0B",
  [STATUS.WAITLISTED]: "#8B5CF6",
  [STATUS.ENROLLED]: "#2563EB",
  [STATUS.CANNOT_REACH]: "#94A3B8",
  [STATUS.DECLINED]: "#F97316",
  [STATUS.CANNOT_ACCEPT]: "#6B7280",
  [STATUS.DUPLICATE]: "#A16207",
};

export const ALL_STATUSES = [
  STATUS.GUIDED,
  STATUS.UNANSWERED,
  STATUS.CONSIDERING,
  STATUS.IN_PROGRESS,
  STATUS.WAITLISTED,
  STATUS.ENROLLED,
  STATUS.CANNOT_REACH,
  STATUS.DECLINED,
  STATUS.CANNOT_ACCEPT,
];

// --- 日付ユーティリティ ---

/** 日付文字列をDateオブジェクトにパースする */
export function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

/** 年度（FY）を取得する。4月始まり（4月=年度開始） */
export function getFiscalYear(date: Date): number {
  const month = date.getMonth(); // 0-based (0=Jan, 3=Apr)
  const year = date.getFullYear();
  return month < 3 ? year - 1 : year; // Jan-Mar = previous FY
}

/** FYの開始日・終了日を取得する */
export function getFYRange(fy: number): { start: Date; end: Date } {
  return {
    start: new Date(fy, 3, 1), // April 1
    end: new Date(fy + 1, 2, 31, 23, 59, 59), // March 31
  };
}

/** 現在のFYを取得する */
export function getCurrentFY(): number {
  return getFiscalYear(new Date());
}

/** タブIDに基づいて日付範囲でフィルタリングする */
export function getDateRangeForTab(tabId: TabId): { start: Date; end: Date } {
  const now = new Date();

  switch (tabId) {
    case "recent": {
      const start = new Date(now);
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      return { start, end: now };
    }
    case "annual":
      return getFYRange(getCurrentFY());
    case "fyMonthly":
    case "comparison":
    case "report":
    case "googleAds":
      return {
        start: new Date(2020, 3, 1),
        end: now,
      };
    default:
      return { start: new Date(0), end: now };
  }
}

/** 前期の日付範囲を取得する */
export function getPrevDateRange(tabId: TabId): {
  start: Date;
  end: Date;
} | null {
  switch (tabId) {
    case "recent": {
      const now = new Date();
      const end = new Date(now);
      end.setDate(end.getDate() - 30);
      const start = new Date(end);
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      return { start, end };
    }
    case "annual":
      return getFYRange(getCurrentFY() - 1);
    default:
      return null;
  }
}

// --- データフィルタリング ---

/** 日付範囲でフィルタリング */
export function filterByDateRange(
  inquiries: Inquiry[],
  start: Date,
  end: Date
): Inquiry[] {
  return inquiries.filter((inq) => {
    const d = parseDate(inq.postDate);
    if (!d) return false;
    return d >= start && d <= end;
  });
}

/** FYでフィルタリング */
export function filterByFY(inquiries: Inquiry[], fy: number): Inquiry[] {
  const { start, end } = getFYRange(fy);
  return filterByDateRange(inquiries, start, end);
}

// --- 集計関数 ---

/** スコアカードデータを計算する */
export function computeScoreCards(inquiries: Inquiry[]): ScoreCardData {
  let enrollments = 0;
  let unanswered = 0;
  let inProgress = 0;
  let underConsideration = 0;
  let waitlisted = 0;
  let declined = 0;

  for (const inq of inquiries) {
    const s = inq.status || "";
    if (s === STATUS.ENROLLED) enrollments++;
    else if (s === STATUS.UNANSWERED || s === "") unanswered++;
    else if (s === STATUS.IN_PROGRESS) inProgress++;
    else if (s === STATUS.CONSIDERING) underConsideration++;
    else if (s === STATUS.WAITLISTED) waitlisted++;
    else if (s === STATUS.DECLINED) declined++;
  }

  const total = inquiries.length;
  return {
    totalInquiries: total,
    enrollments,
    unanswered,
    inProgress,
    underConsideration,
    waitlisted,
    declined,
    enrollmentRate: total > 0 ? (enrollments / total) * 100 : 0,
    unansweredRate: total > 0 ? (unanswered / total) * 100 : 0,
    declineRate: total > 0 ? (declined / total) * 100 : 0,
  };
}

/** スコアカードデータ（前期比較付き） */
export function computeScoreCardsWithComparison(
  current: Inquiry[],
  previous: Inquiry[] | null
): ScoreCardWithComparison {
  const data = computeScoreCards(current);
  if (!previous) return data;

  const prev = computeScoreCards(previous);
  return {
    ...data,
    prevTotalInquiries: prev.totalInquiries,
    prevEnrollments: prev.enrollments,
    prevUnanswered: prev.unanswered,
    prevInProgress: prev.inProgress,
    prevUnderConsideration: prev.underConsideration,
    prevWaitlisted: prev.waitlisted,
    prevDeclined: prev.declined,
  };
}

/** 増減率を計算 */
export function calcChangeRate(
  current: number,
  previous: number | undefined
): { rate: number; direction: "up" | "down" | "none" } | null {
  if (previous === undefined) return null;
  if (previous === 0) {
    if (current === 0) return { rate: 0, direction: "none" };
    return null; // 該当せず
  }
  const rate = ((current - previous) / previous) * 100;
  return {
    rate: Math.abs(rate),
    direction: rate > 0 ? "up" : rate < 0 ? "down" : "none",
  };
}

/** 経路（チャネル）別集計 */
export function computeChannelData(inquiries: Inquiry[]): ChannelData[] {
  const counts = new Map<string, number>();
  for (const inq of inquiries) {
    const channel = inq.why || "その他";
    counts.set(channel, (counts.get(channel) || 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([channel, count]) => ({ channel, count }))
    .sort((a, b) => b.count - a.count);
}

export type TimelinePoint = { date: string; count: number; prevCount?: number };

/** 経時（タイムライン）データ - 日別（前期比較付き） */
export function computeDailyTimeline(
  inquiries: Inquiry[],
  prevInquiries?: Inquiry[] | null
): TimelinePoint[] {
  const counts = new Map<string, number>();
  const dateMap = new Map<string, Date>();
  for (const inq of inquiries) {
    const d = parseDate(inq.postDate);
    if (!d) continue;
    const key = `${d.getMonth() + 1}月${d.getDate()}日`;
    counts.set(key, (counts.get(key) || 0) + 1);
    if (!dateMap.has(key)) dateMap.set(key, d);
  }

  const sorted = Array.from(counts.entries())
    .sort((a, b) => dateMap.get(a[0])!.getTime() - dateMap.get(b[0])!.getTime());

  if (!prevInquiries || prevInquiries.length === 0) {
    return sorted.map(([date, count]) => ({ date, count }));
  }

  // 前期: 日数でインデックス対応させる（前期1日目→当期1日目）
  const prevCounts = new Map<string, number>();
  const prevDateMap = new Map<string, Date>();
  for (const inq of prevInquiries) {
    const d = parseDate(inq.postDate);
    if (!d) continue;
    const key = `${d.getMonth() + 1}月${d.getDate()}日`;
    prevCounts.set(key, (prevCounts.get(key) || 0) + 1);
    if (!prevDateMap.has(key)) prevDateMap.set(key, d);
  }
  const prevSorted = Array.from(prevCounts.entries())
    .sort((a, b) => prevDateMap.get(a[0])!.getTime() - prevDateMap.get(b[0])!.getTime());

  return sorted.map(([date, count], i) => ({
    date,
    count,
    prevCount: i < prevSorted.length ? prevSorted[i][1] : undefined,
  }));
}

/** 経時（タイムライン）データ - 月別（前年同月比較付き） */
export function computeMonthlyTimeline(
  inquiries: Inquiry[],
  prevInquiries?: Inquiry[] | null
): TimelinePoint[] {
  const counts = new Map<string, number>();
  const dateMap = new Map<string, Date>();
  for (const inq of inquiries) {
    const d = parseDate(inq.postDate);
    if (!d) continue;
    const key = `${d.getFullYear()}年${d.getMonth() + 1}月`;
    counts.set(key, (counts.get(key) || 0) + 1);
    if (!dateMap.has(key)) dateMap.set(key, new Date(d.getFullYear(), d.getMonth(), 1));
  }

  const sorted = Array.from(counts.entries())
    .sort((a, b) => dateMap.get(a[0])!.getTime() - dateMap.get(b[0])!.getTime());

  if (!prevInquiries || prevInquiries.length === 0) {
    return sorted.map(([date, count]) => ({ date, count }));
  }

  // 前年同月: 月番号(1-12)でマッチング
  const prevByMonth = new Map<number, number>();
  for (const inq of prevInquiries) {
    const d = parseDate(inq.postDate);
    if (!d) continue;
    const m = d.getMonth() + 1;
    prevByMonth.set(m, (prevByMonth.get(m) || 0) + 1);
  }

  return sorted.map(([date, count]) => {
    const monthMatch = date.match(/(\d+)月$/);
    const month = monthMatch ? parseInt(monthMatch[1]) : 0;
    return {
      date,
      count,
      prevCount: prevByMonth.get(month),
    };
  });
}

/** 月別ステータス集計（FY月次ビュー用） */
export function computeMonthlyStatusData(
  inquiries: Inquiry[],
  fy: number
): MonthlyStatusData[] {
  // FY月順: 4月、5月、...、2月、3月
  const months = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3];

  return months.map((month) => {
    const year = month >= 4 ? fy : fy + 1;
    const monthInqs = inquiries.filter((inq) => {
      const d = parseDate(inq.postDate);
      if (!d) return false;
      return d.getFullYear() === year && d.getMonth() + 1 === month;
    });

    const statusCounts: Record<string, number> = {};
    for (const s of ALL_STATUSES) {
      statusCounts[s] = 0;
    }
    for (const inq of monthInqs) {
      const s = inq.status || STATUS.UNANSWERED;
      if (s in statusCounts) {
        statusCounts[s]++;
      }
    }

    return {
      month: `${month}月`,
      total: monthInqs.length,
      ...statusCounts,
    };
  });
}

/** エリア別ステータス集計 */
export function computeAreaStatusData(
  inquiries: Inquiry[]
): AreaStatusData[] {
  const areaMap = new Map<string, Map<string, number>>();

  for (const inq of inquiries) {
    const area = inq.area || "不明";
    if (!areaMap.has(area)) areaMap.set(area, new Map());
    const statusMap = areaMap.get(area)!;
    const s = inq.status || STATUS.UNANSWERED;
    statusMap.set(s, (statusMap.get(s) || 0) + 1);
  }

  return Array.from(areaMap.entries())
    .map(([area, statusMap]) => {
      const row: AreaStatusData = { area };
      let total = 0;
      statusMap.forEach((count, status) => {
        row[status] = count;
        total += count;
      });
      row.total = total;
      return row;
    })
    .sort((a, b) => (b.total as number) - (a.total as number));
}

/** ステータス × エリア クロス集計テーブル */
export function computeStatusAreaCrosstab(
  inquiries: Inquiry[]
): StatusAreaCrosstab[] {
  const areaMap = new Map<string, StatusAreaCrosstab>();

  for (const inq of inquiries) {
    const area = inq.area || "不明";
    if (!areaMap.has(area)) {
      areaMap.set(area, {
        area,
        連絡つかない: 0,
        辞退: 0,
        未対応: 0,
        諸事情: 0,
        待ちリスト: 0,
        対応中: 0,
        入園: 0,
        total: 0,
      });
    }
    const row = areaMap.get(area)!;
    const s = inq.status || "";
    if (s === STATUS.CANNOT_REACH) row["連絡つかない"]++;
    else if (s === STATUS.DECLINED) row["辞退"]++;
    else if (s === STATUS.UNANSWERED || s === "") row["未対応"]++;
    else if (s === STATUS.CANNOT_ACCEPT) row["諸事情"]++;
    else if (s === STATUS.WAITLISTED) row["待ちリスト"]++;
    else if (s === STATUS.IN_PROGRESS) row["対応中"]++;
    else if (s === STATUS.ENROLLED) row["入園"]++;
    row.total++;
  }

  return Array.from(areaMap.values()).sort((a, b) => b.total - a.total);
}

/** FY比較データを計算する */
export function computeComparisonData(
  inquiries: Inquiry[],
  fyList: number[]
): ComparisonRow[] {
  // エリア × シート名 ごとに各FYの集計
  const groupKey = (inq: Inquiry) =>
    `${inq.area || "不明"}|${inq.sheetName || "不明"}`;

  const groups = new Map<
    string,
    { area: string; nurseryName: string; byFY: Map<number, { total: number; enrolled: number }> }
  >();

  for (const inq of inquiries) {
    const key = groupKey(inq);
    if (!groups.has(key)) {
      groups.set(key, {
        area: inq.area || "不明",
        nurseryName: inq.sheetName || "不明",
        byFY: new Map(),
      });
    }
    const group = groups.get(key)!;
    const d = parseDate(inq.postDate);
    if (!d) continue;
    const fy = getFiscalYear(d);

    if (!group.byFY.has(fy)) {
      group.byFY.set(fy, { total: 0, enrolled: 0 });
    }
    const fyData = group.byFY.get(fy)!;
    fyData.total++;
    if (inq.status === STATUS.ENROLLED) fyData.enrolled++;
  }

  const rows: ComparisonRow[] = [];
  groups.forEach((group) => {
    const row: ComparisonRow = {
      area: group.area,
      nurseryName: group.nurseryName,
    };

    let grandTotal = 0;
    let grandEnrolled = 0;

    for (const fy of fyList) {
      const data = group.byFY.get(fy);
      const total = data?.total || 0;
      const enrolled = data?.enrolled || 0;
      row[`fy${fy}_total`] = total;
      row[`fy${fy}_enrolled`] = enrolled;
      row[`fy${fy}_rate`] =
        total > 0 ? Math.round((enrolled / total) * 1000) / 10 : 0;
      grandTotal += total;
      grandEnrolled += enrolled;
    }

    row.grandTotal = grandTotal;
    row.grandEnrolled = grandEnrolled;
    row.grandRate =
      grandTotal > 0
        ? Math.round((grandEnrolled / grandTotal) * 1000) / 10
        : 0;

    rows.push(row);
  });

  // Sort by area then nurseryName
  rows.sort((a, b) => {
    const areaComp = (a.area as string).localeCompare(b.area as string);
    if (areaComp !== 0) return areaComp;
    return (a.nurseryName as string).localeCompare(b.nurseryName as string);
  });

  return rows;
}

/** ユニークな値リストを取得する（フィルター用） */
export function getUniqueValues(
  inquiries: Inquiry[],
  field: keyof Inquiry
): string[] {
  const values = new Set<string>();
  for (const inq of inquiries) {
    const val = inq[field];
    if (val) values.add(val);
  }
  return Array.from(values).sort();
}
