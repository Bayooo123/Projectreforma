"use client";

import { useState } from 'react';
import { BrainCircuit, X, Check } from 'lucide-react';
import { answerMatterQuestion, dismissMatterQuestion } from '@/app/actions/matterQuestions';

interface Question {
    id: string;
    question: string;
    askedAt: Date | string;
    matter: { id: string; name: string; caseNumber: string | null; court: string | null };
    calendarEntry: { id: string; date: Date | string; title: string | null };
}

interface Props {
    questions: Question[];
}

export default function PendingQuestionsPanel({ questions }: Props) {
    const [hidden, setHidden] = useState<Set<string>>(new Set());
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState<string | null>(null);

    const visible = questions.filter(q => !hidden.has(q.id));
    if (visible.length === 0) return null;

    function hide(id: string) {
        setHidden(prev => new Set([...prev, id]));
    }

    async function handleDismiss(id: string) {
        hide(id);
        await dismissMatterQuestion(id);
    }

    async function handleSubmit(id: string) {
        const answer = (answers[id] || '').trim();
        if (!answer) return;
        setSubmitting(id);
        const result = await answerMatterQuestion(id, answer);
        setSubmitting(null);
        if (result.success) hide(id);
    }

    return (
        <div style={{
            background: '#fefce8',
            border: '1px solid #fde68a',
            borderRadius: 12,
            marginBottom: 16,
            overflow: 'hidden',
        }}>
            {/* Header */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 14px',
                borderBottom: '1px solid #fde68a',
                background: '#fffbeb',
            }}>
                <BrainCircuit size={14} color="#b45309" />
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#92400e' }}>
                    Eureka needs your input
                </span>
                <span style={{ fontSize: '0.72rem', color: '#b45309', marginLeft: 4 }}>
                    {visible.length} court outcome{visible.length !== 1 ? 's' : ''} unrecorded
                </span>
            </div>

            {/* Questions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {visible.map((q, idx) => {
                    const hearingDate = new Date(q.calendarEntry.date).toLocaleDateString('en-GB', {
                        weekday: 'short', day: 'numeric', month: 'short',
                    });
                    const isSubmitting = submitting === q.id;
                    const answer = answers[q.id] || '';

                    return (
                        <div
                            key={q.id}
                            style={{
                                padding: '12px 14px',
                                borderBottom: idx < visible.length - 1 ? '1px solid #fde68a' : 'none',
                            }}
                        >
                            {/* Meta row */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#1e293b' }}>
                                        {q.matter.name}
                                    </span>
                                    {q.matter.caseNumber && (
                                        <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>{q.matter.caseNumber}</span>
                                    )}
                                    <span style={{
                                        fontSize: '0.68rem', color: '#b45309',
                                        background: '#fef3c7', borderRadius: 20,
                                        padding: '1px 8px', fontWeight: 600,
                                    }}>
                                        {hearingDate}
                                    </span>
                                    {q.matter.court && (
                                        <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>{q.matter.court}</span>
                                    )}
                                </div>
                                <button
                                    onClick={() => handleDismiss(q.id)}
                                    disabled={isSubmitting}
                                    title="Skip this question"
                                    style={{
                                        background: 'none', border: 'none', cursor: 'pointer',
                                        color: '#94a3b8', padding: '2px', display: 'flex',
                                    }}
                                >
                                    <X size={13} />
                                </button>
                            </div>

                            {/* Question text */}
                            <p style={{ fontSize: '0.82rem', color: '#0f172a', margin: '0 0 8px', fontWeight: 500, lineHeight: 1.5 }}>
                                {q.question}
                            </p>

                            {/* Answer row */}
                            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                                <textarea
                                    value={answer}
                                    onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                                    placeholder="Record the outcome — ruling, adjournment, orders made…"
                                    rows={2}
                                    style={{
                                        flex: 1, resize: 'vertical',
                                        padding: '6px 10px',
                                        border: '1px solid #fcd34d',
                                        borderRadius: 7,
                                        fontSize: '0.8rem',
                                        color: '#1e293b',
                                        background: '#fff',
                                        fontFamily: 'inherit',
                                        outline: 'none',
                                    }}
                                    onFocus={e => { e.target.style.borderColor = '#f59e0b'; }}
                                    onBlur={e => { e.target.style.borderColor = '#fcd34d'; }}
                                />
                                <button
                                    onClick={() => handleSubmit(q.id)}
                                    disabled={!answer.trim() || isSubmitting}
                                    style={{
                                        display: 'inline-flex', alignItems: 'center', gap: 5,
                                        padding: '6px 14px', borderRadius: 7,
                                        border: 'none',
                                        background: !answer.trim() || isSubmitting ? '#e2e8f0' : '#b45309',
                                        color: !answer.trim() || isSubmitting ? '#94a3b8' : '#fff',
                                        fontSize: '0.78rem', fontWeight: 700,
                                        cursor: !answer.trim() || isSubmitting ? 'not-allowed' : 'pointer',
                                        whiteSpace: 'nowrap', flexShrink: 0,
                                        transition: 'background 0.15s',
                                    }}
                                >
                                    <Check size={12} />
                                    {isSubmitting ? 'Saving…' : 'Record'}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
