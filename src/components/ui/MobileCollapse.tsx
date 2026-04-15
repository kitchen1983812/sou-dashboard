"use client";

import { ReactNode, useState } from "react";

interface MobileCollapseProps {
	/** ヘッダー表示（折りたたみ時にも見える） */
	summary: ReactNode;
	/** 折りたたみ対象コンテンツ */
	children: ReactNode;
	/** モバイル時の初期展開状態（デフォルトfalse） */
	defaultOpen?: boolean;
	/** 追加クラス */
	className?: string;
}

/**
 * モバイル時のみ折りたたみUI（デスクトップでは常時展開）
 * フィルタやセクションのモバイル専用折りたたみに使用
 */
export default function MobileCollapse({
	summary,
	children,
	defaultOpen = false,
	className = "",
}: MobileCollapseProps) {
	const [open, setOpen] = useState(defaultOpen);

	return (
		<div className={className}>
			{/* モバイル表示 */}
			<div className="md:hidden">
				<button
					onClick={() => setOpen(!open)}
					className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-200 text-sm font-semibold text-gray-700 min-h-11"
					aria-expanded={open}
				>
					<span className="flex-1 text-left">{summary}</span>
					<svg
						className={`w-4 h-4 text-gray-500 transition-transform ${open ? "rotate-180" : ""}`}
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M19 9l-7 7-7-7"
						/>
					</svg>
				</button>
				{open && <div className="mt-2">{children}</div>}
			</div>

			{/* デスクトップ表示（常時展開） */}
			<div className="hidden md:block">{children}</div>
		</div>
	);
}
