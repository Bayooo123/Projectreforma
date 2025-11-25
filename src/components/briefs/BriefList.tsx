"use client";

import { useState } from 'react';
import Link from 'next/link';
import { Search, Filter, MoreVertical, Plus, Trash2, UserPlus, Eye, Briefcase } from 'lucide-react';
import styles from './BriefList.module.css';

// Mock Data matching the screenshot fields
const MOCK_BRIEFS: any[] = [];

interface BriefListProps {
    onUpload: () => void;
}

const BriefList = ({ onUpload }: BriefListProps) => {
    const [activeActionId, setActiveActionId] = useState<string | null>(null);

    const toggleActions = (id: string) => {
        setActiveActionId(activeActionId === id ? null : id);
    };

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

            {MOCK_BRIEFS.length === 0 ? (
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
                            {MOCK_BRIEFS.map((brief) => (
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
                                    <td className={styles.clientName}>{brief.client}</td>
                                    <td className={styles.lawyerName}>{brief.lawyer}</td>
                                    <td>{brief.category}</td>
                                    <td className={styles.dateCell}>{brief.dueDate}</td>
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
