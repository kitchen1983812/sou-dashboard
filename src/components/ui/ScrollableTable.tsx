import { ReactNode } from "react";

interface ScrollableTableProps {
	children: ReactNode;
	/** モバイルで横スクロールさせる最小幅 */
	minWidth?: number;
	/** 最大高さ（縦スクロール） */
	maxHeight?: number;
	/** 横スクロールヒントの表示（モバイルのみ） */
	showScrollHint?: boolean;
	className?: string;
}

/**
 * モバイルでの横スクロール + sticky header 対応テーブルラッパー
 * - `overflow-auto`（x/y両軸スクロール）
 * - max-h 指定で thead sticky 動作
 * - モバイル時のみスクロールヒント表示
 */
export default function ScrollableTable({
	children,
	minWidth = 600,
	maxHeight = 600,
	showScrollHint = true,
	className = "",
}: ScrollableTableProps) {
	return (
		<div className={className}>
			{showScrollHint && (
				<div className="md:hidden text-[11px] text-gray-400 mb-1 text-right pr-1">
					← 横スクロールできます →
				</div>
			)}
			<div
				className="overflow-auto border-t border-gray-100"
				style={{ maxHeight: `${maxHeight}px` }}
			>
				<div style={{ minWidth: `${minWidth}px` }}>{children}</div>
			</div>
		</div>
	);
}
