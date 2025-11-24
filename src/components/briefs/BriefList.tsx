"use client";

import { useState } from 'react';
import Link from 'next/link';
import { Search, Filter, MoreVertical, Plus, Trash2, UserPlus, Eye } from 'lucide-react';
import styles from './BriefList.module.css';

// Mock Data matching the screenshot fields
const MOCK_BRIEFS = [
    {
        id: '1',
        briefNumber: '001',
        name: 'Motion for Summary Judgment',
        ref: 'LGL-2025-481-MSJ',
        client: 'Stellar Corporation',
        lawyer: 'Tariq Audu',
        category: 'Litigation',
        dueDate: '2025-08-15',
        status: 'Active',
    },
    {
        id: '2',
        briefNumber: '002',
        name: 'Appellate Reply Brief reg...',
        ref: 'LGL-2025-481-MSJ',
        client: 'Green Meadow...',
        lawyer: 'Onyeka Chioma',
        category: 'ADR',
        dueDate: '2025-07-01',
        status: 'Active',
    },
    {
        id: '3',
        briefNumber: '003',
        name: 'Stipulation for Dismissal...',
        ref: 'LGL-2025-481-MSJ',
        client: 'OmniTech Solut...',
        lawyer: 'Yemisi Grace',
        category: 'Tax advisory',
        dueDate: '2025-09-05',
        status: 'Inactive',
    },
    {
        id: '4',
        briefNumber: '004',
        name: 'Internal Memo',
        ref: 'LGL-2025-481-MSJ',
        client: 'Maritime Logist...',
        lawyer: 'Zainab Musa',
        category: 'Corporate advisory',
        dueDate: '2025-09-28',
        status: 'Active',
    },
    {
        id: '5',
        briefNumber: '005',
        name: 'Motion for Summary Jud...',
        ref: 'LGL-2025-481-MSJ',
        client: 'Phoenix Group...',
        lawyer: 'Ayo Omowunmi',
        category: 'Academic research',
        dueDate: '2025-06-20',
        status: 'Finalized',
    },
];

const BriefList = () => {
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
                <button className={styles.uploadBtn}>
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
        </div>
    );
};

export default BriefList;
