'use client';

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { getFirmPulse } from "@/app/actions/dashboard";
import { cn } from "@/lib/utils";
import { Activity, Circle } from "lucide-react";

interface FirmActivity {
    id: string;
    caseName: string | null;
    person: string;
    action: string;
    type: string;
    timestamp: Date;
    source: string;
}

export function FirmPulse() {
    const [activities, setActivities] = useState<FirmActivity[]>([]);

    useEffect(() => {
        const fetchActivities = async () => {
            const data = await getFirmPulse();
            setActivities(data);
        };

        fetchActivities();
        const interval = setInterval(fetchActivities, 30000); // Poll every 30s
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="w-full rounded-xl bg-white p-8 shadow-sm dark:bg-slate-800 dark:border dark:border-slate-700">
            <div className="mb-8 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Firm Pulse</h2>
                    <div className="hidden items-center gap-2 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-600 dark:bg-green-900/30 dark:text-green-400 sm:flex">
                        <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
                        </span>
                        LIVE
                    </div>
                </div>
            </div>

            <div className="relative space-y-0">
                <AnimatePresence initial={false}>
                    {activities.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">No recent activity found.</p>
                    ) : (
                        activities.map((activity, index) => (
                            <ActivityItem key={activity.id} activity={activity} isLast={index === activities.length - 1} />
                        ))
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

function ActivityItem({ activity, isLast }: { activity: FirmActivity; isLast: boolean }) {
    const timeString = new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
    }).format(new Date(activity.timestamp));

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="group relative flex gap-6 pb-8 last:pb-0"
        >
            {/* Timeline Line */}
            {!isLast && (
                <div className="absolute left-[5px] top-3 h-full w-[2px] bg-slate-100 dark:bg-slate-700 group-hover:bg-teal-50 dark:group-hover:bg-teal-900/20" />
            )}

            {/* Dot */}
            <div className="relative mt-1.5 h-3 w-3 shrink-0 rounded-full bg-teal-500 ring-4 ring-white dark:ring-slate-800 dark:bg-teal-400 group-hover:scale-110 transition-transform" />

            {/* Content */}
            <div className="flex flex-1 flex-col sm:flex-row sm:items-center sm:justify-between gap-1 group-hover:translate-x-1 transition-transform">
                <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        <span className="text-teal-600 dark:text-teal-400 font-semibold">{activity.person}</span>
                        {" "}
                        <span className="text-slate-600 dark:text-slate-400">{formatAction(activity.action)}</span>
                        {" in "}
                        <span className="font-semibold text-slate-900 dark:text-white">
                            {activity.caseName || "Unassigned"}
                        </span>
                    </p>
                </div>
                <span className="text-xs font-medium text-slate-400 dark:text-slate-500 tabular-nums">
                    {timeString}
                </span>
            </div>
        </motion.div>
    );
}

function formatAction(action: string): string {
    // Simple formatter, can be expanded
    return action.replace(/_/g, " ").toLowerCase();
}
