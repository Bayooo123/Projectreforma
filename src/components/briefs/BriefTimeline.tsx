'use client';

import { useEffect, useState } from 'react';
import { Gavel, CalendarX, Users, CheckCircle2, Clock, FileText, Activity, BookOpen, Flag, Loader, ScrollText } from 'lucide-react';
import { getBriefTimeline, backfillBriefTimeline, TimelineEvent, TimelineEventType } from '@/app/actions/briefs';
import styles from './BriefTimeline.module.css';

const CONFIG: Record<TimelineEventType, { label: string; color: string; bg: string; Icon: React.ElementType }> = {
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

        // Insert TODAY divider before the first future/today event
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

interface BriefTimelineProps { briefId: string; }

export default function BriefTimeline({ briefId }: BriefTimelineProps) {
    const [events, setEvents] = useState<TimelineEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [analyzing, setAnalyzing] = useState(false);
    const [analyzeMsg, setAnalyzeMsg] = useState<string | null>(null);

    const load = () => getBriefTimeline(briefId).then(data => { setEvents(data); setLoading(false); });

    useEffect(() => { load(); }, [briefId]);

    const handleReanalyze = async () => {
        setAnalyzing(true);
        setAnalyzeMsg(null);
        try {
            const result = await backfillBriefTimeline(briefId);
            const parts: string[] = [];
            if (result.processed > 0) parts.push(`Analysed ${result.processed} document${result.processed !== 1 ? 's' : ''}`);
            if (result.found > 0) parts.push(`${result.found} event${result.found !== 1 ? 's' : ''} found`);
            if (result.skipped > 0) parts.push(`${result.skipped} skipped (no text extracted)`);
            setAnalyzeMsg(parts.length ? parts.join(' · ') : 'No readable documents found. Try re-uploading the documents.');
            await load();
        } catch {
            setAnalyzeMsg('Analysis failed. Please try again.');
        } finally {
            setAnalyzing(false);
        }
    };

    if (loading) {
        return (
            <div className={styles.loading}>
                <Loader size={18} className={styles.spinner} />
                Building timeline…
            </div>
        );
    }

    const groups = groupEvents(events);

    return (
        <div className={styles.root}>
            {/* Toolbar */}
            <div className={styles.toolbar}>
                <button
                    className={styles.reanalyzeBtn}
                    onClick={handleReanalyze}
                    disabled={analyzing}
                    title="Re-read all documents and extract any dates/events found inside them"
                >
                    {analyzing ? <Loader size={13} className={styles.spinner} /> : <ScrollText size={13} />}
                    {analyzing ? 'Analysing documents…' : 'Analyse documents'}
                </button>
                {analyzeMsg && <span className={styles.analyzeMsg}>{analyzeMsg}</span>}
            </div>

            {groups.length === 0 && (
                <div className={styles.empty}>
                    <Activity size={28} className={styles.emptyIcon} />
                    <p>No events recorded yet. Upload documents or click Analyse documents.</p>
                </div>
            )}
            {groups.map(group => (
                <div key={group.monthKey} className={styles.group}>
                    <div className={styles.monthLabel}>{group.label}</div>

                    {group.events.map((item, idx) => {
                        if (item === 'TODAY') {
                            return (
                                <div key="today-divider" className={styles.todayDivider}>
                                    <div className={styles.todayLine} />
                                    <span className={styles.todayBadge}>Today</span>
                                    <div className={styles.todayLine} />
                                </div>
                            );
                        }

                        const cfg = CONFIG[item.type];
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
                                {/* Date */}
                                <div className={styles.dateCol}>
                                    <span className={styles.dateDay}>{formatDay(new Date(item.date))}</span>
                                </div>

                                {/* Dot */}
                                <div
                                    className={styles.dot}
                                    style={isPast ? undefined : { backgroundColor: cfg.color }}
                                />

                                {/* Card */}
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
            ))}
        </div>
    );
}
