"use client";

import { useState } from 'react';
import {
    CheckCircle,
    XCircle,
    Mail,
    Building,
    Globe,
    MoreVertical,
    Search
} from 'lucide-react';
import { approveWaitlistEntry } from '../../actions/admin';
import styles from './Waitlist.module.css';

interface WaitlistEntry {
    id: string;
    email: string;
    name: string | null;
    firmName: string | null;
    market: string | null;
    createdAt: Date;
}

export default function WaitlistClient({ entries: initialEntries }: { entries: WaitlistEntry[] }) {
    const [entries, setEntries] = useState(initialEntries);
    const [searchTerm, setSearchTerm] = useState('');
    const [isProcessing, setIsProcessing] = useState<string | null>(null);

    const filteredEntries = entries.filter(entry =>
        entry.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.firmName?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleApprove = async (id: string) => {
        if (!confirm('Are you sure you want to approve this request?')) return;

        setIsProcessing(id);
        try {
            const result = await approveWaitlistEntry(id);
            if (result.success) {
                setEntries(entries.filter(e => e.id !== id));
            }
        } catch (error) {
            alert('Failed to approve entry');
        } finally {
            setIsProcessing(null);
        }
    };

    return (
        <div className={styles.content}>
            <div className={styles.toolbar}>
                <div className={styles.searchWrapper}>
                    <Search className={styles.searchIcon} size={18} />
                    <input
                        type="text"
                        placeholder="Search by email, name, or firm..."
                        className={styles.searchInput}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className={styles.count}>
                    {filteredEntries.length} entries found
                </div>
            </div>

            <div className={styles.tableCard}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Contact Info</th>
                            <th>Practice Context</th>
                            <th>Requested On</th>
                            <th className={styles.actionsCol}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredEntries.length === 0 ? (
                            <tr>
                                <td colSpan={4} className={styles.emptyState}>
                                    No pending waitlist entries found.
                                </td>
                            </tr>
                        ) : (
                            filteredEntries.map((entry) => (
                                <tr key={entry.id}>
                                    <td>
                                        <div className={styles.name}>{entry.name || 'Anonymous'}</div>
                                        <div className={styles.email}>
                                            <Mail size={12} /> {entry.email}
                                        </div>
                                    </td>
                                    <td>
                                        <div className={styles.firm}>
                                            <Building size={12} /> {entry.firmName || 'Not specified'}
                                        </div>
                                        <div className={styles.market}>
                                            <Globe size={12} /> {entry.market || 'Unknown Market'}
                                        </div>
                                    </td>
                                    <td>
                                        <div className={styles.date}>
                                            {new Date(entry.createdAt).toLocaleDateString()}
                                        </div>
                                        <div className={styles.time}>
                                            {new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </td>
                                    <td className={styles.actionsCol}>
                                        <div className={styles.actionButtons}>
                                            <button
                                                className={styles.approveBtn}
                                                onClick={() => handleApprove(entry.id)}
                                                disabled={isProcessing === entry.id}
                                            >
                                                {isProcessing === entry.id ? '...' : <CheckCircle size={18} />}
                                                <span>Approve</span>
                                            </button>
                                            <button className={styles.rejectBtn}>
                                                <XCircle size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
