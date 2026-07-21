'use client';

import { useState } from 'react';
import { Bot, ChevronDown, ChevronUp, X, CheckCheck, Send } from 'lucide-react';
import { dismissAgentInsight, resolveAgentInsight, viewAgentInsight } from '@/app/actions/agent-insights';
import DocumentUpload from '@/components/briefs/DocumentUpload';
import type { BriefManagerInsightData } from '@/lib/agents/brief-manager/scan';

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

interface AgentInsightRow {
    id: string;
    briefId: string | null;
    brief: { id: string; name: string; briefNumber: string } | null;
    title: string;
    summary: string;
    data: BriefManagerInsightData;
    messages: ChatMessage[] | null;
    status: string;
    createdAt: Date;
}

const BALL_IN_COURT_STYLE: Record<string, { bg: string; text: string; label: string }> = {
    us:                { bg: '#fef2f2', text: '#dc2626', label: 'Waiting on you' },
    opposing_counsel:  { bg: '#fff7ed', text: '#ea580c', label: 'Waiting on opposing counsel' },
    court:             { bg: '#eff6ff', text: '#2563eb', label: 'Waiting on the court' },
    unclear:           { bg: '#f9fafb', text: '#6b7280', label: 'Status unclear' },
};

function InsightCard({ insight, onRemove }: { insight: AgentInsightRow; onRemove: (id: string) => void }) {
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>(insight.messages ?? []);
    const [data, setData] = useState(insight.data);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const [acting, setActing] = useState(false);
    const [resolvedNow, setResolvedNow] = useState(false);

    const ballStyle = BALL_IN_COURT_STYLE[data.ballInCourt?.status] ?? BALL_IN_COURT_STYLE.unclear;

    const handleOpen = () => {
        if (!open) viewAgentInsight(insight.id);
        setOpen(o => !o);
    };

    const send = async () => {
        const text = input.trim();
        if (!text || sending) return;
        setInput('');
        setSending(true);
        const nextMessages = [...messages, { role: 'user' as const, content: text }];
        setMessages(nextMessages);

        try {
            const res = await fetch(`/api/agents/insight/${insight.id}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text }),
            });
            const result = await res.json();
            setMessages([...nextMessages, { role: 'assistant', content: result.message ?? 'Done.' }]);
            if (result.data) setData(result.data);
            if (result.status === 'resolved' || result.status === 'dismissed') setResolvedNow(true);
        } catch {
            setMessages([...nextMessages, { role: 'assistant', content: 'Something went wrong — please try again.' }]);
        } finally {
            setSending(false);
        }
    };

    const act = async (fn: (id: string) => Promise<{ success: boolean }>) => {
        setActing(true);
        await fn(insight.id);
        setActing(false);
        onRemove(insight.id);
    };

    if (resolvedNow) return null;

    return (
        <div style={{
            border: '1px solid #e5e7eb', borderRadius: 10, background: '#fff',
            overflow: 'hidden', marginBottom: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}>
            <div style={{ padding: '0.85rem 1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.4rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                        <span style={{
                            fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                            padding: '2px 8px', borderRadius: '999px', background: ballStyle.bg, color: ballStyle.text, flexShrink: 0,
                        }}>
                            {ballStyle.label}
                        </span>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {insight.brief?.name ?? insight.title}
                        </span>
                    </div>
                    {insight.brief && (
                        <a href={`/briefs/${insight.brief.id}`} style={{ fontSize: '0.68rem', color: '#6366f1', flexShrink: 0 }}>
                            Open Brief →
                        </a>
                    )}
                </div>
                <p style={{ fontSize: '0.75rem', color: '#374151', lineHeight: 1.5, margin: '0 0 0.6rem' }}>
                    {data.lastActivity}
                </p>
                {data.questions?.length > 0 && (
                    <p style={{ fontSize: '0.75rem', color: '#4b5563', lineHeight: 1.5, margin: '0 0 0.6rem', fontStyle: 'italic' }}>
                        &ldquo;{data.questions[0]}&rdquo;
                    </p>
                )}

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                        onClick={handleOpen}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '4px',
                            padding: '0.35rem 0.85rem', borderRadius: '6px', border: 'none',
                            background: '#0d9488', color: '#fff', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer',
                        }}
                    >
                        <Bot size={12} /> {open ? 'Hide' : 'Discuss'} {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                    <button
                        onClick={() => act(resolveAgentInsight)}
                        disabled={acting}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '4px',
                            padding: '0.35rem 0.85rem', borderRadius: '6px', border: '1px solid #e5e7eb',
                            background: '#fff', color: '#374151', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer',
                        }}
                    >
                        <CheckCheck size={12} /> Resolved
                    </button>
                    <button
                        onClick={() => act(dismissAgentInsight)}
                        disabled={acting}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '4px',
                            padding: '0.35rem 0.7rem', borderRadius: '6px', border: '1px solid #e5e7eb',
                            background: 'transparent', color: '#9ca3af', fontSize: '0.72rem', cursor: 'pointer',
                        }}
                        title="Not relevant right now — dismiss"
                    >
                        <X size={12} />
                    </button>
                </div>
            </div>

            {open && (
                <div style={{ borderTop: '1px solid #f3f4f6', background: '#f8fafc', padding: '0.85rem 1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.6rem', maxHeight: 260, overflowY: 'auto' }}>
                        {messages.length === 0 && (
                            <p style={{ fontSize: '0.72rem', color: '#9ca3af', fontStyle: 'italic', margin: 0 }}>
                                Ask Brief Manager anything about this case — what&apos;s next, whether it needs a client update, or request more documents.
                            </p>
                        )}
                        {messages.map((m, i) => (
                            <div key={i} style={{
                                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                                maxWidth: '85%',
                                background: m.role === 'user' ? '#0d9488' : '#fff',
                                color: m.role === 'user' ? '#fff' : '#1e293b',
                                border: m.role === 'user' ? 'none' : '1px solid #e5e7eb',
                                borderRadius: 8, padding: '0.5rem 0.7rem', fontSize: '0.75rem', lineHeight: 1.5, whiteSpace: 'pre-wrap',
                            }}>
                                {m.content}
                            </div>
                        ))}
                    </div>

                    {data.needsDocuments && insight.briefId && (
                        <div style={{ marginBottom: '0.6rem', border: '1px dashed #cbd5e1', borderRadius: 8, padding: '0.6rem', background: '#fff' }}>
                            <p style={{ fontSize: '0.7rem', color: '#6b7280', margin: '0 0 0.4rem' }}>
                                {data.docRequestReason ?? 'More documents are needed to say more about this brief.'}
                            </p>
                            <DocumentUpload
                                briefId={insight.briefId}
                                onUploadComplete={() => setData(d => ({ ...d, needsDocuments: false }))}
                            />
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                            placeholder="Reply to Brief Manager…"
                            disabled={sending}
                            style={{
                                flex: 1, fontSize: '0.75rem', padding: '0.45rem 0.7rem',
                                border: '1px solid #e5e7eb', borderRadius: 6, outline: 'none',
                            }}
                        />
                        <button
                            onClick={send}
                            disabled={sending || !input.trim()}
                            style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                width: 32, height: 32, borderRadius: 6, border: 'none',
                                background: sending || !input.trim() ? '#e5e7eb' : '#0d9488',
                                color: sending || !input.trim() ? '#9ca3af' : '#fff', cursor: 'pointer', flexShrink: 0,
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

export default function BriefAgentPanel({ insights: initial }: { insights: AgentInsightRow[] }) {
    const [insights, setInsights] = useState(initial);
    const [collapsed, setCollapsed] = useState(true);
    const [showAll, setShowAll] = useState(false);

    if (insights.length === 0) return null;

    const visible = showAll ? insights : insights.slice(0, 5);

    return (
        <div style={{ marginBottom: '1.5rem', borderRadius: '12px', border: '1px solid #ccfbf1', overflow: 'hidden' }}>
            <button
                onClick={() => setCollapsed(c => !c)}
                style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0.85rem 1rem', background: '#f0fdfa', border: 'none', cursor: 'pointer',
                    borderBottom: collapsed ? 'none' : '1px solid #ccfbf1',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <Bot size={16} color="#0d9488" />
                    <span style={{ fontWeight: 700, fontSize: '0.82rem', color: '#0d9488' }}>
                        Brief Manager — {insights.length} case{insights.length !== 1 ? 's' : ''} to review
                    </span>
                </div>
                {collapsed ? <ChevronDown size={16} color="#0d9488" /> : <ChevronUp size={16} color="#0d9488" />}
            </button>

            {!collapsed && (
                <div style={{ padding: '0.75rem' }}>
                    {visible.map(insight => (
                        <InsightCard
                            key={insight.id}
                            insight={insight}
                            onRemove={id => setInsights(prev => prev.filter(i => i.id !== id))}
                        />
                    ))}
                    {!showAll && insights.length > 5 && (
                        <button
                            onClick={() => setShowAll(true)}
                            style={{ fontSize: '0.72rem', color: '#0d9488', background: 'none', border: 'none', cursor: 'pointer', padding: '0.4rem 0' }}
                        >
                            View all {insights.length} →
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
