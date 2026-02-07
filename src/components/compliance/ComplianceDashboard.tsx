'use client';

import { useState, useEffect, useCallback } from "react";
import { getComplianceTasks, ComplianceTask } from "@/app/actions/compliance";
import ComplianceTable from "./ComplianceTable";
import { Loader2 } from "lucide-react";

interface ComplianceDashboardProps {
    workspaceId: string;
}

type Tier = 'Federal' | 'State' | 'Local' | 'International';

export default function ComplianceDashboard({ workspaceId }: ComplianceDashboardProps) {
    const [activeTier, setActiveTier] = useState<Tier>('Federal');
    const [tasks, setTasks] = useState<ComplianceTask[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchTasks = useCallback(async () => {
        setLoading(true);
        const result = await getComplianceTasks(workspaceId, activeTier);
        if (result.success) {
            setTasks(result.data);
        } else {
            console.error(result.error);
        }
        setLoading(false);
    }, [workspaceId, activeTier]);

    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);

    const tabs: Tier[] = ['Local', 'State', 'Federal', 'International'];

    return (
        <div className="space-y-6">
            {/* Tier Navigation */}
            <div className="border-b border-slate-200 dark:border-slate-800">
                <div className="flex gap-8">
                    {tabs.map((tier) => (
                        <button
                            key={tier}
                            onClick={() => setActiveTier(tier)}
                            className={`pb-4 text-sm font-semibold transition-all relative ${activeTier === tier
                                    ? 'text-red-600 dark:text-red-400'
                                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                                }`}
                        >
                            {tier}
                            {activeTier === tier && (
                                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-red-600 dark:bg-red-400" />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Area */}
            {loading ? (
                <div className="py-12 flex justify-center text-slate-400">
                    <Loader2 className="animate-spin" size={24} />
                </div>
            ) : (
                <ComplianceTable
                    tasks={tasks}
                    onUpdate={fetchTasks}
                />
            )}
        </div>
    );
}
