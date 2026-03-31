"use client";

import { useState, useMemo } from "react";
import { Inquiry } from "@/types/inquiry";
import DataTable, { Column } from "@/components/ui/DataTable";

interface InquiryDetailTableProps {
	data: Inquiry[];
}

const PAGE_SIZE = 10;

const COLUMNS: Column[] = [
	{ key: "no", label: "#" },
	{ key: "sheetName", label: "園名", sortable: true },
	{ key: "name", label: "氏名" },
	{ key: "status", label: "ステータス", sortable: true },
	{ key: "postDate", label: "日付", sortable: true },
];

export default function InquiryDetailTable({ data }: InquiryDetailTableProps) {
	const [page, setPage] = useState(0);

	const sorted = useMemo(
		() =>
			[...data]
				.sort((a, b) => {
					const da = new Date(a.postDate || "1970-01-01").getTime();
					const db = new Date(b.postDate || "1970-01-01").getTime();
					return db - da;
				})
				.map((inq, i) => ({
					...inq,
					no: i + 1,
					status: inq.status || "未対応",
				})),
		[data],
	);

	const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
	const pageData = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

	return (
		<div className="bg-white rounded-xl shadow-sm p-5">
			<h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
				<span className="w-1 h-4 bg-brand-500 rounded-full" />
				問い合わせ一覧
			</h3>
			<DataTable columns={COLUMNS} data={pageData} maxHeight={false} />
			<div className="flex items-center justify-between mt-3 text-sm text-gray-500 border-t border-gray-100 pt-3">
				<span className="font-medium text-gray-700">
					総計: {sorted.length}件
				</span>
				{totalPages > 1 && (
					<div className="flex items-center gap-2">
						<span>
							{page * PAGE_SIZE + 1}–
							{Math.min((page + 1) * PAGE_SIZE, sorted.length)} /{" "}
							{sorted.length}
						</span>
						<button
							onClick={() => setPage((p) => Math.max(0, p - 1))}
							disabled={page === 0}
							className="px-2 py-1 border rounded disabled:opacity-30 hover:bg-gray-50"
						>
							&lt;
						</button>
						<button
							onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
							disabled={page >= totalPages - 1}
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
