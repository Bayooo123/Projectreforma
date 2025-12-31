export default function ManagementLoading() {
    return (
        <div className="animate-pulse p-6 space-y-6">
            {/* Header skeleton */}
            <div className="flex justify-between items-center">
                <div>
                    <div className="h-8 w-32 bg-slate-700/50 rounded-lg mb-2"></div>
                    <div className="h-4 w-56 bg-slate-700/30 rounded"></div>
                </div>
                <div className="h-10 w-28 bg-teal-600/30 rounded-lg"></div>
            </div>

            {/* Stats Cards skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                        <div className="h-4 w-20 bg-slate-700/40 rounded mb-2"></div>
                        <div className="h-8 w-12 bg-slate-700/50 rounded-lg"></div>
                    </div>
                ))}
            </div>

            {/* Table skeleton */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
                <div className="flex gap-4 p-4 border-b border-slate-700/50">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="h-4 flex-1 bg-slate-700/40 rounded"></div>
                    ))}
                </div>
                {[1, 2, 3, 4, 5, 6].map(row => (
                    <div key={row} className="flex gap-4 p-4 border-b border-slate-700/30">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="h-5 flex-1 bg-slate-700/20 rounded"></div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}
