import { Activity, Gavel, FileText, CheckCircle, TrendingUp, AlertTriangle } from 'lucide-react';

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
        <section className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
            {/* Active Matters */}
            <div className="relative overflow-hidden bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-white/20 dark:border-white/5 hover:-translate-y-1 transition-transform duration-300 group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-bl-[100px] -mr-4 -mt-4 transition-transform group-hover:scale-110" />

                <div className="flex items-start justify-between relative z-10">
                    <div>
                        <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            Active Matters
                        </p>
                        <p className="text-5xl font-black text-slate-800 dark:text-white tracking-tight">
                            {metrics.activeMatters}
                        </p>
                        <div className="flex items-center gap-1 mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                            <TrendingUp className="w-3 h-3 text-emerald-500" />
                            <span>Ongoing cases</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Upcoming Court Dates */}
            <div className="relative overflow-hidden bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-white/20 dark:border-white/5 hover:-translate-y-1 transition-transform duration-300 group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-bl-[100px] -mr-4 -mt-4 transition-transform group-hover:scale-110" />

                <div className="flex items-start justify-between relative z-10">
                    <div>
                        <p className="text-sm font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-2">
                            Hearings (2 Weeks)
                        </p>
                        <p className="text-5xl font-black text-slate-800 dark:text-white tracking-tight">
                            {metrics.hearingWeek}
                        </p>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-2">
                            Upcoming appearances
                        </p>
                    </div>
                </div>
            </div>

            {/* Invoices Issued */}
            <div className="relative overflow-hidden bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-white/20 dark:border-white/5 hover:-translate-y-1 transition-transform duration-300 group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/10 rounded-bl-[100px] -mr-4 -mt-4 transition-transform group-hover:scale-110" />

                <div className="flex items-start justify-between relative z-10">
                    <div>
                        <p className="text-sm font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider mb-2">
                            Invoices Issued
                        </p>
                        <p className="text-5xl font-black text-slate-800 dark:text-white tracking-tight">
                            {metrics.invoicesIssued}
                        </p>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-2">
                            This month
                        </p>
                    </div>
                </div>
            </div>

            {/* Invoices Outstanding */}
            <div className="relative overflow-hidden bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-white/20 dark:border-white/5 hover:-translate-y-1 transition-transform duration-300 group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/10 rounded-bl-[100px] -mr-4 -mt-4 transition-transform group-hover:scale-110" />

                <div className="flex items-start justify-between relative z-10">
                    <div>
                        <p className="text-sm font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            Outstanding
                            <AlertTriangle className="w-3.5 h-3.5" />
                        </p>
                        <p className="text-5xl font-black text-slate-800 dark:text-white tracking-tight">
                            {metrics.invoicesOutstanding}
                        </p>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-2">
                            Unpaid invoices
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}

export function StatsGridSkeleton() {
    return (
        <section className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
            {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-md rounded-2xl p-6 shadow-sm border border-white/10">
                    <div className="flex items-start justify-between animate-pulse">
                        <div className="flex-1">
                            <div className="h-4 bg-slate-200 dark:bg-slate-700/50 rounded w-24 mb-3"></div>
                            <div className="h-12 bg-slate-200 dark:bg-slate-700/50 rounded w-16 mb-2"></div>
                            <div className="h-3 bg-slate-200 dark:bg-slate-700/50 rounded w-32"></div>
                        </div>
                    </div>
                </div>
            ))}
        </section>
    );
}
