"use client";

import { useEffect, useMemo, useState } from "react";
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
	STATUS,
	parseDate,
	getCurrentFY,
	getFYRange,
	filterByDateRange,
} from "@/lib/dashboardUtils";
import ScrollableTable from "@/components/ui/ScrollableTable";

interface PendingStatusPanelProps {
	inquiries: Inquiry[];
}

interface NurseryEmail {
	email: string;
	brand: string;
	director: string;
	individualCc: string;
	cityCode: string;
	notifyEnabled: boolean;
	patternForced: string;
}

interface NurseryEmailsSnapshot {
	generatedAt: string;
	config: {
		commonCc?: string;
		asanoBcc?: string;
		fromAddress?: string;
	};
	nurseries: Record<string, NurseryEmail>;
}

type ReminderPattern = "A" | "B" | "C";

function determinePattern(
	row: NurseryRow,
	guidedStallCount90: number,
): ReminderPattern {
	// 良好園: 決着率50%以上
	const decidedRate = row.total > 0 ? (row.decided / row.total) * 100 : 0;
	if (decidedRate >= 50) return "C";
	// 要対応: 未決着>10件 or 91日超 ≥ 5件
	if (row.pending > 10 || guidedStallCount90 >= 5) return "B";
	return "A";
}

function buildMailto(
	row: NurseryRow,
	pattern: ReminderPattern,
	email: NurseryEmail,
	config: NurseryEmailsSnapshot["config"],
): string {
	const month = new Date().getMonth() + 1;
	const directorPrefix = email.director ? `${email.director} 様` : "園長 様";
	const cc = [config.commonCc, email.individualCc].filter(Boolean).join(",");
	const bcc = config.asanoBcc ?? "";

	let subject = "";
	let body = "";

	if (pattern === "C") {
		subject = `【SOUキッズケア】${month}月 ステータス整理ご協力への御礼(${row.nursery})`;
		body = [
			directorPrefix,
			"",
			"いつもありがとうございます。",
			`${month}月のステータス整理状況のご報告と、ご相談がございます。`,
			"",
			`▼ ${row.nursery} 現在の状況`,
			`・総問い合わせ件数: ${row.total}件`,
			`・決着率: ${row.total > 0 ? ((row.decided / row.total) * 100).toFixed(1) : 0}%`,
			"・ご案内済の長期滞留: ほとんどありません",
			"",
			"▼ 御礼",
			"日々のステータス更新を丁寧に実施いただき、ありがとうございます。",
			`${row.nursery}の運用は、SOUキッズケア全体の中でもベンチマーク的な水準です。`,
			"",
			"▼ ご相談",
			"他園でステータス更新がうまく進んでいないケースがあり、",
			`${row.nursery}の運用フローを参考にさせていただきたく、20分ほどお時間を頂戴できないでしょうか。`,
			"",
			"  ・どのタイミングでステータス更新を行っているか",
			"  ・どんなルール・声かけで習慣化しているか",
			"  ・困った点・工夫している点",
			"",
			"オンラインまたは電話で構いません。ご都合のよい日時を本社事務局までお知らせください。",
			"",
			"ダッシュボード: https://sou-dashboard.vercel.app/dashboard",
			"",
			"--",
			"SOUキッズケア 本社事務局",
		].join("\n");
	} else if (pattern === "B") {
		subject = `【SOUキッズケア】${month}月 ステータス棚卸しのお願い(${row.nursery}・要対応)`;
		body = [
			directorPrefix,
			"",
			"いつも保護者様対応をありがとうございます。",
			`${month}月のステータス棚卸しに関して、ご相談がございます。`,
			"",
			`▼ ${row.nursery} 現在の状況`,
			`・未決着件数: ${row.pending}件(うち、ご案内済 ${row.guided}件)`,
			`・未対応: ${row.unanswered}件`,
			`・FY入園実績: ${row.enrolled}件`,
			"",
			"▼ ご依頼内容",
			"ご案内済のまま長期間が経過している案件が一定数あり、",
			"実際にはご入園・ご辞退で既に決着しているケースも含まれている可能性があります。",
			"",
			"以下のいずれかに該当する案件があれば、最終ステータスへの更新をお願いいたします。",
			"(保護者様への確認は不要です。園長様の認識ベースでの更新で構いません)",
			"",
			"  ・既に入園された方",
			"  ・他園に決まった/辞退された方",
			"  ・一定期間連絡がつかない方",
			"  ・受入要件と合致しなかった方",
			"",
			"▼ 集中棚卸し時間のご提案",
			"通常作業に上乗せの依頼となるため、",
			`${month}月中に60分ほどお時間をいただければ十分かと思います。`,
			"",
			"▼ 本社サポート",
			"ご不明点・ご相談は本社事務局まで。",
			"リストの一括確認方法のご案内も可能です。",
			"",
			"ダッシュボード: https://sou-dashboard.vercel.app/dashboard",
			"配置表: https://docs.google.com/spreadsheets/d/1JZBJuvlzKL0iujUcz-dtJMcJmjB47jjXyR_kiXvFH1A/edit",
			"",
			"--",
			"SOUキッズケア 本社事務局",
		].join("\n");
	} else {
		subject = `【SOUキッズケア】${month}月 ステータス棚卸しのお願い(${row.nursery})`;
		body = [
			directorPrefix,
			"",
			"いつも保護者様対応とご入園後のサポート、ありがとうございます。",
			`${month}月の問い合わせステータス棚卸しのご案内です。`,
			"",
			`▼ ${row.nursery} 現在の状況`,
			`・総問い合わせ件数: ${row.total}件`,
			`・決着済み: ${row.decided}件`,
			`・未決着(ご案内済 含む): ${row.pending}件`,
			`・うち、ご案内済: ${row.guided}件`,
			"",
			"▼ ご依頼内容",
			"「ご案内済」のままになっている方について、以下のいずれかへ更新をお願いします。",
			"保育園としての対応自体は完了されていることが多いですが、",
			"シート上のステータスのみが古くなっているケースがあります。",
			"",
			"  [入園]      … 既にご入園された方",
			"  [辞退]      … ご家庭側で辞退の意思表明があった方",
			"  [連絡つかない] … 一定期間以上、保護者様と連絡が取れていない方",
			"  [諸事情により受入不可] … 受け入れ要件と合致しなかった方",
			"  [保護者様検討中] … 検討中の連絡が直近で取れている方",
			"  [待ちリスト登録済み] … 空き待ちで継続フォロー中の方",
			"",
			"▼ 作業の目安",
			"30分程度を目安にご対応いただけますと幸いです。",
			"ご不明点があれば本社事務局までお気軽にご相談ください。",
			"",
			"ダッシュボード: https://sou-dashboard.vercel.app/dashboard",
			"配置表: https://docs.google.com/spreadsheets/d/1JZBJuvlzKL0iujUcz-dtJMcJmjB47jjXyR_kiXvFH1A/edit",
			"",
			"ステータスの整理は経営判断(入園率の見える化・採用計画)にも直結する大切な情報になります。",
			"ご協力よろしくお願いいたします。",
			"",
			"--",
			"SOUキッズケア 本社事務局",
		].join("\n");
	}

	const params = new URLSearchParams();
	params.set("subject", subject);
	params.set("body", body);
	if (cc) params.set("cc", cc);
	if (bcc) params.set("bcc", bcc);
	return `mailto:${encodeURIComponent(email.email)}?${params.toString()}`;
}

