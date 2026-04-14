"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import type {
	GroupBrandSummary,
	GroupNursery,
} from "@/app/api/group-reviews/route";
import type { BrandCategory } from "@/config/brandConfig";

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
	const [expandedBrand, setExpandedBrand] = useState<string | null>(null);
	const [uploading, setUploading] = useState(false);
	const [uploadMsg, setUploadMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		fetch("/api/group-reviews")
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

	const totals = useMemo(() => {
		const count = filteredBrands.reduce((s, b) => s + b.nurseryCount, 0);
		const reviews = filteredBrands.reduce((s, b) => s + b.totalReviews, 0);
		const ratings: number[] = [];
		for (const b of filteredBrands) {
			for (const n of b.nurseries) {
				if (n.rating != null) ratings.push(n.rating);
			}
		}
		const avg = ratings.length > 0 ? ratings.reduce((s, v) => s + v, 0) / ratings.length : null;
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
			const res = await fetch("/api/group-reviews", { method: "POST", body: formData });
			const json = await res.json();
			if (!res.ok) throw new Error(json.error ?? "アップロード失敗");
			setData(json.data);
			setUploadMsg({ type: "success", text: `${json.rowCount}園のデータを更新しました` });
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
					<h3 className="text-base font-bold text-gray-700">グループ園口コミサマリー</h3>
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
			<div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-100">
				<div>
					<h3 className="text-base font-bold text-gray-700">グループ園口コミサマリー</h3>
					<p className="text-xs text-gray-500 mt-0.5">
						データ取得日: {data.exportedAt}（Excel受領ベース）
					</p>
				</div>
				<div className="flex items-center gap-3">
					<div className="flex items-center gap-2">
						<span className="text-sm text-gray-500">分類:</span>
						<select
							value={categoryFilter}
							onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}
							className="text-sm border border-gray-300 rounded-md px-2 py-1"
						>
							<option value="all">全て</option>
							<option value="自社">自社運営</option>
							<option value="グループ">グループ他ブランド</option>
						</select>
					</div>
					<UploadButton
						uploading={uploading}
						fileInputRef={fileInputRef}
						onChange={handleUpload}
					/>
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
			<div className="grid grid-cols-3 gap-4 p-5">
				<div className="text-center">
					<div className="text-xs text-gray-500 mb-1">園数</div>
					<div className="text-2xl font-bold text-gray-900">{totals.count}園</div>
				</div>
				<div className="text-center">
					<div className="text-xs text-gray-500 mb-1">総クチコミ数</div>
					<div className="text-2xl font-bold text-gray-900">{totals.reviews}件</div>
				</div>
				<div className="text-center">
					<div className="text-xs text-gray-500 mb-1">平均評価</div>
					<div className="text-2xl font-bold text-gray-900">
						{totals.avg != null ? totals.avg.toFixed(2) : "-"}
					</div>
				</div>
			</div>

			{/* ブランド別テーブル */}
			<div className="overflow-x-auto">
				<table className="w-full text-sm">
					<thead>
						<tr className="bg-gray-50 border-b-2 border-gray-200 text-gray-600">
							<th className="text-left px-4 py-2">カテゴリ</th>
							<th className="text-left px-4 py-2">ブランド</th>
							<th className="text-center px-4 py-2">園数</th>
							<th className="text-center px-4 py-2">総クチコミ</th>
							<th className="text-center px-4 py-2">1園平均</th>
							<th className="text-center px-4 py-2">平均評価</th>
							<th className="text-center px-4 py-2">詳細</th>
						</tr>
					</thead>
					<tbody>
						{filteredBrands.map((b) => (
							<BrandRow
								key={`${b.category}|${b.brand}`}
								brand={b}
								expanded={expandedBrand === `${b.category}|${b.brand}`}
								onToggle={() =>
									setExpandedBrand(
										expandedBrand === `${b.category}|${b.brand}`
											? null
											: `${b.category}|${b.brand}`,
									)
								}
							/>
						))}
					</tbody>
				</table>
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
						<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

function BrandRow({
	brand,
	expanded,
	onToggle,
}: {
	brand: GroupBrandSummary;
	expanded: boolean;
	onToggle: () => void;
}) {
	const perNursery = brand.nurseryCount > 0 ? (brand.totalReviews / brand.nurseryCount).toFixed(1) : "-";
	return (
		<>
			<tr className="border-b border-gray-100 hover:bg-gray-50">
				<td className="px-4 py-2">
					<span
						className={`inline-block px-2 py-0.5 text-xs ${brand.category === "自社" ? "bg-brand-50 text-brand-700" : "bg-gray-100 text-gray-600"}`}
					>
						{brand.category}
					</span>
				</td>
				<td className="px-4 py-2 font-medium text-gray-800">{brand.brand}</td>
				<td className="px-4 py-2 text-center tabular-nums text-gray-700">
					{brand.nurseryCount}園
				</td>
				<td className="px-4 py-2 text-center tabular-nums text-gray-700">
					{brand.totalReviews}件
				</td>
				<td className="px-4 py-2 text-center tabular-nums text-gray-500">{perNursery}件</td>
				<td className="px-4 py-2 text-center tabular-nums font-semibold text-gray-800">
					{brand.avgRating != null ? brand.avgRating.toFixed(2) : "-"}
				</td>
				<td className="px-4 py-2 text-center">
					<button
						onClick={onToggle}
						className="text-xs text-brand-600 hover:text-brand-700"
					>
						{expanded ? "閉じる" : "展開"}
					</button>
				</td>
			</tr>
			{expanded && (
				<tr>
					<td colSpan={7} className="bg-gray-50 px-5 py-3">
						<NurseryList nurseries={brand.nurseries} />
					</td>
				</tr>
			)}
		</>
	);
}

function NurseryList({ nurseries }: { nurseries: GroupNursery[] }) {
	return (
		<div className="overflow-x-auto">
			<table className="w-full text-xs">
				<thead>
					<tr className="text-gray-500 border-b border-gray-200">
						<th className="text-left px-2 py-1">園名</th>
						<th className="text-center px-2 py-1">クチコミ数</th>
						<th className="text-center px-2 py-1">評価</th>
					</tr>
				</thead>
				<tbody>
					{nurseries.map((n) => (
						<tr key={n.placeId} className="border-b border-gray-100">
							<td className="px-2 py-1 text-gray-700">{n.name}</td>
							<td className="px-2 py-1 text-center tabular-nums text-gray-700">
								{n.count}件
							</td>
							<td className="px-2 py-1 text-center tabular-nums text-gray-700">
								{n.rating != null ? n.rating.toFixed(1) : "-"}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
