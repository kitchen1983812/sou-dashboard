"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import type {
	GroupBrandSummary,
	GroupNursery,
} from "@/app/api/group-reviews/route";
import type { BrandCategory } from "@/config/brandConfig";
import ScrollableTable from "@/components/ui/ScrollableTable";

interface GroupReviewsData {
	exportedAt: string;
	brands: GroupBrandSummary[];
}

type CategoryFilter = "all" | BrandCategory;

export default function GroupReviewsPanel() {
	const [data, setData] = useState<GroupReviewsData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
	const [brandFilter, setBrandFilter] = useState<string>("all");
	const [nurserySortKey, setNurserySortKey] = useState<
		"count" | "rating" | "name"
	>("count");
	const [nurserySortDir, setNurserySortDir] = useState<"asc" | "desc">("desc");
	const [uploading, setUploading] = useState(false);
	const [uploadMsg, setUploadMsg] = useState<{
		type: "success" | "error";
		text: string;
	} | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		fetch(`/api/group-reviews?_=${Date.now()}`, { cache: "no-store" })
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

	const filteredBrands = useMemo(() => {
		if (!data) return [];
		if (categoryFilter === "all") return data.brands;
		return data.brands.filter((b) => b.category === categoryFilter);
	}, [data, categoryFilter]);

	// 全園一覧（フィルタ適用後）
	const allNurseries = useMemo(() => {
		const list: GroupNursery[] = [];
		for (const b of filteredBrands) {
			if (brandFilter !== "all" && b.brand !== brandFilter) continue;
			for (const n of b.nurseries) list.push(n);
		}
		const dir = nurserySortDir === "asc" ? 1 : -1;
		list.sort((a, b) => {
			if (nurserySortKey === "name") return a.name.localeCompare(b.name) * dir;
			if (nurserySortKey === "rating") {
				return ((a.rating ?? -1) - (b.rating ?? -1)) * dir;
			}
			return (a.count - b.count) * dir;
		});
		return list;
	}, [filteredBrands, brandFilter, nurserySortKey, nurserySortDir]);

	const brandOptions = useMemo(() => {
		return filteredBrands.map((b) => b.brand);
	}, [filteredBrands]);

	const handleNurserySort = (key: "count" | "rating" | "name") => {
		if (nurserySortKey === key)
			setNurserySortDir(nurserySortDir === "asc" ? "desc" : "asc");
		else {
			setNurserySortKey(key);
			setNurserySortDir(key === "name" ? "asc" : "desc");
		}
	};

	const nurserySortIcon = (key: "count" | "rating" | "name") => {
		if (nurserySortKey !== key) return "↕";
		return nurserySortDir === "asc" ? "↑" : "↓";
	};

	const totals = useMemo(() => {
		const count = filteredBrands.reduce((s, b) => s + b.nurseryCount, 0);
		const reviews = filteredBrands.reduce((s, b) => s + b.totalReviews, 0);
		const ratings: number[] = [];
		for (const b of filteredBrands) {
			for (const n of b.nurseries) {
				if (n.rating != null) ratings.push(n.rating);
			}
		}
		const avg =
			ratings.length > 0
				? ratings.reduce((s, v) => s + v, 0) / ratings.length
				: null;
		return { count, reviews, avg };
	}, [filteredBrands]);

	const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		setUploading(true);
		setUploadMsg(null);
		try {
			const formData = new FormData();
			formData.append("file", file);
			const res = await fetch("/api/group-reviews", {
				method: "POST",
				body: formData,
			});
			const json = await res.json();
			if (!res.ok) throw new Error(json.error ?? "アップロード失敗");
			setData(json.data);
			setUploadMsg({
				type: "success",
				text: `${json.rowCount}園のデータを更新しました`,
			});
		} catch (err) {
			setUploadMsg({ type: "error", text: String(err) });
		} finally {
			setUploading(false);
			if (fileInputRef.current) fileInputRef.current.value = "";
		}
	};

	if (loading) {
		return (
			<div className="bg-white shadow-sm p-6 text-center text-sm text-gray-500">
				グループ園データを取得中...
			</div>
		);
	}

	if (error) {
		return (
			<div className="bg-white shadow-sm p-5">
				<div className="flex items-center justify-between mb-3">
					<h3 className="text-base font-bold text-gray-700">
						グループ園口コミサマリー
					</h3>
					<UploadButton
						uploading={uploading}
						fileInputRef={fileInputRef}
						onChange={handleUpload}
					/>
				</div>
				<div className="text-sm text-gray-500">{error}</div>
			</div>
		);
	}

	if (!data) return null;

	return (
		<div className="bg-white shadow-sm">
			{/* ヘッダー */}
			<div className="px-3 md:px-5 pt-4 pb-3 border-b border-gray-100 space-y-3">
				<div className="flex items-start justify-between gap-3">
					<div className="min-w-0">
						<h3 className="text-base font-bold text-gray-700">
							グループ園口コミサマリー
						</h3>
						<p className="text-xs text-gray-500 mt-0.5">
							データ取得日: {data.exportedAt}（Excel受領ベース）
						</p>
					</div>
					<UploadButton
						uploading={uploading}
						fileInputRef={fileInputRef}
						onChange={handleUpload}
					/>
				</div>
				<div className="flex items-center gap-2">
					<span className="text-xs text-gray-500 whitespace-nowrap">分類:</span>
					<select
						value={categoryFilter}
						onChange={(e) =>
							setCategoryFilter(e.target.value as CategoryFilter)
						}
						className="text-sm border border-gray-300 rounded-md px-2 py-1.5 min-h-11 flex-1 sm:flex-none"
					>
						<option value="all">全て</option>
						<option value="自社">自社運営</option>
						<option value="グループ">グループ他ブランド</option>
					</select>
				</div>
			</div>
			{uploadMsg && (
				<div
					className={`mx-5 mt-3 px-3 py-2 text-sm ${uploadMsg.type === "success" ? "bg-gray-50 text-gray-700" : "bg-red-50 text-red-700"}`}
				>
					{uploadMsg.text}
				</div>
			)}

			{/* サマリーKPI */}
			<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 p-3 md:p-5">
				<div className="text-center">
					<div className="text-xs text-gray-500 mb-1">園数</div>
					<div className="text-2xl font-bold text-gray-900">
						{totals.count}園
					</div>
				</div>
				<div className="text-center">
					<div className="text-xs text-gray-500 mb-1">総クチコミ数</div>
					<div className="text-2xl font-bold text-gray-900">
						{totals.reviews}件
					</div>
				</div>
				<div className="text-center">
					<div className="text-xs text-gray-500 mb-1">平均評価</div>
					<div className="text-2xl font-bold text-gray-900">
						{totals.avg != null ? totals.avg.toFixed(2) : "-"}
					</div>
				</div>
			</div>

			{/* ブランド別テーブル */}
			<div className="border-t border-gray-100">
				<div className="px-3 md:px-5 py-3 text-sm font-semibold text-gray-700">
					ブランド別サマリー
				</div>
				<ScrollableTable minWidth={640} maxHeight={500} showScrollHint={false}>
					<table className="w-full text-sm">
						<thead className="sticky top-0 z-10 bg-gray-50 border-b-2 border-gray-200 text-gray-600">
							<tr>
								<th className="text-left px-4 py-2 whitespace-nowrap">
									カテゴリ
								</th>
								<th className="text-left px-4 py-2 whitespace-nowrap">
									ブランド
								</th>
								<th className="text-center px-4 py-2 whitespace-nowrap">
									園数
								</th>
								<th className="text-center px-4 py-2 whitespace-nowrap">
									総クチコミ
								</th>
								<th className="text-center px-4 py-2 whitespace-nowrap">
									1園平均
								</th>
								<th className="text-center px-4 py-2 whitespace-nowrap">
									平均評価
								</th>
							</tr>
						</thead>
						<tbody>
							{filteredBrands.map((b) => (
								<tr
									key={`${b.category}|${b.brand}`}
									className="border-b border-gray-100 hover:bg-gray-50"
								>
									<td className="px-4 py-2">
										<span
											className={`inline-block px-2 py-0.5 text-xs ${b.category === "自社" ? "bg-brand-50 text-brand-700" : "bg-gray-100 text-gray-600"}`}
										>
											{b.category}
										</span>
									</td>
									<td className="px-4 py-2 font-medium text-gray-800 whitespace-nowrap">
										{b.brand}
									</td>
									<td className="px-4 py-2 text-center tabular-nums text-gray-700">
										{b.nurseryCount}園
									</td>
									<td className="px-4 py-2 text-center tabular-nums text-gray-700">
										{b.totalReviews}件
									</td>
									<td className="px-4 py-2 text-center tabular-nums text-gray-500">
										{b.nurseryCount > 0
											? (b.totalReviews / b.nurseryCount).toFixed(1)
											: "-"}
										件
									</td>
									<td className="px-4 py-2 text-center tabular-nums font-semibold text-gray-800">
										{b.avgRating != null ? b.avgRating.toFixed(2) : "-"}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</ScrollableTable>
			</div>

			{/* 園別一覧 */}
			<div className="border-t border-gray-100 mt-2">
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-3 md:px-5 py-3">
					<div className="text-sm font-semibold text-gray-700 whitespace-nowrap">
						園別一覧（{allNurseries.length}園）
					</div>
					<div className="flex items-center gap-2">
						<span className="text-sm text-gray-500 whitespace-nowrap">
							ブランド:
						</span>
						<select
							value={brandFilter}
							onChange={(e) => setBrandFilter(e.target.value)}
							className="text-sm border border-gray-300 rounded-md px-2 py-1 min-h-11 flex-1 sm:flex-none"
						>
							<option value="all">全て</option>
							{brandOptions.map((b) => (
								<option key={b} value={b}>
									{b}
								</option>
							))}
						</select>
					</div>
				</div>
				<ScrollableTable minWidth={720} maxHeight={500} showScrollHint={true}>
					<table className="w-full text-sm">
						<thead className="sticky top-0 z-10 bg-gray-50 border-b-2 border-gray-200 text-gray-600">
							<tr>
								<th className="text-left px-4 py-2">カテゴリ</th>
								<th className="text-left px-4 py-2">ブランド</th>
								<th
									className="text-left px-4 py-2 cursor-pointer hover:text-brand-600"
									onClick={() => handleNurserySort("name")}
								>
									園名 {nurserySortIcon("name")}
								</th>
								<th
									className="text-center px-4 py-2 cursor-pointer hover:text-brand-600"
									onClick={() => handleNurserySort("count")}
								>
									クチコミ数 {nurserySortIcon("count")}
								</th>
								<th
									className="text-center px-4 py-2 cursor-pointer hover:text-brand-600"
									onClick={() => handleNurserySort("rating")}
								>
									評価 {nurserySortIcon("rating")}
								</th>
							</tr>
						</thead>
						<tbody>
							{allNurseries.map((n) => (
								<tr
									key={n.placeId}
									className="border-b border-gray-100 hover:bg-gray-50"
								>
									<td className="px-4 py-1.5">
										<span
											className={`inline-block px-2 py-0.5 text-xs ${n.category === "自社" ? "bg-brand-50 text-brand-700" : "bg-gray-100 text-gray-600"}`}
										>
											{n.category}
										</span>
									</td>
									<td className="px-4 py-1.5 text-gray-600 whitespace-nowrap">
										{n.brand}
									</td>
									<td className="px-4 py-1.5 text-gray-800 whitespace-nowrap">
										{n.name}
									</td>
									<td className="px-4 py-1.5 text-center tabular-nums text-gray-700">
										{n.count}件
									</td>
									<td className="px-4 py-1.5 text-center tabular-nums text-gray-800">
										{n.rating != null ? n.rating.toFixed(1) : "-"}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</ScrollableTable>
			</div>
		</div>
	);
}

function UploadButton({
	uploading,
	fileInputRef,
	onChange,
}: {
	uploading: boolean;
	fileInputRef: React.RefObject<HTMLInputElement | null>;
	onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
	return (
		<>
			<input
				ref={fileInputRef}
				type="file"
				accept=".xlsx"
				className="hidden"
				onChange={onChange}
			/>
			<button
				onClick={() => fileInputRef.current?.click()}
				disabled={uploading}
				className="flex items-center gap-1.5 text-sm px-3 py-1.5 border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
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
						Excelを更新
					</>
				)}
			</button>
		</>
	);
}
