/** ブランドのカテゴリ（自社 or グループ） */
export type BrandCategory = "自社" | "グループ";

/** 園名プレフィックス → { brand, category } のマッピング */
interface BrandRule {
	match: (name: string) => boolean;
	brand: string;
	category: BrandCategory;
}

export const BRAND_RULES: BrandRule[] = [
	// 自社運営（SOUキッズケア直接運営）
	{ match: (n) => n.startsWith("フェリーチェ"), brand: "フェリーチェ", category: "自社" },
	{ match: (n) => n.startsWith("わくわく保育園"), brand: "わくわく保育園", category: "自社" },
	{ match: (n) => n.startsWith("ことり保育園"), brand: "ことり保育園", category: "自社" },
	// グループ他ブランド（スクルドエンジェル系は保育園に統合、キッズキッズ系も保育園に統合）
	{
		match: (n) => n.startsWith("スクルドエンジェル"),
		brand: "スクルドエンジェル保育園",
		category: "グループ",
	},
	{ match: (n) => n.startsWith("あーす保育園"), brand: "あーす保育園", category: "グループ" },
	{
		match: (n) => n.startsWith("キッズキッズ"),
		brand: "キッズキッズ保育園",
		category: "グループ",
	},
	{
		match: (n) => n.startsWith("イオンゆめみらい保育園"),
		brand: "イオンゆめみらい保育園",
		category: "グループ",
	},
	{
		match: (n) => n.startsWith("ドリームキッズグローバルアカデミー"),
		brand: "ドリームキッズグローバルアカデミー",
		category: "グループ",
	},
];

export function classifyBrand(name: string): { brand: string; category: BrandCategory } {
	for (const rule of BRAND_RULES) {
		if (rule.match(name)) return { brand: rule.brand, category: rule.category };
	}
	return { brand: "その他", category: "グループ" };
}

export const GROUP_REVIEWS_SHEET_NAME = "GBPグループデータ";

/** ReviewsViewのデフォルト表示 */
export const REVIEWS_DEFAULT_VIEW: "自社" | "グループ" | "全て" = "自社";
