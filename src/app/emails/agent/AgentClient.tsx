'use client';

import { useState, useEffect, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
    Bot, ChevronRight, Check, Plus, Search, X, ArrowLeft,
    RefreshCw, Mail, Users, Calendar, SkipForward, Link2, Sparkles,
} from 'lucide-react';
import {
    AgentEmailGroup,
    InboxBrief,
    getAgentEmailGroups,
    getInboxBriefs,
    bulkLinkEmailsToBrief,
    quickCreateBriefAndLink,
} from '@/app/actions/email-inbox';
import styles from './page.module.css';

const CATEGORIES = ['Litigation', 'Corporate', 'Real Estate', 'Employment', 'Tax', 'Criminal', 'Arbitration', 'Advisory', 'Other'];

function formatDate(d: Date) {
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' });
}

function confLabel(c: number) {
    if (c >= 0.7) return { text: 'High confidence', cls: 'high' };
    if (c >= 0.45) return { text: 'Good match', cls: 'mid' };
    return { text: 'Possible match', cls: 'low' };
}

// ── Done screen ───────────────────────────────────────────────────────────────

interface DoneProps { linked: number; created: number; skipped: number; total: number; onRestart: () => void; }

function DoneScreen({ linked, created, skipped, total, onRestart }: DoneProps) {
    const router = useRouter();
    return (
        <div className={styles.doneWrap}>
            <div className={styles.doneIcon}><Check size={36} /></div>
            <h2 className={styles.doneTitle}>All done!</h2>
            <p className={styles.doneSub}>Agent reviewed {total} group{total !== 1 ? 's' : ''}</p>
            <div className={styles.doneStats}>
                <div className={styles.doneStat}>
                    <span className={styles.doneStatNum}>{linked}</span>
                    <span className={styles.doneStatLabel}>Linked to existing</span>
                </div>
                <div className={styles.doneStat}>
                    <span className={styles.doneStatNum}>{created}</span>
                    <span className={styles.doneStatLabel}>New briefs created</span>
                </div>
                <div className={styles.doneStat}>
                    <span className={styles.doneStatNum}>{skipped}</span>
                    <span className={styles.doneStatLabel}>Skipped</span>
                </div>
            </div>
            <div className={styles.doneBtns}>
                <button className={styles.doneSecondary} onClick={onRestart}>
                    <RefreshCw size={14} /> Run again
                </button>
                <button className={styles.donePrimary} onClick={() => router.push('/management/it')}>
                    <Mail size={14} /> Back to inbox
                </button>
            </div>
        </div>
    );
}

// ── Group card ────────────────────────────────────────────────────────────────

interface GroupCardProps {
    group: AgentEmailGroup;
    briefs: InboxBrief[];
    onLinked:  (count: number) => void;
    onCreated: (count: number) => void;
    onSkipped: () => void;
}

