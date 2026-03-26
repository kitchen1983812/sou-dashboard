import {
	Applicant,
	RecruitCost,
	RecruitFunnelData,
	RouteBreakdown,
	NurseryApplicationData,
	MonthlyRecruitTrend,
	RouteCostData,
	AgencyCostData,
	NurseryStatusCrosstab,
	AgencyStatusCrosstab,
	CostSummaryRow,
	MonthlyCostTrend,
} from "@/types/recruit";
import { parseDate, getFiscalYear, getFYRange } from "./dashboardUtils";

// --- ステータス分類 ---

/** ファネルステージに到達したとみなすステータス群 */
const JOINED_STATUSES = ["入社"];
const OFFER_STATUSES = [...JOINED_STATUSES, "内定承諾済"];
const PASSED_STATUSES = [...OFFER_STATUSES, "合格", "内定後辞退"];
const TOUR_INTERVIEW_STATUSES = [
	...PASSED_STATUSES,
	"面接待ち",
	"見学待ち",
	"面接設定済",
	"見学設定済",
	"面接後辞退",
	"不採用",
];
const DOC_PASS_STATUSES = [
	...TOUR_INTERVIEW_STATUSES,
	"見学前辞退",
	"見学後辞退",
	"面接前辞退",
];

// ドロップオフ判定
const DECLINE_STATUSES = [
	"見学前辞退",
	"見学後辞退",
	"面接前辞退",
	"面接後辞退",
	"内定後辞退",
];

/** ステータスをグループに分類（クロス集計用） */
export function classifyStatusGroup(
	status: string,
): keyof Omit<NurseryStatusCrosstab, "nursery" | "total"> {
	if (!status) return "その他";
	if (JOINED_STATUSES.includes(status)) return "入社";
	if (status === "内定承諾済") return "内定";
	if (status === "合格" || status === "内定後辞退") return "合格";
	if (
		["面接待ち", "見学待ち", "面接設定済", "見学設定済"].includes(status) ||
		status === "面接後辞退" ||
		status === "不採用"
	) {
		if (status === "不採用") return "不採用";
		if (status === "面接後辞退") return "辞退";
		return "面接見学";
	}
	if (DECLINE_STATUSES.includes(status)) return "辞退";
	if (status === "書類選考落ち") return "不採用";
	if (status.includes("応募") || status === "書類選考中") return "応募";
	return "その他";
}

// --- FYフィルタ ---

export function filterApplicantsByFY(
	applicants: Applicant[],
	fy: number,
): Applicant[] {
	const { start, end } = getFYRange(fy);
	return applicants.filter((a) => {
		const d = parseDate(a.applicationDate);
		return d && d >= start && d <= end;
	});
}

export function filterCostsByFY(
	costs: RecruitCost[],
	fy: number,
): RecruitCost[] {
	return costs.filter((c) => {
		const d = parseDate(c.aggregateYearMonth);
		if (d) {
			const cfy = getFiscalYear(d);
			return cfy === fy;
		}
		// fallback: year/month
		const y = Number(c.year);
		const m = Number(c.month);
		if (isNaN(y) || isNaN(m)) return false;
		return m >= 4 ? y === fy : y === fy + 1;
	});
}

// --- ユニーク値取得 ---

export function getUniqueValues(
	applicants: Applicant[],
	field: keyof Applicant,
): string[] {
	const set = new Set<string>();
	applicants.forEach((a) => {
		const val = a[field];
		if (val) set.add(val);
	});
	return Array.from(set).sort();
}

// --- ファネル計算 ---

export function computeRecruitFunnel(
	applicants: Applicant[],
): RecruitFunnelData {
	let total = 0;
	let documentPass = 0;
	let tourInterview = 0;
	let passed = 0;
	let offerAccepted = 0;
	let joined = 0;
	let documentFail = 0;
	let preTourDecline = 0;
	let postTourDecline = 0;
	let preInterviewDecline = 0;
	let postInterviewDecline = 0;
	let postOfferDecline = 0;
	let rejected = 0;

	for (const a of applicants) {
		const s = a.status;
		if (!s) continue;
		total++;

		if (DOC_PASS_STATUSES.includes(s)) documentPass++;
		if (TOUR_INTERVIEW_STATUSES.includes(s)) tourInterview++;
		if (PASSED_STATUSES.includes(s)) passed++;
		if (OFFER_STATUSES.includes(s)) offerAccepted++;
		if (JOINED_STATUSES.includes(s)) joined++;

		// ドロップオフ
		if (s === "書類選考落ち") documentFail++;
		if (s === "見学前辞退") preTourDecline++;
		if (s === "見学後辞退") postTourDecline++;
		if (s === "面接前辞退") preInterviewDecline++;
		if (s === "面接後辞退") postInterviewDecline++;
		if (s === "内定後辞退") postOfferDecline++;
		if (s === "不採用") rejected++;
	}

	return {
		total,
		documentPass,
		tourInterview,
		passed,
		offerAccepted,
		joined,
		documentFail,
		preTourDecline,
		postTourDecline,
		preInterviewDecline,
		postInterviewDecline,
		postOfferDecline,
		rejected,
	};
}

