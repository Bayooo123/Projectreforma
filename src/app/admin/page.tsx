import { getPlatformStats } from '../actions/admin';
import {
    Building2,
    Users,
    Clock,
    FileText,
    ArrowUpRight
} from 'lucide-react';
import styles from './page.module.css';
import Link from 'next/link';

export default async function AdminDashboard() {
    const stats = await getPlatformStats();

    const cards = [
        {
            title: 'Active Workspaces',
            value: stats.workspaces,
            desc: 'Registered law firms',
            icon: Building2,
            color: '#0ea5e9',
            link: '/admin/workspaces'
        },
        {
            title: 'Total Users',
            value: stats.users,
            desc: 'Across all law firms',
            icon: Users,
            color: '#8b5cf6',
            link: '/admin/users'
        },
        {
            title: 'Waitlist',
            value: stats.waitlist,
            desc: 'Pending registrations',
            icon: Clock,
            color: '#f59e0b',
            link: '/admin/waitlist'
        },
        {
            title: 'Briefs Filed',
            value: stats.briefs,
            desc: 'Total system activity',
            icon: FileText,
            color: '#10b981',
            link: '#'
        },
    ];

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>HQ Dashboard</h1>
                <p className={styles.subtitle}>Platform-wide overview and health metrics</p>
            </header>

            <div className={styles.grid}>
                {cards.map((card) => (
                    <div key={card.title} className={styles.card}>
                        <div className={styles.cardHeader}>
                            <div className={styles.iconWrapper} style={{ backgroundColor: `${card.color}15`, color: card.color }}>
                                <card.icon size={24} />
                            </div>
                            <Link href={card.link} className={styles.viewLink}>
                                View <ArrowUpRight size={16} />
                            </Link>
                        </div>
                        <div className={styles.cardBody}>
                            <h3 className={styles.cardValue}>{card.value.toLocaleString()}</h3>
                            <p className={styles.cardLabel}>{card.title}</p>
                            <p className={styles.cardDesc}>{card.desc}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className={styles.recentActivity}>
                <h2 className={styles.sectionTitle}>System Health</h2>
                <div className={styles.healthGrid}>
                    <div className={styles.healthItem}>
                        <span className={styles.healthLabel}>Database Status</span>
                        <span className={styles.healthStatus}>Healthy</span>
                    </div>
                    <div className={styles.healthItem}>
                        <span className={styles.healthLabel}>Auth Service</span>
                        <span className={styles.healthStatus}>Operational</span>
                    </div>
                    <div className={styles.healthItem}>
                        <span className={styles.healthLabel}>OCR Engine</span>
                        <span className={styles.healthStatus}>Operational</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
