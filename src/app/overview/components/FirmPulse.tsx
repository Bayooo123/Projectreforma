'use client';

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { getFirmPulse } from "@/app/actions/dashboard";
import { Activity } from "lucide-react";

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
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchActivities = async () => {
            const data = await getFirmPulse();
            setActivities(data);
            setIsLoading(false);
        };

        fetchActivities();
        const interval = setInterval(fetchActivities, 30000); // Poll every 30s
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="mt-8 bg-surface rounded-xl p-8 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
            <div className="flex justify-between items-center mb-7">
                <div className="text-2xl font-semibold text-primary">Firm Pulse</div>
                <div className="inline-flex items-center gap-2 text-success text-[13px] font-semibold px-4 py-2 bg-success-bg rounded-full">
                    <span className="w-2 h-2 rounded-full bg-success animate-pulse"></span>
                    LIVE
                </div>
            </div>

            <div className="flex flex-col gap-0">
                {isLoading ? (
                    // Loading Skeletons
                    <div className="space-y-4">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="flex gap-5 py-6 border-b border-border last:border-0">
                                <div className="flex flex-col items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-surface-subtle animate-pulse"></div>
                                    <div className="w-[2px] flex-1 bg-border"></div>
                                </div>
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 w-1/3 bg-surface-subtle rounded animate-pulse"></div>
                                    <div className="h-4 w-2/3 bg-surface-subtle rounded animate-pulse"></div>
                                    <div className="h-3 w-1/4 bg-surface-subtle rounded animate-pulse"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : activities.length === 0 ? (
                    // Empty State
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="w-16 h-16 rounded-full bg-surface-subtle flex items-center justify-center mb-4">
                            <Activity className="w-8 h-8 text-tertiary" />
                        </div>
                        <p className="text-secondary text-base font-medium mb-1">No recent activity</p>
                        <p className="text-tertiary text-sm">Activity from matters, briefs, and invitations will appear here</p>
                    </div>
                ) : (
                    // Activity List
                    <AnimatePresence initial={false}>
                        {activities.map((activity) => (
                            <ActivityItem key={activity.id} activity={activity} />
                        ))}
                    </AnimatePresence>
                )}
            </div>
        </div>
    );
}

function ActivityItem({ activity }: { activity: FirmActivity }) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-5 py-6 border-b border-border last:border-0 hover:bg-hover-bg hover:px-8 hover:-mx-8 transition-all duration-200"
        >
            <div className="flex flex-col items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-teal-text shrink-0"></div>
                <div className="w-[2px] flex-1 bg-border"></div>
            </div>
            <div className="flex-1 pt-[2px]">
                <div className="font-bold text-primary text-base mb-2">
                    {activity.caseName || "General Activity"}
                </div>
                <div className="text-secondary text-[15px] leading-relaxed mb-2">
                    <span className="font-semibold text-teal-text">{activity.person}</span>
                    {" "}
                    {formatAction(activity.action)}
                </div>
                <div className="text-[13px] text-tertiary font-medium">
                    {new Date(activity.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} • {new Date(activity.timestamp).toLocaleDateString()}
                </div>
            </div>
        </motion.div>
    );
}

function formatAction(action: string): string {
    return action.replace(/_/g, " ").toLowerCase();
}

