"use client";

import { useEffect, useMemo, useState } from "react";
import {
	CartesianGrid,
	Legend,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import {
	NURSERY_CITY_MAP,
	RISK_COLOR,
	RISK_LABEL,
	computeCandidateScore,
	computeRiskScore,
	fetchMarketResearchSnapshot,
	getExistingCityCodes,
	getNurseriesByCity,
} from "@/lib/marketResearch";
import type {
	MarketResearchSnapshot,
	MarketSubTab,
} from "@/types/marketResearch";

const SUB_TABS: { id: MarketSubTab; label: string }[] = [
	{ id: "existing", label: "既存出店エリア環境" },
	{ id: "risk", label: "出生数リスクモニタ" },
	{ id: "candidates", label: "首都圏新規候補ランキング" },
];

const UTILIZATION_DEFINITION =
	"充足率 = 保育所利用人数 ÷ 保育所定員数 (認可保育所+小規模保育所のみ・各年度4/1時点)。100%超=満員以上(待機児童発生の可能性) / 90-100%=ほぼ満員 / 70%未満=供給余剰。SOU等の事業所内/企業主導型保育は分母分子に含まれない地域全体の指標。";

export default function MarketResearchView() {
	const [snapshot, setSnapshot] = useState<MarketResearchSnapshot | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [subTab, setSubTab] = useState<MarketSubTab>("existing");

	useEffect(() => {
		fetchMarketResearchSnapshot()
			.then(setSnapshot)
			.catch((e) => setError(e.message ?? "データの取得に失敗しました"));
	}, []);

	if (error) {
		return (
			<div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
				<p className="text-red-600 text-sm">エラー: {error}</p>
			</div>
		);
	}

	if (!snapshot) {
		return (
			<div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
				<p className="text-slate-500 text-sm">読み込み中...</p>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<SubTabNav subTab={subTab} onChange={setSubTab} />
			{subTab === "existing" && <ExistingAreaTab snapshot={snapshot} />}
			{subTab === "risk" && <RiskMonitorTab snapshot={snapshot} />}
			{subTab === "candidates" && <CandidatesTab snapshot={snapshot} />}
			<DataSourceNote snapshot={snapshot} />
		</div>
	);
}

function SubTabNav({
	subTab,
	onChange,
}: {
	subTab: MarketSubTab;
	onChange: (t: MarketSubTab) => void;
}) {
	return (
		<div className="flex gap-1 border-b border-slate-200 overflow-x-auto">
			{SUB_TABS.map((t) => (
				<button
					key={t.id}
					onClick={() => onChange(t.id)}
					className={`px-4 py-2 text-sm whitespace-nowrap border-b-2 transition-colors ${
						subTab === t.id
							? "border-brand-500 text-brand-700 font-semibold"
							: "border-transparent text-slate-600 hover:text-slate-900"
					}`}
				>
					{t.label}
				</button>
			))}
		</div>
	);
}

function DataSourceNote({ snapshot }: { snapshot: MarketResearchSnapshot }) {
	const generated = new Date(snapshot.meta.generatedAt);
	const yyyy = generated.getFullYear();
	const mm = String(generated.getMonth() + 1).padStart(2, "0");
	const dd = String(generated.getDate()).padStart(2, "0");
	return (
		<p className="text-xs text-slate-500 pt-2">
			データソース: {snapshot.meta.source} ({yyyy}-{mm}-{dd}更新) ・
			対象市区町村: {snapshot.meta.totalCities}件 (うち1都3県{" "}
			{snapshot.meta.metropolitanCities}件) ・ 年度範囲:{" "}
			{snapshot.meta.years[0]}-
			{snapshot.meta.years[snapshot.meta.years.length - 1]}
		</p>
	);
}

// ===== タブA: 既存出店エリア環境 =====

interface NurseryOccupancy {
	nursery: string;
	area: string;
	yearMonth: string;
	capacity: number[];
	enrolled: number[];
}

function ExistingAreaTab({ snapshot }: { snapshot: MarketResearchSnapshot }) {
	const nurseriesByCity = useMemo(() => getNurseriesByCity(), []);
	const existingCodes = useMemo(() => getExistingCityCodes(), []);
	const [selectedCode, setSelectedCode] = useState<string>(() => {
		const codes = Array.from(existingCodes).filter((c) => snapshot.cities[c]);
		return codes[0] ?? "";
	});

	// 自園充足率(SOU運営データ)を /api/occupancy から取得し市区町村別に集計
	const [occupancyByCity, setOccupancyByCity] = useState<
		Map<string, { utilization: number; nurseries: string[]; yearMonth: string }>
	>(new Map());

	useEffect(() => {
		fetch("/api/occupancy", { cache: "no-store" })
			.then((r) => (r.ok ? r.json() : null))
			.then((d: { nurseries: NurseryOccupancy[] } | null) => {
				if (!d?.nurseries) return;
				const byCity = new Map<
					string,
					{
						capacityTotal: number;
						enrolledTotal: number;
						nurseries: string[];
						yearMonth: string;
					}
				>();
				for (const n of d.nurseries) {
					const code = NURSERY_CITY_MAP[n.nursery];
					if (!code) continue;
					const capSum = (n.capacity ?? []).reduce((a, b) => a + (b ?? 0), 0);
					const enrSum = (n.enrolled ?? []).reduce((a, b) => a + (b ?? 0), 0);
					if (capSum === 0) continue;
					const entry = byCity.get(code) ?? {
						capacityTotal: 0,
						enrolledTotal: 0,
						nurseries: [],
						yearMonth: n.yearMonth ?? "",
					};
					entry.capacityTotal += capSum;
					entry.enrolledTotal += enrSum;
					entry.nurseries.push(n.nursery);
					byCity.set(code, entry);
				}
				const result = new Map<
					string,
					{ utilization: number; nurseries: string[]; yearMonth: string }
				>();
				byCity.forEach((v, code) => {
					result.set(code, {
						utilization: (v.enrolledTotal / v.capacityTotal) * 100,
						nurseries: v.nurseries,
						yearMonth: v.yearMonth,
					});
				});
				setOccupancyByCity(result);
			})
			.catch(() => {
				/* silently skip */
			});
	}, []);

	const existingCities = useMemo(() => {
		return Array.from(existingCodes)
			.map((c) => snapshot.cities[c])
			.filter(Boolean)
			.sort((a, b) =>
				`${a.prefName}${a.name}`.localeCompare(`${b.prefName}${b.name}`, "ja"),
			);
	}, [snapshot, existingCodes]);

	const selectedCity = snapshot.cities[selectedCode];

	return (
		<div className="space-y-4">
			<SummaryCards snapshot={snapshot} />

			{selectedCity && (
				<CityDetailPanel city={selectedCity} years={snapshot.meta.years} />
			)}

			<div className="bg-white rounded-xl border border-slate-200 p-4 md:p-6 shadow-sm">
				<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
					<h3 className="text-base font-bold text-slate-900">
						園×市区町村 マッピング
					</h3>
					<span className="text-xs text-slate-500">
						全{Object.keys(NURSERY_CITY_MAP).length}園マッピング適用 (うち
						{
							Object.values(NURSERY_CITY_MAP).filter((c) => snapshot.cities[c])
								.length
						}
						園が市区町村データ取得済)
					</span>
				</div>

				<div
					className="overflow-x-auto overflow-y-auto"
					style={{ maxHeight: 380 }}
				>
					<table className="min-w-full text-sm">
						<thead className="sticky top-0 bg-gray-50 z-10">
							<tr className="border-b border-slate-200">
								<th
									scope="col"
									className="px-3 py-2 text-left text-xs uppercase text-slate-500 bg-gray-50"
								>
									市区町村
								</th>
								<th
									scope="col"
									className="px-3 py-2 text-left text-xs uppercase text-slate-500 bg-gray-50"
								>
									所在園
								</th>
								<th
									scope="col"
									className="px-3 py-2 text-right text-xs uppercase text-slate-500 bg-gray-50"
								>
									直近出生数
								</th>
								<th
									scope="col"
									className="px-3 py-2 text-right text-xs uppercase text-slate-500 bg-gray-50"
								>
									2000年比
								</th>
								<th
									scope="col"
									className="px-3 py-2 text-right text-xs uppercase text-slate-500 cursor-help bg-gray-50"
									title={UTILIZATION_DEFINITION}
								>
									自治体 直近充足率<sup className="text-[10px] ml-0.5">?</sup>
								</th>
								<th
									scope="col"
									className="px-3 py-2 text-right text-xs uppercase text-slate-500 bg-gray-50"
									title="SOU自園の定員充足率(運営データ・全年齢合算)。自治体充足率と並べることで「認可枠の埋まり具合 vs 自園の入りやすさ」の仮説検証ができる"
								>
									自園 充足率<sup className="text-[10px] ml-0.5">?</sup>
								</th>
								<th
									scope="col"
									className="px-3 py-2 text-center text-xs uppercase text-slate-500 bg-gray-50"
								>
									詳細
								</th>
							</tr>
						</thead>
						<tbody>
							{existingCities.map((city) => {
								const risk = computeRiskScore(city);
								const utilSeries = city.data.utilization;
								const latestUtil = [...utilSeries]
									.reverse()
									.find((v) => v !== null && v !== undefined);
								const birthsSeries = city.data.births;
								const latestBirths = [...birthsSeries]
									.reverse()
									.find((v) => v !== null && v !== undefined);
								const nurseries = nurseriesByCity[city.code] ?? [];
								const occ = occupancyByCity.get(city.code);
								return (
									<tr
										key={city.code}
										className={`border-b border-slate-100 hover:bg-gray-50 transition-colors ${
											selectedCode === city.code ? "bg-brand-50" : ""
										}`}
									>
										<td className="px-3 py-2">
											<div className="font-medium text-slate-900">
												{city.name}
											</div>
											<div className="text-xs text-slate-500">
												{city.prefName}
											</div>
										</td>
										<td className="px-3 py-2 text-slate-700">
											{nurseries.join(" / ")}
										</td>
										<td className="px-3 py-2 text-right tabular-nums text-slate-900">
											{latestBirths != null
												? Math.round(latestBirths).toLocaleString()
												: "-"}
										</td>
										<td className="px-3 py-2 text-right tabular-nums">
											{risk.declineFrom2000 !== null ? (
												<span
													className="px-2 py-0.5 rounded-full text-xs"
													style={{
														backgroundColor: `${RISK_COLOR[risk.level]}1A`,
														color: RISK_COLOR[risk.level],
													}}
												>
													{risk.declineFrom2000 >= 0 ? "-" : "+"}
													{Math.abs(risk.declineFrom2000 * 100).toFixed(1)}%
												</span>
											) : (
												<span className="text-slate-400">-</span>
											)}
										</td>
										<td className="px-3 py-2 text-right tabular-nums text-slate-900">
											{latestUtil != null
												? `${(latestUtil * 100).toFixed(1)}%`
												: "-"}
										</td>
										<td className="px-3 py-2 text-right tabular-nums text-slate-900">
											{occ ? (
												<span
													title={`対象園: ${occ.nurseries.join(", ")} (${occ.yearMonth})`}
												>
													{occ.utilization.toFixed(1)}%
												</span>
											) : (
												<span className="text-slate-400">-</span>
											)}
										</td>
										<td className="px-3 py-2 text-center">
											<button
												onClick={() => setSelectedCode(city.code)}
												className="text-xs text-brand-700 hover:underline"
											>
												推移を見る
											</button>
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>

				<p className="mt-3 text-xs text-slate-500">
					<span className="font-medium">自治体充足率:</span>{" "}
					{UTILIZATION_DEFINITION}
					<br />
					<span className="font-medium">自園充足率:</span>{" "}
					SOU自園の定員充足率(全年齢合算・運営データ最新月)。市区町村に複数園ある場合は加重平均(在園児数合計÷定員合計)。
				</p>
			</div>
		</div>
	);
}

function SummaryCards({ snapshot }: { snapshot: MarketResearchSnapshot }) {
	const existingCodes = useMemo(() => getExistingCityCodes(), []);
	const existingCities = useMemo(
		() =>
			Array.from(existingCodes)
				.map((c) => snapshot.cities[c])
				.filter(Boolean),
		[snapshot, existingCodes],
	);

	const riskScores = existingCities.map(computeRiskScore);
	const highRisk = riskScores.filter((r) => r.level === "high").length;

	let totalBirthsLatest = 0;
	let totalBirths2000 = 0;
	let countWithBoth = 0;
	for (const c of existingCities) {
		const baseline = c.data.births[0];
		const latest = [...c.data.births].reverse().find((v) => v != null);
		if (baseline != null && latest != null) {
			totalBirths2000 += baseline;
			totalBirthsLatest += latest;
			countWithBoth++;
		}
	}
	const totalDecline =
		totalBirths2000 > 0
			? ((totalBirths2000 - totalBirthsLatest) / totalBirths2000) * 100
			: null;

	// 認可充足率の集計 (2026-06-10 MTG mikami指摘 反映)
	const latestUtilizations: number[] = [];
	let countLowUtil80 = 0; // <80% = 民間園に流れにくい
	let countLowUtil70 = 0; // <70% = 危険水域
	for (const c of existingCities) {
		const latest = [...c.data.utilization].reverse().find((v) => v != null);
		if (latest != null) {
			const pct = latest * 100;
			latestUtilizations.push(pct);
			if (pct < 80) countLowUtil80++;
			if (pct < 70) countLowUtil70++;
		}
	}
	const avgUtilization =
		latestUtilizations.length > 0
			? latestUtilizations.reduce((a, b) => a + b, 0) /
				latestUtilizations.length
			: null;

	return (
		<div className="grid grid-cols-2 md:grid-cols-5 gap-3">
			<KpiCard
				label="出店エリア数"
				value={`${existingCities.length}市区町村`}
				sub={`(${countWithBoth}件 2000-直近データ揃い)`}
			/>
			<KpiCard
				label="2000-直近 出生数減"
				value={totalDecline !== null ? `-${totalDecline.toFixed(1)}%` : "-"}
				sub={`合計 ${totalBirths2000.toLocaleString()} → ${totalBirthsLatest.toLocaleString()}人`}
				accent={totalDecline != null && totalDecline > 25 ? "warn" : "default"}
			/>
			<KpiCard
				label="地域認可充足率 平均"
				value={avgUtilization !== null ? `${avgUtilization.toFixed(1)}%` : "-"}
				sub={`${latestUtilizations.length}市区町村平均`}
				accent={
					avgUtilization != null && avgUtilization < 85 ? "warn" : "default"
				}
			/>
			<KpiCard
				label="充足率 < 80% エリア"
				value={`${countLowUtil80}件`}
				sub="認可枠余り=民間園に流れにくい"
				accent={countLowUtil80 > 0 ? "warn" : "default"}
			/>
			<KpiCard
				label="出生数 リスク高 エリア"
				value={`${highRisk}件`}
				sub="2000年比30%超減 or 直近3年急減"
				accent={highRisk > 0 ? "warn" : "default"}
			/>
		</div>
	);
}

function KpiCard({
	label,
	value,
	sub,
	accent,
}: {
	label: string;
	value: string;
	sub?: string;
	accent?: "default" | "warn";
}) {
	const valueColor = accent === "warn" ? "text-red-600" : "text-slate-900";
	return (
		<div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
			<div className="text-xs text-slate-500 mb-1">{label}</div>
			<div className={`text-xl md:text-2xl font-bold ${valueColor}`}>
				{value}
			</div>
			{sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
		</div>
	);
}

function CityDetailPanel({
	city,
	years,
}: {
	city: import("@/types/marketResearch").MarketCity;
	years: number[];
}) {
	const chartData = years.map((year, i) => ({
		year,
		出生数: city.data.births[i],
		定員: city.data.capacity[i],
		利用人数: city.data.enrollment[i],
		充足率:
			city.data.utilization[i] != null
				? Number(((city.data.utilization[i] ?? 0) * 100).toFixed(1))
				: null,
	}));

	return (
		<div className="bg-white rounded-xl border border-slate-200 p-4 md:p-6 shadow-sm">
			<h3 className="text-base font-bold text-slate-900 mb-3">
				{city.prefName}
				{city.name} 経年推移 (2000-{years[years.length - 1]})
			</h3>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
				<div>
					<h4 className="text-sm font-semibold text-slate-700 mb-2">
						出生数推移
					</h4>
					<ResponsiveContainer width="100%" height={240}>
						<LineChart
							data={chartData}
							margin={{ left: 4, right: 8, top: 4, bottom: 4 }}
						>
							<CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
							<XAxis dataKey="year" tick={{ fontSize: 11 }} />
							<YAxis tick={{ fontSize: 11 }} />
							<Tooltip
								formatter={(v) =>
									typeof v === "number" ? v.toLocaleString() : "-"
								}
							/>
							<Line
								type="monotone"
								dataKey="出生数"
								stroke="#2e7cc2"
								strokeWidth={2}
								dot={false}
							/>
						</LineChart>
					</ResponsiveContainer>
				</div>

				<div>
					<h4 className="text-sm font-semibold text-slate-700 mb-2">
						保育所定員 vs 利用人数
					</h4>
					<ResponsiveContainer width="100%" height={240}>
						<LineChart
							data={chartData}
							margin={{ left: 4, right: 8, top: 4, bottom: 4 }}
						>
							<CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
							<XAxis dataKey="year" tick={{ fontSize: 11 }} />
							<YAxis tick={{ fontSize: 11 }} />
							<Tooltip
								formatter={(v) =>
									typeof v === "number" ? v.toLocaleString() : "-"
								}
							/>
							<Legend wrapperStyle={{ fontSize: 12 }} />
							<Line
								type="monotone"
								dataKey="定員"
								stroke="#24699f"
								strokeWidth={2}
								dot={false}
							/>
							<Line
								type="monotone"
								dataKey="利用人数"
								stroke="#F59E0B"
								strokeWidth={2}
								dot={false}
							/>
						</LineChart>
					</ResponsiveContainer>
				</div>

				<div className="lg:col-span-2">
					<h4
						className="text-sm font-semibold text-slate-700 mb-2 cursor-help"
						title={UTILIZATION_DEFINITION}
					>
						充足率推移 (%)<sup className="text-[10px] ml-0.5">?</sup>
					</h4>
					<p className="text-xs text-slate-500 mb-2">
						{UTILIZATION_DEFINITION}
					</p>
					<ResponsiveContainer width="100%" height={200}>
						<LineChart
							data={chartData}
							margin={{ left: 4, right: 8, top: 4, bottom: 4 }}
						>
							<CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
							<XAxis dataKey="year" tick={{ fontSize: 11 }} />
							<YAxis tick={{ fontSize: 11 }} domain={[60, 110]} />
							<Tooltip
								formatter={(v) => (typeof v === "number" ? `${v}%` : "-")}
							/>
							<Line
								type="monotone"
								dataKey="充足率"
								stroke="#10B981"
								strokeWidth={2}
								dot={false}
							/>
						</LineChart>
					</ResponsiveContainer>
				</div>
			</div>
		</div>
	);
}

// ===== タブC: 出生数リスクモニタ =====

function RiskMonitorTab({ snapshot }: { snapshot: MarketResearchSnapshot }) {
	const existingCodes = useMemo(() => getExistingCityCodes(), []);
	const nurseriesByCity = useMemo(() => getNurseriesByCity(), []);

	const riskScores = useMemo(() => {
		const arr = Array.from(existingCodes)
			.map((c) => snapshot.cities[c])
			.filter(Boolean)
			.map(computeRiskScore);
		return arr.sort((a, b) => {
			const ad = a.declineFrom2000 ?? -Infinity;
			const bd = b.declineFrom2000 ?? -Infinity;
			return bd - ad;
		});
	}, [snapshot, existingCodes]);

	return (
		<div className="space-y-4">
			<div className="bg-white rounded-xl border border-slate-200 p-4 md:p-6 shadow-sm">
				<h3 className="text-base font-bold text-slate-900 mb-3">
					出店済エリア リスクランキング (2000年比 出生数減 順)
				</h3>
				<div className="overflow-x-auto">
					<table className="min-w-full text-sm">
						<thead>
							<tr className="bg-gray-50 border-b border-slate-200">
								<th
									scope="col"
									className="px-3 py-2 text-left text-xs uppercase text-slate-500"
								>
									#
								</th>
								<th
									scope="col"
									className="px-3 py-2 text-left text-xs uppercase text-slate-500"
								>
									市区町村
								</th>
								<th
									scope="col"
									className="px-3 py-2 text-left text-xs uppercase text-slate-500"
								>
									所在園
								</th>
								<th
									scope="col"
									className="px-3 py-2 text-right text-xs uppercase text-slate-500"
								>
									2000年比
								</th>
								<th
									scope="col"
									className="px-3 py-2 text-right text-xs uppercase text-slate-500"
								>
									直近3年急減
								</th>
								<th
									scope="col"
									className="px-3 py-2 text-center text-xs uppercase text-slate-500"
								>
									リスク
								</th>
							</tr>
						</thead>
						<tbody>
							{riskScores.map((r, i) => (
								<tr
									key={r.city.code}
									className="border-b border-slate-100 hover:bg-gray-50 transition-colors"
								>
									<td className="px-3 py-2 text-slate-500 tabular-nums">
										{i + 1}
									</td>
									<td className="px-3 py-2">
										<div className="font-medium text-slate-900">
											{r.city.name}
										</div>
										<div className="text-xs text-slate-500">
											{r.city.prefName}
										</div>
									</td>
									<td className="px-3 py-2 text-slate-700">
										{(nurseriesByCity[r.city.code] ?? []).join(" / ")}
									</td>
									<td className="px-3 py-2 text-right tabular-nums text-slate-900">
										{r.declineFrom2000 !== null
											? `${r.declineFrom2000 >= 0 ? "-" : "+"}${Math.abs(r.declineFrom2000 * 100).toFixed(1)}%`
											: "-"}
									</td>
									<td className="px-3 py-2 text-right tabular-nums text-slate-900">
										{r.recentDeclineRate !== null
											? `${r.recentDeclineRate >= 0 ? "-" : "+"}${Math.abs(r.recentDeclineRate * 100).toFixed(1)}%`
											: "-"}
									</td>
									<td className="px-3 py-2 text-center">
										<span
											className="px-2 py-0.5 rounded-full text-xs font-medium"
											style={{
												backgroundColor: `${RISK_COLOR[r.level]}1A`,
												color: RISK_COLOR[r.level],
											}}
										>
											{RISK_LABEL[r.level]}
										</span>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>

				<div className="mt-4 text-xs text-slate-500 space-y-1">
					<p>
						<span className="font-medium">リスク判定:</span>{" "}
						高=2000年比30%以上減または直近3年急減20%以上 /
						中=15-30%減または10-20%急減 / 低=それ未満
					</p>
					<p>「直近3年急減」=直近3年平均 vs その前5年平均の減少率</p>
				</div>
			</div>
		</div>
	);
}

// ===== タブB: 首都圏新規候補ランキング =====

function CandidatesTab({ snapshot }: { snapshot: MarketResearchSnapshot }) {
	const existingCodes = useMemo(() => getExistingCityCodes(), []);

	const candidates = useMemo(() => {
		const metro = Object.values(snapshot.cities).filter(
			(c) => c.isMetropolitan && !existingCodes.has(c.code),
		);
		const maxBirths = Math.max(
			...metro.flatMap((c) => {
				const latest = [...c.data.births].reverse().find((v) => v != null);
				return latest != null ? [latest] : [];
			}),
			1,
		);
		return metro
			.map((c) => computeCandidateScore(c, maxBirths))
			.sort((a, b) => b.totalScore - a.totalScore);
	}, [snapshot, existingCodes]);

	const hasData = candidates.length > 0;

	return (
		<div className="space-y-4">
			<div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-900">
				<p className="font-semibold mb-1">スコアリング対象</p>
				<p>
					1都3県の{candidates.length}
					市区町村(既存出店エリアを除く)。元データ(2000-2024年・38市区町村)と
					e-Stat補完(2014-2023年・厚労省人口動態統計)を統合。e-Stat補完分は出生数のみで保育所定員・利用人数なしのため需給ギャップスコアは中立扱い。
				</p>
			</div>

			{!hasData ? (
				<div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
					<p className="text-sm text-slate-600">
						対象データがありません。既存出店エリアと首都圏範囲の重複により、未出店エリアが見つかりませんでした。
					</p>
				</div>
			) : (
				<div className="bg-white rounded-xl border border-slate-200 p-4 md:p-6 shadow-sm">
					<h3 className="text-base font-bold text-slate-900 mb-3">
						未出店市区町村 スコアランキング (Top{" "}
						{Math.min(20, candidates.length)})
					</h3>
					<div className="overflow-x-auto">
						<table className="min-w-full text-sm">
							<thead>
								<tr className="bg-gray-50 border-b border-slate-200">
									<th
										scope="col"
										className="px-3 py-2 text-left text-xs uppercase text-slate-500"
									>
										#
									</th>
									<th
										scope="col"
										className="px-3 py-2 text-left text-xs uppercase text-slate-500"
									>
										市区町村
									</th>
									<th
										scope="col"
										className="px-3 py-2 text-right text-xs uppercase text-slate-500"
									>
										直近3年平均出生
									</th>
									<th
										scope="col"
										className="px-3 py-2 text-right text-xs uppercase text-slate-500 cursor-help"
										title={UTILIZATION_DEFINITION}
									>
										直近充足率<sup className="text-[10px] ml-0.5">?</sup>
									</th>
									<th
										scope="col"
										className="px-3 py-2 text-right text-xs uppercase text-slate-500"
									>
										5年トレンド
									</th>
									<th
										scope="col"
										className="px-3 py-2 text-right text-xs uppercase text-slate-500"
									>
										規模
									</th>
									<th
										scope="col"
										className="px-3 py-2 text-right text-xs uppercase text-slate-500"
									>
										需給ギャップ
									</th>
									<th
										scope="col"
										className="px-3 py-2 text-right text-xs uppercase text-slate-500"
									>
										トレンド
									</th>
									<th
										scope="col"
										className="px-3 py-2 text-right text-xs uppercase text-slate-500"
									>
										総合
									</th>
								</tr>
							</thead>
							<tbody>
								{candidates.slice(0, 20).map((s, i) => (
									<tr
										key={s.city.code}
										className="border-b border-slate-100 hover:bg-gray-50"
									>
										<td className="px-3 py-2 text-slate-500 tabular-nums">
											{i + 1}
										</td>
										<td className="px-3 py-2">
											<div className="font-medium text-slate-900">
												{s.city.name}
											</div>
											<div className="text-xs text-slate-500">
												{s.city.prefName}
											</div>
										</td>
										<td className="px-3 py-2 text-right tabular-nums text-slate-900">
											{s.recentAvgBirths != null
												? Math.round(s.recentAvgBirths).toLocaleString()
												: "-"}
										</td>
										<td className="px-3 py-2 text-right tabular-nums text-slate-900">
											{s.recentUtilization != null
												? `${s.recentUtilization.toFixed(1)}%`
												: "-"}
										</td>
										<td className="px-3 py-2 text-right tabular-nums text-slate-900">
											{s.birthsTrend != null
												? `${s.birthsTrend >= 0 ? "+" : ""}${s.birthsTrend.toFixed(1)}%/年`
												: "-"}
										</td>
										<td className="px-3 py-2 text-right tabular-nums text-slate-500">
											{s.sizeScore.toFixed(0)}
										</td>
										<td className="px-3 py-2 text-right tabular-nums text-slate-500">
											{s.gapScore.toFixed(0)}
										</td>
										<td className="px-3 py-2 text-right tabular-nums text-slate-500">
											{s.trendScore.toFixed(0)}
										</td>
										<td className="px-3 py-2 text-right tabular-nums font-bold text-brand-700">
											{s.totalScore.toFixed(0)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
					<div className="mt-4 text-xs text-slate-500 space-y-1">
						<p>
							<span className="font-medium">スコア計算:</span> 規模(25%) +
							需給ギャップ(55%) + トレンド(20%) = 総合
						</p>
						<p>
							需給ギャップ: 充足率100%以上=100点(満員=新規余地大) / 90%以上=80点
							/ 80%以上=60点 / 70%以上=40点 / 70%未満=20点
						</p>
						<p className="text-amber-700">
							<span className="font-medium">
								解釈の主軸 (2026-06-10 現場知見):
							</span>{" "}
							認可保育所充足率が高い=認可枠が満員=民間園(SOU)に流れやすい。出生数より自治体の認可定員政策の影響が大きいため需給ギャップを主指標として重み付け。
						</p>
						<p>
							<span className="font-medium">充足率:</span>{" "}
							{UTILIZATION_DEFINITION}
						</p>
					</div>
				</div>
			)}
		</div>
	);
}
