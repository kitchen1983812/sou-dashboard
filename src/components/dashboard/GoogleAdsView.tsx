"use client";

import { useMemo, useState } from "react";
import {
	ComposedChart,
	Bar,
	Line,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	Legend,
	ResponsiveContainer,
} from "recharts";
import { Inquiry } from "@/types/inquiry";
import {
	AdKeywordRow,
	AdSearchQueryRow,
	AdMonthlySummary,
	AdLinkedInquiry,
} from "@/types/ads";
import {
	parseDate,
	getFiscalYear,
	getCurrentFY,
	STATUS,
	STATUS_COLORS,
} from "@/lib/dashboardUtils";

interface GoogleAdsViewProps {
	inquiries: Inquiry[];
	adKeywords: AdKeywordRow[];
	adSearchQueries: AdSearchQueryRow[];
}

// --- ブランドキーワード判定 ---
const BRAND_KEYWORDS = [
	"フェリーチェ",
	"felice",
	"ブレア",
	"brea",
	"コビー",
	"coby",
	"キッズ・プレップ",
	"kids prep",
	"sou",
	"skuld",
	"スクルド",
];

function isBrandKeyword(keyword: string): boolean {
	const lower = keyword.toLowerCase();
	return BRAND_KEYWORDS.some((b) => lower.includes(b.toLowerCase()));
}

// --- utm_contentからキーワードIDを抽出 ---
function extractKeywordId(utmContent: string): string | null {
	const match = utmContent.match(/kwd-(\d+)/);
	return match ? match[1] : null;
}

// --- utm_termからキーワードテキストを抽出（マッチタイプのプレフィックスを除去） ---
function extractKeywordText(utmTerm: string): string {
	if (!utmTerm) return "";
	return utmTerm.replace(/^[bpe]_/, "").trim();
}

// --- 子供の年齢を計算 ---
function computeChildAge(
	birthYear: string,
	birthMonth: string,
	postDate: string,
): string {
	if (!birthYear || !birthMonth) return "-";
	const by = parseInt(birthYear, 10);
	const bm = parseInt(birthMonth, 10);
	if (isNaN(by) || isNaN(bm)) return "-";

	const d = parseDate(postDate);
	if (!d) return "-";

	let ageY = d.getFullYear() - by;
	let ageM = d.getMonth() + 1 - bm;
	if (ageM < 0) {
		ageY--;
		ageM += 12;
	}
	if (ageY < 0) return "-";
	return `${ageY}歳${ageM}ヶ月`;
}

// --- ステータス行色（3色に集約: ポジティブ/ネガティブ/ニュートラル） ---
function getStatusRowClass(status: string): string {
	// ポジティブ（入園・待ちリスト）
	if (status === STATUS.ENROLLED || status === STATUS.WAITLISTED)
		return "bg-blue-50";
	// ネガティブ（未対応・辞退・連絡つかない）
	if (
		status === STATUS.UNANSWERED ||
		status === STATUS.DECLINED ||
		status === STATUS.CANNOT_REACH
	)
		return "bg-red-50";
	// その他は背景なし（対応中・検討中・案内済み等）
	return "";
}

// --- FY月（4月〜3月）の順序 ---
const FY_MONTHS = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3];

