/**
 * Skeleton Loader for Attendance Insights
 * Displays a loading placeholder that matches the actual layout
 */

export default function AttendanceInsightsSkeleton() {
    return (
        <div className="space-y-6 animate-pulse font-outfit">
            {/* Overall Summary Card Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-white/40 backdrop-blur-md p-6 rounded-[2rem] border border-identity-sky/15">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex flex-col items-center">
                        <div className="w-12 h-12 bg-slate-100 rounded-xl mb-3" />
                        <div className="h-6 bg-slate-100 rounded w-16 mb-2" />
                        <div className="h-3 bg-slate-100 rounded w-20" />
                    </div>
                ))}
            </div>

            {/* Streak Card Skeleton */}
            <div className="bg-identity-navy/90 rounded-[2rem] p-6 sm:p-7 relative overflow-hidden">
                <div className="flex items-center justify-between gap-8">
                    <div className="flex-1">
                        <div className="h-3 bg-white/10 rounded w-40 mb-3" />
                        <div className="h-8 bg-white/10 rounded w-56 mb-2" />
                        <div className="h-3 bg-white/10 rounded w-32 mb-6" />
                        <div className="h-16 bg-white/10 rounded w-32" />
                    </div>
                    <div className="w-20 h-20 bg-white/10 rounded-2xl" />
                </div>
            </div>

            {/* Stats Grid Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white/40 border border-identity-sky/15 rounded-[2rem] p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="h-3 bg-slate-100 rounded w-24" />
                            <div className="w-5 h-5 bg-slate-100 rounded" />
                        </div>
                        <div className="h-10 bg-slate-100 rounded w-32 mb-4" />
                        <div className="h-px bg-slate-50 w-full mb-4" />
                        <div className="h-3 bg-slate-100 rounded w-full" />
                    </div>
                ))}
            </div>

            {/* Risk Alert Skeleton */}
            <div className="border-2 border-identity-sky/10 rounded-2xl p-6 bg-white/40">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-slate-100 rounded-xl" />
                    <div className="flex-1 pt-1">
                        <div className="h-4 bg-slate-100 rounded w-48 mb-2" />
                        <div className="h-3 bg-slate-100 rounded w-full" />
                    </div>
                </div>
            </div>

            {/* Recommendations Skeleton */}
            <div className="bg-white/40 border border-identity-sky/15 rounded-[2rem] p-6">
                <div className="h-5 bg-slate-100 rounded w-56 mb-8" />
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-start gap-4">
                            <div className="w-8 h-8 bg-slate-100 rounded-lg shrink-0" />
                            <div className="flex-1 h-3 bg-slate-100 rounded mt-2.5" />
                        </div>
                    ))}
                </div>
            </div>

            {/* Monthly Trend Chart Skeleton */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
                <div className="h-6 bg-slate-800 rounded w-56 mb-6" />

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
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
