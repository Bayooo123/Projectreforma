'use client';

import { useState, useMemo, useTransition, useEffect } from 'react';
import {
    Mail, Link2, Plus, Search, X, Check, AlertCircle,
    ChevronDown, Unlink, FileText, CheckSquare, Square, RefreshCw, Layers,
} from 'lucide-react';
import {
    InboxEmail, InboxBrief, TriageGroup, TriageSuggestion,
    linkEmailToBrief, unlinkEmail,
    bulkLinkEmailsToBrief, quickCreateBriefAndLink,
    getInboxEmails, getInboxBriefs, triageUnlinkedEmails,
} from '@/app/actions/email-inbox';
import styles from './page.module.css';
import { useIsMobile } from '@/hooks/useIsMobile';
import { BottomSheet } from '@/components/mobile/MobileShared';

const CATEGORIES = ['Litigation', 'Corporate', 'Real Estate', 'Employment', 'Tax', 'Criminal', 'Arbitration', 'Advisory', 'Other'];

function formatDate(date: Date) {
    return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' });
}

function stripFwd(subject: string) {
    return subject.replace(/^(fwd?:|re:)\s*/gi, '').trim();
}

// ── Link Panel ────────────────────────────────────────────────────────────────

interface LinkPanelProps {
    emailIds: string[];
    firstSubject: string;
    briefs: InboxBrief[];
    onDone: (emailIds: string[], briefId: string, briefName: string) => void;
    onClose: () => void;
}

