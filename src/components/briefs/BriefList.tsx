"use client";

import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import Link from 'next/link';
import { Search, Filter, MoreVertical, Plus, Trash2, UserPlus, Eye, Briefcase } from 'lucide-react';
import styles from './BriefList.module.css';
import FluidLoader from '@/components/ui/FluidLoader';
import { getBriefs, deleteBrief } from '@/app/actions/briefs';
import EditBriefModal from './EditBriefModal';
import BriefActivityModal from './BriefActivityModal';
import { MessageSquare, Edit } from 'lucide-react'; // Imports for new icons

interface BriefListProps {
    onUpload: () => void;
    workspaceId: string;
}

export interface BriefListRef {
    refresh: () => Promise<void>;
    addBriefOptimistically: (brief: any) => void;
}

const BriefList = forwardRef<BriefListRef, BriefListProps>(({ onUpload, workspaceId }, ref) => {
    const [briefs, setBriefs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeActionId, setActiveActionId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');

    // Modal states
    const [editingBrief, setEditingBrief] = useState<any | null>(null);
    const [activityBrief, setActivityBrief] = useState<any | null>(null);

    useEffect(() => {
        if (workspaceId) {
            fetchBriefs();
        }
    }, [workspaceId]);

    const fetchBriefs = async () => {
        setIsLoading(true);
        try {
            console.log('[BriefList] 🔄 Fetching briefs for workspace:', workspaceId);
            const data = await getBriefs(workspaceId);
            console.log('[BriefList] 📥 Fetched', data.length, 'briefs from server');
            console.log('[BriefList] 📋 Brief IDs:', data.map((b: any) => b.id));
            console.log('[BriefList] 🔢 Brief Numbers:', data.map((b: any) => b.briefNumber));
            setBriefs(data);
        } catch (error) {
            console.error("[BriefList] ❌ Failed to fetch briefs", error);
        } finally {
            setIsLoading(false);
        }
    };

    // Expose refresh method to parent component
    useImperativeHandle(ref, () => ({
        refresh: async () => {
            console.log('[BriefList] Refresh called via ref');
            await fetchBriefs();
        },
        addBriefOptimistically: (brief: any) => {
            console.log('[BriefList] Adding brief optimistically:', brief);
            setBriefs(prevBriefs => [brief, ...prevBriefs]);
        }
    }));

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this brief?')) {
            const result = await deleteBrief(id);
            if (result.success) {
                setBriefs(briefs.filter(b => b.id !== id));
            } else {
                alert('Failed to delete brief: ' + result.error);
            }
        }
    };

    const handleUpdateSuccess = (updatedBrief: any) => {
        setBriefs(briefs.map(b => b.id === updatedBrief.id ? { ...b, ...updatedBrief } : b));
    };

    const toggleActions = (id: string) => {
        setActiveActionId(activeActionId === id ? null : id);
    };

    // Filter briefs based on search and status
    const filteredBriefs = briefs.filter(brief => {
        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const matchesSearch =
                brief.name.toLowerCase().includes(query) ||
                brief.briefNumber.toLowerCase().includes(query) ||
                brief.client?.name.toLowerCase().includes(query) ||
                brief.category.toLowerCase().includes(query);
            if (!matchesSearch) return false;
        }
        // Status filter
        if (statusFilter !== 'all' && brief.status.toLowerCase() !== statusFilter) {
            return false;
        }
        return true;
    });

    if (isLoading) {
        return (
            <div className={styles.container}>
                <div className="flex justify-center items-center h-64">
                    <FluidLoader />
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Legal Briefs</h1>
                    <p className={styles.subtitle}>Manage and collaborate on legal documents</p>
                </div>
                <button className={styles.uploadBtn} onClick={onUpload}>
                    <Plus size={18} />
                    <span>Create Brief</span>
                </button>
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

            {
                filteredBriefs.length === 0 ? (
                    <div className={styles.emptyState}>
                        <div className={styles.emptyIcon}>
                            <Briefcase size={48} />
                        </div>
                        <h3 className={styles.emptyTitle}>No Briefs Created</h3>
                        <p className={styles.emptyText}>Create your first brief to get started managing your legal documents.</p>
                        <button className={styles.uploadBtn} onClick={onUpload} style={{ marginTop: '1.5rem' }}>
                            <Plus size={18} />
                            <span>Create Brief</span>
                        </button>
                    </div>
                ) : (
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
                                    <th>Due date</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredBriefs.map((brief) => (
                                    <tr key={brief.id}>
                                        <td className={styles.checkboxCell}><input type="checkbox" /></td>
                                        <td className={styles.briefNumber}>{brief.briefNumber}</td>
                                        <td>
                                            <div className={styles.briefInfo}>
                                                <Link href={`/briefs/${brief.id}`} className={styles.briefName}>
                                                    {brief.name}
                                                </Link>
                                                <span className={styles.briefRef}>{brief.ref}</span>
                                            </div>
                                        </td>
                                        <td className={styles.clientName}>{brief.client?.name || 'Unknown Client'}</td>
                                        <td className={styles.lawyerName}>{brief.lawyer?.name || 'Unassigned'}</td>
                                        <td>{brief.category}</td>
                                        <td className={styles.dateCell}>{brief.dueDate ? new Date(brief.dueDate).toLocaleDateString() : '-'}</td>
                                        <td>
                                            <span className={`${styles.statusBadge} ${styles[brief.status.toLowerCase()]}`}>
                                                <span className={styles.statusDot}></span>
                                                {brief.status}
                                            </span>
                                        </td>
                                        <td className={styles.actionCell}>
                                            <button
                                                className={styles.actionBtn}
                                                onClick={() => toggleActions(brief.id)}
                                            >
                                                <MoreVertical size={18} />
                                            </button>
                                            {activeActionId === brief.id && (
                                                <div className={styles.actionMenu}>
                                                    <Link href={`/briefs/${brief.id}`} className={styles.menuItem}>
                                                        <Eye size={14} /> Open Brief
                                                    </Link>
                                                    <button
                                                        className={styles.menuItem}
                                                        onClick={() => {
                                                            setActivityBrief(brief);
                                                            setActiveActionId(null);
                                                        }}
                                                    >
                                                        <MessageSquare size={14} /> Add Comment/Activity
                                                    </button>
                                                    <button
                                                        className={styles.menuItem}
                                                        onClick={() => {
                                                            setEditingBrief(brief);
                                                            setActiveActionId(null);
                                                        }}
                                                    >
                                                        <Edit size={14} /> Edit Brief Details
                                                    </button>
                                                    <button
                                                        className={`${styles.menuItem} ${styles.deleteItem}`}
                                                        onClick={() => {
                                                            handleDelete(brief.id);
                                                            setActiveActionId(null);
                                                        }}
                                                    >
                                                        <Trash2 size={14} /> Delete Brief
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )
            }

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
        </div >
    );
});

BriefList.displayName = 'BriefList';

export default BriefList;
