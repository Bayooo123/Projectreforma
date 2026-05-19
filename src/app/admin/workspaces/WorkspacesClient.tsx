"use client";

import { useState } from 'react';
import {
    Building2,
    User,
    Mail,
    Calendar,
    Briefcase,
    Search,
    ExternalLink,
    ChevronRight,
    Users
} from 'lucide-react';
import styles from './Workspaces.module.css';

interface Workspace {
    id: string;
    name: string;
    slug: string;
    plan: string;
    subscriptionStatus: string;
    subscriptionBand: string | null;
    subscriptionTier: string | null;
    subscriptionExpiresAt: Date | null;
    createdAt: Date;
    owner: {
        name: string | null;
        email: string;
    };
    _count: {
        members: number;
        briefs: number;
    }
}

const STATUS_COLOR: Record<string, string> = {
    active:  '#10b981',
    expired: '#ef4444',
    free:    '#f59e0b',
    pending: '#6366f1',
};

export default function WorkspacesClient({ workspaces }: { workspaces: Workspace[] }) {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredWorkspaces = workspaces.filter(ws =>
        ws.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ws.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ws.owner.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className={styles.content}>
            <div className={styles.toolbar}>
                <div className={styles.searchWrapper}>
                    <Search className={styles.searchIcon} size={18} />
                    <input
                        type="text"
                        placeholder="Search by firm name, slug, or owner..."
                        className={styles.searchInput}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className={styles.count}>
                    {filteredWorkspaces.length} workspaces found
                </div>
            </div>

            <div className={styles.workspaceGrid}>
                {filteredWorkspaces.length === 0 ? (
                    <div className={styles.emptyState}>No workspaces matching your search.</div>
                ) : (
                    filteredWorkspaces.map((ws) => (
                        <div key={ws.id} className={styles.workspaceCard}>
                            <div className={styles.cardHeader}>
                                <div className={styles.firmInfo}>
                                    <div className={styles.firmIcon}>
                                        <Building2 size={24} />
                                    </div>
                                    <div>
                                        <h3 className={styles.firmName}>{ws.name}</h3>
                                        <span className={styles.slug}>/{ws.slug}</span>
                                    </div>
                                </div>
                                <div
                                    className={styles.planBadge}
                                    data-plan={ws.subscriptionStatus}
                                    style={{ background: `${STATUS_COLOR[ws.subscriptionStatus] ?? '#6b7280'}20`, color: STATUS_COLOR[ws.subscriptionStatus] ?? '#6b7280' }}
                                >
                                    {ws.subscriptionStatus.toUpperCase()}
                                </div>
                            </div>

                            <div className={styles.cardBody}>
                                <div className={styles.metaItem}>
                                    <User size={14} />
                                    <span>Owner: {ws.owner.name || 'Anonymous'}</span>
                                </div>
                                <div className={styles.metaItem}>
                                    <Mail size={14} />
                                    <span>{ws.owner.email}</span>
                                </div>
                                <div className={styles.metaItem}>
                                    <Calendar size={14} />
                                    <span>Joined: {new Date(ws.createdAt).toLocaleDateString()}</span>
                                </div>
                                {ws.subscriptionStatus === 'active' && ws.subscriptionExpiresAt && (
                                    <div className={styles.metaItem}>
                                        <Briefcase size={14} />
                                        <span>Band {ws.subscriptionBand} · {ws.subscriptionTier} · expires {new Date(ws.subscriptionExpiresAt).toLocaleDateString()}</span>
                                    </div>
                                )}

                                <div className={styles.statsRow}>
                                    <div className={styles.stat}>
                                        <span className={styles.statValue}>{ws._count.members}</span>
                                        <span className={styles.statLabel}>Members</span>
                                    </div>
                                    <div className={styles.stat}>
                                        <span className={styles.statValue}>{ws._count.briefs}</span>
                                        <span className={styles.statLabel}>Briefs</span>
                                    </div>
                                </div>
                            </div>

                            <div className={styles.cardFooter}>
                                <button type="button" className={styles.viewBtn}>
                                    Manage Firm <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
