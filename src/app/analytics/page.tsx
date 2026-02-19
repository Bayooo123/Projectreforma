import { auth } from "@/auth";
import { redirect } from "next/navigation";
import {
    getAnalyticsMetrics,
    getRevenueTrend,
    getTopClients,
    getLawyerStats,
    getMatterDistribution,
    getCourtVisits
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

    // Fetch all data in parallel on the server
    const [
        metrics,
        revenueTrend,
        topClients,
        lawyerStats,
        matterDistribution,
        courtVisits
    ] = await Promise.all([
        getAnalyticsMetrics(workspaceId),
        getRevenueTrend(workspaceId),
        getTopClients(workspaceId),
        getLawyerStats(workspaceId),
        getMatterDistribution(workspaceId),
        getCourtVisits(workspaceId)
    ]);

    const analyticsData = {
        metrics: metrics || {
            revenue: { total: 0, lastMonth: 0, growth: 0 },
            matters: { active: 0, newThisMonth: 0 },
            expenses: { total: 0, count: 0 },
            courtDates: { upcoming: 0 }
        },
        revenueTrend: revenueTrend || [],
        topClients: topClients || [],
        lawyerStats: lawyerStats || [],
        matterDistribution: matterDistribution || [],
        courtVisits: courtVisits || []
    };

    return (
        <AnalyticsClient
            data={analyticsData}
            workspaceId={workspaceId}
            initialFilter={filter}
        />
    );
}

