'use client';

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { getFirmPulse } from "@/app/actions/dashboard";

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
        <div className="bg-white dark:bg-slate-800 rounded-xl p-8 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
            <div className="flex justify-between items-center mb-7">
                <div className="text-2xl font-semibold text-slate-900 dark:text-white">Firm Pulse</div>
                <div className="inline-flex items-center gap-2 text-[#10b981] text-[13px] font-semibold px-4 py-2 bg-[#ecfdf5] dark:bg-green-900/20 rounded-full">
                    <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse"></span>
                    LIVE
                </div>
            </div>

            <div className="flex flex-col gap-0">
                <AnimatePresence initial={false}>
                    {activities.map((activity) => (
                        <ActivityItem key={activity.id} activity={activity} />
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
}

function ActivityItem({ activity }: { activity: FirmActivity }) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-5 py-6 border-b border-slate-100 last:border-0 hover:bg-[#f8fffe] dark:hover:bg-slate-700/20 hover:px-8 hover:-mx-8 transition-all duration-200"
        >
            <div className="flex flex-col items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#0f5f5a] dark:bg-teal-500 shrink-0"></div>
                <div className="w-[2px] flex-1 bg-slate-200 dark:bg-slate-700"></div>
            </div>
            <div className="flex-1 pt-[2px]">
                <div className="font-bold text-slate-900 dark:text-white text-base mb-2">
                    {activity.caseName || "General Activity"}
                </div>
                <div className="text-slate-600 dark:text-slate-400 text-[15px] leading-relaxed mb-2">
                    <span className="font-semibold text-[#0f5f5a] dark:text-teal-400">{activity.person}</span>
                    {" "}
                    {formatAction(activity.action)}
                </div>
                <div className="text-[13px] text-slate-400 font-medium">
                    {new Date(activity.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} • {new Date(activity.timestamp).toLocaleDateString()}
                </div>
            </div>
        </motion.div>
    );
}

function formatAction(action: string): string {
    return action.replace(/_/g, " ").toLowerCase();
}
