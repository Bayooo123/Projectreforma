import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import StatsGrid, { StatsGridSkeleton } from "./StatsGrid";
// FirmPulse is in components/dashboard, but check if local proxy exists. 
// Assuming standard import based on component location.
import { FirmPulse } from "@/components/dashboard/FirmPulse";
import OverviewCockpit from "./OverviewCockpit";
import TodaysActivityPanel from "./TodaysActivityPanel";

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

    return (
        <main className="min-h-screen pb-20">
            <div className="max-w-7xl mx-auto px-8 py-12 space-y-12">
                {/* Header */}
                <header>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                        {getGreeting()}, {firstName}
                    </h1>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                        {dateStr} &bull; Firm Pulse
                    </p>
                </header>

                {/* 1. Quick Action Cockpit */}
                <OverviewCockpit
                    workspaceId={workspaceId}
                    userId={session.user.id}
                    userName={session.user.name || ''}
                    clients={clients}
                />

                {/* 2. Operational Metrics (Read-only) */}
                <Suspense fallback={<StatsGridSkeleton />}>
                    <StatsGrid metrics={metrics} />
                </Suspense>

                {/* 3. Operational Grid: Today's Activity + Audit Feed */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    {/* Left/Center: Today's Critical Activity (2/3 width on large screens) */}
                    <div className="xl:col-span-2">
                        <section>
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                Today&apos;s Agenda
                            </h2>
                            <TodaysActivityPanel activities={todaysActivity} />
                        </section>

                        {/* Space for future widgets or "Matters on Watchlist" */}
                    </div>

                    {/* Right: Firm Pulse / System Feed (1/3 width) */}
                    <div className="xl:col-span-1 h-full min-h-[500px]">
                        <FirmPulse logs={firmPulseLogs} />
                    </div>
                </div>
            </div>
        </main>
    );
}
