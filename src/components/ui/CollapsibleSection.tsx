"use client";

import { ReactNode, useState } from "react";

interface CollapsibleSectionProps {
	title: string;
	subtitle?: string;
	defaultOpen?: boolean;
	children: ReactNode;
}

/**
 * 折りたたみ可能なセクション。
 * 二次情報を隠して情報密度をコントロールするために使用する。
 */
export default function CollapsibleSection({
	title,
	subtitle,
	defaultOpen = false,
	children,
}: CollapsibleSectionProps) {
	const [isOpen, setIsOpen] = useState(defaultOpen);

	return (
		<section>
			<button
				type="button"
				onClick={() => setIsOpen(!isOpen)}
				aria-expanded={isOpen}
				className="w-full flex items-center justify-between py-2 px-3 bg-white shadow-sm hover:bg-gray-50 transition-colors text-left"
			>
				<div className="flex items-baseline gap-2">
					<h3 className="text-base font-bold text-gray-800">{title}</h3>
					{subtitle && (
						<span className="text-xs text-gray-500">{subtitle}</span>
					)}
				</div>
				<svg
					className={`w-4 h-4 text-gray-400 transition-transform ${
						isOpen ? "rotate-180" : ""
					}`}
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					strokeWidth={2}
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						d="M19 9l-7 7-7-7"
					/>
				</svg>
			</button>
			{isOpen && <div className="mt-3 space-y-4">{children}</div>}
		</section>
	);
}
