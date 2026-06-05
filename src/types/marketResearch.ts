/** 市場調査タブの型定義 */

/** 1つの市区町村のデータ */
export interface MarketCity {
	/** 5桁市区町村コード (全国地方公共団体コード) */
	code: string;
	/** 2桁都道府県コード */
	prefCode: string;
	/** 都道府県名 */
	prefName: string;
	/** 市区町村名 */
	name: string;
	/** 1都3県(東京/神奈川/千葉/埼玉)かどうか */
	isMetropolitan: boolean;
	data: {
		/** 出生数 (人/年度) */
		births: (number | null)[];
		/** 保育所定員数 (認可+小規模, 4/1時点) */
		capacity: (number | null)[];
		/** 保育所利用人数 (認可+小規模, 4/1時点) */
		enrollment: (number | null)[];
		/** 保育所充足率 (小数: 0-1.x, 利用÷定員) */
		utilization: (number | null)[];
	};
}

/** スナップショットJSON のルート構造 */
export interface MarketResearchSnapshot {
	meta: {
		generatedAt: string;
		source: string;
		/** 対応年度の配列。data[*][i] が years[i] に対応 */
		years: number[];
		metrics: {
			births: string;
			capacity: string;
			enrollment: string;
			utilization: string;
		};
		metropolitanPrefCodes: string[];
		totalCities: number;
		metropolitanCities: number;
	};
	/** code → MarketCity */
	cities: Record<string, MarketCity>;
}

/** サブタブID */
export type MarketSubTab = "existing" | "risk" | "candidates";

/** リスク区分 */
export type RiskLevel = "high" | "medium" | "low" | "unknown";

/** リスクスコア計算結果 */
export interface CityRiskScore {
	city: MarketCity;
	/** 2000年度比 直近実績との減少率 (-が減少, 0.30 = 30%減) */
	declineFrom2000: number | null;
	/** 直近3年平均 vs 過去5年平均 の減少率 */
	recentDeclineRate: number | null;
	/** 総合リスクスコア (0-100, 高いほどリスク大) */
	score: number;
	level: RiskLevel;
}

/** 出店候補スコア */
export interface CityCandidateScore {
	city: MarketCity;
	/** 直近3年平均出生数 */
	recentAvgBirths: number | null;
	/** 直近の充足率 (%) */
	recentUtilization: number | null;
	/** 直近5年の出生数トレンド (年間平均変化率, -10 = 10%減) */
	birthsTrend: number | null;
	/** 規模スコア (0-100) */
	sizeScore: number;
	/** 供給ギャップスコア (0-100) */
	gapScore: number;
	/** トレンドスコア (0-100, 高いほど健全) */
	trendScore: number;
	/** 総合スコア (0-100) */
	totalScore: number;
}
