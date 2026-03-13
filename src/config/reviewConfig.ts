/** Google口コミ関連設定 */

export interface NurseryConfig {
	name: string;
	area: string;
	placeId: string;
}

/** フェリーチェ（旧アルコバレーノ）GBP登録25園 */
export const NURSERIES: NurseryConfig[] = [
	{
		name: "稲城長沼園",
		area: "東京都",
		placeId: "ChIJAT_un8j6GGARRJDWMAye3XE",
	},
	{
		name: "京成八幡園",
		area: "千葉県",
		placeId: "ChIJq30EnM-GGGARwtXJOrPeADY",
	},
	{ name: "行徳園", area: "千葉県", placeId: "ChIJc2MR3muHGGARhHtG6RP1dKU" },
	{ name: "新座園", area: "埼玉県", placeId: "ChIJt9t-ubLpGGARbSs4iZCwOMU" },
	{
		name: "相武台前園",
		area: "神奈川県",
		placeId: "ChIJmfaEZpz_GGARzgWS_10r0o8",
	},
	{
		name: "相模原園",
		area: "神奈川県",
		placeId: "ChIJq9CYz9kDGWARvC3WXdkbKpA",
	},
	{
		name: "大田馬込園",
		area: "東京都",
		placeId: "ChIJ0QP_5KGKGGAR2U-hrZrUCZA",
	},
	{ name: "大和園", area: "神奈川県", placeId: "ChIJsbeGEa34GGARRaVauXzbF0g" },
	{
		name: "中央林間園",
		area: "神奈川県",
		placeId: "ChIJWVLe3xP_GGARPjPg9pKfdsM",
	},
	{
		name: "中野新橋園",
		area: "東京都",
		placeId: "ChIJ-7i0-efyGGAR2Zm6giP_Fdc",
	},
	{ name: "朝霞園", area: "埼玉県", placeId: "ChIJgbwKmXfpGGARsTdBJiV-YpU" },
	{ name: "東川口園", area: "埼玉県", placeId: "ChIJ6XMEHgaVGGARGzFHI1-Ly_o" },
	{ name: "南行徳園", area: "千葉県", placeId: "ChIJxfYClqmHGGARNxWFyGrt2Mg" },
	{ name: "柏II園", area: "千葉県", placeId: "ChIJYf0QStOdGGARaQzhDXeDgiA" },
	{ name: "鳩ヶ谷園", area: "埼玉県", placeId: "ChIJ02cMqmOUGGARQmncmaR1mXE" },
	{
		name: "武蔵中原園",
		area: "神奈川県",
		placeId: "ChIJTVVcNZ71GGARS1eDY7Ubf8A",
	},
	{ name: "目黒園", area: "東京都", placeId: "ChIJ7akCmzyLGGARdDt5sc19MYQ" },
	{
		name: "練馬中村橋園",
		area: "東京都",
		placeId: "ChIJF5cU6rHtGGARE3OZgLrHKBs",
	},
	{ name: "和光園", area: "埼玉県", placeId: "ChIJ21XWI-DrGGARJjwrKXbBVx8" },
	{ name: "和光II園", area: "埼玉県", placeId: "ChIJUboxFebrGGAR4wU8-2A2zno" },
	{ name: "蕨園", area: "埼玉県", placeId: "ChIJm_dqt2_rGGARZOwV9-OkTxQ" },
	{ name: "蕨II園", area: "埼玉県", placeId: "ChIJlzqtUpfrGGARUsZBMphXEXA" },
	{
		name: "ふぇりーちぇほいくえん",
		area: "千葉県",
		placeId: "ChIJ80xh1ceEImARJ_hE_nHvtvM",
	},
	{
		name: "病児保育室にじのへや",
		area: "埼玉県",
		placeId: "ChIJK9MxgKLrGGARUiRQk2GgMaU",
	},
	{
		name: "座間II園",
		area: "神奈川県",
		placeId: "ChIJLZnrOpn_GGARulv_-cYUkSM",
	},
];

/**
 * 競合保育園リスト
 * エリア別ベンチマーク用。競合のPlace IDを追加してください。
 * Place IDはGoogleマップURLまたはPlaces APIで取得できます。
 *
 * 例:
 * { name: "○○保育園", area: "東京都", placeId: "ChIJ..." }
 */
export interface CompetitorConfig {
	name: string;
	area: string;
	placeId: string;
}

export const COMPETITORS: CompetitorConfig[] = [
	// ここに競合保育園のPlace IDを追加してください
];

/** 月次口コミ獲得目標 */
export const DEFAULT_MONTHLY_GOAL = 3; // 件/月（デフォルト）

/** 園別の月次目標上書き設定（placeId → 目標件数） */
export const NURSERY_GOALS: Record<string, number> = {
	// 例: "ChIJAT_un8j6GGARRJDWMAye3XE": 5,
};

export function getMonthlyGoal(placeId: string): number {
	return NURSERY_GOALS[placeId] ?? DEFAULT_MONTHLY_GOAL;
}
