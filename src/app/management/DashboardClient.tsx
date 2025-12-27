"use client";

import { useSession } from "next-auth/react";
import { MetricsRow } from "@/components/dashboard/MetricsRow";
import { UpcomingHearings } from "@/components/dashboard/UpcomingHearings";
import { FirmPulse } from "@/components/dashboard/FirmPulse";
import { MyBriefsWidget } from "@/components/dashboard/MyBriefsWidget";
import { cn } from "@/lib/utils";

interface DashboardClientProps {
    initialData: {
        metrics: any;
        upcomingHearings: any[];
        firmPulseLogs: any[];
        tasks: any[];
        users: any[];
        myBriefs: any[];
    }
}

export default function DashboardClient({ initialData }: DashboardClientProps) {
    const { data: session } = useSession();
    const user = session?.user;
    const userRole = 'partner';

    const currentDate = new Intl.DateTimeFormat('en-GB', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    }).format(new Date());

    return (
        <div className="space-y-8">
            {/* Welcome Section - Static layout to respect AppLayout */}
            <div className="flex justify-between items-center animate-in fade-in slide-in-from-top-2 duration-700">
                <div>
                    <h2 className="text-xl font-medium text-slate-800 tracking-tight">
                        Good morning, <span className="font-semibold text-teal-700">
                            {user?.name?.split(' ')[0] || 'Counsel'}
                        </span>
                    </h2>
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mt-0.5">{currentDate}</p>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="animate-in fade-in slide-in-from-bottom-5 duration-1000 delay-100 fill-mode-both">
                <MetricsRow metrics={initialData.metrics} userRole={userRole} />
            </div>

            {/* Cards Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-200 fill-mode-both">

                {/* Left Column: Hearings & Quick Actions */}
                <div className="space-y-8">
                    {/* Upcoming Hearings (Feature Card) */}
                    <div className="h-[420px]">
                        <UpcomingHearings hearings={initialData.upcomingHearings} />
                    </div>

                    {/* Quick Actions (My Briefs Widget) */}
                    <div className="h-auto">
                        <MyBriefsWidget briefs={initialData.myBriefs} />
                    </div>
                </div>

                {/* Right Column: Firm Pulse (Feature Card) */}
                <div className="h-full min-h-[600px]">
                    <FirmPulse logs={initialData.firmPulseLogs} />
                </div>

            </div>
        </div>
    );
}
