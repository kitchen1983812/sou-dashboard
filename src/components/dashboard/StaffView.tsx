"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import type { StaffNursery, JobBreakdown } from "@/app/api/staff/route";
import type { OccupancyNursery } from "@/app/api/occupancy/route";
import { JOB_CATEGORIES, type JobCategory } from "@/config/staffConfig";
import ScrollableTable from "@/components/ui/ScrollableTable";

interface StaffResponse {
	exportedAt: string;
	nurseries: StaffNursery[];
	summary: { total: number; seishain: number; rate: number };
	jobSummary?: Record<JobCategory, JobBreakdown>;
}

const FILL_THRESHOLD = 80;
const SEISHAIN_THRESHOLD = 60;

interface RiskPoint {
	name: string;
	area: string;
	fillRate: number;
	seishainRate: number;
	quadrant: "profit" | "recruit" | "risk" | "pareto";
}

function classifyQuadrant(
	fill: number,
	seishain: number,
): RiskPoint["quadrant"] {
	const fillHigh = fill >= FILL_THRESHOLD;
	const seishainHigh = seishain >= SEISHAIN_THRESHOLD;
	if (fillHigh && seishainHigh) return "profit";
	if (fillHigh && !seishainHigh) return "recruit";
	if (!fillHigh && seishainHigh) return "risk";
	return "pareto";
}

const QUADRANT_META: Record<
	RiskPoint["quadrant"],
	{ label: string; color: string; desc: string }
> = {
	profit: {
		label: "利益最大化",
		color: "#008cc9",
		desc: "充足率高×正社員率高。安定運営エリア",
	},
	recruit: {
		label: "採用強化候補",
		color: "#4db5e3",
		desc: "充足率高×正社員率低。安定収益化のため正社員強化",
	},
	risk: {
		label: "固定費リスク",
		color: "#DC2626",
		desc: "充足率低×正社員率高。要警戒・人件費吸収検討",
	},
	pareto: {
		label: "パート活用見直し",
		color: "#9ca3af",
		desc: "充足率低×正社員率低。配置最適化候補",
	},
};

const EMP_LABELS: Record<string, string> = {
	正社員: "正社員",
	管理監督者: "管理監督者",
	常勤パート: "常勤パート",
	非常勤パート: "非常勤パート",
	"嘱託社員 （時給）": "嘱託社員",
};

function rateColor(rate: number): string {
	// 60%以上は固定費リスク = 赤字表示
	if (rate >= 60) return "text-red-600";
	return "text-gray-900";
}

type SortKey = "name" | "area" | "total" | "seishain" | "rate";
type SortDir = "asc" | "desc";

