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
	{ id: "weeklyReport", label: "週次レポート", title: "週次レポート" },
	{ id: "recruitReport", label: "採用レポート", title: "採用レポート" },
	{ id: "recruitCost", label: "採用費分析", title: "採用費分析" },
	{ id: "ga4", label: "GA4", title: "サイトパフォーマンス (GA4)" },
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

// --- エリア正規化（園名→都県名マッピング） ---

const NURSERY_TO_PREFECTURE: Record<string, string> = {
	// 東京都
	練馬中村橋園: "東京都",
	練馬中村橋: "東京都",
	大田馬込園: "東京都",
	大田馬込: "東京都",
	稲城長沼園: "東京都",
	稲城長沼: "東京都",
	目黒園: "東京都",
	目黒: "東京都",
	中野新橋園: "東京都",
	中野新橋: "東京都",
	高円寺II園: "東京都",
	高円寺II: "東京都",
	// 神奈川県
	座間II園: "神奈川県",
	座間II: "神奈川県",
	座間２園: "神奈川県",
	相武台前園: "神奈川県",
	相武台前: "神奈川県",
	中央林間園: "神奈川県",
	中央林間: "神奈川県",
	大和園: "神奈川県",
	大和: "神奈川県",
	武蔵中原園: "神奈川県",
	武蔵中原: "神奈川県",
	相模原園: "神奈川県",
	相模原: "神奈川県",
	// 千葉県
	柏II園: "千葉県",
	柏II: "千葉県",
	柏２園: "千葉県",
	京成八幡園: "千葉県",
	京成八幡: "千葉県",
	南行徳園: "千葉県",
	南行徳: "千葉県",
	"ふぇりーちぇほいくえん（東千葉園）": "千葉県",
	ふぇりーちぇほいくえん: "千葉県",
	東千葉園: "千葉県",
	行徳園: "千葉県",
	行徳: "千葉県",
	成田園: "千葉県",
	並木町園: "千葉県",
	久住園: "千葉県",
	もねの里園: "千葉県",
	東金園: "千葉県",
	日吉台園: "千葉県",
	スカイタウン園: "千葉県",
	勝田台園: "千葉県",
	公津の杜園: "千葉県",
	本八幡園: "千葉県",
	"LAKESIDE INTERNATIONAL CHILDCARE": "千葉県",
	// 埼玉県
	東川口園: "埼玉県",
	東川口: "埼玉県",
	鳩ヶ谷園: "埼玉県",
	鳩ヶ谷: "埼玉県",
	蕨園: "埼玉県",
	蕨: "埼玉県",
	和光園: "埼玉県",
	和光: "埼玉県",
	和光II園: "埼玉県",
	和光II: "埼玉県",
	和光２園: "埼玉県",
	新座園: "埼玉県",
	新座: "埼玉県",
	蕨II園: "埼玉県",
	蕨II: "埼玉県",
	蕨２園: "埼玉県",
	朝霞園: "埼玉県",
	朝霞: "埼玉県",
	病児保育室にじのへや: "埼玉県",
};

const PREFECTURES = new Set(["東京都", "神奈川県", "千葉県", "埼玉県"]);

/** エリア文字列を都県名に正規化する */
export function normalizeArea(area: string): string {
	if (!area) return "その他";
	if (PREFECTURES.has(area)) return area;
	return NURSERY_TO_PREFECTURE[area] || "その他";
}

// --- 園別ステータス集計 ---

export interface NurseryStatusRow {
	nursery: string;
	area: string;
	company: string;
	total: number;
	enrollmentRate: number;
	statuses: Record<string, number>;
}

/** 園別×ステータス集計（週次レポート用） */
export function computeNurseryStatusData(
	inquiries: Inquiry[],
): NurseryStatusRow[] {
	const map = new Map<
		string,
		{ area: string; company: string; statuses: Record<string, number> }
	>();

	for (const inq of inquiries) {
		const nursery = inq.sheetName || inq.nursery || "";
		if (!nursery) continue;

		if (!map.has(nursery)) {
			map.set(nursery, {
				area: inq.area || "",
				company: inq.company || "",
				statuses: {},
			});
		}
		const entry = map.get(nursery)!;
		const s = inq.status || STATUS.UNANSWERED;
		entry.statuses[s] = (entry.statuses[s] || 0) + 1;
	}

	const rows: NurseryStatusRow[] = [];
	map.forEach((data, nursery) => {
		const total = Object.values(data.statuses).reduce((s, v) => s + v, 0);
		const enrolled = data.statuses[STATUS.ENROLLED] || 0;
		rows.push({
			nursery,
			area: data.area,
			company: data.company,
			total,
			enrollmentRate:
				total > 0 ? Math.round((enrolled / total) * 1000) / 10 : 0,
			statuses: data.statuses,
		});
	});

	// エリア順 → 園名順
	const AREA_ORDER = ["東京都", "神奈川県", "千葉県", "埼玉県"];
	rows.sort((a, b) => {
		const ai = AREA_ORDER.indexOf(normalizeArea(a.area));
		const bi = AREA_ORDER.indexOf(normalizeArea(b.area));
		const aIdx = ai !== -1 ? ai : 99;
		const bIdx = bi !== -1 ? bi : 99;
		if (aIdx !== bIdx) return aIdx - bIdx;
		return a.nursery.localeCompare(b.nursery);
	});

	return rows;
}

