export default function OverviewLoading() {
    return (
        <div className="animate-pulse p-6 space-y-8">
            {/* Header skeleton */}
            <div>
                <div className="h-10 w-72 bg-slate-700/50 rounded-lg mb-2"></div>
                <div className="h-4 w-48 bg-slate-700/30 rounded"></div>
            </div>

            {/* KPI Cards skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => (
                    <div key={i} className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
                        <div className="flex justify-between items-start">
                            <div className="space-y-3 flex-1">
                                <div className="h-4 w-24 bg-slate-700/40 rounded"></div>
                                <div className="h-10 w-16 bg-slate-700/50 rounded-lg"></div>
                                <div className="h-3 w-20 bg-slate-700/30 rounded"></div>
                            </div>
                            <div className="w-12 h-12 bg-slate-700/30 rounded-xl"></div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Firm Pulse skeleton */}
            <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 overflow-hidden">
                <div className="p-5 border-b border-slate-700/50 flex justify-between">
                    <div className="h-6 w-32 bg-slate-700/40 rounded"></div>
                    <div className="h-6 w-16 bg-teal-600/30 rounded-full"></div>
                </div>
                <div className="divide-y divide-slate-700/30">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="p-4 flex gap-4">
                            <div className="w-2 h-2 mt-2 bg-slate-700/40 rounded-full"></div>
                            <div className="flex-1 space-y-2">
                                <div className="h-4 w-40 bg-slate-700/40 rounded"></div>
                                <div className="h-3 w-64 bg-slate-700/30 rounded"></div>
                                <div className="h-3 w-24 bg-slate-700/20 rounded"></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