export default function StaffView() {
	const [data, setData] = useState<StaffResponse | null>(null);
	const [occupancy, setOccupancy] = useState<OccupancyNursery[] | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [sortKey, setSortKey] = useState<SortKey>("rate");
	const [sortDir, setSortDir] = useState<SortDir>("desc");
	const [areaFilter, setAreaFilter] = useState("all");
	const [uploading, setUploading] = useState(false);
	const [uploadMsg, setUploadMsg] = useState<{
		type: "success" | "error";
		text: string;
	} | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		fetch("/api/staff")
			.then((r) => r.json())
			.then((d) => {
				if (d.error) setError(d.error);
				else setData(d);
				setLoading(false);
			})
			.catch((e) => {
				setError(String(e));
				setLoading(false);
			});
		fetch("/api/occupancy")
			.then((r) => r.json())
			.then((d) => {
				if (!d.error && d.nurseries) setOccupancy(d.nurseries);
			})
			.catch(() => {});
	}, []);

	const riskPoints = useMemo<RiskPoint[]>(() => {
		if (!data || !occupancy) return [];
		const fillMap = new Map<string, number>();
		for (const o of occupancy) {
			const cap = o.capacity.reduce((a, b) => a + b, 0);
			const enr = o.enrolled.reduce((a, b) => a + b, 0);
			if (cap > 0) fillMap.set(o.nursery, (enr / cap) * 100);
		}
		const points: RiskPoint[] = [];
		for (const s of data.nurseries) {
			const fill = fillMap.get(s.name);
			if (fill === undefined) continue;
			points.push({
				name: s.name,
				area: s.area,
				fillRate: fill,
				seishainRate: s.rate,
				quadrant: classifyQuadrant(fill, s.rate),
			});
		}
		return points;
	}, [data, occupancy]);

	const quadrantCounts = useMemo(() => {
		const c = { profit: 0, recruit: 0, risk: 0, pareto: 0 };
		for (const p of riskPoints) c[p.quadrant]++;
		return c;
	}, [riskPoints]);

	const areas = useMemo(() => {
		if (!data) return [];
		return Array.from(new Set(data.nurseries.map((n) => n.area))).sort();
	}, [data]);

	const sorted = useMemo(() => {
		if (!data) return [];
		let list = data.nurseries;
		if (areaFilter !== "all") list = list.filter((n) => n.area === areaFilter);
		return [...list].sort((a, b) => {
			const dir = sortDir === "asc" ? 1 : -1;
			if (sortKey === "name") return a.name.localeCompare(b.name) * dir;
			if (sortKey === "area") return a.area.localeCompare(b.area) * dir;
			if (sortKey === "total") return (a.total - b.total) * dir;
			if (sortKey === "seishain") return (a.seishain - b.seishain) * dir;
			return (a.rate - b.rate) * dir;
		});
	}, [data, sortKey, sortDir, areaFilter]);

	const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		setUploading(true);
		setUploadMsg(null);
		try {
			const formData = new FormData();
			formData.append("file", file);
			const res = await fetch("/api/staff", { method: "POST", body: formData });
			const json = await res.json();
			if (!res.ok) throw new Error(json.error ?? "アップロード失敗");
			setData(json.data);
			const warn = json.warnings?.length
				? `（警告: ${json.warnings.join(" / ")}）`
				: "";
			setUploadMsg({ type: "success", text: `更新しました${warn}` });
		} catch (err) {
			setUploadMsg({ type: "error", text: String(err) });
		} finally {
			setUploading(false);
			if (fileInputRef.current) fileInputRef.current.value = "";
		}
	};

	const handleSort = (key: SortKey) => {
		if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
		else {
			setSortKey(key);
			setSortDir(key === "name" || key === "area" ? "asc" : "desc");
		}
	};

	const sortIcon = (key: SortKey) => {
		if (sortKey !== key) return "↕";
		return sortDir === "asc" ? "↑" : "↓";
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center py-20">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
				<span className="ml-3 text-gray-500">職員データを取得中...</span>
			</div>
		);
	}

	if (error) {
		return (
			<div className="bg-red-50 border border-red-200 p-4 text-red-700">
				エラー: {error}
			</div>
		);
	}

	if (!data) return null;

	const { summary } = data;

	// フィルター後の集計
	const filtTotal = sorted.reduce((s, n) => s + n.total, 0);
	const filtSeishain = sorted.reduce((s, n) => s + n.seishain, 0);
	const filtRate =
		filtTotal > 0 ? Math.round((filtSeishain / filtTotal) * 100 * 10) / 10 : 0;

	return (
		<div className="space-y-5">
			{/* サマリーカード（全体） */}
			<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
				<div className="bg-white shadow-sm p-4 text-center">
					<div className="text-xs text-gray-500 mb-1">全職員数</div>
					<div className="text-2xl font-bold text-gray-900">
						{summary.total}名
					</div>
				</div>
				<div className="bg-white shadow-sm p-4 text-center">
					<div className="text-xs text-gray-500 mb-1">
						正社員数（正社員＋管理監督者）
					</div>
					<div className="text-2xl font-bold text-gray-900">
						{summary.seishain}名
					</div>
				</div>
				<div className="bg-white shadow-sm p-4 text-center">
					<div className="text-xs text-gray-500 mb-1">
						正社員比率（全園平均）
					</div>
					<div className={`text-2xl font-bold ${rateColor(summary.rate)}`}>
						{summary.rate}%
					</div>
				</div>
			</div>

			{/* 職種別サマリー */}
			{data.jobSummary && (
				<div className="bg-white shadow-sm p-4">
					<h3 className="text-sm font-bold text-gray-700 mb-3">
						職種別 正社員比率（全園合計）
					</h3>
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
						{JOB_CATEGORIES.map((c) => {
							const j = data.jobSummary?.[c];
							if (!j) return null;
							return (
								<div key={c} className="border border-gray-200 p-3 rounded">
									<div className="text-xs text-gray-500 mb-1">{c}</div>
									<div className="flex items-baseline gap-3">
										<span className={`text-2xl font-bold ${rateColor(j.rate)}`}>
											{j.rate}%
										</span>
										<span className="text-xs text-gray-500">
											{j.seishain} / {j.total}名
										</span>
									</div>
									<div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
										<div
											className={`h-full rounded-full ${j.rate >= 60 ? "bg-red-500" : "bg-brand-500"}`}
											style={{ width: `${Math.min(j.rate, 100)}%` }}
										/>
									</div>
								</div>
							);
						})}
					</div>
					<div className="text-[11px] text-gray-500 mt-2">
						※ 保育士＝保育士＋保育従事者(無資格) /
						栄養士（調理師）＝栄養士＋管理栄養士＋調理(無資格)＋調理 /
						その他＝看護師・管理職・事務職
					</div>
				</div>
			)}

			{/* 人材×定員リスクマップ */}
			{riskPoints.length > 0 && (
				<div className="bg-white shadow-sm p-4">
					<div className="flex items-baseline justify-between flex-wrap gap-2 mb-3">
						<h3 className="text-sm font-bold text-gray-700">
							人材×定員リスクマップ（{riskPoints.length}園）
						</h3>
						<div className="text-xs text-gray-500">
							横軸: 充足率 / 縦軸: 正社員比率 / 閾値: 充足率
							{FILL_THRESHOLD}% & 正社員率{SEISHAIN_THRESHOLD}%
						</div>
					</div>

					{/* 散布図 */}
					<div className="flex gap-4 flex-col md:flex-row">
						<div className="flex-1">
							<div
								className="relative bg-gray-50 border border-gray-200"
								style={{ height: 360 }}
							>
								{/* 軸ラベル */}
								<div className="absolute left-0 top-0 bottom-0 w-12 flex flex-col justify-between text-[10px] text-gray-500 px-1 py-1">
									<span>100%</span>
									<span>50%</span>
									<span>0%</span>
								</div>
								<div className="absolute right-1 bottom-0 text-[10px] text-gray-500">
									充足率 →
								</div>
								<div className="absolute left-1 top-1 text-[10px] text-gray-500">
									↑ 正社員率
								</div>
								{/* 描画エリア */}
								<div
									className="absolute"
									style={{
										left: 48,
										right: 12,
										top: 12,
										bottom: 24,
									}}
								>
									{/* 4象限ガイドライン */}
									<div
										className="absolute border-l border-dashed border-gray-300"
										style={{
											left: `${FILL_THRESHOLD}%`,
											top: 0,
											bottom: 0,
										}}
									/>
									<div
										className="absolute border-t border-dashed border-gray-300"
										style={{
											top: `${100 - SEISHAIN_THRESHOLD}%`,
											left: 0,
											right: 0,
										}}
									/>
									{/* 象限ラベル背景 */}
									<div
										className="absolute text-[10px] text-red-700 font-semibold opacity-60"
										style={{ top: 4, left: 4 }}
									>
										固定費リスク
									</div>
									<div
										className="absolute text-[10px] text-brand-700 font-semibold opacity-60"
										style={{ top: 4, right: 4 }}
									>
										利益最大化
									</div>
									<div
										className="absolute text-[10px] text-gray-500 font-semibold opacity-60"
										style={{ bottom: 4, left: 4 }}
									>
										パート活用見直し
									</div>
									<div
										className="absolute text-[10px] text-brand-700 font-semibold opacity-60"
										style={{ bottom: 4, right: 4 }}
									>
										採用強化候補
									</div>
									{/* プロット */}
									{riskPoints.map((p) => {
										const x = Math.min(Math.max(p.fillRate, 0), 130); // overflow capped
										const y = Math.min(Math.max(p.seishainRate, 0), 100);
										return (
											<div
												key={p.name}
												className="absolute group"
												style={{
													left: `${(x / 130) * 100}%`,
													top: `${100 - y}%`,
													transform: "translate(-50%, -50%)",
												}}
												title={`${p.name} (${p.area})\n充足率: ${p.fillRate.toFixed(1)}%\n正社員率: ${p.seishainRate.toFixed(1)}%`}
											>
												<div
													className="w-2.5 h-2.5 rounded-full border border-white shadow-sm"
													style={{
														backgroundColor: QUADRANT_META[p.quadrant].color,
													}}
												/>
											</div>
										);
									})}
								</div>
							</div>
						</div>

						{/* 4象限サマリー */}
						<div className="md:w-72 space-y-2">
							{(Object.keys(QUADRANT_META) as RiskPoint["quadrant"][]).map(
								(q) => {
									const meta = QUADRANT_META[q];
									const count = quadrantCounts[q];
									const points = riskPoints.filter((p) => p.quadrant === q);
									return (
										<div
											key={q}
											className="border border-gray-200 p-2 rounded-sm"
											style={{ borderLeft: `3px solid ${meta.color}` }}
										>
											<div className="flex items-center justify-between">
												<span className="text-xs font-semibold text-gray-700">
													{meta.label}
												</span>
												<span
													className="text-sm font-bold"
													style={{ color: meta.color }}
												>
													{count}園
												</span>
											</div>
											<div className="text-[11px] text-gray-500 mt-0.5">
												{meta.desc}
											</div>
											{q === "risk" && points.length > 0 && (
												<div className="text-[11px] text-red-700 mt-1 truncate">
													例:{" "}
													{points
														.slice(0, 3)
														.map((p) => p.name)
														.join(", ")}
													{points.length > 3 && ` 他${points.length - 3}園`}
												</div>
											)}
										</div>
									);
								},
							)}
						</div>
					</div>
				</div>
			)}

			{/* 雇用形態内訳（全体） */}
			<div className="bg-white shadow-sm p-4">
				<h3 className="text-sm font-bold text-gray-700 mb-3">
					雇用形態内訳（全園合計）
				</h3>
				<div className="flex gap-6 flex-wrap">
					{Object.keys(EMP_LABELS).map((emp) => {
						const count = data.nurseries.reduce(
							(s, n) => s + (n.breakdown[emp] ?? 0),
							0,
						);
						return (
							<div key={emp} className="text-center">
								<div className="text-xs text-gray-500">{EMP_LABELS[emp]}</div>
								<div className="text-lg font-semibold text-gray-800">
									{count}名
								</div>
							</div>
						);
					})}
				</div>
			</div>

			{/* テーブル */}
			<div className="bg-white shadow-sm">
				<div className="flex items-center justify-between px-3 md:px-5 pt-4 pb-3 flex-wrap gap-2">
					<h3 className="text-base font-bold text-gray-700">
						園別 正社員比率（{data.exportedAt}時点）
					</h3>
					<div className="flex items-center gap-3">
						<div className="flex items-center gap-2">
							<span className="text-sm text-gray-500">エリア:</span>
							<select
								value={areaFilter}
								onChange={(e) => setAreaFilter(e.target.value)}
								className="text-sm border border-gray-300 rounded-md px-2 py-1"
							>
								<option value="all">全て</option>
								{areas.map((a) => (
									<option key={a} value={a}>
										{a}
									</option>
								))}
							</select>
						</div>
						<input
							ref={fileInputRef}
							type="file"
							accept=".csv"
							className="hidden"
							onChange={handleUpload}
						/>
						<button
							onClick={() => fileInputRef.current?.click()}
							disabled={uploading}
							className="flex items-center gap-1.5 text-sm px-3 py-1.5 border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{uploading ? (
								<>
									<span className="animate-spin inline-block w-3.5 h-3.5 border border-gray-400 border-t-gray-700 rounded-full" />
									更新中...
								</>
							) : (
								<>
									<svg
										className="w-3.5 h-3.5"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
										/>
									</svg>
									CSVを更新
								</>
							)}
						</button>
					</div>
				</div>
				{uploadMsg && (
					<div
						className={`mx-5 mb-3 px-3 py-2 text-sm ${uploadMsg.type === "success" ? "bg-gray-50 text-gray-700" : "bg-red-50 text-red-700"}`}
					>
						{uploadMsg.text}
					</div>
				)}
				<ScrollableTable minWidth={1100} maxHeight={600}>
					<table className="w-full text-sm">
						<thead>
							<tr className="bg-gray-50 border-b-2 border-gray-200 text-gray-600">
								<th
									className="text-left px-4 py-2 cursor-pointer hover:text-brand-600"
									onClick={() => handleSort("name")}
								>
									園名 {sortIcon("name")}
								</th>
								<th
									className="text-left px-4 py-2 cursor-pointer hover:text-brand-600"
									onClick={() => handleSort("area")}
								>
									エリア {sortIcon("area")}
								</th>
								<th
									className="text-center px-4 py-2 cursor-pointer hover:text-brand-600"
									onClick={() => handleSort("total")}
								>
									全職員 {sortIcon("total")}
								</th>
								<th
									className="text-center px-4 py-2 cursor-pointer hover:text-brand-600"
									onClick={() => handleSort("seishain")}
								>
									正社員 {sortIcon("seishain")}
								</th>
								{Object.keys(EMP_LABELS)
									.filter((e) => e !== "正社員" && e !== "管理監督者")
									.map((emp) => (
										<th
											key={emp}
											className="text-center px-4 py-2 text-gray-500 font-normal"
										>
											{EMP_LABELS[emp]}
										</th>
									))}
								{JOB_CATEGORIES.map((c) => (
									<th
										key={c}
										className="text-center px-4 py-2 text-gray-500 font-normal whitespace-nowrap"
									>
										{c}
									</th>
								))}
								<th
									className="text-center px-4 py-2 cursor-pointer hover:text-brand-600"
									onClick={() => handleSort("rate")}
								>
									正社員比率 {sortIcon("rate")}
								</th>
							</tr>
						</thead>
						<tbody>
							{sorted.map((row) => (
								<tr
									key={row.name}
									className="border-b border-gray-100 hover:bg-gray-50"
								>
									<td className="px-4 py-2 font-medium text-gray-800">
										{row.name}
									</td>
									<td className="px-4 py-2 text-gray-500">{row.area}</td>
									<td className="px-4 py-2 text-center tabular-nums text-gray-800">
										{row.total}名
									</td>
									<td className="px-4 py-2 text-center tabular-nums text-gray-800">
										{row.seishain}名
									</td>
									{Object.keys(EMP_LABELS)
										.filter((e) => e !== "正社員" && e !== "管理監督者")
										.map((emp) => (
											<td
												key={emp}
												className="px-4 py-2 text-center tabular-nums text-gray-500"
											>
												{row.breakdown[emp] ?? 0}名
											</td>
										))}
									{JOB_CATEGORIES.map((c) => {
										const j = row.byJob?.[c];
										if (!j || j.total === 0) {
											return (
												<td
													key={c}
													className="px-4 py-2 text-center tabular-nums text-gray-300"
												>
													-
												</td>
											);
										}
										return (
											<td
												key={c}
												className={`px-4 py-2 text-center tabular-nums whitespace-nowrap ${rateColor(j.rate)}`}
											>
												{j.rate}%
												<span className="text-[10px] text-gray-400 ml-1">
													({j.seishain}/{j.total})
												</span>
											</td>
										);
									})}
									<td
										className={`px-4 py-2 text-center tabular-nums font-semibold ${rateColor(row.rate)}`}
									>
										{/* プログレスバー付き */}
										<div className="flex items-center gap-2 justify-end">
											<div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
												<div
													className="h-full bg-brand-500 rounded-full"
													style={{ width: `${Math.min(row.rate, 100)}%` }}
												/>
											</div>
											<span className="w-12 text-right">{row.rate}%</span>
										</div>
									</td>
								</tr>
							))}
						</tbody>
						<tfoot>
							<tr className="bg-gray-50 font-bold border-t-2 border-gray-300">
								<td className="px-4 py-2 text-gray-800" colSpan={2}>
									合計（{sorted.length}園）
								</td>
								<td className="px-4 py-2 text-center tabular-nums text-gray-800">
									{filtTotal}名
								</td>
								<td className="px-4 py-2 text-center tabular-nums text-gray-800">
									{filtSeishain}名
								</td>
								{Object.keys(EMP_LABELS)
									.filter((e) => e !== "正社員" && e !== "管理監督者")
									.map((emp) => (
										<td
											key={emp}
											className="px-4 py-2 text-center tabular-nums text-gray-600"
										>
											{sorted.reduce((s, n) => s + (n.breakdown[emp] ?? 0), 0)}
											名
										</td>
									))}
								{JOB_CATEGORIES.map((c) => {
									const fTotal = sorted.reduce(
										(s, n) => s + (n.byJob?.[c]?.total ?? 0),
										0,
									);
									const fSeishain = sorted.reduce(
										(s, n) => s + (n.byJob?.[c]?.seishain ?? 0),
										0,
									);
									const fRate =
										fTotal > 0
											? Math.round((fSeishain / fTotal) * 1000) / 10
											: 0;
									return (
										<td
											key={c}
											className={`px-4 py-2 text-center tabular-nums whitespace-nowrap ${rateColor(fRate)}`}
										>
											{fTotal > 0 ? `${fRate}%` : "-"}
										</td>
									);
								})}
								<td
									className={`px-4 py-2 text-center tabular-nums font-bold ${rateColor(filtRate)}`}
								>
									{filtRate}%
								</td>
							</tr>
						</tfoot>
					</table>
				</ScrollableTable>
			</div>

			<div className="text-xs text-gray-400 text-right">
				データ取得日: {data.exportedAt}（ジョブカン）
			</div>
		</div>
	);
}
