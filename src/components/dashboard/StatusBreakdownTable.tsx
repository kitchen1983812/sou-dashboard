"use client";

import { StatusAreaCrosstab } from "@/types/inquiry";

interface StatusBreakdownTableProps {
	data: StatusAreaCrosstab[];
}

const COLUMNS: { key: keyof StatusAreaCrosstab; label: string }[] = [
	{ key: "area", label: "エリア" },
	{ key: "連絡つかない", label: "連絡つ..." },
	{ key: "辞退", label: "辞退" },
	{ key: "未対応", label: "未対応" },
	{ key: "諸事情", label: "諸事情..." },
	{ key: "待ちリスト", label: "待ちリ..." },
	{ key: "対応中", label: "対応中" },
	{ key: "入園", label: "入園" },
	{ key: "total", label: "総計" },
];

function getCellColor(value: number, max: number): string {
	if (value === 0 || max === 0) return "";
	const ratio = value / max;
	if (ratio > 0.5) return "bg-blue-500 text-white";
	if (ratio > 0.3) return "bg-blue-400 text-white";
	if (ratio > 0.15) return "bg-blue-300";
	if (ratio > 0.05) return "bg-blue-200";
	return "bg-blue-100";
}

export default function StatusBreakdownTable({
	data,
}: StatusBreakdownTableProps) {
	const maxValues = COLUMNS.reduce(
		(acc, col) => {
			if (col.key === "area") return acc;
			const max = Math.max(...data.map((d) => d[col.key] as number));
			acc[col.key] = max;
			return acc;
		},
		{} as Record<string, number>,
	);

	const totals = COLUMNS.reduce(
		(acc, col) => {
			if (col.key === "area") return acc;
			acc[col.key] = data.reduce((sum, d) => sum + (d[col.key] as number), 0);
			return acc;
		},
		{} as Record<string, number>,
	);

	return (
		<div className="bg-white rounded-xl border border-gray-200 p-4">
			<h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
				<span className="w-1 h-4 bg-red-500 rounded-full" />
				ステータス / 件数
			</h3>
			<div className="overflow-x-auto">
				<table className="w-full text-sm">
					<thead>
						<tr className="border-b-2 border-gray-200 bg-gray-50">
							{COLUMNS.map((col) => (
								<th
									key={col.key}
									className="px-2 py-1.5 text-left font-medium text-gray-500"
								>
									{col.label}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{data.map((row, idx) => (
							<tr
								key={row.area}
								className={`border-b border-gray-100 ${idx % 2 === 1 ? "bg-gray-50/50" : ""}`}
							>
								{COLUMNS.map((col) => (
									<td
										key={col.key}
										className={`px-2 py-1.5 ${
											col.key === "area"
												? "font-medium text-gray-700"
												: `text-center ${getCellColor(
														row[col.key] as number,
														maxValues[col.key] || 1,
													)}`
										}`}
									>
										{col.key === "area"
											? row.area
											: (row[col.key] as number) > 0
												? row[col.key]
												: "-"}
									</td>
								))}
							</tr>
						))}
						<tr className="border-t-2 border-gray-300 font-semibold">
							<td className="px-2 py-1.5 text-gray-700">総計</td>
							{COLUMNS.slice(1).map((col) => (
								<td key={col.key} className="px-2 py-1.5 text-center">
									{totals[col.key] || 0}
								</td>
							))}
						</tr>
					</tbody>
				</table>
			</div>
		</div>
	);
}
