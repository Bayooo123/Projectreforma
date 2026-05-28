'use client';

import { useState } from 'react';
import { Gavel, CalendarX, Users, CheckCircle2, Clock, FileText, Activity, BookOpen, Flag, Loader, ScrollText, Sparkles, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { generateBriefSummary, TimelineEvent, BriefSummaryData } from '@/app/actions/briefs';
import styles from './BriefTimeline.module.css';

const CONFIG: Record<string, { label: string; color: string; bg: string; Icon: React.ElementType }> = {
    brief_created:    { label: 'Opened',    color: '#6366f1', bg: '#eef2ff', Icon: BookOpen },
    brief_due:        { label: 'Due Date',  color: '#ef4444', bg: '#fef2f2', Icon: Flag },
    court_hearing:    { label: 'Court',     color: '#1d4ed8', bg: '#eff6ff', Icon: Gavel },
    court_adjourned:  { label: 'Adjourned', color: '#7c3aed', bg: '#f5f3ff', Icon: CalendarX },
    meeting:          { label: 'Meeting',   color: '#0d9488', bg: '#f0fdfa', Icon: Users },
    task_created:     { label: 'Task',      color: '#d97706', bg: '#fffbeb', Icon: Clock },
    task_completed:   { label: 'Completed', color: '#059669', bg: '#ecfdf5', Icon: CheckCircle2 },
    task_due:         { label: 'Deadline',  color: '#ea580c', bg: '#fff7ed', Icon: Clock },
    document_uploaded:{ label: 'Document',  color: '#475569', bg: '#f8fafc', Icon: FileText },
    activity:         { label: 'Activity',  color: '#6b7280', bg: '#f9fafb', Icon: Activity },
    doc_event:        { label: 'Alleged',   color: '#7c3aed', bg: '#f5f3ff', Icon: ScrollText },
};

type Group = { monthKey: string; label: string; events: Array<TimelineEvent | 'TODAY'> };

function groupEvents(events: TimelineEvent[]): Group[] {
    const groups: Group[] = [];
    let todayInserted = false;

    for (const event of events) {
        const d = new Date(event.date);
        const monthKey = `${d.getFullYear()}-${d.getMonth()}`;
        const label = d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

        if (!todayInserted && (event.isFuture || event.isToday)) {
            todayInserted = true;
            let group = groups.find(g => g.monthKey === monthKey);
            if (!group) { group = { monthKey, label, events: [] }; groups.push(group); }
            group.events.push('TODAY');
        }

        let group = groups.find(g => g.monthKey === monthKey);
        if (!group) { group = { monthKey, label, events: [] }; groups.push(group); }
        group.events.push(event);
    }

    return groups;
}

function formatDay(date: Date) {
    return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function formatRelative(date: Date): string {
    const diffMs = Date.now() - date.getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── AI Summary panel ─────────────────────────────────────────────────────────

interface SummaryPanelProps {
    briefId: string;
    initial: BriefSummaryData | null;
}

function SummaryPanel({ briefId, initial }: SummaryPanelProps) {
    const [summary, setSummary]     = useState<BriefSummaryData | null>(initial);
    const [generating, setGenerating] = useState(false);
    const [error, setError]         = useState<string | null>(null);
    const [collapsed, setCollapsed] = useState(false);

    const handleGenerate = async () => {
        setGenerating(true);
        setError(null);
        try {
            const res = await generateBriefSummary(briefId);
            if (res.success && res.data) {
                setSummary(res.data);
                setCollapsed(false);
            } else {
                setError(res.error ?? 'Unknown error');
            }
        } catch {
            setError('Summary generation failed. Please try again.');
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className={styles.summaryPanel}>
            <div className={styles.summaryHeader}>
                <div className={styles.summaryTitle}>
                    <Sparkles size={13} />
                    AI Brief Summary
                    {summary && (
                        <span className={styles.summaryMeta}>
                            · generated {formatRelative(new Date(summary.generatedAt))}
                        </span>
                    )}
                </div>
                <div className={styles.summaryActions}>
                    <button
                        className={styles.generateBtn}
                        onClick={handleGenerate}
                        disabled={generating}
                        title={summary ? 'Regenerate summary from current document events' : 'Generate AI summary from document events'}
                    >
                        {generating
                            ? <><Loader size={12} className={styles.spinner} /> Generating…</>
                            : <><RefreshCw size={12} /> {summary ? 'Regenerate' : 'Generate Summary'}</>
                        }
                    </button>
                    {summary && (
                        <button
                            className={styles.collapseBtn}
                            onClick={() => setCollapsed(v => !v)}
                            title={collapsed ? 'Show summary' : 'Hide summary'}
                        >
                            {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                        </button>
                    )}
                </div>
            </div>

            {error && <p className={styles.summaryError}>{error}</p>}

            {!summary && !generating && (
                <p className={styles.summaryHint}>
                    Click <strong>Generate Summary</strong> to produce a prose overview and chronological outline
                    from the documents analysed in this brief.
                </p>
            )}

            {generating && (
                <div className={styles.summaryLoading}>
                    <Loader size={16} className={styles.spinner} />
                    <span>Analysing documents and composing summary…</span>
                </div>
            )}

            {summary && !collapsed && (
                <div className={styles.summaryBody}>
                    {/* Prose */}
                    <div className={styles.summaryProse}>
                        {summary.prose.split('\n').filter(Boolean).map((para, i) => (
                            <p key={i}>{para}</p>
                        ))}
                    </div>

                    {/* Chronology — narrative bullets for transactional, table for litigation */}
                    {summary.chronology.length > 0 && (
                        <div className={styles.chronoSection}>
                            <h4 className={styles.chronoTitle}>Chronology</h4>

                            {summary.briefType === 'transactional' ? (
                                <ul className={styles.chronoBullets}>
                                    {summary.chronology.map((row, i) => (
                                        <li key={i} className={styles.chronoBulletItem}>
                                            {row.narrative ?? `${row.dateDisplay || row.date} — ${row.title ?? ''} ${row.summary ?? ''}`.trim()}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className={styles.chronoTableWrap}>
                                    <table className={styles.chronoTable}>
                                        <thead>
                                            <tr>
                                                <th>Date</th>
                                                <th>Event</th>
                                                <th>Key Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {summary.chronology.map((row, i) => (
                                                <tr key={i}>
                                                    <td className={styles.chronoDate}>{row.dateDisplay || row.date}</td>
                                                    <td className={styles.chronoTitle2}>{row.title}</td>
                                                    <td>{row.summary}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ── Main component ────────────────────────────────────────────────────────────

interface BriefTimelineProps {
    briefId: string;
    initialEvents: TimelineEvent[];
    initialSummary: BriefSummaryData | null;
}

export default function BriefTimeline({ briefId, initialEvents, initialSummary }: BriefTimelineProps) {
    const [events] = useState<TimelineEvent[]>(initialEvents);

    const groups = groupEvents(events);

    return (
        <div className={styles.root}>
            {/* AI Summary panel */}
            <SummaryPanel briefId={briefId} initial={initialSummary} />

            {groups.length === 0 ? (
                <div className={styles.empty}>
                    <Activity size={28} className={styles.emptyIcon} />
                    <p>No events yet. Click <strong>Analyse documents</strong> to extract dates from uploaded documents.</p>
                </div>
            ) : (
                groups.map(group => (
                    <div key={group.monthKey} className={styles.group}>
                        <div className={styles.monthLabel}>{group.label}</div>

                        {group.events.map((item) => {
                            if (item === 'TODAY') {
                                return (
                                    <div key="today-divider" className={styles.todayDivider}>
                                        <div className={styles.todayLine} />
                                        <span className={styles.todayBadge}>Today</span>
                                        <div className={styles.todayLine} />
                                    </div>
                                );
                            }

                            const cfg = CONFIG[item.type] ?? CONFIG['activity'];
                            const Icon = cfg.Icon;
                            const isPast = !item.isFuture && !item.isToday;
                            const rowClass = [
                                styles.event,
                                isPast ? styles.past : '',
                                item.isToday ? styles.today : '',
                                item.isFuture ? styles.future : '',
                            ].filter(Boolean).join(' ');

                            return (
                                <div key={item.id} className={rowClass}>
                                    <div className={styles.dateCol}>
                                        <span className={styles.dateDay}>{formatDay(new Date(item.date))}</span>
                                    </div>

                                    <div
                                        className={styles.dot}
                                        style={isPast ? undefined : { backgroundColor: cfg.color }}
                                    />

                                    <div className={styles.card}>
                                        <div
                                            className={styles.badge}
                                            style={isPast
                                                ? { color: '#94a3b8', backgroundColor: '#f8fafc' }
                                                : { color: cfg.color, backgroundColor: cfg.bg }
                                            }
                                        >
                                            <Icon size={10} />
                                            {cfg.label}
                                            {item.isFuture && <span className={styles.upcomingTag}>upcoming</span>}
                                        </div>

                                        <p className={styles.title}>{item.title}</p>
                                        {item.description && <p className={styles.desc}>{item.description}</p>}
                                        {item.source && (
                                            <p className={styles.source}>
                                                <ScrollText size={10} style={{ display: 'inline', marginRight: 3 }} />
                                                {item.source}
                                            </p>
                                        )}
                                        {item.actor && <p className={styles.actor}>{item.actor}</p>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ))
            )}
        </div>
    );
}
