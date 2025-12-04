import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getCurrentUserWithWorkspace } from '@/lib/workspace';
import { getMattersForMonth } from '@/lib/matters';
import CalendarClient from './CalendarClient';

export default async function CalendarPage() {
    const session = await auth();

    if (!session?.user) {
        redirect('/login');
    }

    // Get workspace
    const data = await getCurrentUserWithWorkspace();

    if (!data?.workspace) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
                <h2>No Workspace Found</h2>
                <p>Please create a workspace first.</p>
            </div>
        );
    }

    // Get current month's matters
    const now = new Date();
    const matters = await getMattersForMonth(
        data.workspace.id,
        now.getFullYear(),
        now.getMonth()
    );

    return (
        <CalendarClient
            initialMatters={matters}
            workspaceId={data.workspace.id}
            userId={session.user.id!}
        />
    );
}
