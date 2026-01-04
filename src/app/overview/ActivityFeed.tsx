"use client";

import { useState } from 'react';
import { FileText, Briefcase, AlertCircle, ChevronRight, Gavel, DollarSign, Mail } from 'lucide-react';
import { ScrollArea } from '@/components/ui/ScrollArea';

// Types matching the provided snippet conceptually, but adapted for real data
interface ActiveLog {
    id: string;
    type: string; // 'invoice' | 'matter' | 'brief' | 'payment' | ...
    activityType: string;
    description: string;
    performedBy: string;
    timestamp: Date;
    entityName?: string;
}

interface ActivityFeedProps {
    logs: ActiveLog[];
}

type FilterType = 'all' | 'financial' | 'matters' | 'documents';

export default function ActivityFeed({ logs }: ActivityFeedProps) {
    const [activeFilter, setActiveFilter] = useState<FilterType>('all');

    // Helper: Map backend type to frontend category
    const getCategory = (log: ActiveLog): FilterType => {
        if (log.type === 'invoice' || log.type === 'payment') return 'financial';
        if (log.type === 'matter' || log.type === 'court_appearance') return 'matters';
        if (log.type === 'brief' || log.type === 'document') return 'documents';
        return 'all'; // Default fallback
    };

    // Helper: Map backend type to Icon
    const getActivityIcon = (type: string) => {
        switch (type) {
            case 'invoice': return <FileText className="w-4 h-4 text-emerald-600" />;
            case 'payment': return <DollarSign className="w-4 h-4 text-emerald-600" />;
            case 'matter': return <Gavel className="w-4 h-4 text-violet-600" />;
            case 'brief': return <FileText className="w-4 h-4 text-blue-600" />;
            case 'task': return <AlertCircle className="w-4 h-4 text-amber-600" />;
            default: return <Briefcase className="w-4 h-4 text-slate-500" />;
        }
    };

    const formatTime = (date: Date) => {
        return new Intl.DateTimeFormat('en-GB', {
            hour: 'numeric', minute: 'numeric', hour12: true
        }).format(new Date(date));
    };

    const getFilteredActivity = () => {
        if (activeFilter === 'all') return logs;
        return logs.filter(log => getCategory(log) === activeFilter);
    };

    const getCategoryCount = (category: FilterType): number => {
        return logs.filter(log => getCategory(log) === category).length;
    };

    return (
        <div className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl rounded-2xl shadow-sm border border-slate-200/50 dark:border-white/5">
            <div className="border-b border-slate-200/50 dark:border-slate-800 p-5">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Recent Activity</h2>
                    {/* Placeholder for "View all history" functionality */}
                    <button className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 font-medium flex items-center gap-1 hover:gap-2 transition-all duration-200">
                        View all history
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-2 flex-wrap">
                    {(['all', 'financial', 'matters', 'documents'] as FilterType[]).map((filter) => (
                        <button
                            key={filter}
                            onClick={() => setActiveFilter(filter)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${activeFilter === filter
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                }`}
                        >
                            {filter.charAt(0).toUpperCase() + filter.slice(1)}
                            {filter !== 'all' && ` (${getCategoryCount(filter)})`}
                        </button>
                    ))}
                </div>
            </div>

            {/* Activity List */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
                <ScrollArea className="h-[500px]">
                    {getFilteredActivity().length > 0 ? (
                        getFilteredActivity().map((item) => (
                            <div key={item.id} className="p-5 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors duration-200">
                                <div className="flex items-start gap-4">
                                    <div className="mt-1 p-2 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                                        {getActivityIcon(item.type)}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <div className="font-medium text-slate-900 dark:text-white">
                                                    {item.description}
                                                </div>
                                                <div className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                                                    <span>{item.performedBy}</span>
                                                    {item.entityName && (
                                                        <>
                                                            <span>•</span>
                                                            <span className="text-slate-400 dark:text-slate-500">{item.entityName}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap ml-2">
                                                {formatTime(item.timestamp)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="p-12 text-center">
                            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FileText className="w-8 h-8 text-slate-400 dark:text-slate-500" />
                            </div>
                            <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">No activity yet</h3>
                            <p className="text-slate-500 dark:text-slate-400 text-sm">
                                No {activeFilter !== 'all' ? activeFilter : ''} activity found.
                            </p>
                        </div>
                    )}
                </ScrollArea>
            </div>
        </div>
    );
}
