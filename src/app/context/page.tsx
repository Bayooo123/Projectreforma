import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getBriefManagerBoard } from '@/app/actions/agent-insights';
import ContextClient from './ContextClient';

export default async function ContextPage() {
    const session = await auth();
    if (!session?.user?.id) redirect('/login');

    const workspaceId = session.user.workspaceId;
    if (!workspaceId) {
        return (
            <div className="p-10 text-center text-slate-500">
                No Workspace Associated with Account
            </div>
        );
    }

    const rows = await getBriefManagerBoard(workspaceId, 'mine');

    return (
        <ContextClient
            initialRows={rows}
            workspaceId={workspaceId}
            userId={session.user.id}
        />
    );
}
