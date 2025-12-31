export default function SettingsLoading() {
    return (
        <div className="animate-pulse p-6 space-y-6 max-w-3xl">
            {/* Header skeleton */}
            <div>
                <div className="h-8 w-32 bg-slate-700/50 rounded-lg mb-2"></div>
                <div className="h-4 w-56 bg-slate-700/30 rounded"></div>
            </div>

            {/* Settings sections skeleton */}
            {[1, 2, 3].map(section => (
                <div key={section} className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6 space-y-4">
                    <div className="h-6 w-40 bg-slate-700/40 rounded"></div>
                    <div className="space-y-3">
                        <div className="h-10 w-full bg-slate-700/30 rounded-lg"></div>
                        <div className="h-10 w-full bg-slate-700/30 rounded-lg"></div>
                    </div>
                    <div className="h-10 w-24 bg-teal-600/30 rounded-lg"></div>
                </div>
            ))}
        </div>
    );
}
