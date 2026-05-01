'use client';

import { useState } from 'react';
import { AlertTriangle, AlertCircle, Info, ChevronDown, ChevronUp, CheckCheck, X, FileText, User, Gavel, DollarSign, Calendar } from 'lucide-react';
import { acknowledgeAnomaly, resolveAnomaly, dismissAnomaly } from '@/app/actions/anomalies';

interface Anomaly {
    id: string;
    type: string;
    severity: string;
    title: string;
    question: string;
    resourceType: string | null;
    resourceId: string | null;
    resourceName: string | null;
    status: string;
    detectedAt: Date;
}

interface AnomalyPanelProps {
    anomalies: Anomaly[];
}

const SEVERITY_CONFIG = {
    critical: { bg: '#fef2f2', border: '#fecaca', text: '#dc2626', icon: AlertCircle, label: 'Critical' },
    high:     { bg: '#fff7ed', border: '#fed7aa', text: '#ea580c', icon: AlertTriangle, label: 'High' },
    medium:   { bg: '#fefce8', border: '#fde68a', text: '#ca8a04', icon: AlertTriangle, label: 'Medium' },
    low:      { bg: '#eff6ff', border: '#bfdbfe', text: '#2563eb', icon: Info, label: 'Low' },
};

const TYPE_ICONS: Record<string, React.ElementType> = {
    SPARSE_BRIEF: FileText,
    PLACEHOLDER_CLIENT: User,
    MISSING_COURT_OUTCOME: Gavel,
    MISSING_EXPENSE_PERIOD: DollarSign,
    UNSCHEDULED_MATTER: Calendar,
};

const TYPE_LABELS: Record<string, string> = {
    SPARSE_BRIEF: 'Empty Brief',
    PLACEHOLDER_CLIENT: 'Placeholder Data',
    MISSING_COURT_OUTCOME: 'Missing Court Update',
    MISSING_EXPENSE_PERIOD: 'Missing Expenses',
    UNSCHEDULED_MATTER: 'Unscheduled Matter',
};

const RESOURCE_LINKS: Record<string, (id: string) => string> = {
    brief: id => `/briefs/${id}`,
    matter: id => `/matters/${id}`,
    client: id => `/management/clients`,
};

