import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

async function getActivities(userId: string) {
    const recentActivities = await Promise.all([
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
    ]);

    const [matterLogs, briefLogs, invitations] = recentActivities;

    return [
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
}

export default async function FirmPulse() {
    const session = await auth();
    if (!session?.user?.id) return null;

    const activities = await getActivities(session.user.id);

    return (
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
                                        <span className="font-medium text-red-600 dark:text-red-400">{activity.person}</span>
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
    );
}

export function FirmPulseSkeleton() {
    return (
        <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div className="h-6 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                <div className="h-6 w-16 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse"></div>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="px-6 py-4 animate-pulse">
                        <div className="flex items-start gap-4">
                            <div className="w-2 h-2 mt-2 rounded-full bg-slate-200 dark:bg-slate-700 flex-shrink-0"></div>
                            <div className="flex-1 min-w-0">
                                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-2"></div>
                                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-2/3 mb-2"></div>
                                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/4"></div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
