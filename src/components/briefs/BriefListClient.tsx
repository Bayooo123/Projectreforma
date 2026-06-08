"use client";

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Search, Filter, MoreVertical, Plus, Trash2, Eye, Briefcase, MessageSquare, Edit, FolderTree, ChevronDown, ChevronRight, Share2, FileText } from 'lucide-react';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import styles from './BriefList.module.css';
import { deleteBrief, getBriefs } from '@/app/actions/briefs'; // Only import actions needed
import EditBriefModal from './EditBriefModal';
import BriefActivityModal from './BriefActivityModal';
import MoveBriefModal from './MoveBriefModal';
import { useRouter } from 'next/navigation';
import BriefUploadModal from './BriefUploadModal';
import { getBriefDisplayTitle } from '@/lib/brief-display';
import { toTitleCase } from '@/lib/sentence-case';
import BriefDocsQuickView from './BriefDocsQuickView';
import { useIsMobile } from '@/hooks/useIsMobile';
import { Icon, Pill } from '@/components/mobile/MobileShared';

interface BriefListClientProps {
    initialBriefs: any[];
    workspaceId: string;
    onUpload?: () => void;
}

const BRIEFS_CACHE_KEY = (wsId: string) => `reforma_briefs_${wsId}`;

function readBriefsCache(wsId: string): any[] {
    try {
        const raw = sessionStorage.getItem(BRIEFS_CACHE_KEY(wsId));
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function writeBriefsCache(wsId: string, data: any[]) {
    try {
        sessionStorage.setItem(BRIEFS_CACHE_KEY(wsId), JSON.stringify(data));
    } catch {}
}

export default function BriefListClient({ initialBriefs, workspaceId }: Omit<BriefListClientProps, 'onUpload'>) {
    const [briefs, setBriefs] = useState<any[]>(() => {
        if (initialBriefs.length > 0) return initialBriefs;
        if (typeof window !== 'undefined') return readBriefsCache(workspaceId);
        return [];
    });
    const [activeActionId, setActiveActionId] = useState<string | null>(null);
    const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [sortBy, setSortBy] = useState<'recent' | 'name' | 'client' | 'status'>('recent');
    const [showSortMenu, setShowSortMenu] = useState(false);
    const [expandedBriefIds, setExpandedBriefIds] = useState<Set<string>>(new Set());
    const [movingBrief, setMovingBrief] = useState<any | null>(null);
    const [deletingBriefId, setDeletingBriefId] = useState<string | null>(null);

    // Persist to sessionStorage whenever briefs change
    useEffect(() => {
        if (briefs.length > 0) writeBriefsCache(workspaceId, briefs);
    }, [briefs, workspaceId]);

    // Keep cache warm with initialBriefs from server on each render
    useEffect(() => {
        if (initialBriefs.length > 0) writeBriefsCache(workspaceId, initialBriefs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // AUTOMATION: Background Polling (90 seconds)
    useEffect(() => {
        const interval = setInterval(async () => {
            const { getBriefs } = await import('@/app/actions/briefs');
            const newBriefs = await getBriefs(workspaceId);
            if (newBriefs && Array.isArray(newBriefs)) {
                setBriefs(newBriefs);
                writeBriefsCache(workspaceId, newBriefs);
            }
        }, 90000);
        return () => clearInterval(interval);
    }, [workspaceId]);

    // Modal states
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [editingBrief, setEditingBrief] = useState<any | null>(null);
    const [activityBrief, setActivityBrief] = useState<any | null>(null);
    const [quickViewBrief, setQuickViewBrief] = useState<{ id: string; name: string } | null>(null);

    const router = useRouter();

    const handleDelete = async (id: string) => {
        const result = await deleteBrief(id);
        if (result.success) {
            setBriefs(briefs.filter(b => b.id !== id));
            router.refresh();
        }
    };

    const handleUpdateSuccess = (updatedBrief: any) => {
        setBriefs(briefs.map(b => b.id === updatedBrief.id ? { ...b, ...updatedBrief } : b));
        router.refresh();
    };

    const handleCreateSuccess = (newBrief: any) => {
        setIsUploadModalOpen(false);
        if (newBrief && newBrief.id) {
            router.push(`/briefs/${newBrief.id}`);
        } else {
            router.refresh();
        }
    };

    const toggleActions = (id: string, e: React.MouseEvent<HTMLButtonElement>) => {
        if (activeActionId === id) {
            setActiveActionId(null);
            setMenuPos(null);
            return;
        }
        const rect = e.currentTarget.getBoundingClientRect();
        setActiveActionId(id);
        setMenuPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
    };

    const toggleExpand = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setExpandedBriefIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleDocsClick = (brief: any, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setQuickViewBrief({ id: brief.id, name: getBriefDisplayTitle(brief) });
    };

    // Client-side filtering and sorting
    const displayedBriefs = briefs
        .filter(brief => {
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const matchesSearch =
                    brief.name?.toLowerCase().includes(query) ||
                    brief.briefNumber?.toLowerCase().includes(query) ||
                    (brief.client?.name || '').toLowerCase().includes(query) ||
                    brief.category?.toLowerCase().includes(query);
                if (!matchesSearch) return false;
            }
            if (statusFilter !== 'all' && brief.status.toLowerCase() !== statusFilter) {
                return false;
            }
            return true;
        })
        .sort((a, b) => {
            if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
            if (sortBy === 'client') return (a.client?.name || '').localeCompare(b.client?.name || '');
            if (sortBy === 'status') return (a.status || '').localeCompare(b.status || '');
            // default: recent (updatedAt desc)
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        });

    // --- HIERARCHY LOGIC ---
    // 1. Identify which briefs have children
    const parentIds = new Set(briefs.map(b => b.parentBriefId).filter(Boolean));
    
    // 2. Build the tree (Top-level briefs)
    const rootBriefs = displayedBriefs.filter(b => !b.parentBriefId);
    
    // 3. Helper to get children for a brief
    const getChildren = (parentId: string) => displayedBriefs.filter(b => b.parentBriefId === parentId);

    // 4. Flatten the tree for rendering (only if parent is expanded OR if searching)
    // If searching, we show everything flat mostly, but here we'll try to keep hierarchy if possible.
    const renderRows: any[] = [];
    
    const flatten = (items: any[], depth = 0) => {
        items.forEach(brief => {
            renderRows.push({ ...brief, depth });
            const hasChildren = parentIds.has(brief.id);
            const isExpanded = expandedBriefIds.has(brief.id) || searchQuery; // Auto-expand when searching
            
            if (hasChildren && isExpanded) {
                flatten(getChildren(brief.id), depth + 1);
            }
        });
    };

    flatten(rootBriefs);

    const isMobile = useIsMobile();

    const statusKind = (s: string) => {
        const l = s.toLowerCase();
        if (l === 'active') return 'active';
        if (l === 'finalized') return 'finalized';
        return 'pending';
    };

    if (isMobile) {
        return (
            <>
                <div className="rm-screen">
                    <div className="rm-scroll">
                        {/* Header */}
                        <div className="rm-hdr" style={{ borderBottom: '1px solid var(--rm-border)' }}>
                            <div className="rm-hdr-row" style={{ alignItems: 'center' }}>
                                <div>
                                    <span className="rm-eyebrow">Documents</span>
                                    <h1 className="rm-h1">Briefs</h1>
                                </div>
                                <button
                                    className="rm-icon-btn dark"
                                    onClick={() => setShowSortMenu(v => !v)}
                                >
                                    <Icon n="filter" s={18} />
                                </button>
                            </div>
                            <div className="rm-search" style={{ margin: '14px 0 0' }}>
                                <Icon n="search" s={16} c="var(--rm-t3)" />
                                <input
                                    type="text"
                                    placeholder="Search briefs, clients, case no."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                />
                            </div>
                            {/* Segmented control */}
                            <div className="rm-seg">
                                {(['all', 'active', 'finalized'] as const).map(s => (
                                    <button
                                        key={s}
                                        className={statusFilter === s ? 'on' : ''}
                                        onClick={() => setStatusFilter(s)}
                                    >
                                        {s === 'all' ? 'All' : s === 'active' ? 'Active' : 'Finalized'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Sort menu */}
                        {showSortMenu && (
                            <>
                                <div style={{ position: 'fixed', inset: 0, zIndex: 39 }} onClick={() => setShowSortMenu(false)} />
                                <div style={{
                                    position: 'fixed', top: 'calc(env(safe-area-inset-top, 0px) + 76px)', right: 20,
                                    background: '#fff', borderRadius: 14, border: '1px solid var(--rm-border)',
                                    boxShadow: '0 8px 24px rgba(15,23,42,.14)', zIndex: 40, overflow: 'hidden', minWidth: 160,
                                }}>
                                    {(['recent', 'name', 'client', 'status'] as const).map(opt => (
                                        <button
                                            key={opt}
                                            onClick={() => { setSortBy(opt); setShowSortMenu(false); }}
                                            style={{
                                                width: '100%', padding: '13px 16px', textAlign: 'left', border: 'none',
                                                background: sortBy === opt ? '#ECFDF5' : '#fff',
                                                color: sortBy === opt ? '#065F46' : '#475569',
                                                fontWeight: sortBy === opt ? 700 : 500, fontSize: 14,
                                                fontFamily: 'var(--rm-ui)', cursor: 'pointer',
                                            }}
                                        >
                                            {opt === 'recent' ? 'Most recent' : opt === 'name' ? 'Brief name' : opt === 'client' ? 'Client name' : 'Status'}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}

                        {/* Brief list */}
                        <div className="rm-sec-label">
                            <span className="t">Briefs ({displayedBriefs.length})</span>
                        </div>
                        <div className="rm-list">
                            {displayedBriefs.length === 0 ? (
                                <div className="rm-empty">
                                    <Icon n="file" s={32} c="#94A3B8" />
                                    <p>{searchQuery ? 'No briefs match your search' : 'Create your first brief to get started'}</p>
                                </div>
                            ) : displayedBriefs.map(brief => (
                                <Link key={brief.id} href={`/briefs/${brief.id}`} className="rm-brief-card">
                                    <div className="row1">
                                        <div style={{ minWidth: 0 }}>
                                            <div className="nm">{getBriefDisplayTitle(brief)}</div>
                                            <div className="no">
                                                {brief.briefNumber}{brief.ref ? ` · ${brief.ref}` : ''}
                                            </div>
                                        </div>
                                        <Pill kind={statusKind(brief.status)}>
                                            {brief.status.charAt(0).toUpperCase() + brief.status.slice(1).toLowerCase()}
                                        </Pill>
                                    </div>
                                    <div className="row2">
                                        <div className="kv" style={{ flex: 1, minWidth: 0 }}>
                                            <span className="lab">Client</span>
                                            <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {brief.client?.name ? toTitleCase(brief.client.name) : 'Unassigned'}
                                            </span>
                                        </div>
                                        <span style={{ fontSize: 12, color: 'var(--rm-t3)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                            {brief.category}
                                        </span>
                                        <div className="docs">
                                            <Icon n="doc" s={13} />
                                            <span>{brief._count?.documents ?? 0}</span>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* FAB */}
                    <div className="rm-cta-fixed">
                        <button className="rm-btn-primary" onClick={() => setIsUploadModalOpen(true)}>
                            <Icon n="plus" s={18} />
                            New Brief
                        </button>
                    </div>
                </div>

                <BriefUploadModal
                    isOpen={isUploadModalOpen}
                    onClose={() => setIsUploadModalOpen(false)}
                    onSuccess={handleCreateSuccess}
                    workspaceId={workspaceId}
                />
                <EditBriefModal
                    isOpen={!!editingBrief}
                    onClose={() => setEditingBrief(null)}
                    onSuccess={handleUpdateSuccess}
                    brief={editingBrief}
                    workspaceId={workspaceId}
                />
                <ConfirmDialog
                    open={!!deletingBriefId}
                    title="Delete brief"
                    message="This will permanently delete the brief and all its documents. This cannot be undone."
                    confirmLabel="Delete"
                    danger
                    onConfirm={() => { if (deletingBriefId) handleDelete(deletingBriefId); setDeletingBriefId(null); }}
                    onCancel={() => setDeletingBriefId(null)}
                />
            </>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Legal Briefs</h1>
                    <p className={styles.subtitle}>Manage and collaborate on legal documents</p>
                </div>
                {initialBriefs.length > 0 && (
                    <button className={styles.uploadBtn} onClick={() => setIsUploadModalOpen(true)}>
                        <Plus size={18} />
                        <span>Create Brief</span>
                    </button>
                )}
            </div>

            <div className={styles.toolbar}>
                <div className={styles.searchWrapper}>
                    <Search size={18} className={styles.searchIcon} />
                    <input
                        type="text"
                        placeholder="Search briefs..."
                        className={styles.searchInput}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div style={{ position: 'relative' }}>
                    <button className={styles.sortBtn} onClick={() => setShowSortMenu(v => !v)}>
                        <Filter size={16} />
                        <span>Sort: {sortBy === 'recent' ? 'Recent' : sortBy === 'name' ? 'Name' : sortBy === 'client' ? 'Client' : 'Status'}</span>
                    </button>
                    {showSortMenu && (
                        <>
                            <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setShowSortMenu(false)} />
                            <div style={{
                                position: 'absolute', top: '110%', right: 0, zIndex: 100,
                                background: 'var(--surface)', border: '1px solid var(--border)',
                                borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                                minWidth: 160, overflow: 'hidden',
                            }}>
                                {(['recent', 'name', 'client', 'status'] as const).map(opt => (
                                    <button
                                        key={opt}
                                        onClick={() => { setSortBy(opt); setShowSortMenu(false); }}
                                        style={{
                                            width: '100%', padding: '0.55rem 0.9rem', textAlign: 'left',
                                            background: sortBy === opt ? 'var(--primary-light, #f0fdfa)' : 'none',
                                            border: 'none', cursor: 'pointer',
                                            color: sortBy === opt ? 'var(--primary)' : 'var(--text-primary)',
                                            fontWeight: sortBy === opt ? 600 : 400,
                                            fontSize: '0.8rem',
                                        }}
                                    >
                                        {opt === 'recent' ? 'Most recent' : opt === 'name' ? 'Brief name' : opt === 'client' ? 'Client name' : 'Status'}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {displayedBriefs.length === 0 ? (
                <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>
                        <Briefcase size={48} />
                    </div>
                    <h3 className={styles.emptyTitle}>No Briefs Found</h3>
                    <p className={styles.emptyText}>
                        {initialBriefs.length === 0
                            ? "Create your first brief to get started managing your legal documents."
                            : "No briefs match your search criteria."}
                    </p>
                    {initialBriefs.length === 0 && (
                        <button className={styles.uploadBtn} onClick={() => setIsUploadModalOpen(true)} style={{ marginTop: '1.5rem' }}>
                            <Plus size={18} />
                            <span>Create Brief</span>
                        </button>
                    )}
                </div>
            ) : (
                <>
                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th className={styles.checkboxCell}><input type="checkbox" /></th>
                                <th>No.</th>
                                <th>Brief Name</th>
                                <th>Client Name</th>
                                <th>Lawyer-in-Charge</th>
                                <th>Category</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {renderRows.map((brief) => (
                                <tr key={brief.id} className={brief.depth > 0 ? styles.childRow : ''}>
                                    <td className={styles.checkboxCell}><input type="checkbox" /></td>
                                    <td className={styles.briefNumber}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            {brief.depth > 0 && <span style={{ width: `${brief.depth * 20}px` }} />}
                                            {parentIds.has(brief.id) ? (
                                                <button 
                                                    onClick={(e) => toggleExpand(brief.id, e)}
                                                    className={styles.expandBtn}
                                                >
                                                    {expandedBriefIds.has(brief.id) || searchQuery ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                                </button>
                                            ) : (
                                                <span style={{ width: '18px' }} />
                                            )}
                                            {brief.briefNumber}
                                        </div>
                                    </td>
                                    <td>
                                        <div className={styles.briefInfo}>
                                            <div className={styles.briefTitleRow}>
                                                <Link href={`/briefs/${brief.id}`} className={styles.briefName}>
                                                    {getBriefDisplayTitle(brief)}
                                                </Link>
                                                <button
                                                    className={styles.docsIconBtn}
                                                    title={brief._count?.documents ? `${brief._count.documents} document(s)` : 'No documents yet'}
                                                    onClick={(e) => handleDocsClick(brief, e)}
                                                >
                                                    <FileText size={14} />
                                                </button>
                                            </div>
                                            <span className={styles.briefRef}>{brief.ref}</span>
                                        </div>
                                    </td>
                                    <td className={styles.clientName}>{brief.client?.name ? toTitleCase(brief.client.name) : 'Unassigned'}</td>
                                    <td className={styles.lawyerName}>{brief.lawyerInCharge?.name || brief.lawyer?.name || 'Unassigned'}</td>
                                    <td>{brief.category}</td>
                                    <td>
                                        <span className={`${styles.statusBadge} ${styles[brief.status.toLowerCase()]}`}>
                                            <span className={styles.statusDot}></span>
                                            {brief.status}
                                        </span>
                                    </td>
                                    <td className={styles.actionCell}>
                                        <button
                                            className={styles.actionBtn}
                                            onClick={(e) => toggleActions(brief.id, e)}
                                        >
                                            <MoreVertical size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Fixed-position dropdown — escapes table overflow clipping */}
                {activeActionId && menuPos && (() => {
                    const brief = briefs.find(b => b.id === activeActionId);
                    if (!brief) return null;
                    return (
                        <>
                            <div
                                style={{ position: 'fixed', inset: 0, zIndex: 99 }}
                                onClick={() => { setActiveActionId(null); setMenuPos(null); }}
                            />
                            <div
                                className={styles.actionMenu}
                                style={{ position: 'fixed', top: menuPos.top, right: menuPos.right, zIndex: 100 }}
                            >
                                <Link href={`/briefs/${brief.id}`} className={styles.menuItem}>
                                    <Eye size={14} /> Open Brief
                                </Link>
                                <button
                                    className={styles.menuItem}
                                    onClick={() => { setMovingBrief(brief); setActiveActionId(null); setMenuPos(null); }}
                                >
                                    <Share2 size={14} /> Move to Parent Brief
                                </button>
                                <button
                                    className={styles.menuItem}
                                    onClick={() => { setActivityBrief(brief); setActiveActionId(null); setMenuPos(null); }}
                                >
                                    <MessageSquare size={14} /> Add Comment/Activity
                                </button>
                                <button
                                    className={styles.menuItem}
                                    onClick={() => { setEditingBrief(brief); setActiveActionId(null); setMenuPos(null); }}
                                >
                                    <Edit size={14} /> Edit Brief Details
                                </button>
                                <button
                                    className={`${styles.menuItem} ${styles.deleteItem}`}
                                    onClick={() => { setDeletingBriefId(brief.id); setActiveActionId(null); setMenuPos(null); }}
                                >
                                    <Trash2 size={14} /> Delete Brief
                                </button>
                            </div>
                        </>
                    );
                })()}

            </>
            )}

            <BriefUploadModal
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
                onSuccess={handleCreateSuccess}
                workspaceId={workspaceId}
            />

            <EditBriefModal
                isOpen={!!editingBrief}
                onClose={() => setEditingBrief(null)}
                onSuccess={handleUpdateSuccess}
                brief={editingBrief}
                workspaceId={workspaceId}
            />

            <BriefActivityModal
                isOpen={!!activityBrief}
                onClose={() => setActivityBrief(null)}
                brief={activityBrief}
            />

            <MoveBriefModal
                isOpen={!!movingBrief}
                onClose={() => setMovingBrief(null)}
                workspaceId={workspaceId}
                briefId={movingBrief?.id}
                briefName={movingBrief?.name}
                currentParentId={movingBrief?.parentBriefId}
                onSuccess={() => {
                    setMovingBrief(null);
                    router.refresh();
                    // Refetch briefs to update UI
                    getBriefs(workspaceId).then(setBriefs);
                }}
            />

            <ConfirmDialog
                open={!!deletingBriefId}
                title="Delete brief"
                message="This will permanently delete the brief and all its documents. This cannot be undone."
                confirmLabel="Delete"
                danger
                onConfirm={() => { if (deletingBriefId) handleDelete(deletingBriefId); setDeletingBriefId(null); }}
                onCancel={() => setDeletingBriefId(null)}
            />

            {quickViewBrief && (
                <BriefDocsQuickView
                    briefId={quickViewBrief.id}
                    briefName={quickViewBrief.name}
                    onClose={() => setQuickViewBrief(null)}
                    onUpload={() => {
                        setQuickViewBrief(null);
                        setIsUploadModalOpen(true);
                    }}
                />
            )}
        </div>
    );
}
