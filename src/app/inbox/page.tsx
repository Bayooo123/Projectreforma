import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import InboxClient from './InboxClient';

export default async function InboxPage() {
    const session = await auth();
    if (!session?.user?.id) redirect('/login');

    const workspaceId = session.user.workspaceId;
    if (!workspaceId) {
        return (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                No workspace associated with this account.
            </div>
        );
    }

    return <InboxClient workspaceId={workspaceId} />;
}
