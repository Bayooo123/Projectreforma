import { Plus, Download } from 'lucide-react';
import ClientList from '@/components/management/ClientList';
import ClientStats from '@/components/management/ClientStats';
import styles from './page.module.css';
import PasswordProtected from '@/components/auth/PasswordProtected';

export default function ClientsPage() {
    return (
        <PasswordProtected password="12345678"><div className={styles.page}>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Clients</h1>
                    <p className={styles.subtitle}>Manage and collaborate on legal documents</p>
                </div>
                <div className={styles.actions}>
                    <button className={styles.exportBtn}>
                        <Download size={18} />
                        <span>Export Data</span>
                    </button>
                    <button className={styles.addBtn}>
                        <Plus size={18} />
                        <span>Add New Client</span>
                    </button>
                </div>
            </div>

            <ClientStats />

            <ClientList />
        </div></PasswordProtected>
    );
}
