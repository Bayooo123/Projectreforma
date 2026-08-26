import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getCurrentUserWithWorkspace } from '@/lib/workspace';
import { getWorkspaceRecordings } from '@/app/actions/meeting-recordings';
import RecordingsClient from './RecordingsClient';

export default async function RecordingsPage() {
    const session = await auth();

    if (!session?.user) {
        redirect('/login');
    }

    const data = await getCurrentUserWithWorkspace();

    if (!data?.workspace) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
                <h2>No Workspace Found</h2>
                <p>Please create a workspace first.</p>
            </div>
        );
    }

    const recordings = await getWorkspaceRecordings(data.workspace.id);

    return (
        <RecordingsClient
            initialRecordings={recordings}
            workspaceId={data.workspace.id}
        />
    );
}
