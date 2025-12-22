export default function TableSkeleton({ rows = 5 }: { rows?: number }) {
    return (
        <div className="w-full border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
            {/* Header */}
            <div className="h-12 bg-slate-50 border-b border-slate-100 flex items-center px-6 gap-4">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-4 bg-slate-200 rounded w-24 animate-pulse"></div>
                ))}
            </div>

            {/* Rows */}
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="h-16 border-b border-slate-50 flex items-center px-6 gap-4 animate-pulse hover:bg-slate-50/50 transition-colors">
                    <div className="h-4 w-4 bg-slate-200 rounded shrink-0"></div>
                    <div className="h-4 w-32 bg-slate-200 rounded shrink-0"></div>
                    <div className="h-4 w-48 bg-slate-200 rounded shrink-0"></div>
                    <div className="h-4 w-20 bg-slate-200 rounded ml-auto shrink-0"></div>
                </div>
            ))}
        </div>
    );
}
