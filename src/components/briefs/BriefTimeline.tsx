'use client';

import { useState } from 'react';
import { Gavel, CalendarX, Users, CheckCircle2, Clock, FileText, Activity, BookOpen, Flag, Loader, ScrollText, Sparkles, ChevronDown, ChevronUp, RefreshCw, Mail, Paperclip } from 'lucide-react';
import { generateBriefSummary, TimelineEvent, BriefSummaryData, TimelineEmailData } from '@/app/actions/briefs';
import styles from './BriefTimeline.module.css';

// ── Email Correspondence Panel (zero-token, computed from timeline events) ────

function stripEmailPrefixes(subject: string): string {
    // Remove [EXTERNAL] / [**EXTERNAL**] tags
    let s = subject.replace(/\[[\*\s]*EXTERNAL[\*\s]*\]\s*/gi, '').trim();
    // Strip Fwd:/Re:/RE:/Fw: prefixes recursively
    const prefixRe = /^(fwd?:|re:|fw:)\s*/i;
    let prev = '';
    while (s !== prev) { prev = s; s = s.replace(prefixRe, '').trim(); }
    return s || subject;
}

function fmtDate(d: Date, style: 'short' | 'monthYear' = 'short') {
    if (style === 'monthYear') return d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function EmailCorrespondencePanel({ events }: { events: TimelineEvent[] }) {
    const emailEvents = events.filter(e => e.type === 'email' && e.email);
    if (emailEvents.length === 0) return null;

    // ── Thread grouping ──────────────────────────────────────────────────────
    const threadMap = new Map<string, { count: number; dates: number[] }>();
    for (const ev of emailEvents) {
        const norm = stripEmailPrefixes(ev.title).toLowerCase();
        const entry = threadMap.get(norm) ?? { count: 0, dates: [] };
        entry.count++;
        entry.dates.push(new Date(ev.date).getTime());
        threadMap.set(norm, entry);
    }
    const threads = Array.from(threadMap.entries())
        .map(([norm, data]) => ({
            name: stripEmailPrefixes(
                emailEvents.find(e => stripEmailPrefixes(e.title).toLowerCase() === norm)?.title ?? norm
            ),
            count: data.count,
            from: new Date(Math.min(...data.dates)),
            to:   new Date(Math.max(...data.dates)),
        }))
        .sort((a, b) => b.count - a.count || b.to.getTime() - a.to.getTime());

    // ── Unique senders ───────────────────────────────────────────────────────
    const senderMap = new Map<string, { name: string | null; lastDate: number }>();
    for (const ev of emailEvents) {
        if (!ev.email) continue;
        const key = ev.email.fromEmail.toLowerCase();
        const t = new Date(ev.date).getTime();
        const existing = senderMap.get(key);
        if (!existing || t > existing.lastDate) {
            senderMap.set(key, { name: ev.email.fromName, lastDate: t });
        }
    }
    const senders = Array.from(senderMap.entries())
        .map(([email, d]) => ({ email, name: d.name, lastDate: d.lastDate }))
        .sort((a, b) => b.lastDate - a.lastDate);

    // ── Date range ───────────────────────────────────────────────────────────
    const ts = emailEvents.map(e => new Date(e.date).getTime());
    const earliest = new Date(Math.min(...ts));
    const latest   = new Date(Math.max(...ts));

    const TOP = 5;

    return (
        <div style={{
            border: '1px solid #99f6e4', borderRadius: 10,
            background: '#f0fdfa', marginBottom: '1rem', overflow: 'hidden',
            fontSize: '0.78rem',
        }}>
            {/* Header */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0.6rem 0.9rem', borderBottom: '1px solid #99f6e4',
                background: 'linear-gradient(135deg,#ecfdf5,#f0fdfa)',
            }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: '#065f46', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <Mail size={12} /> Correspondence Overview
                </span>
                <span style={{ fontSize: '0.7rem', color: '#6b7280' }}>
                    <span style={{ fontWeight: 700, color: '#0d9488', marginRight: 6 }}>{emailEvents.length} emails</span>
                    {fmtDate(earliest)} – {fmtDate(latest)}
                </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                {/* Threads column */}
                <div style={{ padding: '0.65rem 0.9rem', borderRight: '1px solid #ccfbf1' }}>
                    <div style={{ fontWeight: 700, color: '#065f46', fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.4rem' }}>Threads</div>
                    {threads.slice(0, TOP).map((t, i) => (
                        <div key={i} style={{
                            display: 'flex', gap: 6, alignItems: 'baseline',
                            padding: '3px 0',
                            borderBottom: i < Math.min(threads.length, TOP) - 1 ? '1px solid #d1fae5' : 'none',
                        }}>
                            <span style={{ flex: 1, color: '#1e293b', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={t.name}>
                                {t.name}
                            </span>
                            <span style={{ color: '#6b7280', flexShrink: 0, fontSize: '0.67rem', minWidth: 50, textAlign: 'right' }}>
                                {t.count} {t.count === 1 ? 'email' : 'emails'}
                            </span>
                            <span style={{ color: '#94a3b8', flexShrink: 0, fontSize: '0.64rem', minWidth: 52, textAlign: 'right' }}>
                                {fmtDate(t.from, 'monthYear')}
                                {(t.from.getMonth() !== t.to.getMonth() || t.from.getFullYear() !== t.to.getFullYear())
                                    ? `–${fmtDate(t.to, 'monthYear')}` : ''}
                            </span>
                        </div>
                    ))}
                    {threads.length > TOP && (
                        <div style={{ color: '#94a3b8', fontSize: '0.64rem', marginTop: 3 }}>+{threads.length - TOP} more</div>
                    )}
                </div>

                {/* Senders column */}
                <div style={{ padding: '0.65rem 0.9rem' }}>
                    <div style={{ fontWeight: 700, color: '#065f46', fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.4rem' }}>Correspondents</div>
                    {senders.slice(0, TOP).map((s, i) => (
                        <div key={i} style={{
                            padding: '3px 0',
                            borderBottom: i < Math.min(senders.length, TOP) - 1 ? '1px solid #d1fae5' : 'none',
                        }}>
                            <div style={{ color: '#1e293b', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {s.name || s.email}
                            </div>
                            {s.name && (
                                <div style={{ color: '#94a3b8', fontSize: '0.64rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {s.email}
                                </div>
                            )}
                        </div>
                    ))}
                    {senders.length > TOP && (
                        <div style={{ color: '#94a3b8', fontSize: '0.64rem', marginTop: 3 }}>+{senders.length - TOP} more</div>
                    )}
                    <div style={{ marginTop: 8, paddingTop: 5, borderTop: '1px solid #ccfbf1', fontSize: '0.67rem' }}>
                        <span style={{ color: '#94a3b8' }}>Latest · </span>
                        <span style={{ color: '#0d9488', fontWeight: 600 }}>{fmtDate(latest)}</span>
                        {senders[0] && <span style={{ color: '#94a3b8' }}> from {senders[0].name || senders[0].email}</span>}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── CONFIG ────────────────────────────────────────────────────────────────────
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
    email:            { label: 'Email',     color: '#0d9488', bg: '#f0fdfa', Icon: Mail },
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

// ── Email card ────────────────────────────────────────────────────────────────

function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function EmailCard({ email }: { email: TimelineEmailData }) {
    const [expanded, setExpanded] = useState(false);
    const sender = email.fromName ? `${email.fromName} <${email.fromEmail}>` : email.fromEmail;

    return (
        <div className={styles.emailCard}>
            <button className={styles.emailCardHeader} onClick={() => setExpanded(v => !v)}>
                <span className={styles.emailSender}>{sender}</span>
                {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {expanded && (
                <div className={styles.emailBody}>
                    {email.body
                        ? <pre className={styles.emailBodyText}>{email.body}</pre>
                        : email.bodyPreview
                            ? <p className={styles.emailBodyText}>{email.bodyPreview}</p>
                            : <p className={styles.emailBodyEmpty}>No content available.</p>
                    }
                    {email.attachments.length > 0 && (
                        <div className={styles.emailAttachments}>
                            {email.attachments.map(att => (
                                <a
                                    key={att.id}
                                    href={att.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={styles.emailAttachment}
                                >
                                    <Paperclip size={11} />
                                    <span>{att.name}</span>
                                    <span className={styles.emailAttachmentSize}>{formatBytes(att.size)}</span>
                                </a>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
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
            {/* Zero-token correspondence overview — always visible when emails are linked */}
            <EmailCorrespondencePanel events={events} />

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
                                        {item.type === 'email' && item.email && (
                                            <EmailCard email={item.email} />
                                        )}
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
