'use client';

import { useState, useEffect, useCallback } from "react";
import { getComplianceTasks, ComplianceTask, ComplianceSummary } from "@/app/actions/compliance";
import ComplianceTable from "./ComplianceTable";
import { Loader2, MapPin, Map, Building2, Globe, Plus } from "lucide-react";
import EditObligationPanel from "./EditObligationPanel";
import styles from "./Compliance.module.css";
import { useIsMobile } from "@/hooks/useIsMobile";
import { Icon } from "@/components/mobile/MobileShared";

interface ComplianceDashboardProps {
    workspaceId: string;
    initialTasks: ComplianceTask[];
    initialTier: Tier;
    summary: ComplianceSummary;
}

type Tier = 'Federal' | 'State' | 'Local' | 'International';

function ScoreWidget({ summary }: { summary: ComplianceSummary }) {
    const r = 40;
    const circ = 2 * Math.PI * r;
    const offset = circ * (1 - summary.score / 100);
    const tiers = ['Federal', 'State', 'Local', 'International'] as const;

    return (
        <div className={styles.scoreWidget}>
            <div className={styles.scoreRing}>
                <svg viewBox="0 0 100 100" width="88" height="88">
                    <circle cx="50" cy="50" r={r} fill="none" stroke="#064e3b" strokeOpacity="0.12" strokeWidth="9" />
                    <circle
                        cx="50" cy="50" r={r} fill="none"
                        stroke="#059669" strokeWidth="9" strokeLinecap="round"
                        strokeDasharray={circ}
                        strokeDashoffset={offset}
                        transform="rotate(-90 50 50)"
                        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
                    />
                    <text x="50" y="46" textAnchor="middle" fontSize="20" fontWeight="700" fill="#064e3b" fontFamily="Georgia, serif">
                        {summary.score}%
                    </text>
                    <text x="50" y="62" textAnchor="middle" fontSize="9" fill="#6B7280" fontFamily="sans-serif">
                        score
                    </text>
                </svg>
            </div>

            <div className={styles.scoreDivider} />

            <div className={styles.scoreStats}>
                <div className={styles.scoreMain}>
                    <span className={styles.scorePrimary}>{summary.concluded}</span>
                    <span className={styles.scoreLabel}> of {summary.total} obligations concluded</span>
                </div>
                <div className={styles.scorePills}>
                    {summary.overdue > 0 && (
                        <span className={styles.pillOverdue}>{summary.overdue} Overdue</span>
                    )}
                    {summary.dueSoon > 0 && (
                        <span className={styles.pillDueSoon}>{summary.dueSoon} Due Soon</span>
                    )}
                    {summary.pending > 0 && (
                        <span className={styles.pillPending}>{summary.pending} Pending</span>
                    )}
                    {summary.total > 0 && summary.concluded === summary.total && (
                        <span className={styles.pillDone}>All current ✓</span>
                    )}
                    {summary.total === 0 && (
                        <span className={styles.pillPending}>Run seed script to populate obligations</span>
                    )}
                </div>
            </div>

            <div className={styles.scoreDivider} />

            <div className={styles.scoreTiers}>
                {tiers.map(tier => {
                    const t = summary.byTier[tier];
                    if (!t || t.total === 0) return null;
                    const pct = Math.round((t.concluded / t.total) * 100);
                    return (
                        <div key={tier} className={styles.tierStat}>
                            <span className={styles.tierStatLabel}>{tier}</span>
                            <span className={styles.tierScore}>{t.concluded}/{t.total}</span>
                            <div className={styles.tierBar}>
                                <div className={styles.tierBarFill} style={{ width: `${pct}%` }} />
                            </div>
                        </div>
                    );
                })}
                {Object.keys(summary.byTier).length === 0 && (
                    <span className={styles.scoreLabel} style={{ fontSize: 11 }}>No data yet</span>
                )}
            </div>
        </div>
    );
}

