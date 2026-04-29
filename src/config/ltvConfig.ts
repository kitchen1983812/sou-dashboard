// 業界相場ベースのLTV定数（社長から実数値を取得次第差し替え）
// 参考: こども家庭庁公定価格・東京都認証保育所
export const LTV_CONFIG = {
	avgMonthlyRevenue: 150000,
	avgEnrollmentMonths: 36,
	operatingMarginRate: 0.1,
} as const;

export const LTV_GROSS =
	LTV_CONFIG.avgMonthlyRevenue * LTV_CONFIG.avgEnrollmentMonths;
export const LTV_PROFIT = LTV_GROSS * LTV_CONFIG.operatingMarginRate;
export const MONTHLY_PROFIT =
	LTV_CONFIG.avgMonthlyRevenue * LTV_CONFIG.operatingMarginRate;