// 決着済みステータス
const DECIDED_STATUSES = new Set<string>([
	STATUS.ENROLLED,
	STATUS.DECLINED,
	STATUS.CANNOT_REACH,
	STATUS.CANNOT_ACCEPT,
	STATUS.DUPLICATE,
]);

interface NurseryRow {
	nursery: string;
	total: number;
	decided: number;
	pending: number;
	pendingRate: number;
	guided: number;
	unanswered: number;
	enrolled: number;
}

interface AgeBucket {
	label: string;
	count: number;
	nurseries: { name: string; days: number }[];
}

function computeNurseryStats(inquiries: Inquiry[]): NurseryRow[] {
	const map = new Map<string, NurseryRow>();
	for (const inq of inquiries) {
		const nursery = (inq.sheetName || inq.nursery || "(不明)").trim();
		if (!nursery) continue;
		if (!map.has(nursery)) {
			map.set(nursery, {
				nursery,
				total: 0,
				decided: 0,
				pending: 0,
				pendingRate: 0,
				guided: 0,
				unanswered: 0,
				enrolled: 0,
			});
		}
		const row = map.get(nursery)!;
		row.total++;
		const s = (inq.status || "").trim();
		if (DECIDED_STATUSES.has(s)) row.decided++;
		else row.pending++;
		if (s === STATUS.GUIDED) row.guided++;
		if (s === STATUS.UNANSWERED || !s) row.unanswered++;
		if (s === STATUS.ENROLLED) row.enrolled++;
	}
	const rows = Array.from(map.values());
	for (const r of rows) {
		r.pendingRate = r.total > 0 ? (r.pending / r.total) * 100 : 0;
	}
	return rows.sort((a, b) => b.pending - a.pending);
}

