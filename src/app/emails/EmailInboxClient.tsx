'use client';

import { useState, useMemo, useTransition } from 'react';
import { Mail, Link2, Plus, Search, X, Check, AlertCircle, ChevronDown, Unlink, FileText } from 'lucide-react';
import { InboxEmail, InboxBrief, linkEmailToBrief, unlinkEmail, quickCreateBriefAndLink } from '@/app/actions/email-inbox';
import styles from './page.module.css';

const CATEGORIES = ['Litigation', 'Corporate', 'Real Estate', 'Employment', 'Tax', 'Criminal', 'Arbitration', 'Advisory', 'Other'];

function formatDate(date: Date) {
    const d = new Date(date);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' });
}

function stripFwd(subject: string) {
    return subject.replace(/^(fwd?:|re:)\s*/gi, '').trim();
}

// ── Link Panel ────────────────────────────────────────────────────────────────

interface LinkPanelProps {
    email: InboxEmail;
    briefs: InboxBrief[];
    onDone: (emailId: string, briefId: string, briefName: string) => void;
    onClose: () => void;
}

function LinkPanel({ email, briefs, onDone, onClose }: LinkPanelProps) {
    const [query, setQuery]         = useState('');
    const [mode, setMode]           = useState<'search' | 'create'>('search');
    const [newName, setNewName]     = useState(stripFwd(email.subject ?? ''));
    const [newCategory, setNewCategory] = useState('Litigation');
    const [isPending, startTransition]  = useTransition();
    const [error, setError]         = useState<string | null>(null);

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
            const res = await linkEmailToBrief(email.id, briefId);
            if (res.success) onDone(email.id, briefId, briefName);
            else setError(res.error ?? 'Failed');
        });
    };

    const handleCreate = () => {
        if (!newName.trim()) return;
        startTransition(async () => {
            setError(null);
            const res = await quickCreateBriefAndLink(email.id, newName, newCategory);
            if (res.success) onDone(email.id, res.briefId!, newName);
            else setError(res.error ?? 'Failed');
        });
    };

    return (
        <div className={styles.panel}>
            <div className={styles.panelHeader}>
                <div className={styles.panelTitle}>
                    <Link2 size={14} />
                    Link to Brief
                </div>
                <button className={styles.closeBtn} onClick={onClose}><X size={16} /></button>
            </div>

            <div className={styles.panelEmail}>
                <span className={styles.panelEmailFrom}>{email.fromName || email.fromEmail}</span>
                <span className={styles.panelEmailSubject}>{email.subject}</span>
            </div>

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
                        {isPending ? 'Creating…' : 'Create Brief & Link'}
                    </button>
                </div>
            )}
        </div>
    );
}

// ── Email Card ────────────────────────────────────────────────────────────────

interface EmailCardProps {
    email: InboxEmail;
    isActive: boolean;
    onLink: () => void;
    onUnlink: () => void;
}

function EmailCard({ email, isActive, onLink, onUnlink }: EmailCardProps) {
    const linked = !!(email.briefId || email.matterName);

    return (
        <div className={`${styles.card} ${isActive ? styles.cardActive : ''} ${linked ? styles.cardLinked : ''}`}>
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

                <div className={styles.cardActions}>
                    {linked && (
                        <button className={styles.unlinkBtn} onClick={onUnlink} title="Remove link">
                            <Unlink size={12} />
                        </button>
                    )}
                    <button className={`${styles.linkBtn} ${isActive ? styles.linkBtnActive : ''}`} onClick={onLink}>
                        <Link2 size={12} />
                        {linked ? 'Relink' : 'Link to Brief'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Main ──────────────────────────────────────────────────────────────────────

interface Props {
    emails: InboxEmail[];
    briefs: InboxBrief[];
}

export default function EmailInboxClient({ emails: initial, briefs }: Props) {
    const [emails, setEmails]           = useState<InboxEmail[]>(initial);
    const [filter, setFilter]           = useState<'all' | 'unlinked' | 'linked'>('all');
    const [search, setSearch]           = useState('');
    const [activeEmailId, setActiveEmailId] = useState<string | null>(null);
    const [, startTransition]           = useTransition();

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

    const handleDone = (emailId: string, briefId: string, briefName: string) => {
        setEmails(prev => prev.map(e => e.id === emailId ? { ...e, briefId, briefName } : e));
        setActiveEmailId(null);
    };

    const handleUnlink = (emailId: string) => {
        startTransition(async () => {
            await unlinkEmail(emailId);
            setEmails(prev => prev.map(e => e.id === emailId ? { ...e, briefId: null, briefName: null, matterId: null, matterName: null } : e));
        });
    };

    const activeEmail = activeEmailId ? emails.find(e => e.id === activeEmailId) : null;

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
            </div>

            <div className={styles.body}>
                {/* Left: email list */}
                <div className={styles.listCol}>
                    {/* Toolbar */}
                    <div className={styles.toolbar}>
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
                                isActive={activeEmailId === email.id}
                                onLink={() => setActiveEmailId(prev => prev === email.id ? null : email.id)}
                                onUnlink={() => handleUnlink(email.id)}
                            />
                        ))}
                    </div>
                </div>

                {/* Right: link panel */}
                {activeEmail && (
                    <div className={styles.panelCol}>
                        <LinkPanel
                            email={activeEmail}
                            briefs={briefs}
                            onDone={handleDone}
                            onClose={() => setActiveEmailId(null)}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