export default function GoogleAdsView({
	inquiries,
	adKeywords,
	adSearchQueries,
}: GoogleAdsViewProps) {
	const currentFY = getCurrentFY();
	const [selectedFY, setSelectedFY] = useState(currentFY);

	// 利用可能なFY一覧
	const availableFYs = useMemo(() => {
		const fySet = new Set<number>();
		inquiries.forEach((inq) => {
			if (inq.utmSource?.toLowerCase() === "google") {
				const d = parseDate(inq.postDate);
				if (d) fySet.add(getFiscalYear(d));
			}
		});
		return Array.from(fySet).sort((a, b) => b - a);
	}, [inquiries]);

	// Google広告経由の問い合わせ（選択FY内）
	const googleInquiries = useMemo(() => {
		return inquiries.filter((inq) => {
			if (inq.utmSource?.toLowerCase() !== "google") return false;
			const d = parseDate(inq.postDate);
			if (!d) return false;
			return getFiscalYear(d) === selectedFY;
		});
	}, [inquiries, selectedFY]);

	// 選択FYの広告キーワードデータ（費用集計用）
	const fyAdKeywords = useMemo(() => {
		const fyStart = new Date(selectedFY, 3, 1);
		const fyEnd = new Date(selectedFY + 1, 2, 31, 23, 59, 59);
		return adKeywords.filter((row) => {
			const d = parseDate(row.date);
			if (!d) return false;
			return d >= fyStart && d <= fyEnd;
		});
	}, [adKeywords, selectedFY]);

	// 検索語句マップ（キーワードID → 検索語句リスト）
	const searchQueryMap = useMemo(() => {
		const map = new Map<string, AdSearchQueryRow[]>();
		adSearchQueries.forEach((row) => {
			if (row.keywordId) {
				if (!map.has(row.keywordId)) map.set(row.keywordId, []);
				map.get(row.keywordId)!.push(row);
			}
		});
		return map;
	}, [adSearchQueries]);

	// 月次集計
	const monthlySummary = useMemo((): AdMonthlySummary[] => {
		// 広告費・CV数を月別に集計（検索キーワードシートから）
		const adSpendByMonth = new Map<string, number>();
		const cvByMonth = new Map<string, number>();
		fyAdKeywords.forEach((row) => {
			const d = parseDate(row.date);
			if (!d) return;
			const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
			adSpendByMonth.set(key, (adSpendByMonth.get(key) || 0) + row.cost);
			cvByMonth.set(key, (cvByMonth.get(key) || 0) + row.conversions);
		});

		// 問い合わせ件数を月別に集計
		const countByMonth = new Map<string, number>();
		googleInquiries.forEach((inq) => {
			const d = parseDate(inq.postDate);
			if (!d) return;
			const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
			countByMonth.set(key, (countByMonth.get(key) || 0) + 1);
		});

		return FY_MONTHS.map((m) => {
			const year = m >= 4 ? selectedFY : selectedFY + 1;
			const key = `${year}-${m}`;
			const adSpend = Math.round(adSpendByMonth.get(key) || 0);
			const conversions = Math.round(cvByMonth.get(key) || 0);
			const cpa = conversions > 0 ? Math.round(adSpend / conversions) : 0;
			const inquiryCount = countByMonth.get(key) || 0;
			const unitCost =
				inquiryCount > 0 ? Math.round(adSpend / inquiryCount) : 0;

			return {
				month: `${m}月`,
				monthNum: m,
				year,
				adSpend,
				conversions,
				cpa,
				inquiryCount,
				unitCost,
			};
		}).filter((row) => row.adSpend > 0 || row.inquiryCount > 0);
	}, [fyAdKeywords, googleInquiries, selectedFY]);

	// 合計
	const totals = useMemo(() => {
		const totalAdSpend = monthlySummary.reduce((s, r) => s + r.adSpend, 0);
		const totalCV = monthlySummary.reduce((s, r) => s + r.conversions, 0);
		const totalCount = monthlySummary.reduce((s, r) => s + r.inquiryCount, 0);
		return {
			adSpend: totalAdSpend,
			conversions: totalCV,
			cpa: totalCV > 0 ? Math.round(totalAdSpend / totalCV) : 0,
			inquiryCount: totalCount,
			unitCost: totalCount > 0 ? Math.round(totalAdSpend / totalCount) : 0,
		};
	}, [monthlySummary]);

	// 問い合わせ詳細テーブル用データ
	const linkedInquiries = useMemo((): AdLinkedInquiry[] => {
		return googleInquiries
			.sort((a, b) => {
				const da = new Date(a.postDate || "1970-01-01").getTime();
				const db = new Date(b.postDate || "1970-01-01").getTime();
				return db - da;
			})
			.map((inq, idx) => {
				const keywordId = extractKeywordId(inq.utmContent || "");
				const keywordText = extractKeywordText(inq.utmTerm || "");

				// キーワードテキスト: まずutm_termから、なければ広告キーワードデータから
				let keyword = keywordText;
				if (!keyword && keywordId) {
					const kwRow = adKeywords.find((r) => r.keywordId === keywordId);
					if (kwRow) keyword = kwRow.keyword;
				}

				// 検索語句: 検索語句シートからキーワードIDで探す
				let searchQuery = "";
				if (keywordId && searchQueryMap.has(keywordId)) {
					const rows = searchQueryMap.get(keywordId)!;
					const d = parseDate(inq.postDate);
					if (d && rows.length > 0) {
						// 問い合わせ日に最も近い日付のデータを取得
						const closest = rows.reduce((best, row) => {
							const rd = parseDate(row.date);
							const bd = parseDate(best.date);
							if (!rd || !bd) return best;
							return Math.abs(rd.getTime() - d.getTime()) <
								Math.abs(bd.getTime() - d.getTime())
								? row
								: best;
						});
						searchQuery = closest.searchQuery || "";
					}
				}

				return {
					no: idx + 1,
					postDate: inq.postDate,
					nurseryName: inq.sheetName || "-",
					keyword: keyword || "(不明)",
					searchQuery: searchQuery || "",
					isBrand: isBrandKeyword(keyword || "") || isBrandKeyword(searchQuery),
					childAge: computeChildAge(
						inq.birthYear,
						inq.birthMonth,
						inq.postDate,
					),
					status: inq.status || "未対応",
					keywordId,
				};
			});
	}, [googleInquiries, adKeywords, searchQueryMap]);

	// ページネーション
	const PAGE_SIZE = 20;
	const [detailPage, setDetailPage] = useState(0);
	const totalDetailPages = Math.ceil(linkedInquiries.length / PAGE_SIZE);
	const pageDetailData = linkedInquiries.slice(
		detailPage * PAGE_SIZE,
		(detailPage + 1) * PAGE_SIZE,
	);

	return (
		<div className="space-y-5">
			{/* FYセレクター */}
			<div className="flex items-center gap-2">
				{availableFYs.map((fy) => (
					<button
						key={fy}
						onClick={() => {
							setSelectedFY(fy);
							setDetailPage(0);
						}}
						className={`px-3 py-1.5 text-sm rounded border transition-colors ${
							selectedFY === fy
								? "bg-brand-500 text-white border-brand-500"
								: "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
						}`}
					>
						FY{String(fy).slice(2)}
					</button>
				))}
			</div>

			{/* 月次サマリーテーブル */}
			<div className="bg-white rounded-xl border border-gray-200 p-4">
				<h3 className="text-sm font-semibold text-gray-700 mb-3">
					月次広告パフォーマンス（FY{String(selectedFY).slice(2)}）
				</h3>
				<div className="overflow-x-auto">
					<table className="w-full text-sm">
						<thead>
							<tr className="border-b-2 border-gray-200">
								<th className="px-3 py-2 text-left font-semibold text-gray-600">
									月
								</th>
								<th className="px-3 py-2 text-right font-semibold text-gray-600">
									広告宣伝費
								</th>
								<th className="px-3 py-2 text-right font-semibold text-gray-600">
									CV数
								</th>
								<th className="px-3 py-2 text-right font-semibold text-gray-600">
									CPA
								</th>
								<th className="px-3 py-2 text-right font-semibold text-gray-600">
									件数
								</th>
								<th className="px-3 py-2 text-right font-semibold text-gray-600">
									単価
								</th>
							</tr>
						</thead>
						<tbody>
							{monthlySummary.map((row) => (
								<tr
									key={`${row.year}-${row.monthNum}`}
									className="border-b border-gray-100 hover:bg-gray-50"
								>
									<td className="px-3 py-1.5 text-gray-700">{row.month}</td>
									<td className="px-3 py-1.5 text-right text-gray-700">
										&yen;{row.adSpend.toLocaleString()}
									</td>
									<td className="px-3 py-1.5 text-right text-gray-700">
										{row.conversions}
									</td>
									<td className="px-3 py-1.5 text-right text-gray-700">
										{row.cpa > 0 ? `¥${row.cpa.toLocaleString()}` : "-"}
									</td>
									<td className="px-3 py-1.5 text-right text-gray-700">
										{row.inquiryCount}
									</td>
									<td className="px-3 py-1.5 text-right text-gray-700">
										{row.unitCost > 0
											? `¥${row.unitCost.toLocaleString()}`
											: "-"}
									</td>
								</tr>
							))}
						</tbody>
						<tfoot>
							<tr className="bg-brand-50 font-bold border-t-2 border-brand-300">
								<td className="px-3 py-2 text-brand-800">合計</td>
								<td className="px-3 py-2 text-right text-brand-800">
									&yen;{totals.adSpend.toLocaleString()}
								</td>
								<td className="px-3 py-2 text-right text-brand-800">
									{totals.conversions}
								</td>
								<td className="px-3 py-2 text-right text-brand-800">
									{totals.cpa > 0 ? `¥${totals.cpa.toLocaleString()}` : "-"}
								</td>
								<td className="px-3 py-2 text-right text-brand-800">
									{totals.inquiryCount}
								</td>
								<td className="px-3 py-2 text-right text-brand-800">
									{totals.unitCost > 0
										? `¥${totals.unitCost.toLocaleString()}`
										: "-"}
								</td>
							</tr>
						</tfoot>
					</table>
				</div>
			</div>

			{/* ComposedChart: 棒グラフ（件数）+ 折れ線（単価） */}
			{monthlySummary.length > 0 && (
				<div className="bg-white rounded-xl border border-gray-200 p-4">
					<h3 className="text-sm font-semibold text-gray-700 mb-3">
						件数 / 単価 推移
					</h3>
					<ResponsiveContainer width="100%" height={280}>
						<ComposedChart data={monthlySummary}>
							<CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
							<XAxis
								dataKey="month"
								tick={{ fontSize: 11 }}
								tickLine={false}
								axisLine={{ stroke: "#e5e7eb" }}
							/>
							<YAxis
								yAxisId="left"
								tick={{ fontSize: 10 }}
								tickLine={false}
								axisLine={{ stroke: "#e5e7eb" }}
								label={{
									value: "件数",
									angle: -90,
									position: "insideLeft",
									style: { fontSize: 10, fill: "#6b7280" },
								}}
							/>
							<YAxis
								yAxisId="right"
								orientation="right"
								tick={{ fontSize: 10 }}
								tickLine={false}
								axisLine={{ stroke: "#e5e7eb" }}
								tickFormatter={(v: number) => `¥${(v / 1000).toFixed(0)}k`}
								label={{
									value: "単価",
									angle: 90,
									position: "insideRight",
									style: { fontSize: 10, fill: "#6b7280" },
								}}
							/>
							<Tooltip
								contentStyle={{ fontSize: 12 }}
								formatter={(value: number, name: string) => {
									if (name === "inquiryCount") return [value, "件数"];
									if (name === "unitCost")
										return [`¥${value.toLocaleString()}`, "単価"];
									return [value, name];
								}}
							/>
							<Legend
								formatter={(value: string) =>
									value === "inquiryCount" ? "件数" : "単価"
								}
								wrapperStyle={{ fontSize: 11 }}
							/>
							<Bar
								yAxisId="left"
								dataKey="inquiryCount"
								fill="#008cc9"
								radius={[3, 3, 0, 0]}
								barSize={28}
							/>
							<Line
								yAxisId="right"
								type="monotone"
								dataKey="unitCost"
								stroke="#F59E0B"
								strokeWidth={2}
								dot={{ r: 4, fill: "#F59E0B" }}
								activeDot={{ r: 6 }}
							/>
						</ComposedChart>
					</ResponsiveContainer>
				</div>
			)}

			{/* 問い合わせ詳細テーブル */}
			<div className="bg-white rounded-xl border border-gray-200 p-4">
				<h3 className="text-sm font-semibold text-gray-700 mb-3">
					Google広告経由 問い合わせ一覧（{linkedInquiries.length}件）
				</h3>
				<div className="overflow-x-auto">
					<table className="w-full text-sm">
						<thead>
							<tr className="border-b-2 border-gray-200">
								<th className="px-2 py-2 text-left font-semibold text-gray-600 w-10">
									No.
								</th>
								<th className="px-2 py-2 text-left font-semibold text-gray-600">
									問い合わせ日時
								</th>
								<th className="px-2 py-2 text-left font-semibold text-gray-600">
									問い合わせ園
								</th>
								<th className="px-2 py-2 text-left font-semibold text-gray-600">
									キーワード
								</th>
								<th className="px-2 py-2 text-left font-semibold text-gray-600">
									検索語句
								</th>
								<th className="px-2 py-2 text-center font-semibold text-gray-600">
									ブランド
								</th>
								<th className="px-2 py-2 text-left font-semibold text-gray-600">
									お子様年齢
								</th>
								<th className="px-2 py-2 text-left font-semibold text-gray-600">
									ステータス
								</th>
							</tr>
						</thead>
						<tbody>
							{pageDetailData.map((row) => (
								<tr
									key={row.no}
									className={`border-b border-gray-100 ${getStatusRowClass(row.status)}`}
								>
									<td className="px-2 py-1.5 text-gray-400">{row.no}</td>
									<td className="px-2 py-1.5 text-gray-700 whitespace-nowrap">
										{row.postDate
											? new Date(row.postDate).toLocaleDateString("ja-JP", {
													year: "numeric",
													month: "2-digit",
													day: "2-digit",
													hour: "2-digit",
													minute: "2-digit",
												})
											: "-"}
									</td>
									<td className="px-2 py-1.5 text-gray-700">
										{row.nurseryName}
									</td>
									<td className="px-2 py-1.5 text-gray-700">{row.keyword}</td>
									<td className="px-2 py-1.5 text-gray-700">
										{row.searchQuery || "-"}
									</td>
									<td className="px-2 py-1.5 text-center">
										{row.isBrand ? (
											<span className="inline-block px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-medium">
												指名
											</span>
										) : (
											<span className="inline-block px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-[10px]">
												一般
											</span>
										)}
									</td>
									<td className="px-2 py-1.5 text-gray-700 whitespace-nowrap">
										{row.childAge}
									</td>
									<td className="px-2 py-1.5">
										<span
											className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium text-white"
											style={{
												backgroundColor: STATUS_COLORS[row.status] || "#9CA3AF",
											}}
										>
											{row.status}
										</span>
									</td>
								</tr>
							))}
							{pageDetailData.length === 0 && (
								<tr>
									<td
										colSpan={8}
										className="px-2 py-8 text-center text-gray-400"
									>
										該当データがありません
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>
				{totalDetailPages > 1 && (
					<div className="flex items-center justify-center gap-2 mt-3 text-sm text-gray-500">
						<span>
							{detailPage * PAGE_SIZE + 1}-
							{Math.min((detailPage + 1) * PAGE_SIZE, linkedInquiries.length)} /{" "}
							{linkedInquiries.length}
						</span>
						<button
							onClick={() => setDetailPage((p) => Math.max(0, p - 1))}
							disabled={detailPage === 0}
							className="px-2 py-1 border rounded disabled:opacity-30 hover:bg-gray-50"
						>
							&lt;
						</button>
						<button
							onClick={() =>
								setDetailPage((p) => Math.min(totalDetailPages - 1, p + 1))
							}
							disabled={detailPage >= totalDetailPages - 1}
							className="px-2 py-1 border rounded disabled:opacity-30 hover:bg-gray-50"
						>
							&gt;
						</button>
					</div>
				)}
			</div>
		</div>
	);
}
