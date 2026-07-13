'use client';

import { useState } from 'react';
import {
    Loader, Sparkles, ChevronDown, ChevronUp, RefreshCw,
    Paperclip, Clock, BookOpen,
} from 'lucide-react';
import { generateBriefSummary, TimelineEvent, TimelineEventType, BriefSummaryData } from '@/app/actions/briefs';
import { getLinkedEmailsForBrief } from '@/app/actions/documents';
import styles from './BriefTimeline.module.css';

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

type LinkedEmail = Awaited<ReturnType<typeof getLinkedEmailsForBrief>>[number];

// ── Event meta ────────────────────────────────────────────────────────────────

const EVENT_META: Record<TimelineEventType, { color: string; label: string }> = {
    brief_created:     { color: '#64748b', label: 'Brief' },
    brief_due:         { color: '#f59e0b', label: 'Deadline' },
    court_hearing:     { color: '#ef4444', label: 'Hearing' },
    court_adjourned:   { color: '#f97316', label: 'Adjourned' },
    meeting:           { color: '#3b82f6', label: 'Meeting' },
    task_created:      { color: '#64748b', label: 'Task' },
    task_completed:    { color: '#10b981', label: 'Completed' },
    task_due:          { color: '#f59e0b', label: 'Deadline' },
    document_uploaded: { color: '#6366f1', label: 'Document' },
    activity:          { color: '#94a3b8', label: 'Activity' },
    doc_event:         { color: '#7c3aed', label: 'Extracted' },
    email:             { color: '#0d9488', label: 'Email' },
};

// ── AI Summary panel ──────────────────────────────────────────────────────────

interface SummaryPanelProps {
    briefId: string;
    initial: BriefSummaryData | null;
}

function SummaryPanel({ briefId, initial }: SummaryPanelProps) {
    const [summary, setSummary]       = useState<BriefSummaryData | null>(initial);
    const [generating, setGenerating] = useState(false);
    const [error, setError]           = useState<string | null>(null);
    const [collapsed, setCollapsed]   = useState(false);

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
                    Brief Summary
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
                        title={summary ? 'Regenerate summary from emails and documents' : 'Generate AI summary from emails and documents'}
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
                    from the linked emails and documents in this brief.
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
                    <div className={styles.summaryProse}>
                        {summary.prose.split('\n').filter(Boolean).map((para, i) => (
                            <p key={i}>{para}</p>
                        ))}
                    </div>

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

// ── Expandable email card ─────────────────────────────────────────────────────

function EmailCard({ event }: { event: TimelineEvent }) {
    const [open, setOpen] = useState(false);
    const em = event.email!;
    const sender = em.fromName ? `${em.fromName} <${em.fromEmail}>` : em.fromEmail;

    return (
        <div className={styles.emailCard}>
            <button className={styles.emailCardHeader} onClick={() => setOpen(v => !v)}>
                <span className={styles.emailSender}>{sender}</span>
                {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
            {open && (
                <div className={styles.emailBody}>
                    {em.body || em.bodyPreview
                        ? <pre className={styles.emailBodyText}>{em.body || em.bodyPreview}</pre>
                        : <p className={styles.emailBodyEmpty}>No message body</p>
                    }
                    {em.attachments.length > 0 && (
                        <div className={styles.emailAttachments}>
                            {em.attachments.map(att => (
                                <a
                                    key={att.id}
                                    href={att.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={styles.emailAttachment}
                                >
                                    <Paperclip size={10} />
                                    {att.name}
                                </a>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ── Single event row ──────────────────────────────────────────────────────────

function EventRow({ event }: { event: TimelineEvent }) {
    const d = new Date(event.date);
    const meta = EVENT_META[event.type];
    const stateClass = event.isFuture ? styles.future : event.isToday ? styles.today : styles.past;

    return (
        <div className={`${styles.event} ${stateClass}`}>
            <div className={styles.dateCol}>
                <span className={styles.dateDay}>
                    {d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </span>
                <span className={styles.dateMonth}>{d.getFullYear()}</span>
            </div>

            <div
                className={styles.dot}
                style={event.isFuture || event.isToday
                    ? { background: meta.color, boxShadow: `0 0 0 1.5px ${meta.color}` }
                    : undefined
                }
            />

            <div className={styles.card}>
                {meta.label && (
                    <div
                        className={styles.badge}
                        style={{ background: `${meta.color}1a`, color: meta.color }}
                    >
                        {meta.label}
                        {event.isFuture && <span className={styles.upcomingTag}>upcoming</span>}
                    </div>
                )}
                <p className={styles.title}>{event.title}</p>
                {event.description && <p className={styles.desc}>{event.description}</p>}
                {event.actor && <p className={styles.actor}>{event.actor}</p>}
                {event.source && (
                    <p className={styles.source}>
                        <BookOpen size={10} />
                        {event.source}
                    </p>
                )}
                {event.type === 'email' && event.email && <EmailCard event={event} />}
            </div>
        </div>
    );
}

// ── Event feed ────────────────────────────────────────────────────────────────

type RenderItem =
    | { kind: 'month'; label: string; key: string }
    | { kind: 'today'; key: string }
    | { kind: 'event'; event: TimelineEvent };

function buildRenderList(events: TimelineEvent[]): RenderItem[] {
    const items: RenderItem[] = [];
    let currentMonth = '';
    let todayInserted = false;

    for (const e of events) {
        const d = new Date(e.date);
        const monthKey = `${d.getFullYear()}-${d.getMonth()}`;
        const label = d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

        // TODAY divider appears before first today/future event
        if ((e.isToday || e.isFuture) && !todayInserted) {
            items.push({ kind: 'today', key: 'today-divider' });
            todayInserted = true;
        }

        // Month header — placed after the today divider so the divider sits above the month label
        if (monthKey !== currentMonth) {
            currentMonth = monthKey;
            items.push({ kind: 'month', label, key: monthKey });
        }

        items.push({ kind: 'event', event: e });
    }

    return items;
}

function EventFeed({ events }: { events: TimelineEvent[] }) {
    if (events.length === 0) {
        return (
            <div className={styles.empty}>
                <Clock size={28} className={styles.emptyIcon} />
                <span>No timeline events yet</span>
            </div>
        );
    }

    const items = buildRenderList(events);

    return (
        <div>
            {items.map(item => {
                if (item.kind === 'month') {
                    return <div key={item.key} className={styles.monthLabel}>{item.label}</div>;
                }
                if (item.kind === 'today') {
                    return (
                        <div key={item.key} className={styles.todayDivider}>
                            <span className={styles.todayLine} />
                            <span className={styles.todayBadge}>Today</span>
                            <span className={styles.todayLine} />
                        </div>
                    );
                }
                return <EventRow key={item.event.id} event={item.event} />;
            })}
        </div>
    );
}

// ── Main component ────────────────────────────────────────────────────────────

interface BriefTimelineProps {
    briefId: string;
    initialEvents: TimelineEvent[];
    initialSummary: BriefSummaryData | null;
    linkedEmails?: LinkedEmail[];
}

export default function BriefTimeline({ briefId, initialSummary, initialEvents }: BriefTimelineProps) {
    return (
        <div className={styles.root}>
            <SummaryPanel briefId={briefId} initial={initialSummary} />
            <EventFeed events={initialEvents} />
        </div>
    );
}
