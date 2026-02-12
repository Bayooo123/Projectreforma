"use client";

import { useState, useRef } from 'react';
import Link from 'next/link';
import { Search, Filter, MoreVertical, Plus, Trash2, Eye, Briefcase, MessageSquare, Edit } from 'lucide-react';
import styles from './BriefList.module.css';
import { deleteBrief } from '@/app/actions/briefs'; // Only import actions needed
import EditBriefModal from './EditBriefModal';
import BriefActivityModal from './BriefActivityModal';
import { useRouter } from 'next/navigation';
import BriefUploadModal from './BriefUploadModal';
import { getBriefDisplayTitle } from '@/lib/brief-display';

interface BriefListClientProps {
    initialBriefs: any[];
    workspaceId: string;
    onUpload?: () => void;
}

export default function BriefListClient({ initialBriefs, workspaceId }: Omit<BriefListClientProps, 'onUpload'>) {
    const [briefs, setBriefs] = useState<any[]>(initialBriefs);
    const [activeActionId, setActiveActionId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');

    // Modal states
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [editingBrief, setEditingBrief] = useState<any | null>(null);
    const [activityBrief, setActivityBrief] = useState<any | null>(null);

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

    const toggleActions = (id: string) => {
        setActiveActionId(activeActionId === id ? null : id);
    };

    // Client-side filtering for immediate feedback on search input
    const displayedBriefs = briefs.filter(brief => {
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const matchesSearch =
                brief.name.toLowerCase().includes(query) ||
                brief.briefNumber.toLowerCase().includes(query) ||
                brief.client?.name.toLowerCase().includes(query) ||
                brief.category.toLowerCase().includes(query);
            if (!matchesSearch) return false;
        }
        if (statusFilter !== 'all' && brief.status.toLowerCase() !== statusFilter) {
            return false;
        }
        return true;
    });

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Legal Briefs</h1>
                    <p className={styles.subtitle}>Manage and collaborate on legal documents</p>
                </div>
                <button className={styles.uploadBtn} onClick={() => setIsUploadModalOpen(true)}>
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
                            {displayedBriefs.map((brief) => (
                                <tr key={brief.id}>
                                    <td className={styles.checkboxCell}><input type="checkbox" /></td>
                                    <td className={styles.briefNumber}>{brief.briefNumber}</td>
                                    <td>
                                        <div className={styles.briefInfo}>
                                            <Link href={`/briefs/${brief.id}`} className={styles.briefName}>
                                                {getBriefDisplayTitle(brief)}
                                            </Link>
                                            <span className={styles.briefRef}>{brief.ref}</span>
                                        </div>
                                    </td>
                                    <td className={styles.clientName}>{brief.client?.name || 'Unassigned'}</td>
                                    <td className={styles.lawyerName}>{brief.lawyerInCharge?.name || brief.lawyer?.name || 'Unassigned'}</td>
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
        </div>
    );
}
