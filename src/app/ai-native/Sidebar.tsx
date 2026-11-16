'use client';

import { useState } from 'react';
import { Plus, Search, Inbox, Folder, Database } from 'lucide-react';
import styles from './page.module.css';
import { AGENT_LABELS, type AgentKey, type BriefSummary, type RunView, type KnowledgeStatus } from './types';

export default function Sidebar({
    docked, selectedId, onSelect, briefs, recentRuns, knowledge, onOpenKnowledge, runningPass,
}: {
    docked: boolean;
    selectedId: string | null;
    onSelect: (id: string | null) => void;
    briefs: BriefSummary[];
    recentRuns: RunView[];
    knowledge: KnowledgeStatus;
    onOpenKnowledge: () => void;
    runningPass: boolean;
}) {
    const [query, setQuery] = useState('');
    const filtered = query.trim()
        ? briefs.filter(b => b.name.toLowerCase().includes(query.toLowerCase()) || b.briefNumber.toLowerCase().includes(query.toLowerCase()))
        : briefs;
    const reviewCount = briefs.filter(b => b.pending).length;
    const briefById = new Map(briefs.map(b => [b.id, b]));

    return (
        <aside className={`${styles.sidebar} ${docked ? styles.sidebarDocked : styles.sidebarOverlay}`}>
            <div className={styles.sidebarHead}>
                <div className={styles.brandRow}>
                    <span className={styles.brandName}>Reforma</span>
                    <span className={styles.brandSub}>Junior</span>
                </div>
                <button type="button" className={styles.iconBtn} title="New" onClick={() => onSelect(null)}>
                    <Plus size={15} />
                </button>
            </div>

            <div className={styles.searchWrap}>
                <div className={styles.search}>
                    <Search size={14} />
                    <input placeholder="Search briefs" value={query} onChange={e => setQuery(e.target.value)} />
                    {!query && <span className={styles.kbdChip}>⌘K</span>}
                </div>
            </div>

            <div className={styles.sidebarScroll}>
                <button
                    type="button"
                    className={`${styles.allActivityBtn} ${!selectedId ? styles.allActivitySelected : ''}`}
                    onClick={() => onSelect(null)}
                >
                    <Inbox size={15} style={{ color: 'var(--text-body)' }} />
                    <span style={{ flex: 1, textAlign: 'left' }}>All activity</span>
                    {reviewCount > 0 && <span className={styles.reviewPill}>{reviewCount}</span>}
                </button>

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
                    {runningPass ? 'Checking the knowledge base…' : 'Knowledge base'}
                </span>
                <span className={styles.kbBar}><span className={styles.kbBarFill} style={{ width: runningPass ? '60%' : '100%' }} /></span>
                <span className={styles.kbSub}>{knowledge.openGapCount} open gap{knowledge.openGapCount === 1 ? '' : 's'} · Run now to check for more</span>
            </button>
        </aside>
    );
}