export default function AnomalyPanel({ anomalies: initial }: AnomalyPanelProps) {
    const [anomalies, setAnomalies] = useState(initial);
    const [collapsed, setCollapsed] = useState(false);
    const [acting, setActing] = useState<string | null>(null);

    const visible = anomalies.filter(a => a.status === 'open' || a.status === 'acknowledged');
    if (visible.length === 0) return null;

    const criticalCount = visible.filter(a => a.severity === 'critical').length;
    const headerBg = criticalCount > 0 ? '#fef2f2' : '#fff7ed';
    const headerBorder = criticalCount > 0 ? '#fecaca' : '#fed7aa';
    const headerText = criticalCount > 0 ? '#dc2626' : '#ea580c';

    const act = async (id: string, fn: (id: string) => Promise<{ success: boolean }>) => {
        setActing(id);
        await fn(id);
        setAnomalies(prev => prev.filter(a => a.id !== id));
        setActing(null);
    };

    return (
        <div style={{ marginBottom: '1.5rem', borderRadius: '12px', border: `1px solid ${headerBorder}`, overflow: 'hidden' }}>
            {/* Header */}
            <button
                onClick={() => setCollapsed(c => !c)}
                style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0.85rem 1rem', background: headerBg, border: 'none', cursor: 'pointer',
                    borderBottom: collapsed ? 'none' : `1px solid ${headerBorder}`,
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <AlertTriangle size={16} color={headerText} />
                    <span style={{ fontWeight: 700, fontSize: '0.82rem', color: headerText }}>
                        {visible.length} Active Anomaly{visible.length !== 1 ? 'ies' : 'y'}
                    </span>
                    {criticalCount > 0 && (
                        <span style={{ background: '#dc2626', color: '#fff', fontSize: '0.65rem', fontWeight: 700, padding: '1px 7px', borderRadius: '999px' }}>
                            {criticalCount} critical
                        </span>
                    )}
                    <span style={{ fontSize: '0.72rem', color: headerText, opacity: 0.7 }}>— issues that ought not to be</span>
                </div>
                {collapsed ? <ChevronDown size={16} color={headerText} /> : <ChevronUp size={16} color={headerText} />}
            </button>

            {!collapsed && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                    {visible.map((anomaly, idx) => {
                        const sev = SEVERITY_CONFIG[anomaly.severity as keyof typeof SEVERITY_CONFIG] ?? SEVERITY_CONFIG.medium;
                        const SevIcon = sev.icon;
                        const TypeIcon = TYPE_ICONS[anomaly.type] ?? AlertTriangle;
                        const link = anomaly.resourceType && anomaly.resourceId ? RESOURCE_LINKS[anomaly.resourceType]?.(anomaly.resourceId) : null;
                        const isAcknowledged = anomaly.status === 'acknowledged';

                        return (
                            <div
                                key={anomaly.id}
                                style={{
                                    padding: '1rem',
                                    background: isAcknowledged ? '#f9fafb' : sev.bg,
                                    borderBottom: idx < visible.length - 1 ? `1px solid ${headerBorder}` : 'none',
                                    opacity: isAcknowledged ? 0.7 : 1,
                                    transition: 'opacity 0.2s',
                                }}
                            >
                                {/* Top row: badges + title */}
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                                        <span style={{
                                            display: 'inline-flex', alignItems: 'center', gap: '3px',
                                            fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                                            padding: '2px 8px', borderRadius: '999px',
                                            background: sev.text + '18', color: sev.text,
                                        }}>
                                            <SevIcon size={9} />
                                            {sev.label}
                                        </span>
                                        <span style={{
                                            display: 'inline-flex', alignItems: 'center', gap: '3px',
                                            fontSize: '0.62rem', fontWeight: 600, padding: '2px 8px', borderRadius: '999px',
                                            background: 'rgba(0,0,0,0.06)', color: '#374151',
                                        }}>
                                            <TypeIcon size={9} />
                                            {TYPE_LABELS[anomaly.type] ?? anomaly.type}
                                        </span>
                                    </div>
                                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#111827', flex: 1 }}>
                                        {anomaly.title}
                                        {link && (
                                            <a href={link} style={{ marginLeft: '0.4rem', fontSize: '0.68rem', color: '#6366f1', fontWeight: 400 }}>
                                                View →
                                            </a>
                                        )}
                                    </span>
                                </div>

                                {/* Question */}
                                <p style={{ fontSize: '0.78rem', color: '#374151', lineHeight: 1.55, margin: '0 0 0.75rem', fontStyle: 'italic' }}>
                                    &ldquo;{anomaly.question}&rdquo;
                                </p>

                                {/* Actions */}
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    {!isAcknowledged && (
                                        <button
                                            onClick={() => act(anomaly.id, acknowledgeAnomaly)}
                                            disabled={acting === anomaly.id}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '4px',
                                                padding: '0.35rem 0.85rem', borderRadius: '6px', border: `1px solid ${sev.border}`,
                                                background: '#fff', color: sev.text, fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer',
                                            }}
                                        >
                                            <CheckCheck size={12} /> Acknowledge
                                        </button>
                                    )}
                                    <button
                                        onClick={() => act(anomaly.id, resolveAnomaly)}
                                        disabled={acting === anomaly.id}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '4px',
                                            padding: '0.35rem 0.85rem', borderRadius: '6px', border: 'none',
                                            background: sev.text, color: '#fff', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer',
                                        }}
                                    >
                                        Resolved
                                    </button>
                                    <button
                                        onClick={() => act(anomaly.id, dismissAnomaly)}
                                        disabled={acting === anomaly.id}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '4px',
                                            padding: '0.35rem 0.7rem', borderRadius: '6px',
                                            border: '1px solid #e5e7eb', background: 'transparent', color: '#9ca3af',
                                            fontSize: '0.72rem', cursor: 'pointer',
                                        }}
                                        title="Not relevant — dismiss"
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
