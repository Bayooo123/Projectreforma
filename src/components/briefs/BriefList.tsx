"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Filter, MoreVertical, Plus, Trash2, UserPlus, Eye, Briefcase, Loader } from 'lucide-react';
import styles from './BriefList.module.css';
import { getBriefs } from '@/app/actions/briefs';

interface BriefListProps {
    onUpload: () => void;
}

const BriefList = ({ onUpload }: BriefListProps) => {
    const [briefs, setBriefs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeActionId, setActiveActionId] = useState<string | null>(null);

    // Hardcoded workspace ID for now - should come from context/auth
    const WORKSPACE_ID = "workspace-id-123";

    useEffect(() => {
        const fetchBriefs = async () => {
            setIsLoading(true);
            try {
                const data = await getBriefs(WORKSPACE_ID);
                setBriefs(data);
            } catch (error) {
                console.error("Failed to fetch briefs", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchBriefs();
    }, []);

    const toggleActions = (id: string) => {
        setActiveActionId(activeActionId === id ? null : id);
    };

    if (isLoading) {
        return (
            <div className={styles.container}>
                <div className="flex justify-center items-center h-64">
                    <Loader className="animate-spin text-gray-500" size={32} />
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
                    <span>Upload New Brief</span>
                </button>
            </div>

            <div className={styles.toolbar}>
                <div className={styles.searchWrapper}>
                    <Search size={18} className={styles.searchIcon} />
                    <input
                        type="text"
                        placeholder="Search"
                        className={styles.searchInput}
                    />
                </div>
                <button className={styles.sortBtn}>
                    <Filter size={16} />
                    <span>Sort by</span>
                </button>
            </div>

            {briefs.length === 0 ? (
                <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>
                        <Briefcase size={48} />
                    </div>
                    <h3 className={styles.emptyTitle}>No Briefs Uploaded</h3>
                    <p className={styles.emptyText}>Upload your first brief to get started managing your legal documents.</p>
                    <button className={styles.uploadBtn} onClick={onUpload} style={{ marginTop: '1.5rem' }}>
                        <Plus size={18} />
                        <span>Upload New Brief</span>
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
                            {briefs.map((brief) => (
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
                                                <button className={styles.menuItem}>
                                                    <Eye size={14} /> Open
                                                </button>
                                                <button className={styles.menuItem}>
                                                    <UserPlus size={14} /> Assign
                                                </button>
                                                <button className={`${styles.menuItem} ${styles.deleteItem}`}>
                                                    <Trash2 size={14} /> Delete
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
        </div>
    );
};

export default BriefList;
