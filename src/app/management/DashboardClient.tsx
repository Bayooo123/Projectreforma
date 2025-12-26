"use client";

import { useSession } from "next-auth/react";
import { MetricsRow } from "@/components/dashboard/MetricsRow";
import { UpcomingHearings } from "@/components/dashboard/UpcomingHearings";
import { FirmPulse } from "@/components/dashboard/FirmPulse";
import { TaskAssignmentWidget } from "@/components/dashboard/TaskAssignmentWidget";
import { Button } from "@/components/ui/Button";
import { Plus } from "lucide-react";
import Link from "next/link";

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
    // TODO: Add proper role check
    const userRole = 'partner'; // Placeholder until properly passed from session/db

    return (
        <div className="p-6 max-w-[1600px] mx-auto space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">
                        Good morning, {user?.name?.split(' ')[0] || 'Counsel'}
                    </h1>
                    <p className="text-slate-500 mt-1">Here is what's happening in your firm today.</p>
                </div>
                <div className="flex gap-3">
                    <Link href="/calendar">
                        <Button variant="outline">
                            View Calendar
                        </Button>
                    </Link>
                    <Link href="/briefs">
                        <Button className="bg-slate-900 hover:bg-slate-800">
                            <Plus className="w-4 h-4 mr-2" />
                            New Matter
                        </Button>
                    </Link>
                </div>
            </div>

            {/* 1. The Pulse (Metrics) */}
            <MetricsRow metrics={initialData.metrics} userRole={userRole} />

            {/* 2. Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* Left Column: My Priorities (Task & Calendar Focus) - Spans 7 cols */}
                <div className="lg:col-span-7 space-y-6">
                    <div className="grid grid-cols-1 gap-6">
                        {/* Upcoming Hearings */}
                        <UpcomingHearings hearings={initialData.upcomingHearings} />
                    </div>

                    {/* My Tasks Widget (Existing) */}
                    {/* We reuse the TaskAssignmentWidget but maybe wrap it to fit the style? 
                It seems designed as a full widget. Let's place it here. 
            */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                            <h3 className="font-semibold text-lg">My Priorities</h3>
                        </div>
                        <div className="p-0">
                            <TaskAssignmentWidget
                                initialTasks={initialData.tasks}
                                users={initialData.users}
                                currentUserId={user?.id || ''}
                            />
                        </div>
                    </div>
                </div>

                {/* Right Column: Firm Intelligence (Async Awareness) - Spans 5 cols */}
                <div className="lg:col-span-5 space-y-6">
                    <FirmPulse logs={initialData.firmPulseLogs} />

                    {/* Quick Links / Resources could go here */}
                </div>

            </div>
        </div>
    );
}
