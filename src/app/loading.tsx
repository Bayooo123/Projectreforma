import { Loader2 } from "lucide-react";

export default function Loading() {
    return (
        <div className="w-full h-full min-h-[500px] flex flex-col items-center justify-center p-8">
            {/* Search Bar Skeleton */}
            <div className="w-full max-w-5xl mb-8 flex justify-between items-center animate-pulse">
                <div className="h-10 w-64 bg-slate-200 rounded-lg"></div>
                <div className="h-10 w-32 bg-slate-200 rounded-lg"></div>
            </div>

            {/* Table Skeleton */}
            <div className="w-full max-w-5xl border rounded-xl overflow-hidden shadow-sm bg-white">
                <div className="h-12 bg-slate-50 border-b flex items-center px-6 gap-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="h-4 bg-slate-200 rounded w-24"></div>
                    ))}
                </div>
                {[1, 2, 3, 4, 5].map((row) => (
                    <div key={row} className="h-16 border-b flex items-center px-6 gap-4 animate-pulse">
                        <div className="h-4 w-4 bg-slate-200 rounded"></div>
                        <div className="h-4 w-32 bg-slate-200 rounded"></div>
                        <div className="h-4 w-48 bg-slate-200 rounded"></div>
                        <div className="h-8 w-20 bg-slate-100 rounded-full ml-auto"></div>
                    </div>
                ))}
            </div>

            <div className="mt-8 flex items-center justify-center text-slate-400">
                <Loader2 className="animate-spin" size={20} />
            </div>
        </div>
    );
}
