import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getCurrentUserWithWorkspace } from '@/lib/workspace';
import { getCourtEvents } from '@/app/actions/court-dates';
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

    // Get all court events (past and future)
    const events = await getCourtEvents(data.workspace.id);

    return (
        <CalendarClient
            initialEvents={events}
            workspaceId={data.workspace.id}
            userId={session.user.id!}
        />
    );
}
