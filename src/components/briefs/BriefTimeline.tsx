'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
    Loader, Sparkles, ChevronDown, ChevronUp, RefreshCw,
    Paperclip, BookOpen, Scale, RefreshCcw, Bot,
} from 'lucide-react';
import {
    generateBriefSummary, getCaseChronology, backfillBriefTimeline,
    CaseChronologyEvent, BriefSummaryData,
} from '@/app/actions/briefs';
import { runBriefManagerNow } from '@/app/actions/agent-insights';
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
    const [asking, setAsking]         = useState(false);
    const [asked, setAsked]           = useState(false);

    const handleAskBriefManager = async () => {
        setAsking(true);
        setAsked(false);
        try {
            const res = await runBriefManagerNow(briefId);
            if (res.success) setAsked(true);
            else setError(res.error ?? 'Could not reach Brief Manager');
        } catch {
            setError('Could not reach Brief Manager. Please try again.');
        } finally {
            setAsking(false);
        }
    };

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
                        onClick={handleAskBriefManager}
                        disabled={asking}
                        title="Ask Brief Manager what happened last, what's next, and whether this brief needs your input — result appears in Firm Pulse"
                    >
                        {asking
                            ? <><Loader size={12} className={styles.spinner} /> Asking…</>
                            : asked
                                ? <><Bot size={12} /> Added to Firm Pulse ✓</>
                                : <><Bot size={12} /> Ask Brief Manager</>
                        }
                    </button>
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
    const [events, setEvents]           = useState<CaseChronologyEvent[]>(initialEvents);
    const [refreshing, setRefreshing]   = useState(false);
    const [analysing, setAnalysing]     = useState(false);
    const [analyseResult, setAnalyseResult] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const eventsRef = useRef(events);
    eventsRef.current = events;

    const refresh = useCallback(async (manual = false) => {
        if (manual) setRefreshing(true);
        try {
            const fresh = await getCaseChronology(briefId);
            const currentIds = new Set(eventsRef.current.map(e => e.id));
            const hasNew = fresh.some(e => !currentIds.has(e.id));
            if (fresh.length !== eventsRef.current.length || hasNew) {
                setEvents(fresh);
                setLastUpdated(new Date());
            }
        } catch { /* silent */ }
        finally { if (manual) setRefreshing(false); }
    }, [briefId]);

    const analyse = useCallback(async () => {
        setAnalysing(true);
        setAnalyseResult(null);
        try {
            const result = await backfillBriefTimeline(briefId);
            setAnalyseResult(`Extracted ${result.found} event${result.found !== 1 ? 's' : ''} from ${result.processed} document${result.processed !== 1 ? 's' : ''}.`);
            await refresh(false);
        } catch {
            setAnalyseResult('Analysis failed. Please try again.');
        } finally {
            setAnalysing(false);
        }
    }, [briefId, refresh]);

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
                    {analyseResult
                        ? <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{analyseResult}</span>
                        : <span style={{ fontSize: '0.72rem', opacity: 0.7 }}>
                            Click <strong>Analyse Documents</strong> to extract dates and facts from uploaded files.
                          </span>
                    }
                    <button
                        className={styles.generateBtn}
                        onClick={analyse}
                        disabled={analysing}
                        style={{ marginTop: '0.5rem' }}
                    >
                        {analysing
                            ? <><Loader size={12} className={styles.spinner} /> Analysing documents…</>
                            : <><Sparkles size={12} /> Analyse Documents</>
                        }
                    </button>
                </div>
            </div>
        );
    }

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
                    {analyseResult && (
                        <span className={styles.chronoRefreshMeta}>{analyseResult}</span>
                    )}
                    <button
                        className={styles.chronoRefreshBtn}
                        onClick={analyse}
                        disabled={analysing || refreshing}
                        title="Re-analyse all documents in this brief"
                    >
                        <Sparkles size={11} className={analysing ? styles.spinner : undefined} />
                        {analysing ? 'Analysing…' : 'Analyse'}
                    </button>
                    <button
                        className={styles.chronoRefreshBtn}
                        onClick={() => refresh(true)}
                        disabled={refreshing || analysing}
                        title="Refresh from database"
                    >
                        <RefreshCcw size={11} className={refreshing ? styles.spinner : undefined} />
                        {refreshing ? '…' : 'Refresh'}
                    </button>
                </div>
            </div>

            <div className={styles.chronoTableWrap}>
                <table className={styles.chronoTable}>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Event</th>
                            <th>Source</th>
                        </tr>
                    </thead>
                    <tbody>
                        {events.map(e => {
                            const d = e.eventDate ? new Date(e.eventDate) : null;
                            return (
                                <tr key={e.id}>
                                    <td className={styles.chronoDate}>
                                        {d
                                            ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                                            : e.eventDateRaw}
                                    </td>
                                    <td className={styles.chronoTitle2}>{e.description}</td>
                                    <td className={styles.source}>
                                        {e.sourceType === 'agent' ? <Bot size={11} /> : <BookOpen size={11} />}
                                        {e.documentName}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

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