// --- 応募経路ドーナツ ---

export function computeRouteBreakdown(
	applicants: Applicant[],
): RouteBreakdown[] {
	const counts = new Map<string, number>();
	applicants.forEach((a) => {
		const route = a.recruitRoute || "(不明)";
		counts.set(route, (counts.get(route) || 0) + 1);
	});
	const total = applicants.length || 1;
	return Array.from(counts.entries())
		.map(([route, count]) => ({
			route,
			count,
			percentage: Math.round((count / total) * 1000) / 10,
		}))
		.sort((a, b) => b.count - a.count);
}

// --- 園別応募数 ---

export function computeNurseryApplications(
	applicants: Applicant[],
): NurseryApplicationData[] {
	const counts = new Map<string, number>();
	applicants.forEach((a) => {
		const nursery = a.nursery || "(不明)";
		counts.set(nursery, (counts.get(nursery) || 0) + 1);
	});
	return Array.from(counts.entries())
		.map(([nursery, count]) => ({ nursery, count }))
		.sort((a, b) => b.count - a.count);
}

// --- 月次推移 ---

export function computeMonthlyRecruitTrend(
	applicants: Applicant[],
	fy: number,
	prevApplicants?: Applicant[],
): MonthlyRecruitTrend[] {
	const months: MonthlyRecruitTrend[] = [];

	for (let i = 0; i < 12; i++) {
		const m = ((i + 3) % 12) + 1; // 4,5,...,12,1,2,3
		const y = m >= 4 ? fy : fy + 1;
		const label = `${m}月`;

		const appCount = applicants.filter((a) => {
			const d = parseDate(a.applicationDate);
			return d && d.getFullYear() === y && d.getMonth() + 1 === m;
		}).length;

		const hireCount = applicants.filter((a) => {
			if (a.status !== "入社") return false;
			// 入社月は joinDate があれば使う、なければ applicationDate
			const dateStr = a.joinDate || a.applicationDate;
			const d = parseDate(dateStr);
			return d && d.getFullYear() === y && d.getMonth() + 1 === m;
		}).length;

		const entry: MonthlyRecruitTrend = {
			month: label,
			monthNum: m,
			year: y,
			applications: appCount,
			hires: hireCount,
		};

		if (prevApplicants) {
			const py = m >= 4 ? fy - 1 : fy;
			entry.prevApplications = prevApplicants.filter((a) => {
				const d = parseDate(a.applicationDate);
				return d && d.getFullYear() === py && d.getMonth() + 1 === m;
			}).length;
			entry.prevHires = prevApplicants.filter((a) => {
				if (a.status !== "入社") return false;
				const dateStr = a.joinDate || a.applicationDate;
				const d = parseDate(dateStr);
				return d && d.getFullYear() === py && d.getMonth() + 1 === m;
			}).length;
		}

		months.push(entry);
	}
	return months;
}

// --- 費用テーブル ---

export function computeRouteCost(
	applicants: Applicant[],
	costs: RecruitCost[],
): RouteCostData[] {
	// ルート別の費用集計
	const costByRoute = new Map<string, number>();
	costs.forEach((c) => {
		// 区分けをルートとして使用（エージェント手数料, 採用課金, etc.）
		// Looker Studioでは「採用ルート」で集計（ハローワーク, 自社(WEB), 採用課金, etc.）
		const route = c.category || c.agency || "(不明)";
		costByRoute.set(route, (costByRoute.get(route) || 0) + c.amountExTax);
	});

	// ルート別の入社数
	const hiresByRoute = new Map<string, number>();
	applicants.forEach((a) => {
		if (a.status === "入社") {
			const route = a.recruitRoute || "(不明)";
			hiresByRoute.set(route, (hiresByRoute.get(route) || 0) + 1);
		}
	});

	// 全ルートをマージ
	const allRoutes = new Set<string>();
	costByRoute.forEach((_, k) => allRoutes.add(k));
	hiresByRoute.forEach((_, k) => allRoutes.add(k));

	return Array.from(allRoutes)
		.map((route) => {
			const cost = costByRoute.get(route) || 0;
			const hires = hiresByRoute.get(route) || 0;
			return {
				route,
				cost,
				hires,
				unitCost: hires > 0 ? Math.round(cost / hires) : 0,
			};
		})
		.sort((a, b) => b.cost - a.cost);
}

