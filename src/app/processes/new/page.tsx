import { redirect } from 'next/navigation';
import { getCurrentUserWithWorkspace } from '@/lib/workspace';
import { getMattersForWorkspace } from '@/app/actions/matters';
import NewProcessWizard from '@/components/processes/NewProcessWizard';
import styles from './page.module.css';

export default async function NewProcessPage() {
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

    const matters = await getMattersForWorkspace(data.workspace.id);

    return (
        <div className={styles.page}>
            <NewProcessWizard workspaceId={data.workspace.id} userId={data.user.id} initialMatters={matters} />
        </div>
    );
}
