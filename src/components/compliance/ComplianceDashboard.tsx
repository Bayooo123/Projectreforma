'use client';

import { useState, useEffect, useCallback } from "react";
import { getComplianceTasks, ComplianceTask } from "@/app/actions/compliance";
import ComplianceTable from "./ComplianceTable";
import { Loader2, MapPin, Map, Building2, Globe, Plus } from "lucide-react";
import EditObligationPanel from "./EditObligationPanel";
import styles from "./Compliance.module.css";

interface ComplianceDashboardProps {
    workspaceId: string;
    initialTasks: ComplianceTask[];
    initialTier: Tier;
}

type Tier = 'Federal' | 'State' | 'Local' | 'International';

export default function ComplianceDashboard({
    workspaceId,
    initialTasks,
    initialTier
}: ComplianceDashboardProps) {
    const [activeTier, setActiveTier] = useState<Tier>(initialTier);
    const [tasks, setTasks] = useState<ComplianceTask[]>(initialTasks);
    const [loading, setLoading] = useState(false);
    
    // Panel state
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<ComplianceTask | null>(null);

    const handleAddObligation = () => {
        setSelectedTask(null);
        setIsPanelOpen(true);
    };

    const handleEditObligation = (task: ComplianceTask) => {
        setSelectedTask(task);
        setIsPanelOpen(true);
    };

    const fetchTasks = useCallback(async () => {
        // If the current tasks match the tier we just switched to from props, skip fetch
        // (This is a small optimization for the first load)
        setLoading(true);
        const result = await getComplianceTasks(workspaceId, activeTier);
        if (result.success) {
            setTasks(result.data);
        } else {
            console.error(result.error);
        }
        setLoading(false);
    }, [workspaceId, activeTier]);

    // Handle tier changes via interaction
    useEffect(() => {
        if (activeTier !== initialTier || tasks !== initialTasks) {
            fetchTasks();
        }
    }, [activeTier, fetchTasks]);

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
                
                <div className="flex-1" />
                <button 
                    onClick={handleAddObligation}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold shadow-sm hover:bg-primary-dark transition-colors"
                >
                    <Plus size={16} />
                    <span>Add Obligation</span>
                </button>
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
                    onEdit={handleEditObligation}
                />
            )}

            <EditObligationPanel 
                isOpen={isPanelOpen}
                onClose={() => setIsPanelOpen(false)}
                task={selectedTask}
                workspaceId={workspaceId}
                tier={activeTier}
                onSaved={fetchTasks}
            />
        </div>
    );
}
