"use client";

import { Component, ReactNode } from "react";

interface Props {
	children: ReactNode;
	sectionName?: string;
}

interface State {
	hasError: boolean;
}

export default class SectionErrorBoundary extends Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = { hasError: false };
	}

	static getDerivedStateFromError(): State {
		return { hasError: true };
	}

	render() {
		if (this.state.hasError) {
			return (
				<div className="bg-white rounded-xl shadow-sm p-5">
					<div className="flex flex-col items-center justify-center py-8 text-center gap-3">
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
								d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
							/>
						</svg>
						<p className="text-sm text-gray-500">
							{this.props.sectionName
								? `${this.props.sectionName}の読み込みに失敗しました`
								: "このセクションの読み込みに失敗しました"}
						</p>
						<button
							onClick={() => this.setState({ hasError: false })}
							className="text-sm px-3 py-1.5 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
						>
							再試行
						</button>
					</div>
				</div>
			);
		}
		return this.props.children;
	}
}
