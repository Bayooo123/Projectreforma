'use client';

import { useState } from 'react';
import { generateSignalDraft, type EmailSignal } from '@/app/actions/signals';
import type { ChronologyRow } from '@/lib/services/brief-summary-generator';

const INTENT_LABELS: Record<string, string> = {
    CLIENT_QUERY: 'Client Query',
    COURT_NOTICE: 'Court Notice',
    DOCUMENT_RECEIVED: 'Document Received',
    PAYMENT: 'Payment',
    NEW_INSTRUCTION: 'New Instruction',
    ADJOURNMENT: 'Adjournment',
    CORRESPONDENCE: 'Correspondence',
};

const URGENCY_STYLES: Record<string, { bg: string; color: string; dot: string }> = {
    critical: { bg: '#fef2f2', color: '#dc2626', dot: '#dc2626' },
    high:     { bg: '#fff7ed', color: '#ea580c', dot: '#ea580c' },
    normal:   { bg: '#eff6ff', color: '#2563eb', dot: '#2563eb' },
    low:      { bg: '#f9fafb', color: '#6b7280', dot: '#9ca3af' },
};

function formatDate(date: Date | string) {
    return new Date(date).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'short', year: 'numeric',
    });
}

export function SignalCard({ signal }: { signal: EmailSignal }) {
    const [draft, setDraft]         = useState<string | null>(null);
    const [generating, setGenerating] = useState(false);
    const [error, setError]         = useState<string | null>(null);
    const [expanded, setExpanded]   = useState(false);

    const urgencyStyle = URGENCY_STYLES[signal.urgency] ?? URGENCY_STYLES.normal;
    const chronology   = signal.brief?.aiSummaryChronology as ChronologyRow[] | null;
    const recentEvents = chronology?.slice(-3) ?? [];

    const handleGenerate = async () => {
        setGenerating(true);
        setError(null);
        const result = await generateSignalDraft(signal.id);
        setGenerating(false);
        if ('error' in result) {
            setError(result.error);
        } else {
            setDraft(result.draft);
            setExpanded(true);
        }
    };

    return (
        <div style={{
            border: '1px solid #e5e7eb',
            borderRadius: 10,
            background: '#fff',
            overflow: 'hidden',
            marginBottom: '1rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                borderBottom: '1px solid #f3f4f6',
                background: urgencyStyle.bg,
                gap: '0.75rem',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 0 }}>
                    <span style={{
                        width: 7, height: 7, borderRadius: '50%',
                        background: urgencyStyle.dot, flexShrink: 0,
                    }} />
                    <span style={{
                        fontSize: '0.7rem', fontWeight: 700,
                        color: urgencyStyle.color, textTransform: 'uppercase', letterSpacing: '0.06em',
                    }}>
                        {INTENT_LABELS[signal.intent] ?? signal.intent}
                    </span>
                    <span style={{ fontSize: '0.68rem', color: '#9ca3af' }}>·</span>
                    <span style={{ fontSize: '0.68rem', color: '#6b7280' }}>
                        {signal.urgency} urgency
                    </span>
                </div>
                <span style={{ fontSize: '0.68rem', color: '#9ca3af', flexShrink: 0 }}>
                    {formatDate(signal.createdAt)}
                </span>
            </div>

            <div style={{ padding: '0.875rem 1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {/* Left — Email signal (the present) */}
                <div>
                    <p style={{ fontSize: '0.62rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 0.4rem' }}>
                        Present Signal
                    </p>
                    {signal.inboundEmail && (
                        <>
                            <p style={{ fontSize: '0.78rem', fontWeight: 600, color: '#111827', margin: '0 0 0.2rem', lineHeight: 1.3 }}>
                                {signal.inboundEmail.subject}
                            </p>
                            <p style={{ fontSize: '0.7rem', color: '#6b7280', margin: '0 0 0.5rem' }}>
                                From {signal.inboundEmail.fromName || signal.inboundEmail.fromEmail} · {formatDate(signal.inboundEmail.receivedAt)}
                            </p>
                        </>
                    )}
                    <p style={{ fontSize: '0.72rem', color: '#374151', lineHeight: 1.55, margin: 0 }}>
                        {signal.summary}
                    </p>
                </div>

                {/* Right — Matter context (the past) */}
                <div style={{ borderLeft: '1px solid #f3f4f6', paddingLeft: '1rem' }}>
                    <p style={{ fontSize: '0.62rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 0.4rem' }}>
                        Matter Context
                    </p>
                    {signal.brief ? (
                        <>
                            <p style={{ fontSize: '0.78rem', fontWeight: 600, color: '#111827', margin: '0 0 0.15rem' }}>
                                {signal.brief.name}
                            </p>
                            {signal.brief.client && (
                                <p style={{ fontSize: '0.7rem', color: '#6b7280', margin: '0 0 0.5rem' }}>
                                    {signal.brief.client.name} · {signal.brief.category}
                                </p>
                            )}
                            {signal.brief.aiSummaryProse ? (
                                <p style={{ fontSize: '0.71rem', color: '#374151', lineHeight: 1.55, margin: '0 0 0.5rem' }}>
                                    {signal.brief.aiSummaryProse.slice(0, 200)}…
                                </p>
                            ) : (
                                <p style={{ fontSize: '0.71rem', color: '#9ca3af', fontStyle: 'italic', margin: '0 0 0.5rem' }}>
                                    No brief summary yet — generate one from the brief page.
                                </p>
                            )}
                            {recentEvents.length > 0 && (
                                <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '0.4rem' }}>
                                    <p style={{ fontSize: '0.6rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 0.3rem' }}>
                                        Recent Chronology
                                    </p>
                                    {recentEvents.map((row, i) => (
                                        <p key={i} style={{ fontSize: '0.68rem', color: '#6b7280', margin: '0 0 0.15rem', lineHeight: 1.4 }}>
                                            <span style={{ color: '#0d9488', fontWeight: 600 }}>{row.dateDisplay || row.date}</span>
                                            {' — '}
                                            {row.narrative ?? `${row.title ?? ''} ${row.summary ?? ''}`.trim()}
                                        </p>
                                    ))}
                                </div>
                            )}
                        </>
                    ) : (
                        <p style={{ fontSize: '0.71rem', color: '#9ca3af', fontStyle: 'italic' }}>
                            No brief linked to this signal.
                        </p>
                    )}
                </div>
            </div>

            {/* Draft output (the future) */}
            {draft && expanded && (
                <div style={{
                    borderTop: '1px solid #e5e7eb',
                    background: '#f8fafc',
                    padding: '0.875rem 1rem',
                }}>
                    <p style={{ fontSize: '0.62rem', fontWeight: 700, color: '#0d9488', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 0.5rem' }}>
                        Suggested Draft — Future Action
                    </p>
                    <pre style={{
                        fontSize: '0.73rem', lineHeight: 1.65, color: '#1e293b',
                        whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0,
                    }}>
                        {draft}
                    </pre>
                </div>
            )}

            {error && (
                <div style={{ borderTop: '1px solid #fee2e2', background: '#fef2f2', padding: '0.6rem 1rem' }}>
                    <p style={{ fontSize: '0.72rem', color: '#dc2626', margin: 0 }}>{error}</p>
                </div>
            )}

            {/* Footer */}
            <div style={{
                borderTop: '1px solid #f3f4f6',
                padding: '0.6rem 1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.5rem',
            }}>
                {signal.brief && (
                    <a
                        href={`/briefs/${signal.brief.id}`}
                        style={{ fontSize: '0.7rem', color: '#6b7280', textDecoration: 'none' }}
                    >
                        Open Brief →
                    </a>
                )}
                <div style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto' }}>
                    {draft && (
                        <button
                            onClick={() => setExpanded(v => !v)}
                            style={{
                                fontSize: '0.7rem', padding: '0.3rem 0.7rem',
                                border: '1px solid #e5e7eb', borderRadius: 6,
                                background: '#fff', color: '#6b7280', cursor: 'pointer',
                            }}
                        >
                            {expanded ? 'Hide Draft' : 'Show Draft'}
                        </button>
                    )}
                    <button
                        onClick={handleGenerate}
                        disabled={generating}
                        style={{
                            fontSize: '0.7rem', padding: '0.3rem 0.85rem',
                            border: 'none', borderRadius: 6,
                            background: generating ? '#e5e7eb' : '#0d9488',
                            color: generating ? '#6b7280' : '#fff',
                            cursor: generating ? 'default' : 'pointer',
                            fontWeight: 600,
                        }}
                    >
                        {generating ? 'Generating…' : draft ? 'Regenerate Draft' : 'Generate Draft'}
                    </button>
                </div>
            </div>
        </div>
    );
}
