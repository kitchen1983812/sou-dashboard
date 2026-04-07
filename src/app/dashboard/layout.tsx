export default function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className="min-h-screen bg-gray-50">
			<header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex items-center gap-3">
				<span className="w-1 h-6 bg-brand-500 rounded-full" />
				<h1 className="text-xl font-bold text-gray-800 tracking-wide">
					経営ダッシュボード
				</h1>
			</header>
			<main>{children}</main>
		</div>
	);
}