export default function ComplianceDashboard({
    workspaceId,
    initialTasks,
    initialTier,
    summary,
}: ComplianceDashboardProps) {
    const [activeTier, setActiveTier] = useState<Tier>(initialTier);
    const [tasks, setTasks] = useState<ComplianceTask[]>(initialTasks);
    const [loading, setLoading] = useState(false);
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
        setLoading(true);
        const result = await getComplianceTasks(workspaceId, activeTier);
        if (result.success) setTasks(result.data);
        setLoading(false);
    }, [workspaceId, activeTier]);

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

    const isMobile = useIsMobile();

    if (isMobile) {
        const scoreR = 40;
        const scoreCirc = 2 * Math.PI * scoreR;
        const scoreOffset = scoreCirc * (1 - summary.score / 100);

        const tiers = ['Local', 'State', 'Federal', 'International'] as const;
        const tierIcons = { Local: 'pin', State: 'map', Federal: 'building', International: 'globe' };

        const fmtDate = (d: string | Date | null | undefined) => {
            if (!d) return '';
            return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        };

        const getStatusPill = (statusStr: string) => {
            const s = (statusStr || '').toLowerCase();
            if (s === 'concluded' || s === 'complied') return { label: 'Complied', cls: 'active' };
            if (s === 'overdue') return { label: 'Overdue', cls: 'today' };
            if (s === 'due_soon') return { label: 'Due Soon', cls: 'soon' };
            return { label: 'Pending', cls: 'pending' };
        };

        return (
            <div className="rm-screen">
                <div className="rm-scroll">
                    {/* Header */}
                    <div className="rm-hdr" style={{ borderBottom: '1px solid var(--rm-border)' }}>
                        <div className="rm-hdr-row" style={{ alignItems: 'center' }}>
                            <div>
                                <span className="rm-eyebrow">Compliance</span>
                                <h1 className="rm-h1">Obligations</h1>
                            </div>
                            <button className="rm-icon-btn dark" onClick={handleAddObligation}>
                                <Plus size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Score Card */}
                    <div className="rm-score-card">
                        <div className="rm-score-ring">
                            <svg viewBox="0 0 100 100" width="84" height="84">
                                <circle cx="50" cy="50" r={scoreR} fill="none" stroke="#064e3b" strokeOpacity="0.12" strokeWidth="8" />
                                <circle
                                    cx="50" cy="50" r={scoreR} fill="none"
                                    stroke="#059669" strokeWidth="8" strokeLinecap="round"
                                    strokeDasharray={scoreCirc}
                                    strokeDashoffset={scoreOffset}
                                    transform="rotate(-90 50 50)"
                                />
                            </svg>
                            <div className="ctr">
                                <span className="pct">{summary.score}%</span>
                                <span className="lb">score</span>
                            </div>
                        </div>
                        <div className="info">
                            <div className="big">
                                <b>{summary.concluded}</b> of {summary.total} concluded
                            </div>
                            <div className="pills">
                                {summary.overdue > 0 && <span className="rm-pill today"><span className="d" />{summary.overdue} Overdue</span>}
                                {summary.dueSoon > 0 && <span className="rm-pill soon"><span className="d" />{summary.dueSoon} Soon</span>}
                                {summary.pending > 0 && <span className="rm-pill pending"><span className="d" />{summary.pending} Pending</span>}
                            </div>
                        </div>
                    </div>

                    {/* Tier Selection Grid */}
                    <div className="rm-sec-label" style={{ marginTop: '22px', marginBottom: '8px' }}>
                        <span className="t">Obligation Tiers</span>
                    </div>
                    <div className="rm-tier-grid">
                        {tiers.map(tier => {
                            const t = summary.byTier[tier] || { concluded: 0, total: 0 };
                            const pct = t.total > 0 ? Math.round((t.concluded / t.total) * 100) : 0;
                            const isActive = activeTier === tier;
                            return (
                                <div
                                    key={tier}
                                    className="rm-tier"
                                    style={{
                                        cursor: 'pointer',
                                        border: isActive ? '1.5px solid var(--rm-green-600)' : undefined,
                                        boxShadow: isActive ? 'var(--rm-sh-md)' : undefined,
                                    }}
                                    onClick={() => setActiveTier(tier)}
                                >
                                    <div className="top">
                                        <div className="ic">
                                            <Icon n={tierIcons[tier]} s={16} />
                                        </div>
                                        <span className="nm">{tier}</span>
                                    </div>
                                    <div className="frac">{t.concluded}/{t.total}</div>
                                    <div className="bar">
                                        <div className="fill" style={{ width: `${pct}%` }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Obligations Checklist */}
                    <div className="rm-sec-label" style={{ marginTop: '24px' }}>
                        <span className="t">{activeTier} Checklist ({tasks.length})</span>
                    </div>

                    <div className="rm-list">
                        {loading ? (
                            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                                <Loader2 className="animate-spin text-primary" size={24} />
                                <p className="text-xs">Fetching tier checklist...</p>
                            </div>
                        ) : tasks.length === 0 ? (
                            <div className="rm-empty">
                                <Icon n="shield" s={32} c="#94A3B8" />
                                <p>No compliance obligations registered for this tier</p>
                            </div>
                        ) : (
                            tasks.map(task => {
                                const pill = getStatusPill(task.status);
                                return (
                                    <div
                                        key={task.id}
                                        className="rm-ob-row"
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => handleEditObligation(task)}
                                    >
                                        <div className="mid">
                                            <div className="nm" style={{ fontSize: '13.5px', lineHeight: 1.3 }}>
                                                {task.obligation.actionRequired}
                                            </div>
                                            <div className="bd" style={{ marginTop: '4px', fontSize: '11px', color: 'var(--rm-t3)' }}>
                                                {task.obligation.regulatoryBody} · {task.obligation.frequency}
                                                {task.dueDate && ` · Due ${fmtDate(task.dueDate)}`}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                                            <span className={`rm-pill ${pill.cls}`}>
                                                <span className="d" />
                                                {pill.label}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Fixed bottom FAB/CTA */}
                <div className="rm-cta-fixed">
                    <button className="rm-btn-primary" onClick={handleAddObligation}>
                        <Icon n="plus" s={18} />
                        Add New Obligation
                    </button>
                </div>

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

    return (
        <div className={styles.dashboardContainer}>
            <ScoreWidget summary={summary} />

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
