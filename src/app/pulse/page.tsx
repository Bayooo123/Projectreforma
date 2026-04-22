import { auth } from "@/auth";
import { redirect } from "next/navigation";
import {
    getPulseFirmStats,
    getPulseUserStats,
    getPulseFeedFirmwide,
    getPulseFeedUser,
} from '@/app/actions/pulse';
import PulseClient from './PulseClient';

export default async function PulsePage() {
    const session = await auth();
    if (!session?.user?.id) return redirect('/login');

    const workspaceId = session.user.workspaceId;
    if (!workspaceId) {
        return (
            <div className="p-10 text-center text-slate-500">
                No Workspace Associated with Account
            </div>
        );
    }

    const [firmStats, userStats, firmFeed, userFeed] = await Promise.all([
        getPulseFirmStats(workspaceId),
        getPulseUserStats(workspaceId),
        getPulseFeedFirmwide(workspaceId),
        getPulseFeedUser(workspaceId),
    ]);

    const attentionCount = firmFeed.filter(i => i.severity === 'urgent').length;

    return (
        <PulseClient
            firmStats={firmStats}
            userStats={userStats}
            firmFeed={firmFeed}
            userFeed={userFeed}
            userName={session.user.name || ''}
            attentionCount={attentionCount}
        />
    );
}
