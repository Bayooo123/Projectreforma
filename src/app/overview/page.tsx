import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import StatsGrid, { StatsGridSkeleton } from "./StatsGrid";
import FirmPulse, { FirmPulseSkeleton } from "./FirmPulse";

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

    // Date calculation is instant and static for the day
    const currentDate = new Date().toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    return (
        <main className="min-h-screen bg-slate-50 dark:bg-slate-900">
            <div className="max-w-7xl mx-auto px-6 py-10">
                {/* Header - Loads Instantly */}
                <header className="mb-10">
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                        {getGreeting()}, {firstName}
                    </h1>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                        {currentDate}
                    </p>
                </header>

                {/* KPI Cards Grid - Suspended */}
                <Suspense fallback={<StatsGridSkeleton />}>
                    <StatsGrid />
                </Suspense>

                {/* Firm Pulse - Suspended */}
                <Suspense fallback={<FirmPulseSkeleton />}>
                    <FirmPulse />
                </Suspense>
            </div>
        </main>
    );
}