function LinkPanel({ emailIds, firstSubject, briefs, onDone, onClose }: LinkPanelProps) {
    const [query, setQuery]             = useState('');
    const [mode, setMode]               = useState<'search' | 'create'>('search');
    const [newName, setNewName]         = useState(stripFwd(firstSubject));
    const [newCategory, setNewCategory] = useState('Litigation');
    const [isPending, startTransition]  = useTransition();
    const [error, setError]             = useState<string | null>(null);
    const isBulk = emailIds.length > 1;

    const filtered = useMemo(() =>
        briefs.filter(b =>
            query.length < 2 ||
            b.name.toLowerCase().includes(query.toLowerCase()) ||
            b.briefNumber.toLowerCase().includes(query.toLowerCase()) ||
            (b.clientName ?? '').toLowerCase().includes(query.toLowerCase())
        ).slice(0, 20),
    [briefs, query]);

    const handleLink = (briefId: string, briefName: string) => {
        startTransition(async () => {
            setError(null);
            const res = isBulk
                ? await bulkLinkEmailsToBrief(emailIds, briefId)
                : await linkEmailToBrief(emailIds[0], briefId);
            if (res.success) onDone(emailIds, briefId, briefName);
            else setError((res as any).error ?? 'Failed');
        });
    };

    const handleCreate = () => {
        if (!newName.trim()) return;
        startTransition(async () => {
            setError(null);
            const res = await quickCreateBriefAndLink(emailIds, newName, newCategory);
            if (res.success) onDone(emailIds, res.briefId!, newName);
            else setError(res.error ?? 'Failed');
        });
    };

    return (
        <div className={styles.panel}>
            <div className={styles.panelHeader}>
                <div className={styles.panelTitle}>
                    <Link2 size={14} />
                    {isBulk ? `Link ${emailIds.length} emails to Brief` : 'Link to Brief'}
                </div>
                <button className={styles.closeBtn} onClick={onClose}><X size={16} /></button>
            </div>

            {isBulk ? (
                <div className={styles.panelEmail}>
                    <span className={styles.panelEmailFrom}>{emailIds.length} emails selected</span>
                    <span className={styles.panelEmailSubject}>{firstSubject}</span>
                </div>
            ) : (
                <div className={styles.panelEmail}>
                    <span className={styles.panelEmailSubject}>{firstSubject}</span>
                </div>
            )}

            <div className={styles.panelTabs}>
                <button className={`${styles.tab} ${mode === 'search' ? styles.tabActive : ''}`} onClick={() => setMode('search')}>
                    <Search size={12} /> Existing Brief
                </button>
                <button className={`${styles.tab} ${mode === 'create' ? styles.tabActive : ''}`} onClick={() => setMode('create')}>
                    <Plus size={12} /> New Brief
                </button>
            </div>

            {error && <p className={styles.panelError}>{error}</p>}

            {mode === 'search' && (
                <div className={styles.panelSearch}>
                    <div className={styles.searchBox}>
                        <Search size={13} className={styles.searchIcon} />
                        <input
                            autoFocus
                            className={styles.searchInput}
                            placeholder="Search by name, number, or client…"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                        />
                    </div>
                    <div className={styles.briefList}>
                        {filtered.length === 0 && <p className={styles.noResults}>No briefs found</p>}
                        {filtered.map(b => (
                            <button
                                key={b.id}
                                className={styles.briefRow}
                                onClick={() => handleLink(b.id, b.name)}
                                disabled={isPending}
                            >
                                <div className={styles.briefRowMain}>
                                    <span className={styles.briefRowName}>{b.name}</span>
                                    <span className={styles.briefRowMeta}>{b.briefNumber} · {b.clientName || 'No client'}</span>
                                </div>
                                <span className={styles.briefRowCat}>{b.category}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {mode === 'create' && (
                <div className={styles.createForm}>
                    <label className={styles.createLabel}>Brief name</label>
                    <input
                        autoFocus
                        className={styles.createInput}
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        placeholder="e.g. Odumosu v. Commissioner of Police"
                    />
                    <label className={styles.createLabel}>Category</label>
                    <div className={styles.selectWrap}>
                        <select
                            className={styles.createSelect}
                            value={newCategory}
                            onChange={e => setNewCategory(e.target.value)}
                        >
                            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                        </select>
                        <ChevronDown size={13} className={styles.selectArrow} />
                    </div>
                    <button
                        className={styles.createBtn}
                        onClick={handleCreate}
                        disabled={isPending || !newName.trim()}
                    >
                        {isPending
                            ? 'Creating…'
                            : isBulk
                                ? `Create Brief & Link ${emailIds.length} Emails`
                                : 'Create Brief & Link'}
                    </button>
                </div>
            )}
        </div>
    );
}

// ── Email Card ────────────────────────────────────────────────────────────────

interface EmailCardProps {
    email: InboxEmail;
    selected: boolean;
    isAnySelected: boolean;
    isPanelTarget: boolean;
    onToggleSelect: () => void;
    onLink: () => void;
    onUnlink: () => void;
}

function EmailCard({ email, selected, isAnySelected, isPanelTarget, onToggleSelect, onLink, onUnlink }: EmailCardProps) {
    const linked = !!(email.briefId || email.matterName);

    return (
        <div className={`${styles.card} ${isPanelTarget ? styles.cardActive : ''} ${linked ? styles.cardLinked : ''} ${selected ? styles.cardSelected : ''}`}>
            {/* Checkbox */}
            <button
                className={`${styles.checkbox} ${isAnySelected ? styles.checkboxVisible : ''}`}
                onClick={onToggleSelect}
                title={selected ? 'Deselect' : 'Select'}
            >
                {selected
                    ? <CheckSquare size={15} className={styles.checkboxOn} />
                    : <Square size={15} className={styles.checkboxOff} />
                }
            </button>

            <div className={styles.cardInner} onClick={isAnySelected ? onToggleSelect : undefined} style={isAnySelected ? { cursor: 'pointer' } : undefined}>
                <div className={styles.cardTop}>
                    <div className={styles.cardFrom}>
                        <span className={styles.cardSender}>{email.fromName || email.fromEmail}</span>
                        <span className={styles.cardDate}>{formatDate(email.receivedAt)}</span>
                    </div>
                    <p className={styles.cardSubject}>{email.subject}</p>
                    {email.bodyPreview && (
                        <p className={styles.cardPreview}>{email.bodyPreview.slice(0, 100).replace(/\n/g, ' ')}</p>
                    )}
                </div>

                <div className={styles.cardFooter}>
                    {linked ? (
                        <div className={styles.linkedBadge}>
                            <Check size={11} />
                            {email.briefName || email.matterName}
                        </div>
                    ) : (
                        <div className={styles.unlinkedBadge}>
                            <AlertCircle size={11} />
                            Unlinked
                        </div>
                    )}

                    <div className={styles.cardActions} onClick={e => e.stopPropagation()}>
                        {linked && (
                            <button className={styles.unlinkBtn} onClick={onUnlink} title="Remove link">
                                <Unlink size={12} />
                            </button>
                        )}
                        <button
                            className={`${styles.linkBtn} ${isPanelTarget ? styles.linkBtnActive : ''}`}
                            onClick={onLink}
                        >
                            <Link2 size={12} />
                            {linked ? 'Relink' : 'Link'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Bulk action bar ───────────────────────────────────────────────────────────

interface BulkBarProps {
    count: number;
    onLinkAll: () => void;
    onCreateBrief: () => void;
    onClear: () => void;
}

function BulkBar({ count, onLinkAll, onCreateBrief, onClear }: BulkBarProps) {
    return (
        <div className={styles.bulkBar}>
            <span className={styles.bulkCount}>{count} email{count !== 1 ? 's' : ''} selected</span>
            <div className={styles.bulkActions}>
                <button className={styles.bulkBtn} onClick={onLinkAll}>
                    <Link2 size={13} /> Link to Existing Brief
                </button>
                <button className={`${styles.bulkBtn} ${styles.bulkBtnPrimary}`} onClick={onCreateBrief}>
                    <Plus size={13} /> Create New Brief
                </button>
                <button className={styles.bulkClear} onClick={onClear}>
                    <X size={13} /> Clear
                </button>
            </div>
        </div>
    );
}

// ── Triage Panel ─────────────────────────────────────────────────────────────

interface TriagePanelProps {
    groups: TriageGroup[];
    onLink: (emailIds: string[], briefId: string, briefName: string) => void;
    onClose: () => void;
}

function TriagePanel({ groups: initialGroups, onLink, onClose }: TriagePanelProps) {
    const [localGroups, setLocalGroups] = useState<TriageGroup[]>(initialGroups);
    const [newNames, setNewNames] = useState<Record<string, string>>(
        () => Object.fromEntries(initialGroups.map(g => [g.key, g.suggestedNewBriefName]))
    );
    const [newCats, setNewCats] = useState<Record<string, string>>(
        () => Object.fromEntries(initialGroups.map(g => [g.key, 'Litigation']))
    );
    const [busy, setBusy] = useState<string | null>(null);
    const [, startTransition] = useTransition();

    const dismiss = (groupKey: string, linkedIds: string[], briefId: string, briefName: string) => {
        onLink(linkedIds, briefId, briefName);
        setLocalGroups(prev => prev.filter(g => g.key !== groupKey));
    };

    const handleLink = (group: TriageGroup, sug: TriageSuggestion) => {
        setBusy(group.key);
        startTransition(async () => {
            const res = await bulkLinkEmailsToBrief(group.emailIds, sug.briefId);
            if (res.success) dismiss(group.key, group.emailIds, sug.briefId, sug.briefName);
            setBusy(null);
        });
    };

    const handleCreate = (group: TriageGroup) => {
        const name = newNames[group.key]?.trim();
        if (!name) return;
        setBusy(group.key);
        startTransition(async () => {
            const res = await quickCreateBriefAndLink(group.emailIds, name, newCats[group.key] ?? 'Litigation');
            if (res.success) dismiss(group.key, group.emailIds, res.briefId!, name);
            setBusy(null);
        });
    };

    const totalEmails = localGroups.reduce((n, g) => n + g.emailIds.length, 0);

    return (
        <div className={styles.triageOverlay} onClick={onClose}>
            <div className={styles.triageModal} onClick={e => e.stopPropagation()}>
                <div className={styles.triageHeader}>
                    <div className={styles.triageTitleRow}>
                        <Layers size={16} className={styles.triageIcon} />
                        <span className={styles.triageTitle}>Group &amp; Link Emails</span>
                    </div>
                    <span className={styles.triageMeta}>
                        {localGroups.length} group{localGroups.length !== 1 ? 's' : ''} · {totalEmails} email{totalEmails !== 1 ? 's' : ''}
                    </span>
                    <button className={styles.closeBtn} onClick={onClose}><X size={16} /></button>
                </div>

                {localGroups.length === 0 ? (
                    <div className={styles.triageEmpty}>
                        <Check size={32} style={{ color: '#059669' }} />
                        <p>All groups linked!</p>
                    </div>
                ) : (
                    <div className={styles.triageGroups}>
                        {localGroups.map(group => (
                            <div key={group.key} className={styles.triageGroup}>
                                <div className={styles.groupHead}>
                                    <span className={styles.groupLabel}>{group.label || '(No subject)'}</span>
                                    <span className={styles.groupCount}>{group.emailIds.length}</span>
                                </div>

                                <div className={styles.groupEmails}>
                                    {group.emailPreviews.map(e => (
                                        <span key={e.id} className={styles.groupEmailPill} title={e.fromEmail}>
                                            {e.fromName || e.fromEmail}
                                        </span>
                                    ))}
                                    {group.emailIds.length > group.emailPreviews.length && (
                                        <span className={styles.groupEmailMore}>+{group.emailIds.length - group.emailPreviews.length}</span>
                                    )}
                                </div>

                                {group.suggestions.length > 0 && (
                                    <div className={styles.groupSuggestions}>
                                        <span className={styles.groupSuggestLabel}>AI Match</span>
                                        {group.suggestions.map(sug => (
                                            <div key={sug.briefId} className={styles.groupSuggestion}>
                                                <div className={styles.suggestionInfo}>
                                                    <span className={styles.suggestionName}>{sug.briefName}</span>
                                                    <span className={styles.suggestionMeta}>
                                                        {sug.briefNumber}{sug.clientName ? ` · ${sug.clientName}` : ''}
                                                    </span>
                                                    <span className={styles.suggestionReason}>{sug.reasoning}</span>
                                                </div>
                                                <div className={styles.suggestionRight}>
                                                    <span
                                                        className={`${styles.confDot} ${sug.confidence >= 0.7 ? styles.confHigh : sug.confidence >= 0.4 ? styles.confMid : styles.confLow}`}
                                                        title={`${Math.round(sug.confidence * 100)}% confidence`}
                                                    />
                                                    <button
                                                        className={styles.linkAllBtn}
                                                        onClick={() => handleLink(group, sug)}
                                                        disabled={busy === group.key}
                                                    >
                                                        {busy === group.key
                                                            ? <RefreshCw size={11} className={styles.spinning} />
                                                            : <Link2 size={11} />
                                                        }
                                                        Link All
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className={styles.groupCreate}>
                                    <input
                                        className={styles.groupNameInput}
                                        value={newNames[group.key] ?? ''}
                                        onChange={e => setNewNames(prev => ({ ...prev, [group.key]: e.target.value }))}
                                        placeholder="Brief name…"
                                    />
                                    <div className={styles.selectWrap} style={{ minWidth: 110 }}>
                                        <select
                                            className={styles.createSelect}
                                            value={newCats[group.key] ?? 'Litigation'}
                                            onChange={e => setNewCats(prev => ({ ...prev, [group.key]: e.target.value }))}
                                        >
                                            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                                        </select>
                                        <ChevronDown size={11} className={styles.selectArrow} />
                                    </div>
                                    <button
                                        className={styles.createGroupBtn}
                                        onClick={() => handleCreate(group)}
                                        disabled={busy === group.key || !newNames[group.key]?.trim()}
                                    >
                                        {busy === group.key
                                            ? <RefreshCw size={11} className={styles.spinning} />
                                            : <Plus size={11} />
                                        }
                                        Create Brief
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Main ──────────────────────────────────────────────────────────────────────

interface Props { emails?: InboxEmail[]; briefs?: InboxBrief[]; }

export default function EmailInboxClient({ emails: initial = [], briefs: initialBriefs = [] }: Props) {
    const [emails, setEmails]               = useState<InboxEmail[]>(initial);
    const [briefs, setBriefs]               = useState<InboxBrief[]>(initialBriefs);
    const [filter, setFilter]               = useState<'all' | 'unlinked' | 'linked'>('all');
    const [search, setSearch]               = useState('');
    const [selected, setSelected]           = useState<Set<string>>(new Set());
    const [panelTarget, setPanelTarget]     = useState<{ emailIds: string[]; subject: string; mode?: 'search' | 'create' } | null>(null);
    const [refreshing, setRefreshing]       = useState(false);
    const [loading, setLoading]             = useState(initial.length === 0);
    const [triageLoading, setTriageLoading] = useState(false);
    const [triageGroups, setTriageGroups]   = useState<TriageGroup[]>([]);
    const [triageOpen, setTriageOpen]       = useState(false);
    const [, startTransition]               = useTransition();

    useEffect(() => {
        if (initial.length === 0 || initialBriefs.length === 0) {
            handleInitialFetch();
        }
    }, []);

    const handleInitialFetch = async () => {
        setLoading(true);
        try {
            const [freshEmails, freshBriefs] = await Promise.all([
                getInboxEmails('all'),
                getInboxBriefs(),
            ]);
            setEmails(freshEmails);
            setBriefs(freshBriefs);
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            const fresh = await getInboxEmails('all');
            setEmails(fresh);
        } finally {
            setRefreshing(false);
        }
    };

    const visible = useMemo(() => {
        let list = emails;
        if (filter === 'unlinked') list = list.filter(e => !e.briefId && !e.matterName);
        if (filter === 'linked')   list = list.filter(e => !!(e.briefId || e.matterName));
        if (search.trim().length >= 2) {
            const q = search.toLowerCase();
            list = list.filter(e =>
                e.subject?.toLowerCase().includes(q) ||
                e.fromEmail.toLowerCase().includes(q) ||
                (e.fromName ?? '').toLowerCase().includes(q)
            );
        }
        return list;
    }, [emails, filter, search]);

    const unlinkedCount = emails.filter(e => !e.briefId && !e.matterName).length;
    const allVisibleSelected = visible.length > 0 && visible.every(e => selected.has(e.id));

    const toggleSelect = (id: string) =>
        setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

    const toggleAll = () => {
        if (allVisibleSelected) {
            setSelected(prev => { const s = new Set(prev); visible.forEach(e => s.delete(e.id)); return s; });
        } else {
            setSelected(prev => { const s = new Set(prev); visible.forEach(e => s.add(e.id)); return s; });
        }
    };

    const clearSelection = () => { setSelected(new Set()); setPanelTarget(null); };

    const handleDone = (emailIds: string[], briefId: string, briefName: string) => {
        setEmails(prev => prev.map(e => emailIds.includes(e.id) ? { ...e, briefId, briefName } : e));
        setSelected(new Set());
        setPanelTarget(null);
    };

    const handleUnlink = (emailId: string) => {
        startTransition(async () => {
            await unlinkEmail(emailId);
            setEmails(prev => prev.map(e => e.id === emailId ? { ...e, briefId: null, briefName: null, matterId: null, matterName: null } : e));
        });
    };

    const openBulkPanel = (mode: 'search' | 'create' = 'search') => {
        const ids = Array.from(selected);
        const first = emails.find(e => e.id === ids[0]);
        setPanelTarget({ emailIds: ids, subject: first?.subject ?? '', mode });
    };

    const openSinglePanel = (email: InboxEmail) => {
        if (panelTarget?.emailIds[0] === email.id && panelTarget.emailIds.length === 1) {
            setPanelTarget(null);
        } else {
            setPanelTarget({ emailIds: [email.id], subject: email.subject ?? '' });
        }
    };

    const handleTriage = async () => {
        setTriageLoading(true);
        try {
            const groups = await triageUnlinkedEmails();
            setTriageGroups(groups);
            setTriageOpen(true);
        } finally {
            setTriageLoading(false);
        }
    };

    const isMobile = useIsMobile();

    return (
        <div className={styles.root} style={isMobile ? { paddingBottom: 60 } : undefined}>
            {/* Header */}
            <div className={styles.header} style={isMobile ? { paddingTop: 'calc(env(safe-area-inset-top, 0px) + 20px)' } : undefined}>
                <div className={styles.headerLeft}>
                    <Mail size={20} className={styles.headerIcon} />
                    <div>
                        <h1 className={styles.title}>Email Inbox</h1>
                        <p className={styles.subtitle}>{emails.length} emails · {unlinkedCount} unlinked</p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                    <button
                        className={styles.triageBtn}
                        onClick={handleTriage}
                        disabled={triageLoading || unlinkedCount === 0}
                        title={unlinkedCount === 0 ? 'No unlinked emails' : 'Group similar unlinked emails and suggest briefs'}
                    >
                        {triageLoading
                            ? <RefreshCw size={14} className={styles.spinning} />
                            : <Layers size={14} />
                        }
                        {triageLoading ? 'Analysing…' : 'Group Unlinked'}
                    </button>
                    <button className={styles.refreshBtn} onClick={handleRefresh} disabled={refreshing} title="Refresh email list">
                        <RefreshCw size={14} className={refreshing ? styles.spinning : ''} />
                        {refreshing ? 'Refreshing…' : 'Refresh'}
                    </button>
                </div>
            </div>

            <div className={styles.body}>
                {/* Left: email list */}
                <div className={styles.listCol}>
                    {/* Toolbar */}
                    <div className={styles.toolbar}>
                        {/* Select-all checkbox */}
                        <button className={styles.selectAllBtn} onClick={toggleAll} title="Select all visible">
                            {allVisibleSelected
                                ? <CheckSquare size={15} className={styles.checkboxOn} />
                                : <Square size={15} className={styles.checkboxOff} />
                            }
                        </button>

                        <div className={styles.filters}>
                            {(['all', 'unlinked', 'linked'] as const).map(f => (
                                <button
                                    key={f}
                                    className={`${styles.filterBtn} ${filter === f ? styles.filterActive : ''}`}
                                    onClick={() => setFilter(f)}
                                >
                                    {f === 'all' ? 'All' : f === 'unlinked' ? `Unlinked (${unlinkedCount})` : 'Linked'}
                                </button>
                            ))}
                        </div>

                        <div className={styles.searchWrap}>
                            <Search size={13} className={styles.searchIconSm} />
                            <input
                                className={styles.searchInputSm}
                                placeholder="Search emails…"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Bulk action bar */}
                    {selected.size > 0 && (
                        <BulkBar
                            count={selected.size}
                            onLinkAll={() => openBulkPanel('search')}
                            onCreateBrief={() => openBulkPanel('create')}
                            onClear={clearSelection}
                        />
                    )}

                    {/* List */}
                    <div className={styles.list}>
                        {loading ? (
                            <div className={styles.empty}>
                                <RefreshCw size={28} className={styles.spinning} />
                                <p>Loading your inbox…</p>
                            </div>
                        ) : visible.length === 0 && (
                            <div className={styles.empty}>
                                <FileText size={28} style={{ opacity: 0.3 }} />
                                <p>No emails match this filter</p>
                            </div>
                        )}
                        {visible.map(email => (
                            <EmailCard
                                key={email.id}
                                email={email}
                                selected={selected.has(email.id)}
                                isAnySelected={selected.size > 0}
                                isPanelTarget={panelTarget?.emailIds.includes(email.id) ?? false}
                                onToggleSelect={() => toggleSelect(email.id)}
                                onLink={() => openSinglePanel(email)}
                                onUnlink={() => handleUnlink(email.id)}
                            />
                        ))}
                    </div>
                </div>

                {/* Right: link panel */}
                {panelTarget && !isMobile && (
                    <div className={styles.panelCol}>
                        <LinkPanel
                            emailIds={panelTarget.emailIds}
                            firstSubject={panelTarget.subject}
                            briefs={briefs}
                            onDone={handleDone}
                            onClose={() => setPanelTarget(null)}
                        />
                    </div>
                )}
            </div>

            {/* Mobile Bottom Sheet Link Panel */}
            {panelTarget && isMobile && (
                <BottomSheet
                    title={panelTarget.emailIds.length > 1 ? `Link ${panelTarget.emailIds.length} emails` : 'Link to Brief'}
                    isOpen={!!panelTarget}
                    onClose={() => setPanelTarget(null)}
                >
                    <div className="rm-sheet-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                        <LinkPanel
                            emailIds={panelTarget.emailIds}
                            firstSubject={panelTarget.subject}
                            briefs={briefs}
                            onDone={handleDone}
                            onClose={() => setPanelTarget(null)}
                        />
                    </div>
                </BottomSheet>
            )}

            {/* Triage Overlay */}
            {triageOpen && (
                <TriagePanel
                    groups={triageGroups}
                    onLink={handleDone}
                    onClose={() => setTriageOpen(false)}
                />
            )}
        </div>
    );
}