export function computeAgencyCost(
	applicants: Applicant[],
	costs: RecruitCost[],
): AgencyCostData[] {
	const costByAgency = new Map<string, { cost: number; route: string }>();
	costs.forEach((c) => {
		const agency = c.agency || "(不明)";
		const prev = costByAgency.get(agency) || { cost: 0, route: c.category };
		prev.cost += c.amountExTax;
		costByAgency.set(agency, prev);
	});

	const hiresByAgency = new Map<string, number>();
	applicants.forEach((a) => {
		if (a.status === "入社") {
			const agency = a.agency || "(不明)";
			hiresByAgency.set(agency, (hiresByAgency.get(agency) || 0) + 1);
		}
	});

	const allAgencies = new Set<string>();
	costByAgency.forEach((_, k) => allAgencies.add(k));
	hiresByAgency.forEach((_, k) => allAgencies.add(k));

	return Array.from(allAgencies)
		.map((agency) => {
			const data = costByAgency.get(agency);
			const cost = data?.cost || 0;
			const route = data?.route || "";
			const hires = hiresByAgency.get(agency) || 0;
			return {
				agency,
				route,
				cost,
				hires,
				unitCost: hires > 0 ? Math.round(cost / hires) : 0,
			};
		})
		.sort((a, b) => b.cost - a.cost);
}

// --- クロス集計 ---

function buildStatusCrosstab<T extends string>(
	applicants: Applicant[],
	groupKey: (a: Applicant) => string,
	labelKey: T,
): Array<
	Record<string, string | number> & {
		応募: number;
		面接見学: number;
		合格: number;
		内定: number;
		入社: number;
		辞退: number;
		不採用: number;
		その他: number;
		total: number;
	}
> {
	const rows = new Map<
		string,
		{
			応募: number;
			面接見学: number;
			合格: number;
			内定: number;
			入社: number;
			辞退: number;
			不採用: number;
			その他: number;
			total: number;
		}
	>();

	applicants.forEach((a) => {
		const key = groupKey(a) || "(不明)";
		if (!rows.has(key)) {
			rows.set(key, {
				応募: 0,
				面接見学: 0,
				合格: 0,
				内定: 0,
				入社: 0,
				辞退: 0,
				不採用: 0,
				その他: 0,
				total: 0,
			});
		}
		const row = rows.get(key)!;
		const group = classifyStatusGroup(a.status);
		row[group]++;
		row.total++;
	});

	return Array.from(rows.entries())
		.map(([key, data]) => ({
			[labelKey]: key,
			...data,
		}))
		.sort((a, b) => (b.total as number) - (a.total as number)) as Array<
		Record<string, string | number> & {
			応募: number;
			面接見学: number;
			合格: number;
			内定: number;
			入社: number;
			辞退: number;
			不採用: number;
			その他: number;
			total: number;
		}
	>;
}

export function computeNurseryStatusCrosstab(
	applicants: Applicant[],
): NurseryStatusCrosstab[] {
	return buildStatusCrosstab(
		applicants,
		(a) => a.nursery,
		"nursery",
	) as unknown as NurseryStatusCrosstab[];
}

export function computeAgencyStatusCrosstab(
	applicants: Applicant[],
): AgencyStatusCrosstab[] {
	return buildStatusCrosstab(
		applicants,
		(a) => a.agency,
		"agency",
	) as unknown as AgencyStatusCrosstab[];
}

// --- 園×雇用形態別コスト ---

export interface NurseryEmploymentCost {
	nursery: string;
	employmentType: string;
	cost: number;
	hires: number;
	unitCost: number;
}

export function computeNurseryEmploymentCost(
	applicants: Applicant[],
	costs: RecruitCost[],
): NurseryEmploymentCost[] {
	const key = (n: string, e: string) => `${n}||${e}`;
	const costMap = new Map<string, number>();
	const hiresMap = new Map<string, number>();

	for (const c of costs) {
		const k = key(c.nursery || "(不明)", c.employmentType || "(不明)");
		costMap.set(k, (costMap.get(k) || 0) + c.amountExTax);
	}

	for (const a of applicants) {
		if (a.status !== "入社") continue;
		const k = key(a.nursery || "(不明)", a.employmentType || "(不明)");
		hiresMap.set(k, (hiresMap.get(k) || 0) + 1);
	}

	const allKeys = new Set<string>();
	costMap.forEach((_, k) => allKeys.add(k));
	hiresMap.forEach((_, k) => allKeys.add(k));
	return Array.from(allKeys)
		.map((k) => {
			const [nursery, employmentType] = k.split("||");
			const cost = costMap.get(k) || 0;
			const hires = hiresMap.get(k) || 0;
			return {
				nursery,
				employmentType,
				cost,
				hires,
				unitCost: hires > 0 ? Math.round(cost / hires) : 0,
			};
		})
		.sort((a, b) => b.cost - a.cost);
}

