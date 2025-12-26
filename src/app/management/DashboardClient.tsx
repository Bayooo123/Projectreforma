"use client";

import { useSession } from "next-auth/react";
import { MetricsRow } from "@/components/dashboard/MetricsRow";
import { UpcomingHearings } from "@/components/dashboard/UpcomingHearings";
import { FirmPulse } from "@/components/dashboard/FirmPulse";
import { TaskAssignmentWidget } from "@/components/dashboard/TaskAssignmentWidget";
import { cn } from "@/lib/utils";

interface DashboardClientProps {
    initialData: {
        metrics: any;
        upcomingHearings: any[];
        firmPulseLogs: any[];
        tasks: any[];
        users: any[];
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
        <div className="min-h-screen bg-slate-50/30">
            {/* Sticky Glass Header */}
            <div className="sticky top-0 z-40 w-full backdrop-blur-xl bg-white/70 border-b border-white/50 shadow-sm transition-all duration-500">
                <div className="max-w-[1600px] mx-auto px-8 py-4">
                    <div className="flex justify-between items-center">
                        <div className="animate-in fade-in slide-in-from-top-2 duration-700">
                            <h2 className="text-xl font-medium text-slate-800 tracking-tight">
                                Good morning, <span className="font-semibold text-teal-700">
                                    {user?.name?.split(' ')[0] || 'Counsel'}
                                </span>
                            </h2>
                            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mt-0.5">{currentDate}</p>
                        </div>
                        {/* Could add actionable header buttons here later */}
                    </div>
                </div>
            </div>

            <div className="p-8 max-w-[1600px] mx-auto space-y-8">
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

                        {/* Quick Actions (Task Widget) */}
                        <div className="h-auto">
                            <TaskAssignmentWidget
                                initialTasks={initialData.tasks}
                                users={initialData.users}
                                currentUserId={user?.id || ''}
                            />
                        </div>
                    </div>

                    {/* Right Column: Firm Pulse (Feature Card) */}
                    <div className="h-full min-h-[600px]">
                        <FirmPulse logs={initialData.firmPulseLogs} />
                    </div>

                </div>
            </div>
        </div>
    );
}
