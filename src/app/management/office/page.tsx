import ManagementTabs from '@/components/management/ManagementTabs';
import StaffAttendance from '@/components/management/StaffAttendance';
import FinancialLog from '@/components/management/FinancialLog';
import styles from './page.module.css';

export default function OfficePage() {
    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <h1 className={styles.title}>Management</h1>
                <p className={styles.subtitle}>Oversee clients, finances, and office operations.</p>
            </div>

            <ManagementTabs />

            <div className={styles.grid}>
                <StaffAttendance />
                <FinancialLog />
            </div>
        </div>
    );
}
