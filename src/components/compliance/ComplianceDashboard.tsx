"use client";

import { useEffect, useState } from 'react';
import { getComplianceTasks, ComplianceTask } from '@/app/actions/compliance';
import ComplianceTaskCard from './ComplianceTaskCard';
import { Loader2, ShieldCheck, AlertCircle, Clock, CheckCircle2 } from 'lucide-react';

interface ComplianceDashboardProps {
    workspaceId: string;
}

export default function ComplianceDashboard({ workspaceId }: ComplianceDashboardProps) {
    const [tasks, setTasks] = useState<ComplianceTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadTasks();
    }, [workspaceId]);

    async function loadTasks() {
        setLoading(true);
        const result = await getComplianceTasks(workspaceId);
        if (result.success) {
            setTasks(result.data);
            setError(null);
        } else {
            setError(result.error);
        }
        setLoading(false);
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-20 text-slate-400">
                <Loader2 className="animate-spin mb-4" size={32} />
                <p>Loading compliance obligations...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 text-center bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl">
                <AlertCircle className="mx-auto mb-4 text-red-500" size={32} />
                <h3 className="text-lg font-semibold text-red-900 dark:text-red-400">Failed to load compliance data</h3>
                <p className="text-red-700 dark:text-red-500">{error}</p>
                <button
                    onClick={loadTasks}
                    className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                    Retry
                </button>
            </div>
        );
    }

    const tiers = ['federal', 'state', 'local'];
    const groupedTasks = tiers.reduce((acc, tier) => {
        acc[tier] = tasks.filter(t => t.obligation.tier === tier);
        return acc;
    }, {} as Record<string, ComplianceTask[]>);

    const stats = {
        total: tasks.length,
        complied: tasks.filter(t => t.status === 'complied').length,
        pending: tasks.filter(t => t.status === 'pending').length,
        overdue: tasks.filter(t => t.status === 'overdue').length,
    };

    return (
        <div className="space-y-8">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider">Total Obligations</span>
                        <ShieldCheck className="text-blue-500" size={20} />
                    </div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm border-l-4 border-l-green-500">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider">Complied</span>
                        <CheckCircle2 className="text-green-500" size={20} />
                    </div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats.complied}</div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm border-l-4 border-l-amber-500">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider">Pending</span>
                        <Clock className="text-amber-500" size={20} />
                    </div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats.pending}</div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm border-l-4 border-l-red-500">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider">Overdue</span>
                        <AlertCircle className="text-red-500" size={20} />
                    </div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats.overdue}</div>
                </div>
            </div>

            {/* Obligation Groups */}
            {tiers.map(tier => (
                <div key={tier} className="space-y-4">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white capitalize flex items-center gap-2">
                        <span className="w-2 h-6 bg-blue-500 rounded-full"></span>
                        {tier} Obligations
                    </h2>
                    {groupedTasks[tier].length > 0 ? (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {groupedTasks[tier].map(task => (
                                <ComplianceTaskCard
                                    key={task.id}
                                    task={task}
                                    onUpdate={loadTasks}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="p-8 text-center bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-500">
                            No {tier} obligations recorded.
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