function GroupCard({ group, briefs, onLinked, onCreated, onSkipped }: GroupCardProps) {
    const [mode, setMode]       = useState<'idle' | 'search' | 'create'>('idle');
    const [query, setQuery]     = useState('');
    const [newName, setNewName] = useState(group.suggestedNewName);
    const [newCat, setNewCat]   = useState('Litigation');
    const [busy, setBusy]       = useState(false);
    const [error, setError]     = useState<string | null>(null);
    const [, startTransition]   = useTransition();

    const filtered = useMemo(() =>
        briefs.filter(b =>
            query.length < 2 ||
            b.name.toLowerCase().includes(query.toLowerCase()) ||
            b.briefNumber.toLowerCase().includes(query.toLowerCase()) ||
            (b.clientName ?? '').toLowerCase().includes(query.toLowerCase())
        ).slice(0, 15),
    [briefs, query]);

    const doLink = (briefId: string) => {
        setBusy(true);
        setError(null);
        startTransition(async () => {
            const res = await bulkLinkEmailsToBrief(group.emailIds, briefId);
            if (res.success) {
                onLinked(group.emailIds.length);
            } else {
                setError(res.error ?? 'Failed to link');
                setBusy(false);
            }
        });
    };

    const doCreate = () => {
        if (!newName.trim()) return;
        setBusy(true);
        setError(null);
        startTransition(async () => {
            const res = await quickCreateBriefAndLink(group.emailIds, newName.trim(), newCat);
            if (res.success) {
                onCreated(group.emailIds.length);
            } else {
                setError(res.error ?? 'Failed to create brief');
                setBusy(false);
            }
        });
    };

    const conf = group.match ? confLabel(group.match.confidence) : null;

    return (
        <div className={styles.card}>
            {/* ── Subject + meta ── */}
            <div className={styles.cardHeader}>
                <div className={styles.cardCount}>{group.emailCount} email{group.emailCount !== 1 ? 's' : ''}</div>
                <h2 className={styles.cardSubject}>{group.label}</h2>
                <div className={styles.cardMeta}>
                    <span className={styles.metaItem}><Users size={11} /> {group.senders.slice(0, 3).join(', ')}{group.senders.length > 3 ? ` +${group.senders.length - 3}` : ''}</span>
                    <span className={styles.metaItem}><Calendar size={11} /> {formatDate(group.dateFrom)}{group.emailCount > 1 ? ` — ${formatDate(group.dateTo)}` : ''}</span>
                </div>
                {group.bodyPreview && (
                    <p className={styles.cardPreview}>{group.bodyPreview.slice(0, 160).replace(/\n/g, ' ')}</p>
                )}
            </div>

            {/* ── Agent suggestion ── */}
            {group.match ? (
                <div className={styles.suggestion}>
                    <div className={styles.suggestionTop}>
                        <Sparkles size={13} className={styles.suggIcon} />
                        <span className={styles.suggLabel}>Suggested match</span>
                        <span className={`${styles.confBadge} ${styles[`conf_${conf!.cls}`]}`}>{conf!.text}</span>
                    </div>
                    <div className={styles.suggBrief}>
                        <span className={styles.suggBriefName}>{group.match.briefName}</span>
                        <span className={styles.suggBriefMeta}>
                            {group.match.briefNumber}{group.match.clientName ? ` · ${group.match.clientName}` : ''}
                        </span>
                    </div>
                </div>
            ) : (
                <div className={styles.suggestionEmpty}>
                    <Sparkles size={13} className={styles.suggIconEmpty} />
                    <span>No existing brief matched — create a new one or search</span>
                </div>
            )}

            {error && <p className={styles.errorMsg}>{error}</p>}

            {/* ── Actions ── */}
            {!busy && (
                <>
                    <div className={styles.primaryActions}>
                        {group.match && (
                            <button
                                className={styles.linkBtn}
                                onClick={() => doLink(group.match!.briefId)}
                            >
                                <Link2 size={14} />
                                Link to {group.match.briefName.length > 28 ? group.match.briefName.slice(0, 28) + '…' : group.match.briefName}
                            </button>
                        )}
                        <button
                            className={`${styles.actionBtn} ${mode === 'create' ? styles.actionBtnActive : ''}`}
                            onClick={() => setMode(m => m === 'create' ? 'idle' : 'create')}
                        >
                            <Plus size={13} /> New brief
                        </button>
                        <button
                            className={`${styles.actionBtn} ${mode === 'search' ? styles.actionBtnActive : ''}`}
                            onClick={() => setMode(m => m === 'search' ? 'idle' : 'search')}
                        >
                            <Search size={13} /> Different brief
                        </button>
                        <button className={styles.skipBtn} onClick={onSkipped}>
                            <SkipForward size={13} /> Skip
                        </button>
                    </div>

                    {/* ── Search panel ── */}
                    {mode === 'search' && (
                        <div className={styles.subPanel}>
                            <div className={styles.subSearch}>
                                <Search size={12} className={styles.subSearchIcon} />
                                <input
                                    autoFocus
                                    className={styles.subSearchInput}
                                    placeholder="Search briefs by name, number, or client…"
                                    value={query}
                                    onChange={e => setQuery(e.target.value)}
                                />
                                {query && <button className={styles.subClear} onClick={() => setQuery('')}><X size={12} /></button>}
                            </div>
                            <div className={styles.subList}>
                                {filtered.length === 0 && <p className={styles.subEmpty}>No briefs found</p>}
                                {filtered.map(b => (
                                    <button key={b.id} className={styles.subRow} onClick={() => doLink(b.id)}>
                                        <div>
                                            <span className={styles.subRowName}>{b.name}</span>
                                            <span className={styles.subRowMeta}>{b.briefNumber}{b.clientName ? ` · ${b.clientName}` : ''}</span>
                                        </div>
                                        <span className={styles.subRowCat}>{b.category}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── Create panel ── */}
                    {mode === 'create' && (
                        <div className={styles.subPanel}>
                            <div className={styles.createRow}>
                                <input
                                    autoFocus
                                    className={styles.createInput}
                                    value={newName}
                                    onChange={e => setNewName(e.target.value)}
                                    placeholder="Brief name…"
                                />
                                <div className={styles.catWrap}>
                                    <select
                                        className={styles.catSelect}
                                        value={newCat}
                                        onChange={e => setNewCat(e.target.value)}
                                    >
                                        {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                                    </select>
                                </div>
                                <button
                                    className={styles.createConfirm}
                                    onClick={doCreate}
                                    disabled={!newName.trim()}
                                >
                                    Create &amp; Link
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}

            {busy && (
                <div className={styles.busyRow}>
                    <RefreshCw size={14} className={styles.spinning} />
                    <span>Linking {group.emailCount} email{group.emailCount !== 1 ? 's' : ''}…</span>
                </div>
            )}
        </div>
    );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function AgentClient() {
    const router = useRouter();
    const goBack = () => router.back();
    const [groups, setGroups]     = useState<AgentEmailGroup[]>([]);
    const [briefs, setBriefs]     = useState<InboxBrief[]>([]);
    const [loading, setLoading]   = useState(true);
    const [index, setIndex]       = useState(0);
    const [linked, setLinked]     = useState(0);
    const [created, setCreated]   = useState(0);
    const [skipped, setSkipped]   = useState(0);

    useEffect(() => {
        Promise.all([getAgentEmailGroups(), getInboxBriefs()]).then(([g, b]) => {
            setGroups(g);
            setBriefs(b);
            setLoading(false);
        });
    }, []);

    const totalGroups = groups.length;
    const totalEmails = groups.reduce((n, g) => n + g.emailCount, 0);
    const done = !loading && index >= totalGroups;

    const advance = () => setIndex(i => i + 1);

    const handleLinked = (count: number) => {
        setLinked(l => l + 1);
        advance();
    };

    const handleCreated = (count: number) => {
        setCreated(c => c + 1);
        advance();
    };

    const handleSkipped = () => {
        setSkipped(s => s + 1);
        advance();
    };

    const restart = () => {
        setLoading(true);
        setIndex(0);
        setLinked(0);
        setCreated(0);
        setSkipped(0);
        Promise.all([getAgentEmailGroups(), getInboxBriefs()]).then(([g, b]) => {
            setGroups(g);
            setBriefs(b);
            setLoading(false);
        });
    };

    const progress = totalGroups > 0 ? Math.round((index / totalGroups) * 100) : 0;
    const emailsDone = groups.slice(0, index).reduce((n, g) => n + g.emailCount, 0);

    return (
        <div className={styles.root}>
            {/* Header */}
            <div className={styles.header}>
                <div className={styles.headerLeft}>
                    <button className={styles.backBtn} onClick={goBack}>
                        <ArrowLeft size={15} />
                    </button>
                    <Bot size={18} className={styles.headerIcon} />
                    <div>
                        <h1 className={styles.title}>Email Link Agent</h1>
                        {!loading && !done && (
                            <p className={styles.subtitle}>
                                Group {index + 1} of {totalGroups} · {emailsDone} of {totalEmails} emails processed
                            </p>
                        )}
                        {loading && <p className={styles.subtitle}>Loading your inbox…</p>}
                        {done && <p className={styles.subtitle}>All groups reviewed</p>}
                    </div>
                </div>
                {!loading && !done && (
                    <div className={styles.headerRight}>
                        <ChevronRight size={13} className={styles.navIcon} />
                        <span className={styles.navLabel}>{totalGroups - index} remaining</span>
                    </div>
                )}
            </div>

            {/* Progress bar */}
            {!loading && totalGroups > 0 && (
                <div className={styles.progressBar}>
                    <div className={styles.progressFill} style={{ width: `${progress}%` }} />
                </div>
            )}

            {/* Content */}
            <div className={styles.body}>
                {loading ? (
                    <div className={styles.loadingState}>
                        <RefreshCw size={28} className={styles.spinning} />
                        <p>Grouping your emails…</p>
                    </div>
                ) : done ? (
                    <DoneScreen
                        linked={linked}
                        created={created}
                        skipped={skipped}
                        total={totalGroups}
                        onRestart={restart}
                    />
                ) : groups[index] ? (
                    <div className={styles.cardWrap}>
                        <GroupCard
                            key={groups[index].key}
                            group={groups[index]}
                            briefs={briefs}
                            onLinked={handleLinked}
                            onCreated={handleCreated}
                            onSkipped={handleSkipped}
                        />
                    </div>
                ) : null}
            </div>
        </div>
    );
}
