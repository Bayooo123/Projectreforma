'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Bot, ChevronDown, ChevronUp, Send, RefreshCw } from 'lucide-react';
import { getBriefManagerBoard, getOpenAgentInsights, runBriefManagerNow, getInsightSnapshot, type BriefBoardRow } from '@/app/actions/agent-insights';
import DocumentUpload from '@/components/briefs/DocumentUpload';
import BriefHistorySearch from '@/components/pulse/BriefHistorySearch';

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

// Loose union of every agent's data shape — each agentType only populates the
// fields relevant to it (see BriefManagerInsightData / MeetingAgentInsightData).
interface AgentInsightData {
    lastActivity?: string;
    summary?: { currentStatus: string; background: string; keyDevelopments: string[]; outstandingIssues: string[] };
    nextSteps?: string[];
    ballInCourt?: { status: string; rationale: string };
    representing?: { party: string; confidence: string };
    questions?: string[];
    needsDocuments?: boolean;
    docRequestReason?: string;
    needsClientUpdate?: boolean;
    daysSinceClientContact?: number;
    prompt?: string;
}

interface BoardRow {
    briefId: string | null;
    briefName: string;
    client: string | null;
    lawyerInCharge: string | null;
    insightId: string | null;
    summary: string | null;
    data: AgentInsightData;
    messages: ChatMessage[];
    checking: boolean;
}

const BALL_IN_COURT_STYLE: Record<string, { bg: string; text: string; label: string }> = {
    us:                { bg: '#fef2f2', text: '#dc2626', label: 'Waiting on you' },
    opposing_counsel:  { bg: '#fff7ed', text: '#ea580c', label: 'Waiting on opposing counsel' },
    court:             { bg: '#eff6ff', text: '#2563eb', label: 'Waiting on the court' },
    unclear:           { bg: '#f9fafb', text: '#6b7280', label: 'Status unclear' },
};

const AGENT_LABELS: Record<string, string> = {
    brief_manager: 'Brief Manager',
    meetings: 'Meetings & Calendar',
};