function computeGuidedAgeBuckets(inquiries: Inquiry[], now: Date): AgeBucket[] {
	const buckets: AgeBucket[] = [
		{ label: "30日以内", count: 0, nurseries: [] },
		{ label: "31〜60日", count: 0, nurseries: [] },
		{ label: "61〜90日", count: 0, nurseries: [] },
		{ label: "91日超", count: 0, nurseries: [] },
	];
	for (const inq of inquiries) {
		if (inq.status !== STATUS.GUIDED) continue;
		const d = parseDate(inq.postDate);
		if (!d) continue;
		const days = Math.floor((now.getTime() - d.getTime()) / 86400000);
		let idx = 0;
		if (days > 90) idx = 3;
		else if (days > 60) idx = 2;
		else if (days > 30) idx = 1;
		else idx = 0;
		buckets[idx].count++;
		const nursery = (inq.sheetName || inq.nursery || "(不明)").trim();
		buckets[idx].nurseries.push({ name: nursery, days });
	}
	return buckets;
}

interface MonthlyTrendPoint {
	month: string;
	total: number;
	decided: number;
	pending: number;
	pendingRate: number;
}

function computeMonthlyTrend(inquiries: Inquiry[]): MonthlyTrendPoint[] {
	const byMonth = new Map<
		string,
		{ total: number; decided: number; pending: number }
	>();
	for (const inq of inquiries) {
		const d = parseDate(inq.postDate);
		if (!d) continue;
		const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
		if (!byMonth.has(key))
			byMonth.set(key, { total: 0, decided: 0, pending: 0 });
		const e = byMonth.get(key)!;
		e.total++;
		const s = (inq.status || "").trim();
		if (DECIDED_STATUSES.has(s)) e.decided++;
		else e.pending++;
	}
	return Array.from(byMonth.entries())
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([month, v]) => ({
			month: month.slice(5) + "月",
			total: v.total,
			decided: v.decided,
			pending: v.pending,
			pendingRate: v.total > 0 ? (v.pending / v.total) * 100 : 0,
		}));
}

