import { listWorkspaces } from '../../actions/admin';
import WorkspacesClient from './WorkspacesClient';
import styles from '../waitlist/page.module.css'; // Reusing header styles

export default async function WorkspacesPage() {
    const workspaces = await listWorkspaces();

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>Workspace Management</h1>
                <p className={styles.subtitle}>Overview of all law firms and their usage metrics</p>
            </header>

            <WorkspacesClient workspaces={workspaces} />
        </div>
    );
}
