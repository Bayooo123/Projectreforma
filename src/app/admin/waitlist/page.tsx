import { getWaitlistEntries } from '../../actions/admin';
import WaitlistClient from './WaitlistClient';
import styles from './page.module.css';

export default async function WaitlistPage() {
    const entries = await getWaitlistEntries();

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>Waitlist Management</h1>
                <p className={styles.subtitle}>Review and approve pending registration requests</p>
            </header>

            <WaitlistClient entries={entries} />
        </div>
    );
}
