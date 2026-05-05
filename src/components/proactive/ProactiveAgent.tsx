'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ArrowLeft,
    Bell,
    CalendarClock,
    CheckCircle2,
    DollarSign,
    FileText,
    Receipt,
    Scale,
    Send,
    User,
    X,
} from 'lucide-react';
import styles from './ProactiveAgent.module.css';

interface AnomalyItem {
    id: string;
    type: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    title: string;
    question: string;
    resourceType: string;
    resourceId: string | null;
    resourceName: string | null;
    context: Record<string, any>;
}

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

const SEV_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

const TYPE_ICONS: Record<string, React.ElementType> = {
    SPARSE_BRIEF: FileText,
    PLACEHOLDER_CLIENT: User,
    MISSING_COURT_OUTCOME: Scale,
    MISSING_EXPENSE_PERIOD: Receipt,
    UNSCHEDULED_MATTER: CalendarClock,
};

const SEV_LABELS: Record<string, string> = {
    critical: 'Critical',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
};

export default function ProactiveAgent() {
    const [open, setOpen] = useState(false);
    const [view, setView] = useState<'list' | 'chat'>('list');
    const [anomalies, setAnomalies] = useState<AnomalyItem[]>([]);
    const [activeAnomaly, setActiveAnomaly] = useState<AnomalyItem | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [resolved, setResolved] = useState(false);
    const [fetching, setFetching] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const fetchAnomalies = useCallback(async () => {
        setFetching(true);
        try {
            const res = await fetch('/api/proactive/anomalies');
            if (!res.ok) return;
            const data = await res.json();
            const sorted = [...(data.anomalies ?? [])].sort(
                (a, b) => (SEV_ORDER[a.severity] ?? 9) - (SEV_ORDER[b.severity] ?? 9)
            );
            setAnomalies(sorted);
        } catch { /* silent */ } finally {
            setFetching(false);
        }
    }, []);

    useEffect(() => {
        if (open) fetchAnomalies();
    }, [open, fetchAnomalies]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);

    useEffect(() => {
        if (view === 'chat') inputRef.current?.focus();
    }, [view]);

    const startResolving = (anomaly: AnomalyItem) => {
        setActiveAnomaly(anomaly);
        setMessages([{ role: 'assistant', content: anomaly.question }]);
        setResolved(false);
        setInput('');
        setView('chat');
    };

    const backToList = () => {
        setView('list');
        setActiveAnomaly(null);
        setMessages([]);
        setResolved(false);
    };

    const autoResize = (el: HTMLTextAreaElement) => {
        el.style.height = 'auto';
        el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
    };

    const send = async () => {
        const text = input.trim();
        if (!text || loading || resolved || !activeAnomaly) return;

        const userMsg: Message = { role: 'user', content: text };
        const next = [...messages, userMsg];
        setMessages(next);
        setInput('');
        if (inputRef.current) { inputRef.current.style.height = 'auto'; }
        setLoading(true);

        try {
            const res = await fetch('/api/proactive/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ anomaly: activeAnomaly, messages: next }),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
            if (data.resolved) {
                setResolved(true);
                setAnomalies(prev => prev.filter(a => a.id !== activeAnomaly.id));
            }
        } catch (err: any) {
            setMessages(prev => [
                ...prev,
                { role: 'assistant', content: `Error: ${err.message ?? 'Something went wrong.'}` },
            ]);
        } finally {
            setLoading(false);
        }
    };

    const hasCritical = anomalies.some(a => a.severity === 'critical');
    const hasHigh = anomalies.some(a => a.severity === 'high');
    const badgeCount = anomalies.length;

    return (
        <>
            {/* Toggle */}
            <button
                className={`${styles.toggle} ${hasCritical ? styles.toggleCritical : hasHigh ? styles.toggleHigh : badgeCount > 0 ? styles.toggleActive : ''}`}
                onClick={() => setOpen(o => !o)}
                title="Reforma — Proactive Agent"
            >
                <Bell size={20} />
                {badgeCount > 0 && (
                    <span className={styles.badge}>{badgeCount > 9 ? '9+' : badgeCount}</span>
                )}
            </button>

            {/* Panel */}
            <div className={`${styles.panel} ${open ? styles.panelOpen : styles.panelClosed}`}>
                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.headerLeft}>
                        {view === 'chat' && (
                            <button className={styles.iconBtn} onClick={backToList} title="Back to list">
                                <ArrowLeft size={13} />
                            </button>
                        )}
                        <span className={styles.headerDot} />
                        <div>
                            <div className={styles.headerTitle}>
                                {view === 'list' ? 'Reforma' : (activeAnomaly?.title ?? 'Resolving')}
                            </div>
                            <div className={styles.headerSub}>
                                {view === 'list'
                                    ? (anomalies.length === 0
                                        ? 'All clear'
                                        : `${anomalies.length} item${anomalies.length !== 1 ? 's' : ''} need${anomalies.length === 1 ? 's' : ''} attention`)
                                    : 'Proactive Agent'}
                            </div>
                        </div>
                    </div>
                    <button className={styles.iconBtn} onClick={() => setOpen(false)} title="Close">
                        <X size={13} />
                    </button>
                </div>

                {/* List view */}
                {view === 'list' && (
                    <div className={styles.listBody}>
                        {fetching && (
                            <div className={styles.emptyState}>
                                <div className={styles.spinner} />
                                <p>Scanning for anomalies…</p>
                            </div>
                        )}
                        {!fetching && anomalies.length === 0 && (
                            <div className={styles.emptyState}>
                                <CheckCircle2 size={28} strokeWidth={1.5} />
                                <p>No issues detected — everything looks good.</p>
                            </div>
                        )}
                        {!fetching && anomalies.map(a => {
                            const Icon = TYPE_ICONS[a.type] ?? DollarSign;
                            return (
                                <div key={a.id} className={`${styles.anomalyCard} ${styles[`sev_${a.severity}`]}`}>
                                    <div className={styles.anomalyCardTop}>
                                        <div className={styles.anomalyMeta}>
                                            <Icon size={12} />
                                            <span className={`${styles.sevBadge} ${styles[`sevBadge_${a.severity}`]}`}>
                                                {SEV_LABELS[a.severity] ?? a.severity}
                                            </span>
                                        </div>
                                        <button className={styles.resolveBtn} onClick={() => startResolving(a)}>
                                            Resolve →
                                        </button>
                                    </div>
                                    <div className={styles.anomalyTitle}>{a.title}</div>
                                    <div className={styles.anomalyQ}>{a.question}</div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Chat view */}
                {view === 'chat' && (
                    <>
                        {resolved && (
                            <div className={styles.resolvedBanner}>
                                <CheckCircle2 size={13} />
                                Resolved — anomaly cleared.
                            </div>
                        )}
                        <div className={styles.messages}>
                            {messages.map((m, i) => (
                                <div
                                    key={i}
                                    className={`${styles.msg} ${m.role === 'user' ? styles.msgUser : styles.msgAssistant}`}
                                >
                                    {m.role === 'assistant' && (
                                        <div className={styles.msgLabel}>Reforma</div>
                                    )}
                                    <div className={styles.msgBubble}>{m.content}</div>
                                </div>
                            ))}
                            {loading && (
                                <div className={`${styles.msg} ${styles.msgAssistant}`}>
                                    <div className={styles.msgLabel}>Forma</div>
                                    <div className={`${styles.msgBubble} ${styles.typing}`}>
                                        <span /><span /><span />
                                    </div>
                                </div>
                            )}
                            <div ref={bottomRef} />
                        </div>
                        <div className={styles.inputArea}>
                            <textarea
                                ref={inputRef}
                                className={styles.input}
                                value={input}
                                onChange={e => { setInput(e.target.value); autoResize(e.target); }}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
                                }}
                                placeholder={resolved ? 'Issue resolved' : 'Type your response…'}
                                disabled={loading || resolved}
                                rows={1}
                            />
                            <button
                                className={styles.sendBtn}
                                onClick={send}
                                disabled={loading || resolved || !input.trim()}
                            >
                                <Send size={13} />
                            </button>
                        </div>
                    </>
                )}
            </div>
        </>
    );
}
