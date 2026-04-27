'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './EurekaWidget.module.css';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

interface Position { bottom: number; left: number; }
const DEFAULT_POS: Position = { bottom: 84, left: 24 };
const TOGGLE_OFFSET = 60;

export default function EurekaWidget() {
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [pos, setPos] = useState<Position>(DEFAULT_POS);
    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const dragState = useRef<{ startX: number; startY: number; startLeft: number; startBottom: number } | null>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);

    useEffect(() => {
        if (open) inputRef.current?.focus();
    }, [open]);

    const send = async () => {
        const text = input.trim();
        if (!text || loading) return;

        const userMsg: Message = { role: 'user', content: text };
        const next = [...messages, userMsg];
        setMessages(next);
        setInput('');
        setLoading(true);

        try {
            const res = await fetch('/api/eureka/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: next }),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
        } catch (err: any) {
            setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${err.message ?? 'Something went wrong.'}` }]);
        } finally {
            setLoading(false);
        }
    };

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    };

    const onDragStart = (e: React.PointerEvent<HTMLDivElement>) => {
        if ((e.target as HTMLElement).closest('button')) return;
        e.preventDefault();
        const startX = e.clientX, startY = e.clientY;
        const startLeft = pos.left, startBottom = pos.bottom;
        const handleMove = (ev: PointerEvent) => setPos({
            left: Math.max(0, startLeft + ev.clientX - startX),
            bottom: Math.max(0, startBottom - (ev.clientY - startY)),
        });
        const handleUp = () => {
            window.removeEventListener('pointermove', handleMove);
            window.removeEventListener('pointerup', handleUp);
        };
        window.addEventListener('pointermove', handleMove);
        window.addEventListener('pointerup', handleUp);
    };

    const togglePos = { bottom: pos.bottom - TOGGLE_OFFSET, left: pos.left };

    return (
        <>
            <div
                className={`${styles.panel} ${open ? styles.panelOpen : styles.panelClosed}`}
                style={{ bottom: pos.bottom, left: pos.left }}
            >
                {/* Header */}
                <div className={styles.header} onPointerDown={onDragStart}>
                    <div className={styles.headerLeft}>
                        <span className={styles.headerDot} />
                        <span className={styles.headerTitle}>Eureka</span>
                        <span className={styles.headerSub}>Reforma Intelligence</span>
                    </div>
                    <div className={styles.headerActions}>
                        <button className={styles.iconBtn} onClick={() => setMessages([])} title="Clear chat">
                            <TrashIcon />
                        </button>
                        <button className={styles.iconBtn} onClick={() => setOpen(false)} title="Minimise">
                            <MinusIcon />
                        </button>
                    </div>
                </div>

                {/* Messages */}
                <div className={styles.messages}>
                    {messages.length === 0 && (
                        <div className={styles.empty}>
                            <div className={styles.emptyIcon}>⚡</div>
                            <p className={styles.emptyTitle}>Ask Eureka anything</p>
                            <div className={styles.suggestions}>
                                {[
                                    'Summarise active matters',
                                    'Which clients have outstanding invoices?',
                                    'Who appears in court most?',
                                    'Show upcoming court dates',
                                ].map(s => (
                                    <button key={s} className={styles.suggestion} onClick={() => { setInput(s); inputRef.current?.focus(); }}>
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {messages.map((m, i) => (
                        <div key={i} className={`${styles.message} ${m.role === 'user' ? styles.userMessage : styles.assistantMessage}`}>
                            {m.role === 'assistant' && <span className={styles.messageLabel}>Eureka</span>}
                            <div className={styles.messageContent}>
                                <MessageText text={m.content} />
                            </div>
                        </div>
                    ))}

                    {loading && (
                        <div className={`${styles.message} ${styles.assistantMessage}`}>
                            <span className={styles.messageLabel}>Eureka</span>
                            <div className={styles.messageContent}>
                                <div className={styles.thinking}>
                                    <span /><span /><span />
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={bottomRef} />
                </div>

                {/* Input */}
                <div className={styles.inputArea}>
                    <textarea
                        ref={inputRef}
                        className={styles.input}
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={onKeyDown}
                        placeholder="Ask about matters, clients, finances, documents…"
                        rows={1}
                    />
                    <button className={styles.sendBtn} onClick={send} disabled={!input.trim() || loading} title="Send">
                        <SendIcon />
                    </button>
                </div>
            </div>

            {/* Toggle */}
            <button
                className={styles.toggle}
                onClick={() => setOpen(o => !o)}
                title="Eureka — Reforma Intelligence"
                style={{ bottom: togglePos.bottom, left: togglePos.left }}
            >
                {open ? <MinusIcon /> : <img src="/logos/reforma-logo-monogram.png" alt="Eureka" className={styles.toggleLogo} />}
            </button>
        </>
    );
}

function MessageText({ text }: { text: string }) {
    // Render line breaks and bold (**text**)
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return (
        <>
            {parts.map((part, i) =>
                part.startsWith('**') && part.endsWith('**')
                    ? <strong key={i}>{part.slice(2, -2)}</strong>
                    : part.split('\n').map((line, j, arr) => (
                        <span key={`${i}-${j}`}>{line}{j < arr.length - 1 && <br />}</span>
                    ))
            )}
        </>
    );
}

function SendIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" />
        </svg>
    );
}
function MinusIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14" />
        </svg>
    );
}
function TrashIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
        </svg>
    );
}
