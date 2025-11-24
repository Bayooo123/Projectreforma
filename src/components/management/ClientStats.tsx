import { User, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import styles from './ClientStats.module.css';

const ClientStats = () => {
    const stats = [
        { label: 'Total clients', value: '24', icon: User },
        { label: 'Outstanding Invoices', value: '24', icon: FileText },
        { label: 'Overdue Payments', value: '24', icon: AlertCircle },
        { label: 'Collected this month', value: '24', icon: CheckCircle },
    ];

    return (
        <div className={styles.grid}>
            {stats.map((stat, index) => (
                <div key={index} className={styles.card}>
                    <div className={styles.header}>
                        <stat.icon size={18} className={styles.icon} />
                        <span className={styles.label}>{stat.label}</span>
                    </div>
                    <div className={styles.value}>{stat.value}</div>
                </div>
            ))}
        </div>
    );
};

export default ClientStats;
