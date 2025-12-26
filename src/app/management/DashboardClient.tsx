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
        <div className="p-8 max-w-[1600px] mx-auto min-h-screen">
            {/* Welcome Section */}
            <div className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <h2 className="text-3xl font-light text-slate-900 mb-2">
                    Good morning, <span className="font-medium bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">
                        {user?.name?.split(' ')[0] || 'Counsel'}
                    </span>
                </h2>
                <p className="text-lg font-light text-slate-500">{currentDate}</p>
            </div>

            {/* Stats Grid */}
            <div className="mb-8 animate-in fade-in slide-in-from-bottom-5 duration-1000 delay-100 fill-mode-both">
                <MetricsRow metrics={initialData.metrics} userRole={userRole} />
            </div>

            {/* Cards Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-200 fill-mode-both">

                {/* Left Column: Hearings & Quick Actions */}
                <div className="space-y-8">
                    {/* Upcoming Hearings (Feature Card Purple) */}
                    <div className="h-[400px]">
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

                {/* Right Column: Firm Pulse (Feature Card Green/Blue) */}
                <div className="h-full min-h-[600px]">
                    <FirmPulse logs={initialData.firmPulseLogs} />
                </div>

            </div>
        </div>
    );
}