function BoardRowCard({ row, onChecked }: { row: BoardRow; onChecked: () => void }) {
    const [open, setOpen] = useState(false);
    const [showSteps, setShowSteps] = useState(false);
    const [showSummary, setShowSummary] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>(row.messages);
    const [data, setData] = useState(row.data);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const [checking, setChecking] = useState(false);
    const [checkError, setCheckError] = useState<string | null>(null);
    const mountedRef = useRef(true);
    useEffect(() => () => { mountedRef.current = false; }, []);

    const ballStyle = data.ballInCourt ? (BALL_IN_COURT_STYLE[data.ballInCourt.status] ?? BALL_IN_COURT_STYLE.unclear) : null;
    const questionLine = data.questions?.[0] ?? data.prompt;
    // Falls back to the pre-executive-summary shape for insights not yet regenerated.
    const currentStatus = data.summary?.currentStatus ?? data.lastActivity;

    const send = async () => {
        const text = input.trim();
        if (!text || sending || !row.insightId) return;
        setInput('');
        setSending(true);
        const next = [...messages, { role: 'user' as const, content: text }];
        setMessages(next);
        try {
            const res = await fetch(`/api/agents/insight/${row.insightId}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text }),
            });
            const result = await res.json();
            setMessages([...next, { role: 'assistant', content: result.message ?? 'Done.' }]);
            if (result.data) setData(result.data);

            // record_brief_update's insight regeneration runs via after() post-response
            // (kept off the critical path so the reply above isn't slowed down by it),
            // so the data just set above can still be pre-regeneration. Re-check shortly
            // after so the collapsed "what happened last" line catches up without
            // requiring a manual reload — this is the line lawyers rely on each morning.
            const insightId = row.insightId;
            if (insightId) {
                setTimeout(async () => {
                    if (!mountedRef.current) return;
                    try {
                        const fresh = await getInsightSnapshot(insightId);
                        if (fresh && mountedRef.current) setData(fresh.data as AgentInsightData);
                    } catch { /* best-effort — the next full board load will still pick it up */ }
                }, 8000);
            }
        } catch {
            setMessages([...next, { role: 'assistant', content: 'Something went wrong — please try again.' }]);
        } finally {
            setSending(false);
        }
    };

    const checkNow = async () => {
        if (!row.briefId) return;
        setChecking(true);
        setCheckError(null);
        try {
            const result = await runBriefManagerNow(row.briefId);
            if (!result.success) {
                setCheckError(result.error ?? 'Could not check this brief right now.');
                return;
            }
            onChecked();
        } catch {
            setCheckError('Something went wrong — please try again.');
        } finally {
            setChecking(false);
        }
    };

    return (
        <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, background: '#fff', overflow: 'hidden', marginBottom: '0.6rem' }}>
            <div style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                        <span style={{
                            fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                            padding: '2px 8px', borderRadius: '999px',
                            background: ballStyle?.bg ?? '#f3f4f6', color: ballStyle?.text ?? '#6b7280', flexShrink: 0,
                        }}>
                            {ballStyle?.label ?? (row.insightId ? 'Checked' : 'Not yet checked')}
                        </span>
                        {data.needsClientUpdate && (
                            <span style={{
                                fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                                padding: '2px 8px', borderRadius: '999px',
                                background: '#fef2f2', color: '#b91c1c', flexShrink: 0,
                            }}>
                                Client update overdue{typeof data.daysSinceClientContact === 'number' ? ` — ${data.daysSinceClientContact}d` : ''}
                            </span>
                        )}
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#111827' }}>{row.briefName}</span>
                        {row.client && <span style={{ fontSize: '0.72rem', color: '#9ca3af' }}>· {row.client}</span>}
                    </div>
                    <p style={{ fontSize: '0.78rem', color: '#4b5563', margin: 0, lineHeight: 1.5 }}>
                        {currentStatus ?? row.summary ?? (row.insightId ? '' : 'No status yet — click Check now to have Brief Manager review this brief.')}
                    </p>
                    {!open && questionLine && (
                        <p style={{ fontSize: '0.75rem', color: '#7c3aed', fontStyle: 'italic', margin: '0.3rem 0 0' }}>
                            &ldquo;{questionLine}&rdquo;
                        </p>
                    )}
                    {checkError && (
                        <p style={{ fontSize: '0.72rem', color: '#b91c1c', margin: '0.3rem 0 0' }}>{checkError}</p>
                    )}
                </div>
                <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                    {row.insightId && data.summary && (
                        <button
                            onClick={() => setShowSummary(s => !s)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '4px',
                                padding: '0.35rem 0.85rem', borderRadius: 6, border: '1px solid #e5e7eb',
                                background: '#fff', color: '#374151', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer',
                            }}
                        >
                            Case summary {showSummary ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>
                    )}
                    {row.insightId && data.nextSteps && data.nextSteps.length > 0 && (
                        <button
                            onClick={() => setShowSteps(s => !s)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '4px',
                                padding: '0.35rem 0.85rem', borderRadius: 6, border: '1px solid #e5e7eb',
                                background: '#fff', color: '#374151', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer',
                            }}
                        >
                            Next steps {showSteps ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>
                    )}
                    {row.insightId ? (
                        <button
                            onClick={() => setOpen(o => !o)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '4px',
                                padding: '0.35rem 0.85rem', borderRadius: 6, border: 'none',
                                background: '#0d9488', color: '#fff', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer',
                            }}
                        >
                            Discuss {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>
                    ) : (
                        <button
                            onClick={checkNow}
                            disabled={checking}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '4px',
                                padding: '0.35rem 0.85rem', borderRadius: 6, border: '1px solid #e5e7eb',
                                background: checking ? '#f3f4f6' : '#fff', color: '#374151', fontSize: '0.72rem', fontWeight: 600, cursor: checking ? 'default' : 'pointer',
                            }}
                        >
                            <RefreshCw size={12} className={checking ? 'rm-spin' : ''} /> {checking ? 'Checking…' : 'Check now'}
                        </button>
                    )}
                </div>
            </div>

            {showSummary && data.summary && (
                <div style={{ borderTop: '1px solid #f3f4f6', background: '#fafafa', padding: '0.6rem 1rem' }}>
                    {data.summary.background && (
                        <p style={{ fontSize: '0.75rem', color: '#374151', margin: '0 0 0.5rem', lineHeight: 1.6 }}>
                            <strong>Background:</strong> {data.summary.background}
                        </p>
                    )}
                    {data.summary.keyDevelopments && data.summary.keyDevelopments.length > 0 && (
                        <div style={{ marginBottom: '0.5rem' }}>
                            <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#6b7280', margin: '0 0 0.25rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Key developments</p>
                            <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
                                {data.summary.keyDevelopments.map((d, i) => (
                                    <li key={i} style={{ fontSize: '0.75rem', color: '#374151', lineHeight: 1.6 }}>{d}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {data.summary.outstandingIssues && data.summary.outstandingIssues.length > 0 && (
                        <div>
                            <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#6b7280', margin: '0 0 0.25rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Outstanding issues</p>
                            <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
                                {data.summary.outstandingIssues.map((issue, i) => (
                                    <li key={i} style={{ fontSize: '0.75rem', color: '#374151', lineHeight: 1.6 }}>{issue}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}

            {showSteps && data.nextSteps && data.nextSteps.length > 0 && (
                <div style={{ borderTop: '1px solid #f3f4f6', background: '#fafafa', padding: '0.6rem 1rem' }}>
                    <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
                        {data.nextSteps.map((step, i) => (
                            <li key={i} style={{ fontSize: '0.75rem', color: '#374151', lineHeight: 1.6 }}>{step}</li>
                        ))}
                    </ul>
                </div>
            )}

            {open && row.insightId && (
                <div style={{ borderTop: '1px solid #f3f4f6', background: '#f8fafc', padding: '0.75rem 1rem' }}>
                    {data.nextSteps && data.nextSteps.length > 0 && (
                        <p style={{ fontSize: '0.75rem', color: '#374151', margin: '0 0 0.5rem' }}>
                            <strong>Next:</strong> {data.nextSteps.join('; ')}
                        </p>
                    )}
                    {questionLine && (
                        <p style={{ fontSize: '0.75rem', color: '#4b5563', fontStyle: 'italic', margin: '0 0 0.6rem' }}>&ldquo;{questionLine}&rdquo;</p>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.6rem', maxHeight: 220, overflowY: 'auto' }}>
                        {messages.map((m, i) => (
                            <div key={i} style={{
                                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%',
                                background: m.role === 'user' ? '#0d9488' : '#fff',
                                color: m.role === 'user' ? '#fff' : '#1e293b',
                                border: m.role === 'user' ? 'none' : '1px solid #e5e7eb',
                                borderRadius: 8, padding: '0.5rem 0.7rem', fontSize: '0.75rem', lineHeight: 1.5, whiteSpace: 'pre-wrap',
                            }}>
                                {m.content}
                            </div>
                        ))}
                    </div>
                    {data.needsDocuments && row.briefId && (
                        <div style={{ marginBottom: '0.6rem', border: '1px dashed #cbd5e1', borderRadius: 8, padding: '0.6rem', background: '#fff' }}>
                            <p style={{ fontSize: '0.7rem', color: '#6b7280', margin: '0 0 0.4rem' }}>
                                {data.docRequestReason ?? 'More documents are needed.'}
                            </p>
                            <DocumentUpload briefId={row.briefId} onUploadComplete={() => setData((d: AgentInsightData) => ({ ...d, needsDocuments: false }))} />
                        </div>
                    )}
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                            placeholder="Tell it what happened, or ask a question…"
                            disabled={sending}
                            style={{ flex: 1, fontSize: '0.75rem', padding: '0.45rem 0.7rem', border: '1px solid #e5e7eb', borderRadius: 6, outline: 'none' }}
                        />
                        <button
                            onClick={send}
                            disabled={sending || !input.trim()}
                            style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 6, border: 'none',
                                background: sending || !input.trim() ? '#e5e7eb' : '#0d9488', color: '#fff', cursor: 'pointer', flexShrink: 0,
                            }}
                        >
                            <Send size={14} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function AgentBoard({ workspaceId, agentType }: { workspaceId: string; agentType: string }) {
    const [scope, setScope] = useState<'firm' | 'mine'>('firm');
    const [rows, setRows] = useState<BoardRow[] | null>(null);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        if (agentType === 'brief_manager') {
            const board: BriefBoardRow[] = await getBriefManagerBoard(workspaceId, scope);
            setRows(board.map(b => ({
                briefId: b.id,
                briefName: b.name,
                client: b.client,
                lawyerInCharge: b.lawyerInCharge,
                insightId: b.insight?.id ?? null,
                summary: b.insight?.summary ?? null,
                data: (b.insight?.data as AgentInsightData) ?? {},
                messages: (b.insight?.messages as unknown as ChatMessage[]) ?? [],
                checking: false,
            })));
        } else {
            const insights = await getOpenAgentInsights(workspaceId, agentType);
            setRows(insights.map(i => ({
                briefId: i.briefId,
                briefName: i.brief?.name ?? i.title,
                client: null,
                lawyerInCharge: null,
                insightId: i.id,
                summary: i.summary,
                data: (i.data as AgentInsightData) ?? {},
                messages: (i.messages as unknown as ChatMessage[]) ?? [],
                checking: false,
            })));
        }
        setLoading(false);
    }, [workspaceId, agentType, scope]);

    // Standard fetch-on-mount/on-scope-change pattern; setState inside load() is intentional.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { load(); }, [load]);

    return (
        <div>
            {agentType === 'brief_manager' && <BriefHistorySearch workspaceId={workspaceId} />}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Bot size={18} color="#0d9488" />
                    <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', margin: 0 }}>
                        {AGENT_LABELS[agentType] ?? agentType}
                    </h2>
                </div>
                {agentType === 'brief_manager' && (
                    <div style={{ display: 'flex', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
                        {(['firm', 'mine'] as const).map(s => (
                            <button
                                key={s}
                                onClick={() => setScope(s)}
                                style={{
                                    padding: '0.35rem 0.9rem', fontSize: '0.75rem', fontWeight: 600, border: 'none', cursor: 'pointer',
                                    background: scope === s ? '#0d9488' : '#fff', color: scope === s ? '#fff' : '#374151',
                                }}
                            >
                                {s === 'firm' ? 'Firmwide' : 'My Briefs'}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {loading && <p style={{ fontSize: '0.8rem', color: '#9ca3af' }}>Loading…</p>}
            {!loading && rows?.length === 0 && (
                <p style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
                    {agentType === 'brief_manager' ? 'No active briefs in scope.' : 'Nothing needs attention right now.'}
                </p>
            )}
            {!loading && rows?.map(row => (
                <BoardRowCard key={row.insightId ?? row.briefId} row={row} onChecked={load} />
            ))}
        </div>
    );
}
