'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Send, RefreshCw, Loader2, Gavel, FileText, ArrowUpRight } from 'lucide-react';
import { getBriefManagerBoard, runBriefManagerNow, type BriefBoardRow } from '@/app/actions/agent-insights';
import DocumentUpload from '@/components/briefs/DocumentUpload';
import styles from './Context.module.css';

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

interface AgentInsightData {
    summary?: { currentStatus: string; background: string; keyDevelopments: string[]; outstandingIssues: string[] };
    lastActivity?: string;
    nextSteps?: string[];
    ballInCourt?: { status: string; rationale: string };
    questions?: string[];
    needsDocuments?: boolean;
    docRequestReason?: string;
    needsClientUpdate?: boolean;
    daysSinceClientContact?: number;
}

const BALL_IN_COURT_STYLE: Record<string, { bg: string; text: string; label: string }> = {
    us:               { bg: '#fef2f2', text: '#dc2626', label: 'Waiting on you' },
    opposing_counsel: { bg: '#fff7ed', text: '#ea580c', label: 'Waiting on opposing counsel' },
    court:            { bg: '#eff6ff', text: '#2563eb', label: 'Waiting on the court' },
    unclear:          { bg: '#f9fafb', text: '#6b7280', label: 'Status unclear' },
};

// One context (brief) selected in the sidebar, rendered as a persistent chat
// rather than an accordion row — this is the "always available, not
// scan-gated" piece the row-based Pulse board didn't have.
type BoardRowWithWorkspace = BriefBoardRow & { workspaceId: string };

