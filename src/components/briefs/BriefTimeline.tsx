'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
    Loader, Sparkles, ChevronDown, ChevronUp, RefreshCw,
    Paperclip, BookOpen, Scale, RefreshCcw,
} from 'lucide-react';
import {
    generateBriefSummary, getCaseChronology,
    CaseChronologyEvent, BriefSummaryData,
} from '@/app/actions/briefs';
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

// ── Case Chronology ───────────────────────────────────────────────────────────

function CaseChronology({ briefId, initialEvents }: { briefId: string; initialEvents: CaseChronologyEvent[] }) {
    const [events, setEvents]         = useState<CaseChronologyEvent[]>(initialEvents);
    const [refreshing, setRefreshing] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const eventsRef = useRef(events);
    eventsRef.current = events;

    const refresh = useCallback(async (manual = false) => {
        if (manual) setRefreshing(true);
        try {
            const fresh = await getCaseChronology(briefId);
            // Update whenever count or content changes
            const currentIds = new Set(eventsRef.current.map(e => e.id));
            const hasNew = fresh.some(e => !currentIds.has(e.id));
            if (fresh.length !== eventsRef.current.length || hasNew) {
                setEvents(fresh);
                setLastUpdated(new Date());
            }
        } catch { /* silent */ }
        finally { if (manual) setRefreshing(false); }
    }, [briefId]);

    // Poll every 30 s to catch fire-and-forget extractions finishing after upload
    useEffect(() => {
        const id = setInterval(() => refresh(false), 30_000);
        return () => clearInterval(id);
    }, [refresh]);

    if (events.length === 0) {
        return (
            <div className={styles.chronoFeedSection}>
                <div className={styles.chronoFeedHeader}>
                    <span className={styles.chronoFeedTitle}><Scale size={13} /> Case Chronology</span>
                </div>
                <div className={styles.empty}>
                    <Scale size={26} className={styles.emptyIcon} />
                    <span>No case events extracted yet.</span>
                    <span style={{ fontSize: '0.72rem', opacity: 0.7 }}>
                        Upload documents — dates and facts are extracted automatically.
                    </span>
                </div>
            </div>
        );
    }

    // Group by year; undated events go last
    const grouped = new Map<string, CaseChronologyEvent[]>();
    for (const e of events) {
        const year = e.eventDate
            ? new Date(e.eventDate).getFullYear().toString()
            : 'Undated';
        if (!grouped.has(year)) grouped.set(year, []);
        grouped.get(year)!.push(e);
    }
    const yearKeys = [...grouped.keys()].sort((a, b) => {
        if (a === 'Undated') return 1;
        if (b === 'Undated') return -1;
        return Number(a) - Number(b);
    });

    return (
        <div className={styles.chronoFeedSection}>
            <div className={styles.chronoFeedHeader}>
                <span className={styles.chronoFeedTitle}><Scale size={13} /> Case Chronology</span>
                <div className={styles.chronoFeedMeta}>
                    {lastUpdated && (
                        <span className={styles.chronoRefreshMeta}>
                            Updated {formatRelative(lastUpdated)}
                        </span>
                    )}
                    <button
                        className={styles.chronoRefreshBtn}
                        onClick={() => refresh(true)}
                        disabled={refreshing}
                        title="Refresh chronology from newly uploaded documents"
                    >
                        <RefreshCcw size={11} className={refreshing ? styles.spinner : undefined} />
                        {refreshing ? 'Refreshing…' : 'Refresh'}
                    </button>
                </div>
            </div>

            {yearKeys.map(year => (
                <div key={year} className={styles.group}>
                    <div className={styles.yearLabel}>{year}</div>
                    {grouped.get(year)!.map(e => {
                        const d = e.eventDate ? new Date(e.eventDate) : null;
                        const dayMonth = d
                            ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                            : '—';

                        return (
                            <div key={e.id} className={styles.event}>
                                <div className={styles.dateCol}>
                                    <span className={styles.dateDay}>{dayMonth}</span>
                                    {!d && (
                                        <span className={styles.dateMonth} title={e.eventDateRaw}>
                                            {e.eventDateRaw.length > 10
                                                ? e.eventDateRaw.slice(0, 10) + '…'
                                                : e.eventDateRaw}
                                        </span>
                                    )}
                                </div>

                                <div
                                    className={styles.dot}
                                    style={{ background: '#7c3aed', boxShadow: '0 0 0 1.5px #7c3aed' }}
                                />

                                <div className={styles.card}>
                                    <p className={styles.title}>{e.description}</p>
                                    <p className={styles.source}>
                                        <BookOpen size={9} />
                                        {e.documentName}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ))}

            <p className={styles.chronoAutoNote}>
                <RefreshCcw size={10} />
                Auto-refreshes every 30 s — new documents are analysed automatically on upload.
            </p>
        </div>
    );
}

// ── Main component ────────────────────────────────────────────────────────────

interface BriefTimelineProps {
    briefId: string;
    initialChronology: CaseChronologyEvent[];
    initialSummary: BriefSummaryData | null;
    linkedEmails?: never[]; // kept so callers don't need updating
}

export default function BriefTimeline({ briefId, initialSummary, initialChronology }: BriefTimelineProps) {
    return (
        <div className={styles.root}>
            <SummaryPanel briefId={briefId} initial={initialSummary} />
            <CaseChronology briefId={briefId} initialEvents={initialChronology} />
        </div>
    );
}
