import ManagementTabs from '@/components/management/ManagementTabs';
import FinancialLog from '@/components/management/FinancialLog';
import styles from './page.module.css';
import PasswordProtected from '@/components/auth/PasswordProtected';
import { getCurrentUserWithWorkspace } from '@/lib/workspace';

export default async function OfficePage() {
    const { workspace } = (await getCurrentUserWithWorkspace()) || {};

    return (
        <PasswordProtected password="12345678">
            <div className={styles.page}>
                <div className={styles.header}>
                    <h1 className={styles.title}>Management</h1>
                    <p className={styles.subtitle}>Oversee clients, finances, and office operations.</p>
                </div>

                <ManagementTabs />

                <div className={styles.content}>
                    <FinancialLog workspaceId={workspace?.id} />
                </div>
            </div>
        </PasswordProtected>
    );
}
