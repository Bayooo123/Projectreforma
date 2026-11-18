'use client';

import { useEffect, useState } from 'react';
import { Plus, Search, Inbox, Bell, Folder, Database, ChevronRight, Sun, Moon } from 'lucide-react';
import styles from './page.module.css';
import { AGENT_LABELS, AGENT_ICON, AGENT_COMING_SOON, NAV_AGENTS, type AgentKey, type BriefSummary, type RunView, type AttentionCounts } from './types';

function readStoredTheme(): 'light' | 'dark' | null {
    if (typeof window === 'undefined') return null;
    try {
        return (localStorage.getItem('ai-native-theme') as 'light' | 'dark' | null) ?? null;
    } catch {
        return null;
    }
}

function ThemeToggle() {
    const [theme, setTheme] = useState<'light' | 'dark' | null>(readStoredTheme);

    function toggle() {
        const prefersDark = typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;
        const current = theme ?? (prefersDark ? 'dark' : 'light');
        const next = current === 'dark' ? 'light' : 'dark';
        setTheme(next);
        try { localStorage.setItem('ai-native-theme', next); } catch { /* non-fatal */ }
    }

    useEffect(() => {
        const root = document.querySelector(`.${styles.app}`);
        if (root && theme) root.setAttribute('data-theme', theme);
    }, [theme]);

    return (
        <button type="button" className={styles.iconBtn} title="Toggle dark mode" onClick={toggle}>
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
        </button>
    );
}

