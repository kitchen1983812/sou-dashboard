import type {
	CityCandidateScore,
	CityRiskScore,
	MarketCity,
	MarketResearchSnapshot,
	RiskLevel,
} from "@/types/marketResearch";

/** 園名 → 5桁市区町村コード */
export const NURSERY_CITY_MAP: Record<string, string> = {
	稲城長沼園: "13225", // 稲城市
	京成八幡園: "12203", // 市川市
	行徳園: "12203", // 市川市
	新座園: "11230", // 新座市
	相武台前園: "14216", // 座間市
	相模原園: "14150", // 相模原市
	大田馬込園: "13111", // 大田区
	大和園: "14213", // 大和市
	中央林間園: "14213", // 大和市
	中野新橋園: "13114", // 中野区
	朝霞園: "11227", // 朝霞市
	東川口園: "11203", // 川口市
	南行徳園: "12203", // 市川市
	柏II園: "12217", // 柏市
	鳩ヶ谷園: "11203", // 川口市 (旧鳩ヶ谷市は2011年に川口市と合併)
	武蔵中原園: "14133", // 川崎市中原区
	目黒園: "13110", // 目黒区
	練馬中村橋園: "13120", // 練馬区
	和光園: "11229", // 和光市
	和光II園: "11229", // 和光市
	蕨園: "11225", // 蕨市
	蕨II園: "11225", // 蕨市
	座間II園: "14216", // 座間市
	// 「ふぇりーちぇほいくえん」「病児保育室にじのへや」は所在地の市区町村が
	// 共有Excelの範囲外、または特殊形態のため未マッピング。
};

/** スナップショットJSONを取得 (Client Componentから) */
export async function fetchMarketResearchSnapshot(): Promise<MarketResearchSnapshot> {
	const res = await fetch("/snapshots/market-research/data.json", {
		cache: "force-cache",
	});
	if (!res.ok) {
		throw new Error("市場調査データの取得に失敗しました");
	}
	return (await res.json()) as MarketResearchSnapshot;
}

/** 直近の非null値とそのインデックスを返す */
function findLatestNonNull(
	series: (number | null)[],
): { value: number; index: number } | null {
	for (let i = series.length - 1; i >= 0; i--) {
		const v = series[i];
		if (v !== null && v !== undefined && !Number.isNaN(v)) {
			return { value: v, index: i };
		}
	}
	return null;
}

/** 指定範囲の平均(非null値のみ) */
function avgInRange(
	series: (number | null)[],
	startIdx: number,
	endIdx: number,
): number | null {
	const vals: number[] = [];
	for (let i = startIdx; i <= endIdx && i < series.length; i++) {
		const v = series[i];
		if (v !== null && v !== undefined && !Number.isNaN(v)) {
			vals.push(v);
		}
	}
	if (vals.length === 0) return null;
	return vals.reduce((a, b) => a + b, 0) / vals.length;
}

/** 出生数リスクスコア計算 */
export function computeRiskScore(city: MarketCity): CityRiskScore {
	const births = city.data.births;
	const baseline = births[0]; // 2000年度
	const latest = findLatestNonNull(births);

	let declineFrom2000: number | null = null;
	if (baseline && latest && baseline > 0) {
		declineFrom2000 = (baseline - latest.value) / baseline;
	}

	// 直近3年平均 vs 過去5年(直近3年の手前5年)平均
	let recentDeclineRate: number | null = null;
	if (latest) {
		const recentAvg = avgInRange(births, latest.index - 2, latest.index);
		const pastAvg = avgInRange(births, latest.index - 7, latest.index - 3);
		if (recentAvg !== null && pastAvg !== null && pastAvg > 0) {
			recentDeclineRate = (pastAvg - recentAvg) / pastAvg;
		}
	}

	const a = declineFrom2000 ?? 0;
	const b = recentDeclineRate ?? 0;
	const score = Math.min(100, Math.max(0, (a * 0.5 + b * 0.5) * 100));

	let level: RiskLevel;
	if (declineFrom2000 === null && recentDeclineRate === null) {
		level = "unknown";
	} else if (a >= 0.3 || b >= 0.2) {
		level = "high";
	} else if (a >= 0.15 || b >= 0.1) {
		level = "medium";
	} else {
		level = "low";
	}

	return {
		city,
		declineFrom2000,
		recentDeclineRate,
		score,
		level,
	};
}

/** 出店候補スコア計算 */
export function computeCandidateScore(
	city: MarketCity,
	maxRecentBirths: number,
): CityCandidateScore {
	const births = city.data.births;
	const utilization = city.data.utilization;
	const latest = findLatestNonNull(births);

	const recentAvgBirths = latest
		? avgInRange(births, latest.index - 2, latest.index)
		: null;
	const latestUtil = findLatestNonNull(utilization);
	const recentUtilization = latestUtil ? latestUtil.value * 100 : null;

	let birthsTrend: number | null = null;
	if (latest && latest.index >= 5) {
		const recent = births[latest.index];
		const past = births[latest.index - 4];
		if (recent && past && past > 0) {
			birthsTrend = (((recent - past) / past) * 100) / 4;
		}
	}

	const sizeScore =
		recentAvgBirths && maxRecentBirths > 0
			? Math.min(
					100,
					(Math.log10(recentAvgBirths + 1) / Math.log10(maxRecentBirths + 1)) *
						100,
				)
			: 0;

	let gapScore = 50;
	if (recentUtilization !== null) {
		if (recentUtilization >= 100) gapScore = 100;
		else if (recentUtilization >= 90) gapScore = 80;
		else if (recentUtilization >= 80) gapScore = 60;
		else if (recentUtilization >= 70) gapScore = 40;
		else gapScore = 20;
	}

	let trendScore = 50;
	if (birthsTrend !== null) {
		trendScore = Math.min(100, Math.max(0, 50 + birthsTrend * 5));
	}

	const totalScore = sizeScore * 0.4 + gapScore * 0.4 + trendScore * 0.2;

	return {
		city,
		recentAvgBirths,
		recentUtilization,
		birthsTrend,
		sizeScore,
		gapScore,
		trendScore,
		totalScore,
	};
}

/** 出店済園の市区町村コードのSet */
export function getExistingCityCodes(): Set<string> {
	return new Set(Object.values(NURSERY_CITY_MAP));
}

/** 市区町村コード → 担当園名リスト */
export function getNurseriesByCity(): Record<string, string[]> {
	const result: Record<string, string[]> = {};
	for (const [nursery, code] of Object.entries(NURSERY_CITY_MAP)) {
		if (!result[code]) result[code] = [];
		result[code].push(nursery);
	}
	return result;
}

export const RISK_COLOR: Record<RiskLevel, string> = {
	high: "#DC2626", // red-600
	medium: "#F59E0B", // amber-500
	low: "#10B981", // emerald-500
	unknown: "#9CA3AF", // gray-400
};

export const RISK_LABEL: Record<RiskLevel, string> = {
	high: "高",
	medium: "中",
	low: "低",
	unknown: "不明",
};