function ChatPanel({
    row,
    onUpdate,
}: {
    row: BoardRowWithWorkspace;
    onUpdate: (briefId: string, patch: Partial<BriefBoardRow>) => void;
}) {
    const data = (row.insight?.data as AgentInsightData) ?? {};
    const messages = (row.insight?.messages as unknown as ChatMessage[]) ?? [];
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const [checking, setChecking] = useState(false);
    const autoChecked = useRef(new Set<string>());
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, [messages.length]);

    const checkNow = useCallback(async () => {
        setChecking(true);
        try {
            const result = await runBriefManagerNow(row.id);
            if (result.success) {
                const fresh = await getBriefManagerBoard(row.workspaceId, 'firm');
                const updated = fresh.find(r => r.id === row.id);
                if (updated) onUpdate(row.id, updated);
            }
        } finally {
            setChecking(false);
        }
    }, [row.id, row.workspaceId, onUpdate]);

    // A context with nothing to show yet gets analyzed the moment it's
    // opened — the point of this page is that selecting a context is itself
    // an engagement, not a dead end waiting on a manual "Check now".
    useEffect(() => {
        if (!row.insight && !autoChecked.current.has(row.id)) {
            autoChecked.current.add(row.id);
            checkNow();
        }
    }, [row.id, row.insight, checkNow]);

    const sendMessage = async (text: string) => {
        const insight = row.insight;
        if (!text.trim() || sending || !insight) return;
        setSending(true);
        const next = [...messages, { role: 'user' as const, content: text }];
        onUpdate(row.id, { insight: { ...insight, messages: next } });
        setInput('');
        try {
            const res = await fetch(`/api/agents/insight/${insight.id}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text }),
            });
            const result = await res.json();
            const withReply = [...next, { role: 'assistant' as const, content: result.message ?? 'Done.' }];
            onUpdate(row.id, {
                insight: { ...insight, messages: withReply, data: result.data ?? data },
            });
        } catch {
            onUpdate(row.id, {
                insight: { ...insight, messages: [...next, { role: 'assistant' as const, content: 'Something went wrong — please try again.' }] },
            });
        } finally {
            setSending(false);
        }
    };

    const ballStyle = data.ballInCourt ? (BALL_IN_COURT_STYLE[data.ballInCourt.status] ?? BALL_IN_COURT_STYLE.unclear) : null;
    const currentStatus = data.summary?.currentStatus ?? data.lastActivity;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
                <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
                        {row.isLitigationDerived
                            ? <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', color: '#7c3aed', background: '#f5f3ff', borderRadius: 999, padding: '2px 8px' }}><Gavel size={10} /> Litigation</span>
                            : <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', color: '#0369a1', background: '#f0f9ff', borderRadius: 999, padding: '2px 8px' }}><FileText size={10} /> Advisory</span>}
                        {ballStyle && (
                            <span style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', padding: '2px 8px', borderRadius: 999, background: ballStyle.bg, color: ballStyle.text }}>
                                {ballStyle.label}
                            </span>
                        )}
                        {data.needsClientUpdate && (
                            <span style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', padding: '2px 8px', borderRadius: 999, background: '#fef2f2', color: '#b91c1c' }}>
                                Client update overdue
                            </span>
                        )}
                    </div>
                    <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', margin: 0 }}>{row.name}</h2>
                    <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: '0.15rem 0 0' }}>
                        {row.client ?? 'No client'} · {row.lawyerInCharge ?? 'Unassigned'}
                    </p>
                </div>
                <a href={`/briefs/${row.id}`} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', color: '#0d9488', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    Open Brief <ArrowUpRight size={12} />
                </a>
            </div>

            <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {checking && !row.insight && (
                    <p style={{ fontSize: '0.8rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Loader2 size={14} className="rm-spin" /> Analyzing this context for the first time…
                    </p>
                )}
                {!checking && !row.insight && (
                    <div>
                        <p style={{ fontSize: '0.8rem', color: '#6b7280' }}>No analysis yet for this context.</p>
                        <button onClick={checkNow} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.4rem 0.9rem', borderRadius: 6, border: 'none', background: '#0d9488', color: '#fff', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
                            <RefreshCw size={12} /> Analyze now
                        </button>
                    </div>
                )}

                {row.insight && messages.length === 0 && (
                    <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: '0.85rem 1rem', background: '#f8fafc' }}>
                        {currentStatus && <p style={{ fontSize: '0.82rem', color: '#374151', margin: '0 0 0.5rem', lineHeight: 1.55 }}>{currentStatus}</p>}
                        {!!data.nextSteps?.length && (
                            <>
                                <p style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#6b7280', margin: '0 0 0.4rem' }}>What's next</p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                    {data.nextSteps.map((step, i) => (
                                        <button
                                            key={i}
                                            onClick={() => sendMessage(step)}
                                            disabled={sending}
                                            style={{ textAlign: 'left', fontSize: '0.78rem', color: '#111827', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '0.5rem 0.7rem', cursor: 'pointer' }}
                                        >
                                            {step}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                        {!!data.questions?.length && (
                            <p style={{ fontSize: '0.78rem', color: '#7c3aed', fontStyle: 'italic', margin: '0.6rem 0 0' }}>&ldquo;{data.questions[0]}&rdquo;</p>
                        )}
                    </div>
                )}

                {messages.map((m, i) => (
                    <div key={i} style={{
                        alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '78%',
                        background: m.role === 'user' ? '#0d9488' : '#fff',
                        color: m.role === 'user' ? '#fff' : '#1e293b',
                        border: m.role === 'user' ? 'none' : '1px solid #e5e7eb',
                        borderRadius: 10, padding: '0.6rem 0.85rem', fontSize: '0.82rem', lineHeight: 1.55, whiteSpace: 'pre-wrap',
                    }}>
                        {m.content}
                    </div>
                ))}

                {data.needsDocuments && (
                    <div style={{ border: '1px dashed #cbd5e1', borderRadius: 8, padding: '0.7rem', background: '#fff' }}>
                        <p style={{ fontSize: '0.72rem', color: '#6b7280', margin: '0 0 0.4rem' }}>
                            {data.docRequestReason ?? 'More documents are needed to say more about this context.'}
                        </p>
                        <DocumentUpload briefId={row.id} onUploadComplete={checkNow} />
                    </div>
                )}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', padding: '0.85rem 1.25rem', borderTop: '1px solid #e5e7eb' }}>
                <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
                    placeholder={row.insight ? 'Ask, tell it what happened, or pick a next step above…' : 'Analyzing this context first…'}
                    disabled={sending || !row.insight}
                    style={{ flex: 1, fontSize: '0.82rem', padding: '0.55rem 0.8rem', border: '1px solid #e5e7eb', borderRadius: 8, outline: 'none' }}
                />
                <button
                    onClick={() => sendMessage(input)}
                    disabled={sending || !input.trim() || !row.insight}
                    style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', width: 38, height: 38, borderRadius: 8, border: 'none', flexShrink: 0,
                        background: sending || !input.trim() || !row.insight ? '#e5e7eb' : '#0d9488',
                        color: '#fff', cursor: sending || !input.trim() || !row.insight ? 'default' : 'pointer',
                    }}
                >
                    <Send size={15} />
                </button>
            </div>
        </div>
    );
}

export default function ContextClient({
    initialRows,
    workspaceId,
    userId,
}: {
    initialRows: BriefBoardRow[];
    workspaceId: string;
    userId: string;
}) {
    const [scope, setScope] = useState<'mine' | 'firm'>('mine');
    const [rows, setRows] = useState<(BriefBoardRow & { workspaceId: string })[]>(
        initialRows.map(r => ({ ...r, workspaceId })),
    );
    const [selectedId, setSelectedId] = useState<string | null>(initialRows[0]?.id ?? null);
    const [loading, setLoading] = useState(false);

    const loadScope = useCallback(async (next: 'mine' | 'firm') => {
        setLoading(true);
        try {
            const fresh = await getBriefManagerBoard(workspaceId, next);
            setRows(fresh.map(r => ({ ...r, workspaceId })));
            if (fresh.length && !fresh.some(r => r.id === selectedId)) setSelectedId(fresh[0].id);
        } finally {
            setLoading(false);
        }
    }, [workspaceId, selectedId]);

    useEffect(() => { loadScope(scope); }, [scope]); // eslint-disable-line react-hooks/exhaustive-deps

    const updateRow = (briefId: string, patch: Partial<BriefBoardRow>) => {
        setRows(prev => prev.map(r => (r.id === briefId ? { ...r, ...patch } as typeof r : r)));
    };

    const selected = rows.find(r => r.id === selectedId) ?? null;

    return (
        <div className={styles.page}>
            <aside className={styles.sidebar}>
                <div className={styles.sidebarHead}>
                    <p className={styles.sidebarTitle}>Contexts</p>
                    <div className={styles.scopeToggle}>
                        {(['mine', 'firm'] as const).map(s => (
                            <button
                                key={s}
                                onClick={() => setScope(s)}
                                className={`${styles.scopeBtn} ${scope === s ? styles.scopeBtnOn : ''}`}
                            >
                                {s === 'mine' ? 'My Briefs' : 'Firmwide'}
                            </button>
                        ))}
                    </div>
                </div>
                <div className={styles.contextList}>
                    {loading && <p className={styles.empty}><Loader2 size={14} className="rm-spin" /> Loading…</p>}
                    {!loading && rows.length === 0 && <p className={styles.empty}>No active briefs in scope.</p>}
                    {!loading && rows.map(row => {
                        const data = (row.insight?.data as AgentInsightData) ?? {};
                        return (
                            <button
                                key={row.id}
                                onClick={() => setSelectedId(row.id)}
                                className={`${styles.contextItem} ${row.id === selectedId ? styles.contextItemOn : ''}`}
                            >
                                <p className={styles.contextItemTitle}>{row.name}</p>
                                <p className={styles.contextItemMeta}>{row.client ?? 'No client'}</p>
                                <div className={styles.contextBadges}>
                                    <span className={styles.badge} style={row.isLitigationDerived ? { background: '#f5f3ff', color: '#7c3aed' } : { background: '#f0f9ff', color: '#0369a1' }}>
                                        {row.isLitigationDerived ? 'Litigation' : 'Advisory'}
                                    </span>
                                    {data.needsClientUpdate && <span className={styles.badge} style={{ background: '#fef2f2', color: '#b91c1c' }}>Update due</span>}
                                    {data.needsDocuments && <span className={styles.badge} style={{ background: '#fffbeb', color: '#b45309' }}>Docs needed</span>}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </aside>

            <div className={styles.main}>
                {selected
                    ? <ChatPanel key={selected.id} row={selected} onUpdate={updateRow} />
                    : <div className={styles.mainEmpty}>Select a context on the left to get started.</div>}
            </div>
        </div>
    );
}