// --- 採用費分析 ---

/** 職種・雇用形態からカテゴリを判定 */
export function classifyCostCategory(
	jobType: string,
	employmentType: string,
): string {
	const isChildcare = jobType.includes("保育");
	const isFulltime = employmentType.includes("正社員");
	return `${isChildcare ? "保育" : "他"}:${isFulltime ? "正社員" : "パート"}`;
}

export function computeCostSummaryGrid(
	applicants: Applicant[],
	costs: RecruitCost[],
): CostSummaryRow[] {
	const categories = ["保育:正社員", "保育:パート", "他:正社員", "他:パート"];
	const results: CostSummaryRow[] = [];

	let totalCost = 0;
	let totalHires = 0;

	for (const cat of categories) {
		const [jobPrefix, empPrefix] = cat.split(":");
		const isChildcare = jobPrefix === "保育";
		const isFulltime = empPrefix === "正社員";

		const catCost = costs
			.filter((c) => {
				const jMatch = isChildcare
					? c.jobType.includes("保育")
					: !c.jobType.includes("保育");
				const eMatch = isFulltime
					? c.employmentType.includes("正社員")
					: !c.employmentType.includes("正社員");
				return jMatch && eMatch;
			})
			.reduce((sum, c) => sum + c.amountExTax, 0);

		const catHires = applicants.filter((a) => {
			if (a.status !== "入社") return false;
			const jMatch = isChildcare
				? a.jobType.includes("保育")
				: !a.jobType.includes("保育");
			const eMatch = isFulltime
				? a.employmentType.includes("正社員")
				: !a.employmentType.includes("正社員");
			return jMatch && eMatch;
		}).length;

		totalCost += catCost;
		totalHires += catHires;

		results.push({
			category: cat,
			cost: catCost,
			hires: catHires,
			unitCost: catHires > 0 ? Math.round(catCost / catHires) : 0,
		});
	}

	results.push({
		category: "合計",
		cost: totalCost,
		hires: totalHires,
		unitCost: totalHires > 0 ? Math.round(totalCost / totalHires) : 0,
	});

	return results;
}

export function computeMonthlyCostTrend(
	costs: RecruitCost[],
	applicants: Applicant[],
	fy: number,
	category?: string, // "保育:正社員" etc. undefinedなら全体
): MonthlyCostTrend[] {
	const result: MonthlyCostTrend[] = [];

	for (let i = 0; i < 12; i++) {
		const m = ((i + 3) % 12) + 1;
		const y = m >= 4 ? fy : fy + 1;

		let filteredCosts = costs.filter((c) => {
			return Number(c.year) === y && Number(c.month) === m;
		});

		let filteredApplicants = applicants.filter((a) => {
			if (a.status !== "入社") return false;
			const dateStr = a.joinDate || a.applicationDate;
			const d = parseDate(dateStr);
			return d && d.getFullYear() === y && d.getMonth() + 1 === m;
		});

		if (category && category !== "合計") {
			const [jobPrefix, empPrefix] = category.split(":");
			const isChildcare = jobPrefix === "保育";
			const isFulltime = empPrefix === "正社員";

			filteredCosts = filteredCosts.filter((c) => {
				const jMatch = isChildcare
					? c.jobType.includes("保育")
					: !c.jobType.includes("保育");
				const eMatch = isFulltime
					? c.employmentType.includes("正社員")
					: !c.employmentType.includes("正社員");
				return jMatch && eMatch;
			});

			filteredApplicants = filteredApplicants.filter((a) => {
				const jMatch = isChildcare
					? a.jobType.includes("保育")
					: !a.jobType.includes("保育");
				const eMatch = isFulltime
					? a.employmentType.includes("正社員")
					: !a.employmentType.includes("正社員");
				return jMatch && eMatch;
			});
		}

		const cost = filteredCosts.reduce((s, c) => s + c.amountExTax, 0);
		const hires = filteredApplicants.length;

		result.push({
			month: `${m}月`,
			monthNum: m,
			year: y,
			cost,
			hires,
			unitCost: hires > 0 ? Math.round(cost / hires) : 0,
		});
	}

	return result;
}
