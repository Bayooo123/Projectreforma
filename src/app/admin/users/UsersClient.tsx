"use client";

import { useState } from 'react';
import {
    User,
    Mail,
    Calendar,
    Briefcase,
    Search,
    Shield,
    MoreHorizontal,
    Building
} from 'lucide-react';
import styles from '../workspaces/Workspaces.module.css'; // Reusing card styles

interface PlatformUser {
    id: string;
    name: string | null;
    email: string;
    isPlatformAdmin: boolean;
    createdAt: Date;
    _count: {
        workspaces: number;
        createdBriefs: number;
    }
}

export default function UsersClient({ users }: { users: any[] }) {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredUsers = users.filter(user =>
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.name?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );

    return (
        <div className={styles.content}>
            <div className={styles.toolbar}>
                <div className={styles.searchWrapper}>
                    <Search className={styles.searchIcon} size={18} />
                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        className={styles.searchInput}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className={styles.count}>
                    {filteredUsers.length} users registered
                </div>
            </div>

            <div className={styles.workspaceGrid}>
                {filteredUsers.length === 0 ? (
                    <div className={styles.emptyState}>No users matching your search.</div>
                ) : (
                    filteredUsers.map((user) => (
                        <div key={user.id} className={styles.workspaceCard}>
                            <div className={styles.cardHeader}>
                                <div className={styles.firmInfo}>
                                    <div className={styles.firmIcon}>
                                        <User size={24} />
                                    </div>
                                    <div>
                                        <h3 className={styles.firmName}>{user.name || 'Anonymous User'}</h3>
                                        <div className={styles.email} style={{ marginTop: '2px' }}>
                                            {user.email}
                                        </div>
                                    </div>
                                </div>
                                {user.isPlatformAdmin && (
                                    <div className={styles.planBadge} style={{ background: '#fef3c7', color: '#92400e' }}>
                                        PLATFORM ADMIN
                                    </div>
                                )}
                            </div>

                            <div className={styles.cardBody}>
                                <div className={styles.metaItem}>
                                    <Calendar size={14} />
                                    <span>Member since: {new Date(user.createdAt).toLocaleDateString()}</span>
                                </div>

                                <div className={styles.statsRow}>
                                    <div className={styles.stat}>
                                        <span className={styles.statValue}>{user._count.workspaces}</span>
                                        <span className={styles.statLabel}>Firms</span>
                                    </div>
                                    <div className={styles.stat}>
                                        <span className={styles.statValue}>{user._count.createdBriefs}</span>
                                        <span className={styles.statLabel}>Briefs</span>
                                    </div>
                                </div>
                            </div>

                            <div className={styles.cardFooter}>
                                <button className={styles.viewBtn}>
                                    View Profile <MoreHorizontal size={16} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
