import { redirect } from 'next/navigation';
import { getCurrentUserWithWorkspace } from '@/lib/workspace';
import { getPendingDrafts } from '@/app/actions/first-draft';
import FirstDraftClient from './FirstDraftClient';

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

    const drafts = await getPendingDrafts(data.workspace.id);

    return <FirstDraftClient initialDrafts={drafts as any} />;
}
