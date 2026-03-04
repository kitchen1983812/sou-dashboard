"use client";

import { useState, useMemo } from "react";
import { Inquiry } from "@/types/inquiry";

interface InquiryDetailTableProps {
  data: Inquiry[];
}

const PAGE_SIZE = 10;

export default function InquiryDetailTable({ data }: InquiryDetailTableProps) {
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    return [...data].sort((a, b) => {
      const da = new Date(a.postDate || "1970-01-01").getTime();
      const db = new Date(b.postDate || "1970-01-01").getTime();
      return db - da;
    });
  }, [data]);

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const pageData = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="px-2 py-2 text-left font-semibold text-gray-600 w-8">
                #
              </th>
              <th className="px-2 py-2 text-left font-semibold text-gray-600">
                園名
              </th>
              <th className="px-2 py-2 text-left font-semibold text-gray-600">
                氏名
              </th>
              <th className="px-2 py-2 text-left font-semibold text-gray-600">
                ステータス
              </th>
              <th className="px-2 py-2 text-right font-semibold text-gray-600">
                件数
              </th>
            </tr>
          </thead>
          <tbody>
            {pageData.map((inq, i) => (
              <tr
                key={inq.id || `${page}-${i}`}
                className="border-b border-gray-100 hover:bg-gray-50"
              >
                <td className="px-2 py-1.5 text-gray-400">
                  {page * PAGE_SIZE + i + 1}.
                </td>
                <td className="px-2 py-1.5 text-gray-700">
                  {inq.sheetName || "-"}
                </td>
                <td className="px-2 py-1.5 text-gray-700">
                  {inq.name || "-"}
                </td>
                <td className="px-2 py-1.5 text-gray-700">
                  {inq.status || "未対応"}
                </td>
                <td className="px-2 py-1.5 text-right text-gray-700">1</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-300">
              <td colSpan={4} className="px-2 py-1.5 font-semibold text-gray-700 text-center">
                総計
              </td>
              <td className="px-2 py-1.5 text-right font-semibold text-gray-700">
                {sorted.length}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-3 text-xs text-gray-500">
          <span>
            {page * PAGE_SIZE + 1}-
            {Math.min((page + 1) * PAGE_SIZE, sorted.length)} / {sorted.length}
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
  );
}
