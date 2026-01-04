import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import StatsGrid, { StatsGridSkeleton } from "./StatsGrid";
import OverviewCockpit from "./OverviewCockpit";
import ActivityFeed from "./ActivityFeed";

import {
    getOperationalMetrics,
    getTodaysActivity,
    getFirmPulse
} from "@/app/actions/dashboard";
import { getClientsForWorkspace } from "@/lib/briefs";

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

    // 1. Resolve Workspace
    const member = await prisma.workspaceMember.findFirst({
        where: { userId: session.user.id },
        select: { workspaceId: true }
    });

    if (!member) {
        return (
            <div className="flex items-center justify-center min-h-screen text-slate-500">
                <p>No workspace found. Please contact your administrator.</p>
            </div>
        );
    }

    const workspaceId = member.workspaceId;
    const firstName = session.user.name?.split(' ')[0] || "Counsel";
    const dateStr = new Date().toLocaleDateString('en-GB', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });

    // 2. Parallel Data Fetching
    const [metrics, todaysActivity, firmPulseLogs, clients] = await Promise.all([
        getOperationalMetrics(workspaceId),
        getTodaysActivity(workspaceId),
        getFirmPulse(20, workspaceId),
        getClientsForWorkspace(workspaceId)
    ]);

    // Calculate activity summary for header
    const activityCount = todaysActivity.length;
    const activityText = activityCount === 1 ? "1 matter active" : `${activityCount} matters active`;

    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-2">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                                {getGreeting()}, {firstName}
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400 mt-1">
                                {dateStr} • FIRM PULSE
                            </p>
                        </div>
                        <div className="text-right hidden sm:block">
                            <div className="text-sm text-slate-600 dark:text-slate-400">Today&apos;s Activity</div>
                            <div className="text-lg font-semibold text-slate-900 dark:text-white">{activityText}</div>
                        </div>
                    </div>
                </div>

                {/* Quick Action Cockpit (Primary + Secondary) */}
                <OverviewCockpit
                    workspaceId={workspaceId}
                    userId={session.user.id}
                    userName={session.user.name || ''}
                    clients={clients}
                />

                {/* Operational Metrics Grid */}
                <Suspense fallback={<StatsGridSkeleton />}>
                    <StatsGrid metrics={metrics} />
                </Suspense>

                {/* Activity Feed (Tabbed) */}
                <ActivityFeed logs={firmPulseLogs} />
            </div>
        </main>
    );
}
