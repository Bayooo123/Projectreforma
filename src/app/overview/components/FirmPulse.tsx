'use client';

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { getFirmPulse } from "@/app/actions/dashboard";
import { Activity, Mail, AlertTriangle, FileText, CreditCard, Scale, MessageSquare, Clock } from "lucide-react";

interface FirmActivity {
    id: string;
    type: string;
    pulseEventId?: string;
    intent?: string;
    urgency?: string;
    title?: string;
    description: string;
    activityType: string;
    timestamp: Date;
    performedBy: string;
    entityName: string;
    assignedTo?: string | null;
    contactType?: string;
    status?: string;
    actionItems?: string[];
    briefNumber?: string | null;
}

const INTENT_META: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
    CLIENT_QUERY:       { label: 'Client Query',      color: '#3b82f6', bg: 'rgba(59,130,246,0.1)',  icon: MessageSquare },
    COURT_NOTICE:       { label: 'Court Notice',      color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   icon: Scale },
    ADJOURNMENT:        { label: 'Adjournment',       color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  icon: Clock },
    DOCUMENT_RECEIVED:  { label: 'Document',          color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)',  icon: FileText },
    PAYMENT:            { label: 'Payment',           color: '#10b981', bg: 'rgba(16,185,129,0.1)',  icon: CreditCard },
    NEW_INSTRUCTION:    { label: 'New Instruction',   color: '#f97316', bg: 'rgba(249,115,22,0.1)',  icon: Mail },
    CORRESPONDENCE:     { label: 'Correspondence',    color: '#6b7280', bg: 'rgba(107,114,128,0.1)', icon: Mail },
};

const URGENCY_DOT: Record<string, string> = {
    critical: '#ef4444',
    high:     '#f59e0b',
    normal:   '#10b981',
    low:      '#6b7280',
};

export function FirmPulse() {
    const [activities, setActivities] = useState<FirmActivity[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchActivities = async () => {
            const data = await getFirmPulse();
            setActivities(data as FirmActivity[]);
            setIsLoading(false);
        };

        fetchActivities();
        const interval = setInterval(fetchActivities, 60000);
        return () => clearInterval(interval);
    }, []);

    const pulseItems  = activities.filter(a => a.type === 'pulse');
    const activityItems = activities.filter(a => a.type !== 'pulse').slice(0, 10);

    return (
        <div className="mt-8 space-y-6">
            {/* ── Intelligence Feed ── */}
            <div className="bg-surface rounded-xl p-8 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
                <div className="flex justify-between items-center mb-7">
                    <div>
                        <div className="text-2xl font-semibold text-primary">Intelligence Feed</div>
                        <div className="text-sm text-secondary mt-1">Emails captured by institutional memory</div>
                    </div>
                    <div className="inline-flex items-center gap-2 text-success text-[13px] font-semibold px-4 py-2 bg-success-bg rounded-full">
                        <span className="w-2 h-2 rounded-full bg-success animate-pulse"></span>
                        LIVE
                    </div>
                </div>

                {isLoading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-24 rounded-xl bg-surface-subtle animate-pulse" />
                        ))}
                    </div>
                ) : pulseItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="w-16 h-16 rounded-full bg-surface-subtle flex items-center justify-center mb-4">
                            <Mail className="w-8 h-8 text-tertiary" />
                        </div>
                        <p className="text-secondary text-base font-medium mb-1">No emails captured yet</p>
                        <p className="text-tertiary text-sm">BCC your firm memory address on client emails to start building institutional knowledge</p>
                    </div>
                ) : (
                    <AnimatePresence initial={false}>
                        <div className="flex flex-col gap-3">
                            {pulseItems.map(item => (
                                <PulseCard key={item.id} item={item} />
                            ))}
                        </div>
                    </AnimatePresence>
                )}
            </div>

            {/* ── Firm Activity ── */}
            <div className="bg-surface rounded-xl p-8 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
                <div className="text-2xl font-semibold text-primary mb-7">Firm Activity</div>
                <div className="flex flex-col gap-0">
                    {isLoading ? (
                        <div className="space-y-4">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="flex gap-5 py-6 border-b border-border last:border-0">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-surface-subtle animate-pulse" />
                                        <div className="w-[2px] flex-1 bg-border" />
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <div className="h-4 w-1/3 bg-surface-subtle rounded animate-pulse" />
                                        <div className="h-4 w-2/3 bg-surface-subtle rounded animate-pulse" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : activityItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <Activity className="w-8 h-8 text-tertiary mb-4" />
                            <p className="text-secondary text-base font-medium">No recent activity</p>
                        </div>
                    ) : (
                        <AnimatePresence initial={false}>
                            {activityItems.map(activity => (
                                <ActivityItem key={activity.id} activity={activity} />
                            ))}
                        </AnimatePresence>
                    )}
                </div>
            </div>
        </div>
    );
}

