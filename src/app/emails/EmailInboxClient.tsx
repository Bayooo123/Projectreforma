'use client';

import { useState, useMemo, useTransition } from 'react';
import {
    Mail, Link2, Plus, Search, X, Check, AlertCircle,
    ChevronDown, Unlink, FileText, CheckSquare, Square, RefreshCw,
} from 'lucide-react';
import {
    InboxEmail, InboxBrief,
    linkEmailToBrief, unlinkEmail,
    bulkLinkEmailsToBrief, quickCreateBriefAndLink,
    getInboxEmails,
} from '@/app/actions/email-inbox';
import styles from './page.module.css';

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

// ── Main ──────────────────────────────────────────────────────────────────────

interface Props { emails: InboxEmail[]; briefs: InboxBrief[]; }

export default function EmailInboxClient({ emails: initial, briefs }: Props) {
    const [emails, setEmails]               = useState<InboxEmail[]>(initial);
    const [filter, setFilter]               = useState<'all' | 'unlinked' | 'linked'>('all');
    const [search, setSearch]               = useState('');
    const [selected, setSelected]           = useState<Set<string>>(new Set());
    const [panelTarget, setPanelTarget]     = useState<{ emailIds: string[]; subject: string; mode?: 'search' | 'create' } | null>(null);
    const [refreshing, setRefreshing]       = useState(false);
    const [, startTransition]               = useTransition();

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

    return (
        <div className={styles.root}>
            {/* Header */}
            <div className={styles.header}>
                <div className={styles.headerLeft}>
                    <Mail size={20} className={styles.headerIcon} />
                    <div>
                        <h1 className={styles.title}>Email Inbox</h1>
                        <p className={styles.subtitle}>{emails.length} emails · {unlinkedCount} unlinked</p>
                    </div>
                </div>
                <button className={styles.refreshBtn} onClick={handleRefresh} disabled={refreshing} title="Refresh email list">
                    <RefreshCw size={14} className={refreshing ? styles.spinning : ''} />
                    {refreshing ? 'Refreshing…' : 'Refresh'}
                </button>
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
                        {visible.length === 0 && (
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
                {panelTarget && (
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
        </div>
    );
}
