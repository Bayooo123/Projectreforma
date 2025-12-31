export default function BriefsLoading() {
    return (
        <div className="animate-pulse p-6 space-y-6">
            {/* Header skeleton */}
            <div className="flex justify-between items-center">
                <div>
                    <div className="h-8 w-40 bg-slate-700/50 rounded-lg mb-2"></div>
                    <div className="h-4 w-64 bg-slate-700/30 rounded"></div>
                </div>
                <div className="h-10 w-32 bg-teal-600/30 rounded-lg"></div>
            </div>

            {/* Toolbar skeleton */}
            <div className="flex gap-4">
                <div className="h-10 flex-1 max-w-md bg-slate-700/30 rounded-lg"></div>
                <div className="h-10 w-24 bg-slate-700/30 rounded-lg"></div>
            </div>

            {/* Table skeleton */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
                {/* Header */}
                <div className="flex gap-4 p-4 border-b border-slate-700/50">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="h-4 flex-1 bg-slate-700/40 rounded"></div>
                    ))}
                </div>
                {/* Rows */}
                {[1, 2, 3, 4, 5].map(row => (
                    <div key={row} className="flex gap-4 p-4 border-b border-slate-700/30">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="h-5 flex-1 bg-slate-700/20 rounded"></div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}
