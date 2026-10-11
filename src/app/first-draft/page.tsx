import { redirect } from 'next/navigation';
import { getCurrentUserWithWorkspace } from '@/lib/workspace';
import { FileEdit } from 'lucide-react';
import styles from './page.module.css';

export default async function FirstDraftPage() {
    const data = await getCurrentUserWithWorkspace();

    if (!data?.user) redirect('/login');

    if (!data?.workspace) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
                <h2>No Workspace Found</h2>
                <p>Please create a workspace first.</p>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <div className={styles.icon}>
                <FileEdit size={28} />
            </div>
            <h1 className={styles.title}>First Draft</h1>
            <p className={styles.lead}>
                When a court attendance is logged against a matter, First Draft will assemble what happened,
                the next date, and what the client was last told, then prepare a client update for a lawyer
                to review and send — no page to remember to visit, no blank page to start from.
            </p>
            <div className={styles.status}>In development — nothing drafted here yet.</div>
        </div>
    );
}