function PulseCard({ item }: { item: FirmActivity }) {
    const meta   = INTENT_META[item.intent || 'CORRESPONDENCE'] || INTENT_META['CORRESPONDENCE'];
    const Icon   = meta.icon;
    const dotColor = URGENCY_DOT[item.urgency || 'normal'];
    const isNew  = item.status === 'new';

    return (
        <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-border p-5 hover:border-teal-500/30 transition-all duration-200"
            style={{ borderLeftWidth: 3, borderLeftColor: meta.color }}
        >
            <div className="flex items-start gap-4">
                {/* Intent icon */}
                <div className="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center mt-0.5" style={{ background: meta.bg }}>
                    <Icon size={18} style={{ color: meta.color }} />
                </div>

                <div className="flex-1 min-w-0">
                    {/* Header row */}
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: meta.bg, color: meta.color }}>
                            {meta.label}
                        </span>
                        {item.urgency && item.urgency !== 'normal' && (
                            <span className="flex items-center gap-1 text-xs font-medium" style={{ color: dotColor }}>
                                <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: dotColor }} />
                                {item.urgency.toUpperCase()}
                            </span>
                        )}
                        {isNew && (
                            <span className="text-xs font-semibold text-teal-text bg-teal-bg px-2 py-0.5 rounded-full">NEW</span>
                        )}
                    </div>

                    {/* Title */}
                    <div className="font-semibold text-primary text-[15px] mb-1 truncate">
                        {item.title || item.description}
                    </div>

                    {/* Summary */}
                    <div className="text-secondary text-sm leading-relaxed mb-2">
                        {item.description}
                    </div>

                    {/* Meta row */}
                    <div className="flex items-center gap-3 text-xs text-tertiary flex-wrap">
                        <span>
                            From: <span className="font-medium text-secondary">{item.performedBy}</span>
                        </span>
                        {item.entityName && item.entityName !== 'Unmatched' && (
                            <span>
                                Brief: <span className="font-medium text-secondary">{item.entityName}</span>
                                {item.briefNumber && <span className="text-tertiary"> ({item.briefNumber})</span>}
                            </span>
                        )}
                        {item.assignedTo && (
                            <span>
                                Assigned: <span className="font-medium text-secondary">{item.assignedTo}</span>
                            </span>
                        )}
                        <span>{formatRelativeTime(new Date(item.timestamp))}</span>
                    </div>
                </div>
            </div>
        </motion.div>
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
                <div className="w-3 h-3 rounded-full bg-teal-text shrink-0" />
                <div className="w-[2px] flex-1 bg-border" />
            </div>
            <div className="flex-1 pt-[2px]">
                <div className="font-bold text-primary text-base mb-2">
                    {activity.entityName || 'General Activity'}
                </div>
                <div className="text-secondary text-[15px] leading-relaxed mb-2">
                    <span className="font-semibold text-teal-text">{activity.performedBy}</span>
                    {' '}
                    {activity.description.replace(/_/g, ' ').toLowerCase()}
                </div>
                <div className="text-[13px] text-tertiary font-medium">
                    {formatRelativeTime(new Date(activity.timestamp))}
                </div>
            </div>
        </motion.div>
    );
}

function formatRelativeTime(date: Date): string {
    const now  = Date.now();
    const diff = now - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1)  return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)  return `${hrs}h ago`;
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
