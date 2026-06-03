import { auth } from "@/auth";
import { redirect } from "next/navigation";
import {
    getAnalyticsMetrics,
    getRevenueTrend,
    getMatterDistribution,
} from '@/app/actions/analytics';
import AnalyticsClient from './AnalyticsClient';

export default async function AnalyticsPage(props: {
    searchParams: Promise<{ filter?: string }>
}) {
    const searchParams = await props.searchParams;
    const session = await auth();
    if (!session?.user?.id) return redirect('/login');

    const workspaceId = session.user.workspaceId;
    if (!workspaceId) {
        return <div className="p-10 text-center text-slate-500">No Workspace Associated with Account</div>;
    }

    const filter = searchParams.filter || 'this-month';

    // Only run the fast aggregates SSR — everything else loads client-side
    const [metrics, revenueTrend, matterDistribution] = await Promise.all([
        getAnalyticsMetrics(workspaceId, filter),
        getRevenueTrend(workspaceId),
        getMatterDistribution(workspaceId),
    ]);

    return (
        <AnalyticsClient
            initialMetrics={metrics || {
                revenue: { total: 0, lastMonth: 0, growth: 0 },
                matters: { active: 0, newThisMonth: 0 },
                expenses: { total: 0, count: 0 },
                courtDates: { upcoming: 0 },
            }}
            initialRevenueTrend={revenueTrend || []}
            initialMatterDistribution={matterDistribution || []}
            workspaceId={workspaceId}
            initialFilter={filter}
        />
    );
}