function MailButton({
	row,
	emailsSnap,
	guidedStall90,
}: {
	row: NurseryRow;
	emailsSnap: NurseryEmailsSnapshot | null;
	guidedStall90: number;
}) {
	if (!emailsSnap) {
		return <span className="text-xs text-gray-400">読込中</span>;
	}
	const entry = emailsSnap.nurseries[row.nursery];
	if (!entry || !entry.email) {
		return (
			<span
				className="text-xs text-gray-400"
				title="園マスタ_通知シートでメアド未登録"
			>
				未登録
			</span>
		);
	}
	const pattern =
		(entry.patternForced as ReminderPattern) ||
		determinePattern(row, guidedStall90);
	const mailtoUrl = buildMailto(row, pattern, entry, emailsSnap.config);
	const patternColor =
		pattern === "B"
			? "bg-red-50 text-red-700 border-red-200"
			: pattern === "C"
				? "bg-emerald-50 text-emerald-700 border-emerald-200"
				: "bg-gray-50 text-gray-700 border-gray-200";
	const patternLabel =
		pattern === "A" ? "通常" : pattern === "B" ? "要対応" : "良好園";
	return (
		<a
			href={mailtoUrl}
			className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-xs ${patternColor} hover:opacity-80 transition-opacity`}
			title={`${entry.email} / パターン${pattern} (${patternLabel}) のメール下書きを開く`}
		>
			<span className="font-semibold">{pattern}</span>
			<span>{patternLabel}</span>
		</a>
	);
}

export default function PendingStatusPanel({
	inquiries,
}: PendingStatusPanelProps) {
	const [fyMode, setFyMode] = useState<"current" | "prev" | "all">("prev");
	const [showAllNurseries, setShowAllNurseries] = useState(false);
	const [emailsSnap, setEmailsSnap] = useState<NurseryEmailsSnapshot | null>(
		null,
	);

	useEffect(() => {
		fetch("/snapshots/nursery-emails.json", { cache: "no-store" })
			.then((r) => (r.ok ? r.json() : null))
			.then((d: NurseryEmailsSnapshot | null) => setEmailsSnap(d))
			.catch(() => setEmailsSnap(null));
	}, []);

	const targetInquiries = useMemo(() => {
		if (fyMode === "all") return inquiries;
		const fy = fyMode === "current" ? getCurrentFY() : getCurrentFY() - 1;
		const { start, end } = getFYRange(fy);
		return filterByDateRange(inquiries, start, end);
	}, [inquiries, fyMode]);

	// 91日超の「ご案内済滞留」を園別にカウント (パターンB判定用)
	const guidedStall90ByNursery = useMemo(() => {
		const now = new Date();
		const counts = new Map<string, number>();
		for (const inq of targetInquiries) {
			if (inq.status !== STATUS.GUIDED) continue;
			const d = parseDate(inq.postDate);
			if (!d) continue;
			const days = Math.floor((now.getTime() - d.getTime()) / 86400000);
			if (days <= 90) continue;
			const nursery = (inq.sheetName || inq.nursery || "(不明)").trim();
			counts.set(nursery, (counts.get(nursery) ?? 0) + 1);
		}
		return counts;
	}, [targetInquiries]);

	const nurseryStats = useMemo(
		() => computeNurseryStats(targetInquiries),
		[targetInquiries],
	);

	const guidedBuckets = useMemo(
		() => computeGuidedAgeBuckets(targetInquiries, new Date()),
		[targetInquiries],
	);

	const monthlyTrend = useMemo(
		() => computeMonthlyTrend(targetInquiries),
		[targetInquiries],
	);

	// 全体集計
	const totals = useMemo(() => {
		const total = nurseryStats.reduce((s, r) => s + r.total, 0);
		const decided = nurseryStats.reduce((s, r) => s + r.decided, 0);
		const pending = nurseryStats.reduce((s, r) => s + r.pending, 0);
		const guided = nurseryStats.reduce((s, r) => s + r.guided, 0);
		return { total, decided, pending, guided };
	}, [nurseryStats]);

	// 表示する園（デフォルトTop15、全表示モードで全件）
	const displayRows = showAllNurseries
		? nurseryStats
		: nurseryStats.slice(0, 15);

	// 「更新できている園」: 決着率50%以上 ∩ 総数3件以上
	const wellManagedRows = nurseryStats
		.filter((r) => r.total >= 3 && r.pendingRate < 50)
		.sort((a, b) => a.pendingRate - b.pendingRate);

	const fyLabel =
		fyMode === "current"
			? `FY${String(getCurrentFY()).slice(2)}`
			: fyMode === "prev"
				? `FY${String(getCurrentFY() - 1).slice(2)}`
				: "全期間";

	return (
		<section>
			<div className="flex items-center justify-between mb-3 flex-wrap gap-2">
				<h3 className="text-base font-bold text-gray-800">
					ご案内済滞留・未決着管理（{fyLabel}）
				</h3>
				<div className="flex items-center gap-2 text-sm">
					<span className="text-gray-500">期間:</span>
					<select
						value={fyMode}
						onChange={(e) =>
							setFyMode(e.target.value as "current" | "prev" | "all")
						}
						className="border border-gray-300 rounded px-2 py-1"
					>
						<option value="current">
							FY{String(getCurrentFY()).slice(2)}（当年度）
						</option>
						<option value="prev">
							FY{String(getCurrentFY() - 1).slice(2)}（前年度）
						</option>
						<option value="all">全期間</option>
					</select>
				</div>
			</div>

			{/* サマリー */}
			<div className="grid grid-cols-2 sm:grid-cols-4 gap-2 md:gap-3 mb-4">
				<div className="bg-white shadow-sm p-3 text-center">
					<div className="text-xs text-gray-500 mb-1">総問い合わせ</div>
					<div className="text-2xl font-bold text-gray-900">
						{totals.total}件
					</div>
				</div>
				<div className="bg-white shadow-sm p-3 text-center">
					<div className="text-xs text-gray-500 mb-1">決着済み</div>
					<div className="text-2xl font-bold text-brand-600">
						{totals.decided}件
					</div>
					<div className="text-xs text-gray-400 mt-1">
						{totals.total > 0
							? `${((totals.decided / totals.total) * 100).toFixed(1)}%`
							: "-"}
					</div>
				</div>
				<div className="bg-white shadow-sm p-3 text-center">
					<div className="text-xs text-gray-500 mb-1">未決着</div>
					<div className="text-2xl font-bold text-red-600">
						{totals.pending}件
					</div>
					<div className="text-xs text-gray-400 mt-1">
						{totals.total > 0
							? `${((totals.pending / totals.total) * 100).toFixed(1)}%`
							: "-"}
					</div>
				</div>
				<div className="bg-white shadow-sm p-3 text-center">
					<div className="text-xs text-gray-500 mb-1">うちご案内済滞留</div>
					<div className="text-2xl font-bold text-amber-600">
						{totals.guided}件
					</div>
					<div className="text-xs text-gray-400 mt-1">
						{totals.pending > 0
							? `未決着の${((totals.guided / totals.pending) * 100).toFixed(0)}%`
							: "-"}
					</div>
				</div>
			</div>

			{/* ご案内済滞留期間別 */}
			<div className="bg-white shadow-sm p-4 mb-4">
				<h4 className="text-sm font-bold text-gray-700 mb-3">
					ご案内済 滞留期間別分布
				</h4>
				<div className="grid grid-cols-2 sm:grid-cols-4 gap-2 md:gap-3">
					{guidedBuckets.map((b, i) => {
						const color =
							i === 0
								? "text-gray-700"
								: i === 1
									? "text-amber-600"
									: i === 2
										? "text-orange-600"
										: "text-red-600";
						return (
							<div key={b.label} className="border border-gray-200 p-3 rounded">
								<div className="text-xs text-gray-500 mb-1">{b.label}</div>
								<div className={`text-xl font-bold ${color}`}>{b.count}件</div>
								{b.count > 0 && (
									<div className="text-[11px] text-gray-400 mt-1">
										{Math.round((b.count / Math.max(totals.guided, 1)) * 100)}%
									</div>
								)}
							</div>
						);
					})}
				</div>
				<div className="text-[11px] text-gray-500 mt-2">
					※
					post_date（問合せ日）から経過日数で算出。31日超は確定ステータスへの更新推奨
				</div>
			</div>

			{/* 月次推移 */}
			{monthlyTrend.length >= 2 && (
				<div className="bg-white shadow-sm p-4 mb-4">
					<h4 className="text-sm font-bold text-gray-700 mb-3">
						月次推移（決着 vs 未決着 + 未決着率）
					</h4>
					<ResponsiveContainer width="100%" height={260}>
						<ComposedChart data={monthlyTrend}>
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
								domain={[0, 100]}
								tickFormatter={(v: number) => `${v}%`}
								label={{
									value: "未決着率",
									angle: 90,
									position: "insideRight",
									style: { fontSize: 10, fill: "#6b7280" },
								}}
							/>
							<Tooltip
								contentStyle={{ fontSize: 12 }}
								formatter={(value: number, name: string) => {
									if (name === "decided") return [value, "決着"];
									if (name === "pending") return [value, "未決着"];
									if (name === "pendingRate")
										return [`${value.toFixed(1)}%`, "未決着率"];
									return [value, name];
								}}
							/>
							<Legend wrapperStyle={{ fontSize: 11 }} />
							<Bar
								yAxisId="left"
								dataKey="decided"
								name="決着"
								fill="#008cc9"
								stackId="a"
							/>
							<Bar
								yAxisId="left"
								dataKey="pending"
								name="未決着"
								fill="#fbbf24"
								stackId="a"
							/>
							<Line
								yAxisId="right"
								type="monotone"
								dataKey="pendingRate"
								name="未決着率"
								stroke="#DC2626"
								strokeWidth={2}
								dot={{ r: 3 }}
							/>
						</ComposedChart>
					</ResponsiveContainer>
					<div className="text-[11px] text-gray-500 mt-2">
						※
						棒グラフ=月別件数の決着/未決着スタック、折れ線=未決着率。直近月は分母が小さいため未決着率は高めに出やすい
					</div>
				</div>
			)}

			{/* 園別未決着率ランキング */}
			<div className="bg-white shadow-sm p-4 mb-4">
				<div className="flex items-baseline justify-between flex-wrap gap-2 mb-3">
					<h4 className="text-sm font-bold text-gray-700">
						園別 未決着件数ランキング（未決着件数 降順 / Top15）
					</h4>
					<button
						onClick={() => setShowAllNurseries(!showAllNurseries)}
						className="text-xs text-brand-600 hover:underline"
					>
						{showAllNurseries
							? "Top15のみ表示"
							: `全${nurseryStats.length}園表示`}
					</button>
				</div>
				<ScrollableTable minWidth={720} maxHeight={500}>
					<table className="w-full text-sm">
						<thead>
							<tr className="bg-gray-50 border-b-2 border-gray-200 text-gray-600">
								<th className="text-left px-3 py-2">園名</th>
								<th className="text-center px-3 py-2">総数</th>
								<th className="text-center px-3 py-2">決着</th>
								<th className="text-center px-3 py-2">未決着</th>
								<th className="text-center px-3 py-2">未決着率</th>
								<th className="text-center px-3 py-2">うちご案内済</th>
								<th className="text-center px-3 py-2">未対応</th>
								<th className="text-center px-3 py-2">入園</th>
								<th className="text-center px-3 py-2">メール送信</th>
							</tr>
						</thead>
						<tbody>
							{displayRows.map((row) => {
								const rateColor =
									row.pendingRate >= 90
										? "text-red-600 font-bold"
										: row.pendingRate >= 80
											? "text-orange-600 font-semibold"
											: row.pendingRate >= 60
												? "text-amber-600"
												: "text-gray-700";
								return (
									<tr
										key={row.nursery}
										className="border-b border-gray-100 hover:bg-gray-50"
									>
										<td className="px-3 py-2 font-medium text-gray-800">
											{row.nursery}
										</td>
										<td className="px-3 py-2 text-center tabular-nums">
											{row.total}
										</td>
										<td className="px-3 py-2 text-center tabular-nums text-brand-600">
											{row.decided}
										</td>
										<td className="px-3 py-2 text-center tabular-nums text-red-600 font-medium">
											{row.pending}
										</td>
										<td
											className={`px-3 py-2 text-center tabular-nums ${rateColor}`}
										>
											{row.pendingRate.toFixed(1)}%
										</td>
										<td className="px-3 py-2 text-center tabular-nums text-amber-600">
											{row.guided}
										</td>
										<td className="px-3 py-2 text-center tabular-nums text-gray-500">
											{row.unanswered || "-"}
										</td>
										<td className="px-3 py-2 text-center tabular-nums text-brand-700">
											{row.enrolled || "-"}
										</td>
										<td className="px-3 py-2 text-center">
											<MailButton
												row={row}
												emailsSnap={emailsSnap}
												guidedStall90={
													guidedStall90ByNursery.get(row.nursery) ?? 0
												}
											/>
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</ScrollableTable>
				<div className="text-[11px] text-gray-500 mt-2">
					※ 未決着率 = （未対応 + 対応中 + 検討中 + 待ちリスト + ご案内済 +
					空）÷ 総数。閾値: 90%超=赤 / 80-90%=橙 / 60-80%=黄
				</div>
			</div>

			{/* 更新できている園（ベンチマーク） */}
			{wellManagedRows.length > 0 && (
				<div className="bg-white shadow-sm p-4">
					<h4 className="text-sm font-bold text-gray-700 mb-3">
						決着率50%以上 達成園（運用ベンチマーク）
					</h4>
					<table className="w-full text-sm">
						<thead>
							<tr className="bg-gray-50 border-b border-gray-200 text-gray-600">
								<th className="text-left px-3 py-2">園名</th>
								<th className="text-center px-3 py-2">総数</th>
								<th className="text-center px-3 py-2">決着</th>
								<th className="text-center px-3 py-2">未決着率</th>
							</tr>
						</thead>
						<tbody>
							{wellManagedRows.map((row) => (
								<tr
									key={row.nursery}
									className="border-b border-gray-100 hover:bg-gray-50"
								>
									<td className="px-3 py-2 font-medium text-gray-800">
										{row.nursery}
									</td>
									<td className="px-3 py-2 text-center tabular-nums">
										{row.total}
									</td>
									<td className="px-3 py-2 text-center tabular-nums text-brand-600 font-medium">
										{row.decided}
									</td>
									<td className="px-3 py-2 text-center tabular-nums text-brand-700 font-semibold">
										{row.pendingRate.toFixed(1)}%
									</td>
								</tr>
							))}
						</tbody>
					</table>
					<div className="text-[11px] text-gray-500 mt-2">
						※ 総数3件以上 ∩
						未決着率50%未満。この園の運用フローを他園展開する候補
					</div>
				</div>
			)}
		</section>
	);
}
