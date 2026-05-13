"use client";

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Search, Filter, MoreVertical, Plus, Trash2, Eye, Briefcase, MessageSquare, Edit, FolderTree, ChevronDown, ChevronRight, Share2, FileText } from 'lucide-react';
import styles from './BriefList.module.css';
import { deleteBrief, getBriefs } from '@/app/actions/briefs'; // Only import actions needed
import EditBriefModal from './EditBriefModal';
import BriefActivityModal from './BriefActivityModal';
import MoveBriefModal from './MoveBriefModal';
import { useRouter } from 'next/navigation';
import BriefUploadModal from './BriefUploadModal';
import { getBriefDisplayTitle } from '@/lib/brief-display';
import { toTitleCase } from '@/lib/sentence-case';

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
    const [expandedBriefIds, setExpandedBriefIds] = useState<Set<string>>(new Set());
    const [movingBrief, setMovingBrief] = useState<any | null>(null);

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
    const [noDocToast, setNoDocToast] = useState<string | null>(null); // brief id currently showing toast

    const router = useRouter();

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this brief?')) {
            const result = await deleteBrief(id);
            if (result.success) {
                setBriefs(briefs.filter(b => b.id !== id));
                router.refresh(); // Sync server state
            } else {
                alert('Failed to delete brief: ' + result.error);
            }
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
        const docCount = brief._count?.documents ?? 0;
        if (docCount === 0) {
            setNoDocToast(brief.id);
            setTimeout(() => setNoDocToast(null), 3500);
        } else {
            router.push(`/briefs/${brief.id}?tab=documents`);
        }
    };

    // Client-side filtering for immediate feedback on search input
    const displayedBriefs = briefs.filter(brief => {
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
                <button className={styles.sortBtn}>
                    <Filter size={16} />
                    <span>Sort by</span>
                </button>
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
                                            {noDocToast === brief.id && (
                                                <div className={styles.noDocToast}>
                                                    No documents yet — upload the first document
                                                </div>
                                            )}
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
                                    onClick={() => { handleDelete(brief.id); setActiveActionId(null); setMenuPos(null); }}
                                >
                                    <Trash2 size={14} /> Delete Brief
                                </button>
                            </div>
                        </>
                    );
                })()}

                {/* Mobile App Card View */}
                <div className={styles.mobileCardsList}>
                    {displayedBriefs.map((brief) => (
                        <div key={brief.id} className={styles.briefCard}>
                            <div className={styles.cardHeader}>
                                <div>
                                    <Link href={`/briefs/${brief.id}`} className={styles.cardTitle}>
                                        {getBriefDisplayTitle(brief)}
                                    </Link>
                                    <div className={styles.cardSubtitle}>{brief.briefNumber} &middot; {brief.ref}</div>
                                </div>
                                <button
                                    className={styles.actionBtn}
                                    onClick={(e) => toggleActions(brief.id, e)}
                                    style={{ width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                >
                                    <MoreVertical size={20} />
                                </button>
                            </div>
                            
                            <div className={styles.cardBody}>
                                <div className={styles.cardRow}>
                                    <span className={styles.cardLabel}>Client</span>
                                    <span className={styles.cardValue}>{brief.client?.name ? toTitleCase(brief.client.name) : 'Unassigned'}</span>
                                </div>
                                <div className={styles.cardRow}>
                                    <span className={styles.cardLabel}>Lawyer</span>
                                    <span className={styles.cardValue}>{brief.lawyerInCharge?.name || brief.lawyer?.name || 'Unassigned'}</span>
                                </div>
                            </div>

                            <div className={styles.cardFooter}>
                                <span className={styles.cardLabel}>{brief.category}</span>
                                <span className={`${styles.statusBadge} ${styles[brief.status.toLowerCase()]}`}>
                                    <span className={styles.statusDot}></span>
                                    {brief.status}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
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
        </div>
    );
}
