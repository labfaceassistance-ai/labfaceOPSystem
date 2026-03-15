/**
 * Skeleton Loader for Attendance Insights
 * Displays a loading placeholder that matches the actual layout
 */

export default function AttendanceInsightsSkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            {/* Overall Summary Card Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-slate-800 rounded-xl" />
                        <div className="flex-1">
                            <div className="h-8 bg-slate-800 rounded w-16 mb-2" />
                            <div className="h-4 bg-slate-800 rounded w-20" />
                        </div>
                    </div>
                ))}
            </div>

            {/* Streak Card Skeleton */}
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-2 border-slate-700 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <div className="h-6 bg-slate-800 rounded w-40 mb-2" />
                        <div className="h-4 bg-slate-800 rounded w-24" />
                    </div>
                    <div className="w-8 h-8 bg-slate-800 rounded-full" />
                </div>
                <div className="flex items-baseline gap-2">
                    <div className="h-16 bg-slate-800 rounded w-24" />
                    <div className="h-8 bg-slate-800 rounded w-16" />
                </div>
            </div>

            {/* Stats Grid Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-slate-900 border border-slate-800 rounded-lg p-6">
                        <div className="flex items-center justify-between mb-2">
                            <div className="h-4 bg-slate-800 rounded w-32" />
                            <div className="w-5 h-5 bg-slate-800 rounded" />
                        </div>
                        <div className="h-10 bg-slate-800 rounded w-24 mb-1" />
                        <div className="h-4 bg-slate-800 rounded w-full" />
                    </div>
                ))}
            </div>

            {/* Risk Alert Skeleton */}
            <div className="border-2 border-slate-700 rounded-lg p-4 bg-slate-900/50">
                <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-slate-800 rounded" />
                    <div className="flex-1">
                        <div className="h-5 bg-slate-800 rounded w-48 mb-2" />
                        <div className="h-4 bg-slate-800 rounded w-full" />
                    </div>
                </div>
            </div>

            {/* Recommendations Skeleton */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-5 h-5 bg-slate-800 rounded" />
                    <div className="h-6 bg-slate-800 rounded w-56" />
                </div>
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-start gap-3">
                            <div className="w-6 h-6 bg-slate-800 rounded" />
                            <div className="flex-1 h-4 bg-slate-800 rounded" />
                        </div>
                    ))}
                </div>
            </div>

            {/* Monthly Trend Chart Skeleton */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
                <div className="h-6 bg-slate-800 rounded w-56 mb-6" />

                {/* Summary Cards */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="rounded-lg p-4 border bg-slate-800/50 border-slate-700">
                            <div className="h-3 bg-slate-700 rounded w-12 mb-2" />
                            <div className="h-8 bg-slate-700 rounded w-16 mb-2" />
                            <div className="h-3 bg-slate-700 rounded w-20" />
                        </div>
                    ))}
                </div>

                {/* Bar Chart */}
                <div className="flex items-end gap-2 h-48">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-2">
                            <div
                                className="w-full rounded-t bg-slate-800"
                                style={{ height: `${Math.random() * 60 + 20}%` }}
                            />
                            <div className="h-3 bg-slate-800 rounded w-8" />
                        </div>
                    ))}
                </div>
            </div>

            {/* Goal Setting Skeleton */}
            <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-5 h-5 bg-slate-800 rounded" />
                    <div className="h-6 bg-slate-800 rounded w-40" />
                </div>
                <div className="mb-4">
                    <div className="h-12 bg-slate-800 rounded w-32 mb-2" />
                    <div className="h-4 bg-slate-800 rounded w-full" />
                </div>
                <div className="h-12 bg-slate-800 rounded w-48" />
            </div>
        </div>
    );
}
