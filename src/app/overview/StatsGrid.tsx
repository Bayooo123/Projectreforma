import { Activity, Gavel, FileText, CheckCircle } from 'lucide-react';

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
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                            Active Matters
                        </p>
                        <p className="text-4xl font-bold text-slate-900 dark:text-white">
                            {metrics.activeMatters}
                        </p>
                        <p className="text-sm text-indigo-600 dark:text-indigo-400 mt-1">
                            Ongoing cases
                        </p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
                        <Gavel className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                    </div>
                </div>
            </div>

            {/* Upcoming Court Dates */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                            Hearings (2 Weeks)
                        </p>
                        <p className="text-4xl font-bold text-slate-900 dark:text-white">
                            {metrics.hearingWeek}
                        </p>
                        <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                            Upcoming appearances
                        </p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
                        <Gavel className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                    </div>
                </div>
            </div>

            {/* Invoices Issued */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                            Invoices Issued
                        </p>
                        <p className="text-4xl font-bold text-slate-900 dark:text-white">
                            {metrics.invoicesIssued}
                        </p>
                        <p className="text-sm text-teal-600 dark:text-teal-400 mt-1">
                            This month
                        </p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center">
                        <FileText className="w-6 h-6 text-teal-600 dark:text-teal-400" />
                    </div>
                </div>
            </div>

            {/* Invoices Outstanding */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                            Outstanding
                        </p>
                        <p className="text-4xl font-bold text-slate-900 dark:text-white">
                            {metrics.invoicesOutstanding}
                        </p>
                        <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                            Unpaid invoices
                        </p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-900/30 flex items-center justify-center">
                        <Activity className="w-6 h-6 text-red-600 dark:text-red-400" />
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
                <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                    <div className="flex items-start justify-between animate-pulse">
                        <div className="flex-1">
                            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-24 mb-3"></div>
                            <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded w-16 mb-2"></div>
                            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-32"></div>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-slate-700"></div>
                    </div>
                </div>
            ))}
        </section>
    );
}