/** ブランド別入園数サマリー */
export function computeBrandSummary(
	inquiries: Inquiry[],
): { brand: string; enrolled: number; total: number }[] {
	const brands = ["わくわく保育園", "ことり保育園"];
	return brands
		.map((brand) => {
			const brandInqs = inquiries.filter((inq) => inq.company === brand);
			const enrolled = brandInqs.filter(
				(inq) => inq.status === STATUS.ENROLLED,
			).length;
			return { brand, enrolled, total: brandInqs.length };
		})
		.filter((b) => b.total > 0);
}

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
		case "weeklyReport":
		case "recruitReport":
		case "ga4":
		case "recruitCost":
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
	end: Date,
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
	previous: Inquiry[] | null,
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
	previous: number | undefined,
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
	prevInquiries?: Inquiry[] | null,
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

	const sorted = Array.from(counts.entries()).sort(
		(a, b) => dateMap.get(a[0])!.getTime() - dateMap.get(b[0])!.getTime(),
	);

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
	const prevSorted = Array.from(prevCounts.entries()).sort(
		(a, b) =>
			prevDateMap.get(a[0])!.getTime() - prevDateMap.get(b[0])!.getTime(),
	);

	return sorted.map(([date, count], i) => ({
		date,
		count,
		prevCount: i < prevSorted.length ? prevSorted[i][1] : undefined,
	}));
}

/** 経時（タイムライン）データ - 月別（前年同月比較付き） */
export function computeMonthlyTimeline(
	inquiries: Inquiry[],
	prevInquiries?: Inquiry[] | null,
): TimelinePoint[] {
	const counts = new Map<string, number>();
	const dateMap = new Map<string, Date>();
	for (const inq of inquiries) {
		const d = parseDate(inq.postDate);
		if (!d) continue;
		const key = `${d.getFullYear()}年${d.getMonth() + 1}月`;
		counts.set(key, (counts.get(key) || 0) + 1);
		if (!dateMap.has(key))
			dateMap.set(key, new Date(d.getFullYear(), d.getMonth(), 1));
	}

	const sorted = Array.from(counts.entries()).sort(
		(a, b) => dateMap.get(a[0])!.getTime() - dateMap.get(b[0])!.getTime(),
	);

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
	fy: number,
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
export function computeAreaStatusData(inquiries: Inquiry[]): AreaStatusData[] {
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
	inquiries: Inquiry[],
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
	fyList: number[],
): ComparisonRow[] {
	// エリア × シート名 ごとに各FYの集計
	const groupKey = (inq: Inquiry) =>
		`${inq.area || "不明"}|${inq.sheetName || "不明"}`;

	const groups = new Map<
		string,
		{
			area: string;
			nurseryName: string;
			byFY: Map<number, { total: number; enrolled: number }>;
		}
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
			grandTotal > 0 ? Math.round((grandEnrolled / grandTotal) * 1000) / 10 : 0;

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
	field: keyof Inquiry,
): string[] {
	const values = new Set<string>();
	for (const inq of inquiries) {
		const val = inq[field];
		if (val) values.add(val);
	}
	return Array.from(values).sort();
}

// --- 週次レポート用ユーティリティ（水曜始まり〜火曜終了） ---

/** 指定日が含まれる週の水曜日を取得する（水曜始まり） */
export function getWeekStart(date: Date): Date {
	const d = new Date(date);
	const day = d.getDay(); // 0=Sun, 1=Mon, 2=Tue, 3=Wed, ...
	// 水曜(3)を基準にオフセットを計算
	const diff = day >= 3 ? day - 3 : day + 4; // 水曜からの経過日数
	d.setDate(d.getDate() - diff);
	d.setHours(0, 0, 0, 0);
	return d;
}

/** 水曜日から火曜日 23:59:59 を取得する */
export function getWeekEnd(wednesday: Date): Date {
	const d = new Date(wednesday);
	d.setDate(d.getDate() + 6);
	d.setHours(23, 59, 59, 999);
	return d;
}

/** 前週の水曜日を取得する */
export function getPrevWeekStart(wednesday: Date): Date {
	const d = new Date(wednesday);
	d.setDate(d.getDate() - 7);
	d.setHours(0, 0, 0, 0);
	return d;
}

/** 週ラベルを "M/D(水)〜M/D(火)" 形式で返す */
export function formatWeekLabel(wednesday: Date): string {
	const tuesday = new Date(wednesday);
	tuesday.setDate(tuesday.getDate() + 6);
	const m1 = wednesday.getMonth() + 1;
	const d1 = wednesday.getDate();
	const m2 = tuesday.getMonth() + 1;
	const d2 = tuesday.getDate();
	return `${m1}/${d1}(水)〜${m2}/${d2}(火)`;
}

/** 直近N週の水曜日配列（新しい順） */
export function getRecentWeeks(n: number = 12): Date[] {
	const today = new Date();
	const thisWed = getWeekStart(today);
	const weeks: Date[] = [];
	for (let i = 0; i < n; i++) {
		const d = new Date(thisWed);
		d.setDate(d.getDate() - 7 * i);
		d.setHours(0, 0, 0, 0);
		weeks.push(d);
	}
	return weeks;
}

/** 週次差分を計算する（絶対差 + direction） */
export function computeWeeklyDiff(
	current: number,
	prev: number,
): { diff: number; direction: "up" | "down" | "none" } {
	const diff = current - prev;
	return {
		diff,
		direction: diff > 0 ? "up" : diff < 0 ? "down" : "none",
	};
}

/** 子供の年齢を計算する（0歳児フィルタ用） */
export function computeChildAge(
	birthYear: string,
	birthMonth: string,
	postDate: string,
): number | null {
	if (!birthYear || !birthMonth) return null;
	const by = parseInt(birthYear, 10);
	const bm = parseInt(birthMonth, 10);
	if (isNaN(by) || isNaN(bm)) return null;

	const d = parseDate(postDate);
	if (!d) return null;

	let ageY = d.getFullYear() - by;
	const ageM = d.getMonth() + 1 - bm;
	if (ageM < 0) ageY--;
	if (ageY < 0) return null;
	return ageY;
}
