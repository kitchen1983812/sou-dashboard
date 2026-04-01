"use client";

import { useState, useMemo, ReactNode } from "react";

export interface Column<T = Record<string, unknown>> {
	key: string;
	label: string;
	sortable?: boolean;
	render?: (value: unknown, row: T) => ReactNode;
}

interface DataTableProps<T = Record<string, unknown>> {
	columns: Column<T>[];
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	data: any[];
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	onRowClick?: (row: any) => void;
	/** Max visible height in px. Auto-enables scroll + sticky header for 10+ rows. Default: 500 */
	maxHeight?: number | false;
}

export default function DataTable<T = Record<string, unknown>>({
	columns,
	data,
	onRowClick,
	maxHeight,
}: DataTableProps<T>) {
	const [sortKey, setSortKey] = useState<string | null>(null);
	const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

	const handleSort = (key: string) => {
		if (sortKey === key) {
			setSortOrder(sortOrder === "asc" ? "desc" : "asc");
		} else {
			setSortKey(key);
			setSortOrder("asc");
		}
	};

	const sortedData = useMemo(() => {
		if (!sortKey) return data;
		return [...data].sort((a, b) => {
			const aVal = a[sortKey];
			const bVal = b[sortKey];
			if (aVal == null && bVal == null) return 0;
			if (aVal == null) return 1;
			if (bVal == null) return -1;
			let comparison = 0;
			if (typeof aVal === "number" && typeof bVal === "number") {
				comparison = aVal - bVal;
			} else {
				comparison = String(aVal).localeCompare(String(bVal), "ja");
			}
			return sortOrder === "asc" ? comparison : -comparison;
		});
	}, [data, sortKey, sortOrder]);

	const effectiveMaxHeight =
		maxHeight === false
			? undefined
			: (maxHeight ?? (data.length > 10 ? 500 : undefined));

	return (
		<div
			className="overflow-x-auto"
			style={
				effectiveMaxHeight
					? { maxHeight: `${effectiveMaxHeight}px`, overflowY: "auto" }
					: undefined
			}
		>
			<table className="w-full text-sm">
				<thead className={effectiveMaxHeight ? "sticky top-0 z-10" : ""}>
					<tr className="bg-gray-50 text-gray-800">
						{columns.map((col) => (
							<th
								key={col.key}
								scope="col"
								className={`px-3 py-2 sm:px-4 sm:py-3 text-left text-xs font-semibold whitespace-nowrap tracking-wider uppercase ${
									col.sortable
										? "cursor-pointer select-none hover:text-brand-600"
										: ""
								}`}
								onClick={() => col.sortable && handleSort(col.key)}
							>
								<div className="flex items-center gap-1">
									<span>{col.label}</span>
									{col.sortable && sortKey === col.key && (
										<span className="text-xs">
											{sortOrder === "asc" ? "▲" : "▼"}
										</span>
									)}
								</div>
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{sortedData.map((row, rowIndex) => (
						<tr
							key={rowIndex}
							className={`border-b border-gray-200 transition-colors ${
								rowIndex % 2 === 1 ? "bg-gray-50" : "bg-white"
							} ${onRowClick ? "cursor-pointer hover:bg-brand-50" : "hover:bg-gray-50"}`}
							onClick={() => onRowClick?.(row)}
						>
							{columns.map((col) => (
								<td key={col.key} className="px-3 py-2 sm:px-4 sm:py-3">
									{col.render
										? col.render(row[col.key], row)
										: String(row[col.key] ?? "")}
								</td>
							))}
						</tr>
					))}
					{sortedData.length > 0 && (
						<tr>
							<td
								colSpan={columns.length}
								className="px-3 py-2 sm:px-4 text-xs text-gray-400 border-b border-gray-100"
							>
								全 {data.length} 件
							</td>
						</tr>
					)}
					{sortedData.length === 0 && (
						<tr>
							<td
								colSpan={columns.length}
								className="px-4 py-10 text-center text-gray-400"
							>
								<div className="flex flex-col items-center gap-2">
									<svg
										className="w-8 h-8 text-gray-300"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
										strokeWidth={1.5}
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776"
										/>
									</svg>
									<span className="text-sm">データがありません</span>
								</div>
							</td>
						</tr>
					)}
				</tbody>
			</table>
		</div>
	);
}
