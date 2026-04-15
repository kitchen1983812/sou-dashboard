"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import type { StaffNursery } from "@/app/api/staff/route";
import ScrollableTable from "@/components/ui/ScrollableTable";

interface StaffResponse {
	exportedAt: string;
	nurseries: StaffNursery[];
	summary: { total: number; seishain: number; rate: number };
}

const EMP_LABELS: Record<string, string> = {
	正社員: "正社員",
	管理監督者: "管理監督者",
	常勤パート: "常勤パート",
	非常勤パート: "非常勤パート",
	"嘱託社員 （時給）": "嘱託社員",
};

function rateColor(rate: number): string {
	if (rate >= 70) return "text-gray-900";
	if (rate >= 50) return "text-gray-700";
	return "text-red-600";
}

type SortKey = "name" | "area" | "total" | "seishain" | "rate";
type SortDir = "asc" | "desc";

export default function StaffView() {
	const [data, setData] = useState<StaffResponse | null>(null);
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
	}, []);

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
			{/* サマリーカード */}
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
				<ScrollableTable minWidth={780} maxHeight={600}>
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
