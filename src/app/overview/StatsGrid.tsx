import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

async function getStats(userId: string) {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + 7);

    const [pendingTasks, upcomingCourtDates, activeBriefs] = await Promise.all([
        prisma.task.count({
            where: {
                assignedToId: userId,
                status: { not: 'completed' }
            }
        }),
        prisma.matter.count({
            where: {
                assignedLawyerId: userId,
                nextCourtDate: {
                    gte: today,
                    lte: futureDate
                }
            }
        }),
        prisma.brief.count({
            where: {
                lawyerId: userId,
                status: 'active'
            }
        })
    ]);

    return { pendingTasks, upcomingCourtDates, activeBriefs };
}

export default async function StatsGrid() {
    const session = await auth();
    if (!session?.user?.id) return null;

    const stats = await getStats(session.user.id);

    return (
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {/* Pending Tasks */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                            Pending Tasks
                        </p>
                        <p className="text-4xl font-bold text-slate-900 dark:text-white">
                            {stats.pendingTasks}
                        </p>
                        <p className="text-sm text-teal-600 dark:text-teal-400 mt-1">
                            Requiring attention
                        </p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center">
                        <svg className="w-6 h-6 text-teal-600 dark:text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                    </div>
                </div>
            </div>

            {/* Court Dates */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                            Upcoming Court Dates
                        </p>
                        <p className="text-4xl font-bold text-slate-900 dark:text-white">
                            {stats.upcomingCourtDates}
                        </p>
                        <p className="text-sm text-teal-600 dark:text-teal-400 mt-1">
                            Next 7 days
                        </p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
                        <svg className="w-6 h-6 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </div>
                </div>
            </div>

            {/* Active Briefs */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                            Active Briefs
                        </p>
                        <p className="text-4xl font-bold text-slate-900 dark:text-white">
                            {stats.activeBriefs}
                        </p>
                        <p className="text-sm text-teal-600 dark:text-teal-400 mt-1">
                            Ongoing matters
                        </p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
                        <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                        </svg>
                    </div>
                </div>
            </div>
        </section>
    );
}

export function StatsGridSkeleton() {
    return (
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {[1, 2, 3].map((i) => (
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
