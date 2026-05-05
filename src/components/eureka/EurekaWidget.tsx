'use client';

import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import styles from './EurekaWidget.module.css';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

interface ChatSession {
    id: string;
    title: string;
    createdAt: number;
    messages: Message[];
}

interface Position { bottom: number; left: number; }
const DEFAULT_POS: Position = { bottom: 84, left: 24 };
const TOGGLE_OFFSET = 60;
const MAX_SESSIONS = 40;

function storageKey(userId: string, workspaceId: string) {
    return `eureka_chats_${userId}_${workspaceId}`;
}

function loadSessions(userId: string, workspaceId: string): ChatSession[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem(storageKey(userId, workspaceId));
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function saveSessions(userId: string, workspaceId: string, sessions: ChatSession[]) {
    try {
        const trimmed = [...sessions]
            .sort((a, b) => b.createdAt - a.createdAt)
            .slice(0, MAX_SESSIONS);
        localStorage.setItem(storageKey(userId, workspaceId), JSON.stringify(trimmed));
    } catch {}
}

function makeId() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function autoTitle(firstUserMessage: string): string {
    const t = firstUserMessage.trim();
    return t.length > 42 ? t.slice(0, 42) + '…' : t;
}

function relativeTime(ts: number): string {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export default function EurekaWidget() {
    const { data: session } = useSession();
    const userId = (session?.user as any)?.id as string | undefined;
    const workspaceId = (session?.user as any)?.workspaceId as string | undefined;

    const [open, setOpen] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [pos, setPos] = useState<Position>(DEFAULT_POS);
    const [loaded, setLoaded] = useState(false);

    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const router = useRouter();

    // One-time cleanup of the old unscoped key (removes contaminated shared history)
    useEffect(() => {
        try { localStorage.removeItem('eureka_history'); } catch {}
    }, []);

    // Load sessions once userId + workspaceId are known
    useEffect(() => {
        if (userId && workspaceId && !loaded) {
            const s = loadSessions(userId, workspaceId);
            setSessions(s);
            if (s.length > 0) setActiveId(s[0].id);
            setLoaded(true);
        }
    }, [userId, workspaceId, loaded]);

    // Persist whenever sessions change (post-load)
    useEffect(() => {
        if (loaded && userId && workspaceId) {
            saveSessions(userId, workspaceId, sessions);
        }
    }, [sessions, loaded, userId, workspaceId]);

    const activeSession = sessions.find(s => s.id === activeId) ?? null;
    const messages = activeSession?.messages ?? [];

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);

    useEffect(() => {
        if (open) inputRef.current?.focus();
    }, [open, activeId]);

    const startNewChat = () => {
        const s: ChatSession = { id: makeId(), title: 'New Chat', createdAt: Date.now(), messages: [] };
        setSessions(prev => [s, ...prev]);
        setActiveId(s.id);
        setInput('');
        // On mobile collapse the sidebar after selecting new chat
        if (typeof window !== 'undefined' && window.innerWidth <= 480) {
            setSidebarOpen(false);
        }
    };

    const selectSession = (id: string) => {
        setActiveId(id);
        if (typeof window !== 'undefined' && window.innerWidth <= 480) {
            setSidebarOpen(false);
        }
    };

    const deleteSession = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setSessions(prev => {
            const next = prev.filter(s => s.id !== id);
            if (activeId === id) setActiveId(next.length > 0 ? next[0].id : null);
            return next;
        });
    };

    const autoResize = (el: HTMLTextAreaElement) => {
        el.style.height = 'auto';
        el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
    };

    const send = async () => {
        const text = input.trim();
        if (!text || loading) return;

        setInput('');
        if (inputRef.current) inputRef.current.style.height = 'auto';
        setLoading(true);

        const userMsg: Message = { role: 'user', content: text };
        let targetId = activeId;
        let priorMessages: Message[];

        if (!targetId) {
            const newSession: ChatSession = {
                id: makeId(),
                title: autoTitle(text),
                createdAt: Date.now(),
                messages: [userMsg],
            };
            setSessions(prev => [newSession, ...prev]);
            setActiveId(newSession.id);
            targetId = newSession.id;
            priorMessages = [];
        } else {
            priorMessages = messages;
            setSessions(prev => prev.map(s => {
                if (s.id !== targetId) return s;
                const updated = [...s.messages, userMsg];
                return {
                    ...s,
                    messages: updated,
                    title: s.messages.length === 0 ? autoTitle(text) : s.title,
                };
            }));
        }

        const apiMessages = [...priorMessages, userMsg];

        try {
            const res = await fetch('/api/eureka/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: apiMessages }),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            const assistantMsg: Message = { role: 'assistant', content: data.message };
            setSessions(prev => prev.map(s =>
                s.id === targetId ? { ...s, messages: [...s.messages, assistantMsg] } : s
            ));
        } catch (err: any) {
            const errMsg: Message = { role: 'assistant', content: `Error: ${err.message ?? 'Something went wrong.'}` };
            setSessions(prev => prev.map(s =>
                s.id === targetId ? { ...s, messages: [...s.messages, errMsg] } : s
            ));
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
                {/* Sidebar */}
                <div className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarVisible : styles.sidebarHidden}`}>
                    <div className={styles.sidebarHeader}>
                        <button className={styles.newChatBtn} onClick={startNewChat}>
                            <PlusIcon />
                            <span>New Chat</span>
                        </button>
                    </div>
                    <div className={styles.sessionList}>
                        {sessions.length === 0 && (
                            <p className={styles.noSessions}>No conversations yet</p>
                        )}
                        {sessions.map(s => (
                            <div
                                key={s.id}
                                className={`${styles.sessionItem} ${s.id === activeId ? styles.sessionItemActive : ''}`}
                                onClick={() => selectSession(s.id)}
                                title={s.title}
                            >
                                <div className={styles.sessionTitle}>{s.title}</div>
                                <div className={styles.sessionMeta}>{relativeTime(s.createdAt)}</div>
                                <button
                                    className={styles.sessionDelete}
                                    onClick={(e) => deleteSession(s.id, e)}
                                    title="Delete"
                                >
                                    <XSmallIcon />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Chat area */}
                <div className={styles.chatArea}>
                    {/* Header */}
                    <div className={styles.header} onPointerDown={onDragStart}>
                        <div className={styles.headerLeft}>
                            <button
                                className={styles.iconBtn}
                                onClick={() => setSidebarOpen(o => !o)}
                                title={sidebarOpen ? 'Hide history' : 'Show history'}
                            >
                                <SidebarIcon />
                            </button>
                            <span className={styles.headerDot} />
                            <span className={styles.headerTitle}>Eureka</span>
                            <span className={styles.headerSub}>Reforma Intelligence</span>
                        </div>
                        <div className={styles.headerActions}>
                            <button className={styles.iconBtn} onClick={startNewChat} title="New chat">
                                <PlusIcon />
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
                                        'Show upcoming deadlines this week',
                                        'Which matters have had no activity in 30 days?',
                                        'Which clients have overdue invoices?',
                                        'Who appears in court most?',
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
                            onChange={e => { setInput(e.target.value); autoResize(e.target); }}
                            onKeyDown={onKeyDown}
                            placeholder="Ask about matters, clients, finances, documents…"
                            rows={1}
                        />
                        <button className={styles.sendBtn} onClick={send} disabled={!input.trim() || loading} title="Send">
                            <SendIcon />
                        </button>
                    </div>
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
    const router = useRouter();

    function renderInline(str: string, key: string): React.ReactNode[] {
        const parts = str.split(/(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*)/g);
        return parts.map((part, i) => {
            const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
            if (linkMatch) {
                const [, label, href] = linkMatch;
                const internal = href.startsWith('/');
                return (
                    <a
                        key={`${key}-${i}`}
                        href={href}
                        className={styles.link}
                        onClick={internal ? (e) => { e.preventDefault(); router.push(href); } : undefined}
                        target={internal ? undefined : '_blank'}
                        rel="noopener noreferrer"
                    >
                        {label}
                    </a>
                );
            }
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={`${key}-${i}`}>{part.slice(2, -2)}</strong>;
            }
            return <span key={`${key}-${i}`}>{part}</span>;
        });
    }

    const isSep = (line: string) => /^\|[\s\-:|]+\|/.test(line.trim());
    const isRow = (line: string) => line.trim().startsWith('|');
    const parseRow = (line: string) => line.trim().split('|').slice(1, -1).map(c => c.trim());

    type Seg = { type: 'text'; lines: string[] } | { type: 'table'; headers: string[]; rows: string[][] };

    const segments: Seg[] = [];
    const rawLines = text.split('\n');
    let i = 0;

    while (i < rawLines.length) {
        if (isRow(rawLines[i]) && isSep(rawLines[i + 1] ?? '')) {
            const tableLines: string[] = [];
            while (i < rawLines.length && isRow(rawLines[i])) { tableLines.push(rawLines[i++]); }
            segments.push({ type: 'table', headers: parseRow(tableLines[0]), rows: tableLines.slice(2).map(parseRow) });
        } else {
            const textLines: string[] = [];
            while (i < rawLines.length && !(isRow(rawLines[i]) && isSep(rawLines[i + 1] ?? ''))) {
                textLines.push(rawLines[i++]);
            }
            if (textLines.length) segments.push({ type: 'text', lines: textLines });
        }
    }

    return (
        <>
            {segments.map((seg, si) => {
                if (seg.type === 'table') {
                    return (
                        <div key={si} className={styles.tableWrapper}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>{seg.headers.map((h, hi) => <th key={hi}>{renderInline(h, `${si}h${hi}`)}</th>)}</tr>
                                </thead>
                                <tbody>
                                    {seg.rows.map((row, ri) => (
                                        <tr key={ri}>{row.map((cell, ci) => <td key={ci}>{renderInline(cell, `${si}r${ri}c${ci}`)}</td>)}</tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    );
                }
                return (
                    <span key={si}>
                        {seg.lines.map((line, li) => (
                            <span key={li}>
                                {renderInline(line, `${si}l${li}`)}
                                {li < seg.lines.length - 1 && <br />}
                            </span>
                        ))}
                    </span>
                );
            })}
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
function PlusIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
        </svg>
    );
}
function SidebarIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M9 3v18" />
        </svg>
    );
}
function XSmallIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18M6 6l12 12" />
        </svg>
    );
}
