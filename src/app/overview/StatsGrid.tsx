import { ChevronRight, TrendingUp, AlertCircle } from 'lucide-react';

interface StatsGridProps {
    metrics: {
        activeMatters: number;
        hearingWeek: number;
        invoicesOutstanding: number;
        invoicesIssued: number;
    };
}

export default function StatsGrid({ metrics }: StatsGridProps) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* Active Matters - Violet */}
            <div className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl border border-violet-200/50 dark:border-violet-900/30 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 group">
                <div className="text-violet-600 dark:text-violet-400 text-sm font-medium mb-1 tracking-wide">ACTIVE MATTERS</div>
                <div className="text-3xl font-bold text-violet-900 dark:text-violet-100 mb-1">
                    {metrics.activeMatters}
                </div>
                <button className="text-violet-600 dark:text-violet-400 text-sm flex items-center gap-1 hover:gap-2 transition-all duration-200">
                    <span>Ongoing cases</span>
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>

            {/* Hearings - Orange */}
            <div className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl border border-orange-200/50 dark:border-orange-900/30 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200">
                <div className="text-orange-600 dark:text-orange-400 text-sm font-medium mb-1 tracking-wide">HEARINGS</div>
                <div className="text-3xl font-bold text-orange-900 dark:text-orange-100 mb-1">
                    {metrics.hearingWeek}
                </div>
                <div className="text-orange-600 dark:text-orange-400 text-sm">Next 2 weeks</div>
            </div>

            {/* Invoices Issued - Teal */}
            <div className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl border border-teal-200/50 dark:border-teal-900/30 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200">
                <div className="text-teal-600 dark:text-teal-400 text-sm font-medium mb-1 tracking-wide">INVOICES ISSUED</div>
                <div className="text-3xl font-bold text-teal-900 dark:text-teal-100 mb-1">
                    {metrics.invoicesIssued}
                </div>
                <div className="text-teal-600 dark:text-teal-400 text-sm flex items-center gap-1">
                    <span>This month</span>
                    <TrendingUp className="w-3 h-3" />
                </div>
            </div>

            {/* Outstanding - Red Alert */}
            <div className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl border border-red-300/50 dark:border-red-900/30 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 relative">
                <div className="absolute top-3 right-3">
                    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div className="text-red-600 dark:text-red-400 text-sm font-medium mb-1 tracking-wide">OUTSTANDING</div>
                <div className="text-3xl font-bold text-red-900 dark:text-red-100 mb-1">
                    {metrics.invoicesOutstanding}
                </div>
                <div className="text-red-700 dark:text-red-300 text-sm font-semibold mb-2">Unpaid invoices</div>
                <button className="text-xs bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 transition-colors duration-200 font-medium shadow-sm">
                    Review Now
                </button>
            </div>
        </div>
    );
}

export function StatsGridSkeleton() {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800 rounded-2xl p-5 h-32 animate-pulse" />
            ))}
        </div>
    );
}
