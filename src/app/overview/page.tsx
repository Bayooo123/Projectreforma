import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

async function getOverviewData(userId: string) {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + 7);

    const [pendingTasks, upcomingCourtDates, activeBriefs, recentActivities] = await Promise.all([
        // Pending Tasks Count
        prisma.task.count({
            where: {
                assignedToId: userId,
                status: { not: 'completed' }
            }
        }),
        // Court Dates in next 7 days
        prisma.matter.count({
            where: {
                assignedLawyerId: userId,
                nextCourtDate: {
                    gte: today,
                    lte: futureDate
                }
            }
        }),
        // Active Briefs
        prisma.brief.count({
            where: {
                lawyerId: userId,
                status: 'active'
            }
        }),
        // Recent Activities (combined from matters, briefs, invitations)
        Promise.all([
            prisma.matterActivityLog.findMany({
                take: 5,
                orderBy: { timestamp: 'desc' },
                include: {
                    user: { select: { name: true } },
                    matter: { select: { name: true } }
                }
            }),
            prisma.briefActivityLog.findMany({
                take: 5,
                orderBy: { timestamp: 'desc' },
                include: {
                    user: { select: { name: true } },
                    brief: { select: { name: true } }
                }
            }),
            prisma.invitation.findMany({
                take: 5,
                orderBy: { createdAt: 'desc' },
                include: {
                    inviter: { select: { name: true } },
                    workspace: { select: { name: true } }
                }
            })
        ])
    ]);

    // Merge and sort activities
    const [matterLogs, briefLogs, invitations] = recentActivities;

    const allActivities = [
        ...matterLogs.map(log => ({
            id: log.id,
            title: log.matter.name,
            person: log.user.name || 'Unknown',
            action: log.description.replace(/_/g, ' '),
            timestamp: log.timestamp,
            type: 'matter' as const
        })),
        ...briefLogs.map(log => ({
            id: log.id,
            title: log.brief.name,
            person: log.user?.name || 'System',
            action: log.description.replace(/_/g, ' '),
            timestamp: log.timestamp,
            type: 'brief' as const
        })),
        ...invitations.map(inv => ({
            id: inv.id,
            title: inv.workspace.name,
            person: inv.inviter.name || 'Unknown',
            action: `invited ${inv.email} as ${inv.role}`,
            timestamp: inv.createdAt,
            type: 'invitation' as const
        }))
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10);

    return {
        stats: { pendingTasks, upcomingCourtDates, activeBriefs },
        activities: allActivities
    };
}

function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
}

export default async function OverviewPage() {
    const session = await auth();
    if (!session?.user) {
        redirect("/auth/login");
    }

    const firstName = session.user.name?.split(' ')[0] || "Counsel";
    const { stats, activities } = await getOverviewData(session.user.id);

    const currentDate = new Date().toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    return (
        <main className="min-h-screen bg-slate-50 dark:bg-slate-900">
            <div className="max-w-7xl mx-auto px-6 py-10">
                {/* Header */}
                <header className="mb-10">
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                        {getGreeting()}, {firstName}
                    </h1>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                        {currentDate}
                    </p>
                </header>

                {/* KPI Cards Grid */}
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

                {/* Firm Pulse - Activity Feed */}
                <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                            Firm Pulse
                        </h2>
                        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold uppercase tracking-wide">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            Live
                        </span>
                    </div>

                    <div className="divide-y divide-slate-100 dark:divide-slate-700">
                        {activities.length === 0 ? (
                            <div className="px-6 py-16 text-center">
                                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                                    <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                </div>
                                <p className="text-slate-500 dark:text-slate-400 font-medium">No recent activity</p>
                                <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">
                                    Activity from matters, briefs, and invitations will appear here
                                </p>
                            </div>
                        ) : (
                            activities.map((activity) => (
                                <div key={activity.id} className="px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                    <div className="flex items-start gap-4">
                                        <div className={`w-2 h-2 mt-2 rounded-full flex-shrink-0 ${activity.type === 'matter' ? 'bg-teal-500' :
                                                activity.type === 'brief' ? 'bg-indigo-500' :
                                                    'bg-amber-500'
                                            }`}></div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-slate-900 dark:text-white text-sm">
                                                {activity.title}
                                            </p>
                                            <p className="text-slate-600 dark:text-slate-300 text-sm mt-0.5">
                                                <span className="font-medium text-teal-600 dark:text-teal-400">{activity.person}</span>
                                                {' '}{activity.action}
                                            </p>
                                            <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">
                                                {new Date(activity.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} • {new Date(activity.timestamp).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </section>
            </div>
        </main>
    );
}
