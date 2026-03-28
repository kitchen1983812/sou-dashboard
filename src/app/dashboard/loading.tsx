import { DashboardViewSkeleton } from "@/components/ui/Skeleton";

export default function DashboardLoading() {
	return (
		<div className="flex h-screen overflow-hidden bg-gray-50">
			{/* サイドバープレースホルダー */}
			<div className="w-56 shrink-0 bg-white border-r border-gray-200 hidden lg:block" />
			<div className="flex-1 overflow-y-auto p-4 sm:p-6">
				<DashboardViewSkeleton />
			</div>
		</div>
	);
}
