export default function CalendarLoading() {
    return (
        <div className="animate-pulse p-6 space-y-6">
            {/* Header skeleton */}
            <div className="flex justify-between items-center">
                <div>
                    <div className="h-8 w-48 bg-slate-700/50 rounded-lg mb-2"></div>
                    <div className="h-4 w-64 bg-slate-700/30 rounded"></div>
                </div>
                <div className="flex gap-2">
                    <div className="h-10 w-10 bg-slate-700/30 rounded-lg"></div>
                    <div className="h-10 w-32 bg-slate-700/30 rounded-lg"></div>
                    <div className="h-10 w-10 bg-slate-700/30 rounded-lg"></div>
                </div>
            </div>

            {/* Calendar Grid skeleton */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
                {/* Weekday headers */}
                <div className="grid grid-cols-7 gap-2 mb-4">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="h-4 bg-slate-700/40 rounded text-center"></div>
                    ))}
                </div>
                {/* Calendar days */}
                {[1, 2, 3, 4, 5].map(week => (
                    <div key={week} className="grid grid-cols-7 gap-2 mb-2">
                        {[1, 2, 3, 4, 5, 6, 7].map(day => (
                            <div key={day} className="h-24 bg-slate-700/20 rounded-lg"></div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}
