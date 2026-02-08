'use client';

import { useState, useEffect, useCallback } from "react";
import { getComplianceTasks, ComplianceTask } from "@/app/actions/compliance";
import ComplianceTable from "./ComplianceTable";
import { Loader2, MapPin, Map, Building2, Globe } from "lucide-react";
import styles from "./Compliance.module.css";

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

    const tabs: { label: Tier; icon: any }[] = [
        { label: 'Local', icon: MapPin },
        { label: 'State', icon: Map },
        { label: 'Federal', icon: Building2 },
        { label: 'International', icon: Globe },
    ];

    return (
        <div className={styles.dashboardContainer}>
            {/* Tier Navigation */}
            <div className={styles.tierNav}>
                {tabs.map((tab) => (
                    <button
                        key={tab.label}
                        onClick={() => setActiveTier(tab.label)}
                        className={`${styles.tierButton} ${activeTier === tab.label ? styles.active : ''}`}
                    >
                        <tab.icon size={18} />
                        <span>{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* Content Area */}
            {loading ? (
                <div className="py-24 flex flex-col items-center justify-center text-slate-400 gap-4">
                    <Loader2 className="animate-spin text-primary" size={32} />
                    <p className="text-sm font-medium animate-pulse">Synchronizing obligations...</p>
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
