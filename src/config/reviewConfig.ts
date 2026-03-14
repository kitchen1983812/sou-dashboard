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
	// ---- 東京都 ----
	{
		name: "Oomaru-Yushi Nursery",
		area: "東京都",
		placeId: "ChIJjwuqU876GGARettnhJBINR8",
	},
	{
		name: "Inagi Nozomi Nursery",
		area: "東京都",
		placeId: "ChIJs0jA2VT7GGARxI_y1qKk09E",
	},
	{
		name: "ピノキオ幼児舎 稲城園",
		area: "東京都",
		placeId: "ChIJ1W_ir8P6GGAR8dIXnP-s2YQ",
	},
	{
		name: "Hongo Yushi Nursery",
		area: "東京都",
		placeId: "ChIJvUJPlcP6GGART-ZqOmnQejA",
	},
	{
		name: "Gakkenほいくえん 馬込",
		area: "東京都",
		placeId: "ChIJdU8HH5qLGGARDw4je5WILCo",
	},
	{
		name: "小鳩ナーサリースクール中馬込",
		area: "東京都",
		placeId: "ChIJwdieSjGLGGARtsb0Yu3zulE",
	},
	{
		name: "Kenpa Nursery Nishimagome",
		area: "東京都",
		placeId: "ChIJdWUvN6eKGGARtJoMHv7NDRg",
	},
	{
		name: "Midori no Oka Nursery",
		area: "東京都",
		placeId: "ChIJAajRgZ2KGGARCkzrWdpmItg",
	},
	{
		name: "Shakaifukushi Hojin Tsubomikai Kamiikedai Nursery",
		area: "東京都",
		placeId: "ChIJ79_vb6-KGGARxgeEW9mIDKo",
	},
	{
		name: "Konbipurazayayoicho Hoikuen",
		area: "東京都",
		placeId: "ChIJCZ6hQO7zGGARWKFiv6q4H94",
	},
	{
		name: "Global Kids Nakano-Shimbashi",
		area: "東京都",
		placeId: "ChIJEUkde9zyGGARlZHdOsklZuo",
	},
	{
		name: "Nakamachi Nursery",
		area: "東京都",
		placeId: "ChIJ__-Pw8HyGGARrd-V0-ZN74A",
	},
	{
		name: "Yayoi Nursery",
		area: "東京都",
		placeId: "ChIJVTO3OOHyGGARx-48kpqxfbY",
	},
	{
		name: "Musashino Nursery",
		area: "東京都",
		placeId: "ChIJMw9s_OTyGGAR3O1ppEYghu4",
	},
	{
		name: "さくらさくみらい 目黒",
		area: "東京都",
		placeId: "ChIJcY6bhm6LGGAR6gqZIzgf37o",
	},
	{
		name: "Tokyo International School Nakameguro Kinder Garden",
		area: "東京都",
		placeId: "ChIJT8fMpjmLGGART1T_gKRECMw",
	},
	{
		name: "Beyondia International School Meguro",
		area: "東京都",
		placeId: "ChIJV1Wh2hiLGGARmzzpPhiBbcs",
	},
	{
		name: "HOPPA Meguro Nursery",
		area: "東京都",
		placeId: "ChIJr9DuTCOLGGARJwxiNCyeZn0",
	},
	{
		name: "Dendō Nursery",
		area: "東京都",
		placeId: "ChIJ7Tp0VDuLGGARAXieEfvJKyY",
	},
	{
		name: "Sorasuto Nakamurabashi Nursery",
		area: "東京都",
		placeId: "ChIJwX3846_tGGAR8JE-Y_9JzBY",
	},
	{
		name: "Kazenoko Nursery",
		area: "東京都",
		placeId: "ChIJ5-Hv2K_tGGAR6iQNvIfGO0E",
	},
	{
		name: "Art Childcare Nakamurabashi",
		area: "東京都",
		placeId: "ChIJ-dyenbrtGGAR3AMWphJ6Xa4",
	},
	{
		name: "Nursery Maam Nakamurabashiekimae",
		area: "東京都",
		placeId: "ChIJKyQpprbtGGARuunzAzvItd4",
	},
	{
		name: "練馬あけみ保育園",
		area: "東京都",
		placeId: "ChIJo1l1zoHtGGARn9mIDXL4Fno",
	},
	// ---- 千葉県 ----
	{
		name: "Little K'sアクス本八幡保育園",
		area: "千葉県",
		placeId: "ChIJdSue9s-GGGARNrrYzfGVd68",
	},
	{
		name: "かえで保育園本八幡",
		area: "千葉県",
		placeId: "ChIJd40C0fuHGGARu253cDnvjUo",
	},
	{
		name: "ル・アンジェ本八幡保育園",
		area: "千葉県",
		placeId: "ChIJI6ybp5qHGGARElY1YcqTNWk",
	},
	{
		name: "AIAI NURSERY 本八幡",
		area: "千葉県",
		placeId: "ChIJu3_TQ5iHGGARSJoAP8Ri1uU",
	},
	{
		name: "八幡チャイルド保育園",
		area: "千葉県",
		placeId: "ChIJQe6_BdKHGGARMy6VGlz2vvE",
	},
	{
		name: "Compass Yohoen Ichikawa School",
		area: "千葉県",
		placeId: "ChIJd6jkHAaHGGARsCWagJzjZ7k",
	},
	{
		name: "若葉インターナショナル幼保園 行徳園",
		area: "千葉県",
		placeId: "ChIJpYQb3GmHGGARsx48PV4frbM",
	},
	{
		name: "アスク行徳保育園",
		area: "千葉県",
		placeId: "ChIJQZrxfEKHGGARXCwiH9pfzRY",
	},
	{
		name: "Suehiro Nursery",
		area: "千葉県",
		placeId: "ChIJj8fKIEKHGGARYl-JyKzwO1s",
	},
	{
		name: "ネピア ソダテラス",
		area: "千葉県",
		placeId: "ChIJg2FIchGHGGAR41ptEGKhmQA",
	},
	{
		name: "南行徳せいわ保育園",
		area: "千葉県",
		placeId: "ChIJOZ7l5LOHGGARNuqYXHBbMnU",
	},
	{
		name: "Kakemama Nursery",
		area: "千葉県",
		placeId: "ChIJCeYQgnCHGGARuFrkVQ3TxK4",
	},
	{
		name: "AIAI NURSERY 南行徳",
		area: "千葉県",
		placeId: "ChIJx7ItSImHGGARwUqjWVTcMek",
	},
	{
		name: "すくすくの杜南行徳園",
		area: "千葉県",
		placeId: "ChIJR4c0EHGHGGARHYM-bu44Qg0",
	},
	{
		name: "Kurumi Kodomoen",
		area: "千葉県",
		placeId: "ChIJOTeF3PKcGGARbYsAyY4_slM",
	},
	{
		name: "Kashiwa Central Nursery",
		area: "千葉県",
		placeId: "ChIJg7vMpu-cGGARiwXXv_8l7aw",
	},
	{
		name: "柏サンフラワー保育園",
		area: "千葉県",
		placeId: "ChIJgazCMsedGGARnqdRGhRCmWI",
	},
	{
		name: "Kagayaki nursery school Kashiwa",
		area: "千葉県",
		placeId: "ChIJV1EM3F-dGGARQ1nKODT0FhI",
	},
	{
		name: "Kashiwa Himawari nursery",
		area: "千葉県",
		placeId: "ChIJgWJOvNGdGGARZp7NQZrxqQE",
	},
	{
		name: "Innai Nursery",
		area: "千葉県",
		placeId: "ChIJh9_2PsmEImARIgK0UYRwf0k",
	},
	{
		name: "Mirainomachi Nursery Tsurusawa",
		area: "千葉県",
		placeId: "ChIJBdNbsAuFImARs7KpHPBI4TA",
	},
	{
		name: "チャコ保育園",
		area: "千葉県",
		placeId: "ChIJT_uxjsuEImAR43PEskn3VJE",
	},
	{
		name: "Nestいんない保育園",
		area: "千葉県",
		placeId: "ChIJcT7ktTeFImARy-oAosDZdcM",
	},
	// ---- 埼玉県 ----
	{
		name: "小規模保育園 元気キッズ 新座園",
		area: "埼玉県",
		placeId: "ChIJca4GiEjoGGAR-Xqd06iGIg8",
	},
	{
		name: "一時保育 菜のハナ",
		area: "埼玉県",
		placeId: "ChIJ6Sdnm5jpGGAR-JZomfWi1po",
	},
	{
		name: "Shiraume Nursery",
		area: "埼玉県",
		placeId: "ChIJSX5TFlToGGARO1I2XFHU3Iw",
	},
	{
		name: "Shiraume Daini Nursery",
		area: "埼玉県",
		placeId: "ChIJ35QMqU3oGGARpsl7_jiNz20",
	},
	{
		name: "Otowanomoriniiza Nursery",
		area: "埼玉県",
		placeId: "ChIJ6R6OikjoGGARGfxnn_faHEE",
	},
	{
		name: "あさかたんぽぽ保育園なかよし園",
		area: "埼玉県",
		placeId: "ChIJAVe-OHfpGGARcosquEYC8WM",
	},
	{
		name: "小規模保育園 元気キッズ 朝霞根岸台園",
		area: "埼玉県",
		placeId: "ChIJn3fhVTbpGGARfKZ2NIQEifI",
	},
	{
		name: "Takinone Nursery",
		area: "埼玉県",
		placeId: "ChIJ0xk8rZjpGGARtMbPc6b96Mk",
	},
	{
		name: "小規模保育園 元気キッズ 朝霞岡園",
		area: "埼玉県",
		placeId: "ChIJbQC1rZvpGGARGPcghoBZEr0",
	},
	{
		name: "認可保育園 元気キッズ第二朝霞根岸台園",
		area: "埼玉県",
		placeId: "ChIJu0tIaYvpGGARZKYZXZigyts",
	},
	{
		name: "Higashikawaguchihatobue Nursery",
		area: "埼玉県",
		placeId: "ChIJVd6jJrCVGGARqtw7tzgJR_Y",
	},
	{
		name: "みんなの保育園東川口",
		area: "埼玉県",
		placeId: "ChIJ35TKqTaVGGARVlUdXNDSNQ8",
	},
	{
		name: "すてっぷ すきっぷ第３",
		area: "埼玉県",
		placeId: "ChIJUS8UawCVGGAR6wdAGGDgte4",
	},
	{
		name: "東川口ポポロ保育園",
		area: "埼玉県",
		placeId: "ChIJS_4W0BCVGGAR6yhDv_EOInM",
	},
	{
		name: "たいよう保育園 戸塚東園",
		area: "埼玉県",
		placeId: "ChIJIUQNIriVGGAR4BWL6J9vqM0",
	},
	{
		name: "かたつむりベビー保育園 鳩ケ谷",
		area: "埼玉県",
		placeId: "ChIJyb046sWVGGARuZvGZrbdA-s",
	},
	{
		name: "Ichigo Nursery",
		area: "埼玉県",
		placeId: "ChIJ94zH5WKUGGARE4KJfiQTUCM",
	},
	{
		name: "和光なかよしこども園",
		area: "埼玉県",
		placeId: "ChIJFYWvVYTpGGARNM2o0aPycXg",
	},
	{
		name: "和光プライムスター保育園",
		area: "埼玉県",
		placeId: "ChIJXTgOfN3rGGARqNErTPrTtgg",
	},
	{
		name: "Nakamachidoronko Nursery",
		area: "埼玉県",
		placeId: "ChIJVxMKjmTpGGAReYXQcACOkF0",
	},
	{
		name: "Wakotchi Little Star Nursery",
		area: "埼玉県",
		placeId: "ChIJ3TNrxt_rGGAREd9w1ggXoIQ",
	},
	{
		name: "Hinata Nursery",
		area: "埼玉県",
		placeId: "ChIJrVoOR97rGGARzu-C1z2MFZk",
	},
	{
		name: "メリー★ポピンズ 和光ルーム",
		area: "埼玉県",
		placeId: "ChIJFYA_wODrGGAR7Q0t8HONaBg",
	},
	{
		name: "Kids Aid Wako Nursery",
		area: "埼玉県",
		placeId: "ChIJ1Q2_2l_pGGARxTjbWbb0NcI",
	},
	{
		name: "蕨市小規模保育園 保育ルームのぞみ",
		area: "埼玉県",
		placeId: "ChIJVVXBADrrGGARISwcPoiq6JM",
	},
	{
		name: "Himawari Nursery",
		area: "埼玉県",
		placeId: "ChIJW1MIesyUGGARpgKhAnBNXqM",
	},
	{
		name: "Midori Nursery",
		area: "埼玉県",
		placeId: "ChIJL1FGhybrGGARhpQoeZ1juNQ",
	},
	{ name: "芝保育所", area: "埼玉県", placeId: "ChIJqQNvhSzrGGARBCIqaj-9sVs" },
	{
		name: "Jirokai Toda Nursery School",
		area: "埼玉県",
		placeId: "ChIJc5MifznrGGARtzrjyPg6gkw",
	},
	{
		name: "蕨ゆたか保育園",
		area: "埼玉県",
		placeId: "ChIJDQELpjPrGGARY8qMny7sl1M",
	},
	{
		name: "Keyaki nursery",
		area: "埼玉県",
		placeId: "ChIJC5Q2NTPrGGARCwldGlKtoho",
	},
	{
		name: "ニチイキッズわらび保育園",
		area: "埼玉県",
		placeId: "ChIJYQndCS_rGGARFMEvBZIvhkU",
	},
	{
		name: "Warabishitachisakura Nursery",
		area: "埼玉県",
		placeId: "ChIJQbDzFjXrGGARzRr5HkUEROg",
	},
	// ---- 神奈川県 ----
	{
		name: "Sobudai Nursery",
		area: "神奈川県",
		placeId: "ChIJFWZ8AgX_GGAR69wxllX3LiM",
	},
	{
		name: "マジオたんぽぽ保育園相武台",
		area: "神奈川県",
		placeId: "ChIJWXqejRL_GGARfeG607vs20g",
	},
	{
		name: "Best Kids Sobudai Nursery",
		area: "神奈川県",
		placeId: "ChIJ6Xse5MT_GGARsU7gq9MmBN4",
	},
	{
		name: "たんぽぽ保育園・相武台前",
		area: "神奈川県",
		placeId: "ChIJyaRKKgf_GGARC5dFwlkHfic",
	},
	{
		name: "Sagamigaokanishi Nursery",
		area: "神奈川県",
		placeId: "ChIJUUJVvR3_GGAR4dchSMfHJP4",
	},
	{
		name: "Kensei Nursery",
		area: "神奈川県",
		placeId: "ChIJ31x8yF_9GGARntcZGNMzdrs",
	},
	{
		name: "カメリアキッズ相模原園",
		area: "神奈川県",
		placeId: "ChIJt8ZmLGf9GGARSXGVC_Ta8Sk",
	},
	{
		name: "Yotsuba Nursery Sagamihara",
		area: "神奈川県",
		placeId: "ChIJ8b4vMF79GGAR_dHtHt7aK_M",
	},
	{
		name: "Sagamiharasakura Nursery",
		area: "神奈川県",
		placeId: "ChIJZS4C2Wb9GGAR84Q_-00wBSQ",
	},
	{
		name: "プリンス保育園 南林間",
		area: "神奈川県",
		placeId: "ChIJMXQnQbP4GGARkgUKgq2AESs",
	},
	{
		name: "Shakaifukushi Hojin Kenofukushikai Nishitsuruma Nursery",
		area: "神奈川県",
		placeId: "ChIJlzjxH1X_GGARpSqrZSzv0ik",
	},
	{
		name: "大和 ひまわり保育園・分園",
		area: "神奈川県",
		placeId: "ChIJXX1BaKz4GGAR1zWJ3oHzv2g",
	},
	{
		name: "Yamato Shiritsu Wakaba Nursery",
		area: "神奈川県",
		placeId: "ChIJrWnRSaj4GGARqqlsXio6CP8",
	},
	{
		name: "まあむベイビィズ中央林間",
		area: "神奈川県",
		placeId: "ChIJXQFt8d_5GGAR43PomTGWCxc",
	},
	{
		name: "ほいくえん虹の子",
		area: "神奈川県",
		placeId: "ChIJw-m-oMz4GGARN6VUW7q5elk",
	},
	{
		name: "スクルドエンジェル保育園中央林間園",
		area: "神奈川県",
		placeId: "ChIJn479rbL5GGAR5BK-2fne-D0",
	},
	{
		name: "Tsukiminoshonan Nursery",
		area: "神奈川県",
		placeId: "ChIJs4JiyjL5GGAR8_bSaufq9cc",
	},
	{
		name: "ヴィラまなびの森保育園中央林間",
		area: "神奈川県",
		placeId: "ChIJqcqTQjL_GGAREFnCRoGh6jM",
	},
	{
		name: "Ein Musashikosugi-kita Nursery School",
		area: "神奈川県",
		placeId: "ChIJocZjQHH1GGARh6CjDynonjI",
	},
	{
		name: "京進のほいくえん HOPPAパークシティ武蔵小杉",
		area: "神奈川県",
		placeId: "ChIJ-XJDBqj1GGARXxdZgqAJtfc",
	},
	{
		name: "Musashinakaharamorinoko Nursery",
		area: "神奈川県",
		placeId: "ChIJYd7LvJz1GGARWqwBhyYkOww",
	},
	{
		name: "Chachaimai Nursery",
		area: "神奈川県",
		placeId: "ChIJyT5S2Xf1GGARiWFgLnZrun8",
	},
	{
		name: "Chacha Nakamachi Nursery",
		area: "神奈川県",
		placeId: "ChIJ9cMceXf1GGARv1nL7kfGGp4",
	},
	{
		name: "ユニーク・１・インターナショナル・キッズ・アカデミー",
		area: "神奈川県",
		placeId: "ChIJY1ZD_Bv1GGAR8XDkKyOT42Y",
	},
	{
		name: "Zamasukoyaka Nursery",
		area: "神奈川県",
		placeId: "ChIJOf6Vk57_GGARfg1ham8GNDw",
	},
	{
		name: "Yanase Nursery",
		area: "神奈川県",
		placeId: "ChIJhceeB3f_GGARESBkI8dz6WE",
	},
	{
		name: "Zama Shiritsu Chigusa Nursery",
		area: "神奈川県",
		placeId: "ChIJB9fZcZX_GGAR1TG0eLx1BQI",
	},
	{
		name: "Zama Nursery",
		area: "神奈川県",
		placeId: "ChIJfTx2ipv_GGARcmnXco2UD70",
	},
];

