"use client";

const SAMPLE_DATA = [
	{
		nursery: "練馬中村橋園",
		area: "東京都",
		capacity: { age0: 6, age1: 10, age2: 12, age3: 15, age4: 15, age5: 15 },
		enrolled: { age0: 5, age1: 10, age2: 12, age3: 14, age4: 13, age5: 15 },
	},
	{
		nursery: "大田馬込園",
		area: "東京都",
		capacity: { age0: 6, age1: 10, age2: 12, age3: 15, age4: 15, age5: 15 },
		enrolled: { age0: 3, age1: 9, age2: 11, age3: 15, age4: 15, age5: 14 },
	},
	{
		nursery: "蕨園",
		area: "埼玉県",
		capacity: { age0: 6, age1: 12, age2: 12, age3: 18, age4: 18, age5: 18 },
		enrolled: { age0: 6, age1: 12, age2: 10, age3: 16, age4: 18, age5: 17 },
	},
];

const AGE_LABELS = ["0歳", "1歳", "2歳", "3歳", "4歳", "5歳"] as const;
const AGE_KEYS = ["age0", "age1", "age2", "age3", "age4", "age5"] as const;

function rateColor(enrolled: number, capacity: number): string {
	if (capacity === 0) return "";
	const rate = enrolled / capacity;
	if (rate >= 1) return "bg-green-100 text-green-800";
	if (rate >= 0.9) return "bg-blue-50 text-blue-800";
	if (rate >= 0.8) return "bg-amber-50 text-amber-800";
	return "bg-red-50 text-red-800 font-bold";
}

export default function OccupancyView() {
	return (
		<div className="space-y-6">
			{/* 説明 */}
			<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
				<p className="text-sm text-blue-700">
					このタブは定員充足率を年齢別・園別に可視化します。 Google
					Sheetsに「定員マスタ」シートを追加すると実データが表示されます。
					現在はサンプルデータで表示イメージをご確認いただけます。
				</p>
			</div>

			{/* サマリーゲージ */}
			<section>
				<h3 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
					<span className="w-1 h-5 bg-brand-500 rounded-full" />
					全体充足率（サンプル）
				</h3>
				<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
					{AGE_LABELS.map((label, i) => {
						const totalCap = SAMPLE_DATA.reduce(
							(s, d) => s + d.capacity[AGE_KEYS[i]],
							0,
						);
						const totalEnr = SAMPLE_DATA.reduce(
							(s, d) => s + d.enrolled[AGE_KEYS[i]],
							0,
						);
						const pct =
							totalCap > 0 ? Math.round((totalEnr / totalCap) * 100) : 0;
						return (
							<div
								key={label}
								className="bg-white border border-gray-200 rounded-lg p-3 text-center"
							>
								<div className="text-xs text-gray-500 mb-1">{label}</div>
								<div className="text-xl font-bold text-gray-900">{pct}%</div>
								<div className="text-xs text-gray-400">
									{totalEnr}/{totalCap}
								</div>
								<div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
									<div
										className={`h-full rounded-full ${pct >= 95 ? "bg-green-500" : pct >= 85 ? "bg-brand-500" : "bg-red-500"}`}
										style={{ width: `${Math.min(pct, 100)}%` }}
									/>
								</div>
							</div>
						);
					})}
				</div>
			</section>

			{/* 園別×年齢マトリックス */}
			<section>
				<h3 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
					<span className="w-1 h-5 bg-brand-500 rounded-full" />
					園別×年齢クラス（サンプル）
				</h3>
				<div className="overflow-x-auto opacity-70">
					<table className="w-full text-sm">
						<thead>
							<tr className="bg-gray-50 border-b border-gray-200">
								<th className="text-left px-3 py-2 font-semibold text-gray-600">
									園名
								</th>
								<th className="text-left px-3 py-2 font-semibold text-gray-600">
									エリア
								</th>
								{AGE_LABELS.map((label) => (
									<th
										key={label}
										className="text-center px-3 py-2 font-semibold text-gray-600"
									>
										{label}
									</th>
								))}
								<th className="text-center px-3 py-2 font-semibold text-gray-600">
									合計
								</th>
							</tr>
						</thead>
						<tbody>
							{SAMPLE_DATA.map((row) => {
								const totalCap = Object.values(row.capacity).reduce(
									(a, b) => a + b,
									0,
								);
								const totalEnr = Object.values(row.enrolled).reduce(
									(a, b) => a + b,
									0,
								);
								return (
									<tr key={row.nursery} className="border-b border-gray-100">
										<td className="px-3 py-2 font-medium text-gray-800">
											{row.nursery}
										</td>
										<td className="px-3 py-2 text-gray-500">{row.area}</td>
										{AGE_KEYS.map((key) => (
											<td
												key={key}
												className={`px-3 py-2 text-center ${rateColor(row.enrolled[key], row.capacity[key])}`}
											>
												{row.enrolled[key]}/{row.capacity[key]}
											</td>
										))}
										<td
											className={`px-3 py-2 text-center font-bold ${rateColor(totalEnr, totalCap)}`}
										>
											{Math.round((totalEnr / totalCap) * 100)}%
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
				<p className="text-xs text-gray-400 mt-2 text-center">
					※ サンプルデータ — 実データ接続後に全25園が表示されます
				</p>
			</section>

			{/* 必要データの説明 */}
			<section className="bg-gray-50 border border-gray-200 rounded-lg p-4">
				<h4 className="text-sm font-semibold text-gray-700 mb-2">
					実データ接続に必要なもの
				</h4>
				<ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
					<li>
						Google Sheetsに「定員マスタ」シートを追加（園名 / 年齢 / 定員数）
					</li>
					<li>「在園児数」シートまたは既存データから在園児の年齢別集計</li>
					<li>月次更新（年度初め + 途中入退園時に更新）</li>
				</ul>
			</section>
		</div>
	);
}
