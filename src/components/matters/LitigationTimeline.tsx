'use client';

import { useState, useEffect, useTransition } from 'react';
import { Check, Clock, AlertCircle, Minus, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import {
    getMilestonesForMatter,
    completeMilestone,
    waiveMilestone,
    updateMilestoneDueDate,
    type LitigationMilestone,
} from '@/app/actions/litigation-milestones';
import {
    MILESTONE_CONFIG,
    MILESTONE_ORDER,
    PHASE_LABELS,
    PHASE_ORDER,
    type LitigationMilestoneType,
    type MilestonePhase,
    type MilestoneConfig,
} from '@/lib/litigation/milestones';

interface Props {
    matterId: string;
}

type StatusFilter = 'all' | 'active' | 'overdue';

export default function LitigationTimeline({ matterId }: Props) {
    const [milestones, setMilestones] = useState<LitigationMilestone[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(true);
    const [filter, setFilter] = useState<StatusFilter>('active');
    const [actingOn, setActingOn] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();
    const [editingDate, setEditingDate] = useState<string | null>(null);
    const [dateInput, setDateInput] = useState('');

    useEffect(() => {
        getMilestonesForMatter(matterId).then(data => {
            setMilestones(data);
            setLoading(false);
        });
    }, [matterId]);

    function handleComplete(id: string) {
        setActingOn(id);
        startTransition(async () => {
            const res = await completeMilestone(id);
            if (res.success) {
                const updated = await getMilestonesForMatter(matterId);
                setMilestones(updated);
            }
            setActingOn(null);
        });
    }

    function handleWaive(id: string) {
        setActingOn(id);
        startTransition(async () => {
            await waiveMilestone(id, 'Waived — not applicable');
            const updated = await getMilestonesForMatter(matterId);
            setMilestones(updated);
            setActingOn(null);
        });
    }

    function handleSaveDate(id: string) {
        if (!dateInput) return;
        startTransition(async () => {
            await updateMilestoneDueDate(id, new Date(dateInput));
            const updated = await getMilestonesForMatter(matterId);
            setMilestones(updated);
            setEditingDate(null);
            setDateInput('');
        });
    }

    if (loading) {
        return (
            <div style={sectionStyle}>
                <div style={headerStyle}>
                    <span style={titleStyle}>Litigation Timeline</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#94a3b8', fontSize: 12, padding: '8px 0' }}>
                    <Loader2 size={13} className="animate-spin" /> Loading milestones...
                </div>
            </div>
        );
    }

    const byType = Object.fromEntries(milestones.map(m => [m.type, m]));

    const filteredTypes = MILESTONE_ORDER.filter(type => {
        const m = byType[type];
        if (!m) return false;
        if (filter === 'all') return true;
        if (filter === 'overdue') return m.status === 'OVERDUE';
        // 'active' = not completed and not waived
        return m.status !== 'COMPLETED' && m.status !== 'WAIVED';
    });

    const completedCount = milestones.filter(m => m.status === 'COMPLETED').length;
    const overdueCount = milestones.filter(m => m.status === 'OVERDUE').length;
    const totalActive = milestones.filter(m => m.status !== 'WAIVED').length;

    // Group visible milestones by phase
    const phaseGroups: Record<MilestonePhase, LitigationMilestoneType[]> = {
        ORIGINATING: [], PLEADINGS: [], PRE_TRIAL: [], TRIAL: [], POST_TRIAL: [],
    };
    for (const type of filteredTypes) {
        phaseGroups[MILESTONE_CONFIG[type].phase].push(type);
    }

    return (
        <div style={sectionStyle}>
            <div style={headerStyle} onClick={() => setExpanded(v => !v)} role="button">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={titleStyle}>Litigation Timeline</span>
                    <span style={progressBadgeStyle}>{completedCount}/{totalActive}</span>
                    {overdueCount > 0 && (
                        <span style={{ ...progressBadgeStyle, background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
                            {overdueCount} overdue
                        </span>
                    )}
                </div>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex' }}>
                    {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                </button>
            </div>

            {expanded && (
                <>
                    {/* Filter tabs */}
                    <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                        {(['active', 'all', 'overdue'] as StatusFilter[]).map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                style={{
                                    padding: '3px 10px', fontSize: 10, borderRadius: 20, cursor: 'pointer',
                                    fontWeight: 600, textTransform: 'capitalize',
                                    border: filter === f ? '1px solid #0d9488' : '1px solid #e2e8f0',
                                    background: filter === f ? '#f0fdfa' : 'transparent',
                                    color: filter === f ? '#0d9488' : '#64748b',
                                }}
                            >
                                {f === 'active' ? 'Pending' : f.charAt(0).toUpperCase() + f.slice(1)}
                            </button>
                        ))}
                    </div>

                    {filteredTypes.length === 0 ? (
                        <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>
                            {filter === 'overdue' ? 'No overdue milestones.' : 'All milestones completed or waived.'}
                        </p>
                    ) : (
                        <div style={{ position: 'relative' }}>
                            {PHASE_ORDER.filter(ph => phaseGroups[ph].length > 0).map(phase => (
                                <div key={phase} style={{ marginBottom: 16 }}>
                                    <div style={phaseHeaderStyle}>{PHASE_LABELS[phase]}</div>
                                    {phaseGroups[phase].map(type => {
                                        const m = byType[type];
                                        const cfg = MILESTONE_CONFIG[type];
                                        const isLast = type === phaseGroups[phase][phaseGroups[phase].length - 1];
                                        return (
                                            <MilestoneRow
                                                key={type}
                                                milestone={m}
                                                config={cfg}
                                                isLast={isLast}
                                                actingOn={actingOn}
                                                editingDate={editingDate}
                                                dateInput={dateInput}
                                                isPending={isPending}
                                                onComplete={handleComplete}
                                                onWaive={handleWaive}
                                                onEditDate={id => { setEditingDate(id); setDateInput(m.dueDate ? new Date(m.dueDate).toISOString().slice(0, 10) : ''); }}
                                                onSaveDate={handleSaveDate}
                                                onCancelDate={() => { setEditingDate(null); setDateInput(''); }}
                                                onDateChange={setDateInput}
                                            />
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

interface RowProps {
    milestone: LitigationMilestone;
    config: MilestoneConfig;
    isLast: boolean;
    actingOn: string | null;
    editingDate: string | null;
    dateInput: string;
    isPending: boolean;
    onComplete: (id: string) => void;
    onWaive: (id: string) => void;
    onEditDate: (id: string) => void;
    onSaveDate: (id: string) => void;
    onCancelDate: () => void;
    onDateChange: (v: string) => void;
}

function MilestoneRow({
    milestone: m, config, isLast,
    actingOn, editingDate, dateInput, isPending,
    onComplete, onWaive, onEditDate, onSaveDate, onCancelDate, onDateChange,
}: RowProps) {
    const isBusy = actingOn === m.id || isPending;
    const isEditingThis = editingDate === m.id;

    const dotColor =
        m.status === 'COMPLETED' ? '#0d9488' :
        m.status === 'OVERDUE' ? '#dc2626' :
        m.status === 'WAIVED' ? '#cbd5e1' :
        m.status === 'IN_PROGRESS' ? '#2563eb' :
        '#e2e8f0';

    const dotIcon =
        m.status === 'COMPLETED' ? <Check size={9} color="#fff" strokeWidth={3} /> :
        m.status === 'OVERDUE' ? <AlertCircle size={9} color="#fff" strokeWidth={2.5} /> :
        m.status === 'WAIVED' ? <Minus size={9} color="#fff" strokeWidth={2.5} /> :
        null;

    const now = new Date();
    const dueDate = m.dueDate ? new Date(m.dueDate) : null;
    const daysUntilDue = dueDate ? Math.ceil((dueDate.getTime() - now.getTime()) / 86_400_000) : null;
    const dueSoon = daysUntilDue !== null && daysUntilDue >= 0 && daysUntilDue <= 7;

    return (
        <div style={{ display: 'flex', gap: 10, position: 'relative' }}>
            {/* Dot + line */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: 18 }}>
                <div style={{
                    width: 18, height: 18, borderRadius: '50%',
                    background: dotColor,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, zIndex: 1,
                    border: m.status === 'PENDING' ? '1.5px solid #cbd5e1' : 'none',
                }}>
                    {dotIcon}
                </div>
                {!isLast && <div style={{ width: 1, flex: 1, background: '#e2e8f0', minHeight: 20 }} />}
            </div>

            {/* Content */}
            <div style={{ flex: 1, paddingBottom: isLast ? 0 : 12 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
                    <div>
                        <span style={{
                            fontSize: 11, fontWeight: 600,
                            color: m.status === 'COMPLETED' ? '#94a3b8' : m.status === 'WAIVED' ? '#cbd5e1' : '#1e293b',
                            textDecoration: m.status === 'WAIVED' ? 'line-through' : 'none',
                        }}>
                            {config.label}
                        </span>
                        {m.status === 'COMPLETED' && m.completedAt && (
                            <span style={metaStyle}> · Done {new Date(m.completedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                        )}
                        {m.status === 'OVERDUE' && dueDate && (
                            <span style={{ ...metaStyle, color: '#dc2626' }}> · Overdue since {dueDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                        )}
                        {m.status === 'WAIVED' && (
                            <span style={metaStyle}> · Waived</span>
                        )}
                    </div>

                    {/* Actions — only for non-terminal statuses */}
                    {(m.status === 'PENDING' || m.status === 'IN_PROGRESS' || m.status === 'OVERDUE') && (
                        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                            <button
                                onClick={() => onComplete(m.id)}
                                disabled={isBusy}
                                style={{ ...actionBtnStyle, background: '#f0fdfa', color: '#0d9488', border: '1px solid #ccfbf1' }}
                                title="Mark done"
                            >
                                {actingOn === m.id ? <Loader2 size={9} className="animate-spin" /> : <Check size={9} strokeWidth={3} />}
                            </button>
                            <button
                                onClick={() => onWaive(m.id)}
                                disabled={isBusy}
                                style={{ ...actionBtnStyle, background: '#f8fafc', color: '#94a3b8', border: '1px solid #e2e8f0' }}
                                title="Waive — not applicable"
                            >
                                <Minus size={9} strokeWidth={2.5} />
                            </button>
                        </div>
                    )}
                </div>

                {/* Due date row */}
                {isEditingThis ? (
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginTop: 4 }}>
                        <input
                            type="date"
                            value={dateInput}
                            onChange={e => onDateChange(e.target.value)}
                            style={{ fontSize: 10, padding: '2px 6px', border: '1px solid #e2e8f0', borderRadius: 4, outline: 'none' }}
                        />
                        <button onClick={() => onSaveDate(m.id)} disabled={!dateInput} style={{ ...actionBtnStyle, background: '#f0fdfa', color: '#0d9488', border: '1px solid #ccfbf1', padding: '2px 8px', fontSize: 9 }}>Save</button>
                        <button onClick={onCancelDate} style={{ ...actionBtnStyle, background: 'transparent', color: '#94a3b8', border: '1px solid #e2e8f0', padding: '2px 8px', fontSize: 9 }}>Cancel</button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                        {dueDate ? (
                            <span style={{ ...metaStyle, display: 'flex', alignItems: 'center', gap: 3, color: dueSoon ? '#d97706' : '#94a3b8' }}>
                                <Clock size={9} />
                                Due {dueDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                {dueSoon && ` (${daysUntilDue}d)`}
                            </span>
                        ) : (
                            m.status !== 'COMPLETED' && m.status !== 'WAIVED' && config.deadlineDays ? (
                                <span style={{ ...metaStyle, color: '#cbd5e1' }}>No deadline set</span>
                            ) : null
                        )}
                        {m.status !== 'COMPLETED' && m.status !== 'WAIVED' && (
                            <button
                                onClick={() => onEditDate(m.id)}
                                style={{ fontSize: 9, background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0 }}
                            >
                                {dueDate ? 'edit date' : 'set date'}
                            </button>
                        )}
                    </div>
                )}

                {m.notes && (
                    <p style={{ ...metaStyle, marginTop: 2, fontStyle: 'italic' }}>{m.notes}</p>
                )}
            </div>
        </div>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const sectionStyle: React.CSSProperties = {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 10,
    padding: '12px 14px',
    marginTop: 12,
};

const headerStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 12, cursor: 'pointer',
};

const titleStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, color: '#475569',
    textTransform: 'uppercase', letterSpacing: '0.06em',
};

const progressBadgeStyle: React.CSSProperties = {
    fontSize: 10, fontWeight: 500, color: '#0d9488',
    background: '#f0fdfa', padding: '1px 7px', borderRadius: 20,
    border: '1px solid #ccfbf1',
};

const phaseHeaderStyle: React.CSSProperties = {
    fontSize: 9, fontWeight: 700, color: '#94a3b8',
    textTransform: 'uppercase', letterSpacing: '0.08em',
    marginBottom: 8,
};

const metaStyle: React.CSSProperties = {
    fontSize: 10, color: '#94a3b8',
};

const actionBtnStyle: React.CSSProperties = {
    padding: '3px 6px', borderRadius: 4, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
};