/** 自園placeId → 近隣競合placeId一覧（Places API Nearby Searchで発見、最大5件） */
export const NURSERY_COMPETITORS: Record<string, string[]> = {
	// 稲城長沼園
	ChIJAT_un8j6GGARRJDWMAye3XE: [
		"ChIJjwuqU876GGARettnhJBINR8",
		"ChIJs0jA2VT7GGARxI_y1qKk09E",
		"ChIJ1W_ir8P6GGAR8dIXnP-s2YQ",
		"ChIJvUJPlcP6GGART-ZqOmnQejA",
		"ChIJvVe2Cc36GGARyrHQdRzs0-0",
	],
	// 京成八幡園
	"ChIJq30EnM-GGGARwtXJOrPeADY": [
		"ChIJdSue9s-GGGARNrrYzfGVd68",
		"ChIJd40C0fuHGGARu253cDnvjUo",
		"ChIJI6ybp5qHGGARElY1YcqTNWk",
		"ChIJu3_TQ5iHGGARSJoAP8Ri1uU",
		"ChIJQe6_BdKHGGARMy6VGlz2vvE",
	],
	// 行徳園
	ChIJc2MR3muHGGARhHtG6RP1dKU: [
		"ChIJd6jkHAaHGGARsCWagJzjZ7k",
		"ChIJpYQb3GmHGGARsx48PV4frbM",
		"ChIJQZrxfEKHGGARXCwiH9pfzRY",
		"ChIJj8fKIEKHGGARYl-JyKzwO1s",
		"ChIJg2FIchGHGGAR41ptEGKhmQA",
	],
	// 新座園
	"ChIJt9t-ubLpGGARbSs4iZCwOMU": [
		"ChIJca4GiEjoGGAR-Xqd06iGIg8",
		"ChIJ6Sdnm5jpGGAR-JZomfWi1po",
		"ChIJSX5TFlToGGARO1I2XFHU3Iw",
		"ChIJ35QMqU3oGGARpsl7_jiNz20",
		"ChIJ6R6OikjoGGARGfxnn_faHEE",
	],
	// 相武台前園
	ChIJmfaEZpz_GGARzgWS_10r0o8: [
		"ChIJFWZ8AgX_GGAR69wxllX3LiM",
		"ChIJWXqejRL_GGARfeG607vs20g",
		"ChIJ6Xse5MT_GGARsU7gq9MmBN4",
		"ChIJyaRKKgf_GGARC5dFwlkHfic",
		"ChIJUUJVvR3_GGAR4dchSMfHJP4",
	],
	// 相模原園
	ChIJq9CYz9kDGWARvC3WXdkbKpA: [
		"ChIJ31x8yF_9GGARntcZGNMzdrs",
		"ChIJjRqkZnv9GGARnzdQtpYjgko",
		"ChIJt8ZmLGf9GGARSXGVC_Ta8Sk",
		"ChIJ8b4vMF79GGAR_dHtHt7aK_M",
		"ChIJZS4C2Wb9GGAR84Q_-00wBSQ",
	],
	// 大田馬込園
	"ChIJ0QP_5KGKGGAR2U-hrZrUCZA": [
		"ChIJdU8HH5qLGGARDw4je5WILCo",
		"ChIJwdieSjGLGGARtsb0Yu3zulE",
		"ChIJdWUvN6eKGGARtJoMHv7NDRg",
		"ChIJAajRgZ2KGGARCkzrWdpmItg",
		"ChIJ79_vb6-KGGARxgeEW9mIDKo",
	],
	// 大和園
	ChIJsbeGEa34GGARRaVauXzbF0g: [
		"ChIJMXQnQbP4GGARkgUKgq2AESs",
		"ChIJlzjxH1X_GGARpSqrZSzv0ik",
		"ChIJXX1BaKz4GGAR1zWJ3oHzv2g",
		"ChIJiQSpB5H5GGARI1WxakxBhZY",
		"ChIJrWnRSaj4GGARqqlsXio6CP8",
	],
	// 中央林間園
	ChIJWVLe3xP_GGARPjPg9pKfdsM: [
		"ChIJXQFt8d_5GGAR43PomTGWCxc",
		"ChIJw-m-oMz4GGARN6VUW7q5elk",
		"ChIJn479rbL5GGAR5BK-2fne-D0",
		"ChIJs4JiyjL5GGAR8_bSaufq9cc",
		"ChIJqcqTQjL_GGAREFnCRoGh6jM",
	],
	// 中野新橋園
	"ChIJ-7i0-efyGGAR2Zm6giP_Fdc": [
		"ChIJCZ6hQO7zGGARWKFiv6q4H94",
		"ChIJEUkde9zyGGARlZHdOsklZuo",
		"ChIJ__-Pw8HyGGARrd-V0-ZN74A",
		"ChIJVTO3OOHyGGARx-48kpqxfbY",
		"ChIJMw9s_OTyGGAR3O1ppEYghu4",
	],
	// 朝霞園
	"ChIJgbwKmXfpGGARsTdBJiV-YpU": [
		"ChIJAVe-OHfpGGARcosquEYC8WM",
		"ChIJn3fhVTbpGGARfKZ2NIQEifI",
		"ChIJ0xk8rZjpGGARtMbPc6b96Mk",
		"ChIJbQC1rZvpGGARGPcghoBZEr0",
		"ChIJu0tIaYvpGGARZKYZXZigyts",
	],
	// 東川口園
	"ChIJ6XMEHgaVGGARGzFHI1-Ly_o": [
		"ChIJVd6jJrCVGGARqtw7tzgJR_Y",
		"ChIJ35TKqTaVGGARVlUdXNDSNQ8",
		"ChIJUS8UawCVGGAR6wdAGGDgte4",
		"ChIJS_4W0BCVGGAR6yhDv_EOInM",
		"ChIJIUQNIriVGGAR4BWL6J9vqM0",
	],
	// 南行徳園
	ChIJxfYClqmHGGARNxWFyGrt2Mg: [
		"ChIJOZ7l5LOHGGARNuqYXHBbMnU",
		"ChIJCeYQgnCHGGARuFrkVQ3TxK4",
		"ChIJx7ItSImHGGARwUqjWVTcMek",
		"ChIJR4c0EHGHGGARHYM-bu44Qg0",
		"ChIJKdm6K4qHGGAR-ixFnAJ-VxY",
	],
	// 柏II園
	ChIJYf0QStOdGGARaQzhDXeDgiA: [
		"ChIJOTeF3PKcGGARbYsAyY4_slM",
		"ChIJg7vMpu-cGGARiwXXv_8l7aw",
		"ChIJgazCMsedGGARnqdRGhRCmWI",
		"ChIJV1EM3F-dGGARQ1nKODT0FhI",
		"ChIJgWJOvNGdGGARZp7NQZrxqQE",
	],
	// 鳩ヶ谷園
	ChIJ02cMqmOUGGARQmncmaR1mXE: [
		"ChIJyb046sWVGGARuZvGZrbdA-s",
		"ChIJbXJD4xeVGGARRCnRyxmXU3w",
		"ChIJ94zH5WKUGGARE4KJfiQTUCM",
		"ChIJPxLE9GKUGGARb6vr2KoyRBE",
		"ChIJ00AJbn-VGGARh96-CgTuuaM",
	],
	// 武蔵中原園
	ChIJTVVcNZ71GGARS1eDY7Ubf8A: [
		"ChIJocZjQHH1GGARh6CjDynonjI",
		"ChIJ-XJDBqj1GGARXxdZgqAJtfc",
		"ChIJYd7LvJz1GGARWqwBhyYkOww",
		"ChIJyT5S2Xf1GGARiWFgLnZrun8",
		"ChIJ9cMceXf1GGARv1nL7kfGGp4",
	],
	// 目黒園
	ChIJ7akCmzyLGGARdDt5sc19MYQ: [
		"ChIJcY6bhm6LGGAR6gqZIzgf37o",
		"ChIJT8fMpjmLGGART1T_gKRECMw",
		"ChIJV1Wh2hiLGGARmzzpPhiBbcs",
		"ChIJr9DuTCOLGGARJwxiNCyeZn0",
		"ChIJ7Tp0VDuLGGARAXieEfvJKyY",
	],
	// 練馬中村橋園
	ChIJF5cU6rHtGGARE3OZgLrHKBs: [
		"ChIJwX3846_tGGAR8JE-Y_9JzBY",
		"ChIJ5-Hv2K_tGGAR6iQNvIfGO0E",
		"ChIJ-dyenbrtGGAR3AMWphJ6Xa4",
		"ChIJKyQpprbtGGARuunzAzvItd4",
		"ChIJo1l1zoHtGGARn9mIDXL4Fno",
	],
	// 和光園
	"ChIJ21XWI-DrGGARJjwrKXbBVx8": [
		"ChIJf5SEBeHrGGAR9MuG_duthhw",
		"ChIJU3TZBeHrGGARBzRNp3j717w",
		"ChIJFYWvVYTpGGARNM2o0aPycXg",
		"ChIJXTgOfN3rGGARqNErTPrTtgg",
		"ChIJVxMKjmTpGGAReYXQcACOkF0",
	],
	// 和光II園
	"ChIJUboxFebrGGAR4wU8-2A2zno": [
		"ChIJ3TNrxt_rGGAREd9w1ggXoIQ",
		"ChIJjzO2DmDpGGARlol-vkg3VtU",
		"ChIJrVoOR97rGGARzu-C1z2MFZk",
		"ChIJFYA_wODrGGAR7Q0t8HONaBg",
		"ChIJ1Q2_2l_pGGARxTjbWbb0NcI",
	],
	// 蕨園
	"ChIJm_dqt2_rGGARZOwV9-OkTxQ": [
		"ChIJVVXBADrrGGARISwcPoiq6JM",
		"ChIJW1MIesyUGGARpgKhAnBNXqM",
		"ChIJL1FGhybrGGARhpQoeZ1juNQ",
		"ChIJqQNvhSzrGGARBCIqaj-9sVs",
		"ChIJc5MifznrGGARtzrjyPg6gkw",
	],
	// 蕨II園
	ChIJlzqtUpfrGGARUsZBMphXEXA: [
		"ChIJDQELpjPrGGARY8qMny7sl1M",
		"ChIJC5Q2NTPrGGARCwldGlKtoho",
		"ChIJYQndCS_rGGARFMEvBZIvhkU",
		"ChIJI5aj08yUGGAR0Sv0JWh-QgA",
		"ChIJQbDzFjXrGGARzRr5HkUEROg",
	],
	// ふぇりーちぇほいくえん
	ChIJ80xh1ceEImARJ_hE_nHvtvM: [
		"ChIJg9FU7UOFImAR64iCRLe9yo0",
		"ChIJh9_2PsmEImARIgK0UYRwf0k",
		"ChIJBdNbsAuFImARs7KpHPBI4TA",
		"ChIJT_uxjsuEImAR43PEskn3VJE",
		"ChIJcT7ktTeFImARy-oAosDZdcM",
	],
	// 病児保育室にじのへや
	ChIJK9MxgKLrGGARUiRQk2GgMaU: [
		"ChIJDQELpjPrGGARY8qMny7sl1M",
		"ChIJC5Q2NTPrGGARCwldGlKtoho",
		"ChIJYQndCS_rGGARFMEvBZIvhkU",
		"ChIJI5aj08yUGGAR0Sv0JWh-QgA",
		"ChIJQbDzFjXrGGARzRr5HkUEROg",
	],
	// 座間II園
	"ChIJLZnrOpn_GGARulv_-cYUkSM": [
		"ChIJY1ZD_Bv1GGAR8XDkKyOT42Y",
		"ChIJOf6Vk57_GGARfg1ham8GNDw",
		"ChIJhceeB3f_GGARESBkI8dz6WE",
		"ChIJB9fZcZX_GGAR1TG0eLx1BQI",
		"ChIJfTx2ipv_GGARcmnXco2UD70",
	],
};

/** 月次口コミ獲得目標 */
export const DEFAULT_MONTHLY_GOAL = 3; // 件/月（デフォルト）

/** 園別の月次目標上書き設定（placeId → 目標件数） */
export const NURSERY_GOALS: Record<string, number> = {
	// 例: "ChIJAT_un8j6GGARRJDWMAye3XE": 5,
};

export function getMonthlyGoal(placeId: string): number {
	return NURSERY_GOALS[placeId] ?? DEFAULT_MONTHLY_GOAL;
}