export default function Sidebar({
    docked, selectedId, onSelect, selectedAgent, onSelectAgent, briefs, recentRuns, attention,
    lastPassLabel, nextPassLabel, onOpenKnowledge, runningPass,
}: {
    docked: boolean;
    selectedId: string | null;
    onSelect: (id: string | null) => void;
    selectedAgent: AgentKey | null;
    onSelectAgent: (agent: AgentKey | null) => void;
    briefs: BriefSummary[];
    recentRuns: RunView[];
    attention: AttentionCounts;
    lastPassLabel: string;
    nextPassLabel: string;
    onOpenKnowledge: () => void;
    runningPass: boolean;
}) {
    const [query, setQuery] = useState('');
    const [agentsOpen, setAgentsOpen] = useState(true);
    const filtered = query.trim()
        ? briefs.filter(b => b.name.toLowerCase().includes(query.toLowerCase()) || b.briefNumber.toLowerCase().includes(query.toLowerCase()))
        : briefs;
    const briefById = new Map(briefs.map(b => [b.id, b]));

    function goHome() {
        onSelect(null);
        onSelectAgent(null);
    }

    return (
        <aside className={`${styles.sidebar} ${docked ? styles.sidebarDocked : styles.sidebarOverlay}`}>
            <div className={styles.sidebarHead}>
                <button type="button" className={styles.brandRow} onClick={() => setAgentsOpen(v => !v)} title="Show the agent suite">
                    <span className={styles.brandName}>Reforma<span className={styles.brandX}>(X)</span></span>
                    <span className={`${styles.brandChevron} ${agentsOpen ? styles.brandChevronOpen : ''}`}>
                        <ChevronRight size={14} />
                    </span>
                </button>
                <div className={styles.headRight}>
                    <ThemeToggle />
                    <button type="button" className={styles.iconBtn} title="New" onClick={goHome}>
                        <Plus size={15} />
                    </button>
                </div>
            </div>

            <div className={styles.searchWrap}>
                <div className={styles.search}>
                    <Search size={14} />
                    <input placeholder="Search briefs" value={query} onChange={e => setQuery(e.target.value)} />
                    {!query && <span className={styles.kbdChip}>⌘K</span>}
                </div>
            </div>

            <div className={styles.sidebarScroll}>
                <button type="button" className={styles.allActivityBtn} onClick={onOpenKnowledge} title="Everything waiting on you, across every brief">
                    <Bell size={15} style={{ color: 'var(--text-body)' }} />
                    <span style={{ flex: 1, textAlign: 'left' }}>For your attention</span>
                    {attention.total > 0 && <span className={styles.reviewPill}>{attention.total}</span>}
                </button>

                <button
                    type="button"
                    className={`${styles.allActivityBtn} ${!selectedId && !selectedAgent ? styles.allActivitySelected : ''}`}
                    onClick={goHome}
                    title="Everything, across every agent and every brief"
                >
                    <Inbox size={15} style={{ color: 'var(--text-body)' }} />
                    <span style={{ flex: 1, textAlign: 'left' }}>All activity</span>
                </button>

                {agentsOpen && (
                    <div className={styles.briefList}>
                        <div className={styles.sectionLabel}><span>Agents</span></div>
                        {NAV_AGENTS.map(a => {
                            const Icon = AGENT_ICON[a];
                            const count = attention.byAgent[a] ?? 0;
                            const soon = !!AGENT_COMING_SOON[a];
                            return (
                                <button
                                    key={a}
                                    type="button"
                                    className={`${styles.agentRow} ${selectedAgent === a ? styles.agentRowSelected : ''}`}
                                    onClick={() => onSelectAgent(a)}
                                >
                                    <span className={styles.agentIcon}><Icon size={14} /></span>
                                    <span style={{ flex: 1, textAlign: 'left' }}>{AGENT_LABELS[a]}</span>
                                    {soon && <span className={styles.soonTag}>Soon</span>}
                                    {!soon && count > 0 && <span className={styles.reviewPill}>{count}</span>}
                                </button>
                            );
                        })}
                    </div>
                )}

                <div className={styles.briefList}>
                    <div className={styles.sectionLabel}><span>Briefs</span><span>{briefs.length}</span></div>
                    {filtered.map(b => (
                        <button
                            key={b.id}
                            type="button"
                            className={`${styles.briefRow} ${selectedId === b.id ? styles.briefRowSelected : ''}`}
                            onClick={() => onSelect(b.id)}
                        >
                            <span className={`${styles.briefIcon} ${selectedId === b.id ? styles.briefIconSelected : ''}`}>
                                <Folder size={15} />
                            </span>
                            <span className={styles.briefMain}>
                                <span className={styles.briefTopLine}>
                                    <span className={styles.briefName}>{b.name}</span>
                                    <span className={styles.briefDot} style={{ background: b.pending ? 'var(--green-bright)' : 'transparent' }} />
                                </span>
                                <span className={styles.briefMeta}>
                                    {b.briefNumber}{b.nextDate ? ` · Next ${new Date(b.nextDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : ' · No date'}
                                </span>
                            </span>
                        </button>
                    ))}
                </div>

                <div className={styles.briefList}>
                    <div className={styles.sectionLabel}><span>Recent</span></div>
                    {recentRuns.slice(0, 6).map(r => {
                        const brief = r.briefId ? briefById.get(r.briefId) : null;
                        return (
                            <button key={r.id} type="button" className={styles.recentRow} onClick={() => onSelect(r.briefId)}>
                                <span className={styles.recentSub}>
                                    {AGENT_LABELS[r.agent as AgentKey] ?? r.agent} — {brief ? brief.name : r.agent === 'ledger' ? 'Firm ledger' : 'Unfiled'}
                                </span>
                                <span className={styles.recentTime}>{new Date(r.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <button type="button" className={styles.kbCard} onClick={onOpenKnowledge}>
                <span className={styles.kbHead}>
                    <span style={{ color: 'var(--green-primary)', display: 'flex' }}><Database size={14} /></span>
                    {runningPass ? 'Checking the knowledge base…' : 'Knowledge base current'}
                </span>
                <span className={styles.kbBar}><span className={styles.kbBarFill} style={{ width: runningPass ? '60%' : '100%' }} /></span>
                <span className={styles.kbSub}>{lastPassLabel} · {nextPassLabel}</span>
            </button>
        </aside>
    );
}
