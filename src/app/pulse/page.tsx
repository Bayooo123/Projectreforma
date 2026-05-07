import { auth } from "@/auth";
import { redirect } from "next/navigation";
import {
    getPulseFirmStats,
    getPulseUserStats,
    getPulseFeedFirmwide,
    getPulseFeedUser,
    getMyBriefs,
} from '@/app/actions/pulse';
import { getPendingMatterQuestions } from '@/app/actions/matterQuestions';
import { getOpenAnomalies } from '@/app/actions/anomalies';
import { runAnomalyScan } from '@/lib/anomaly/detector';
import { getTodayWorkEntries } from '@/app/actions/work-entries';
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

    // Run scan first (duplicate-safe), then fetch results in parallel with the rest
    await runAnomalyScan(workspaceId).catch(e => console.error('[Pulse] anomaly scan failed:', e));

    const [firmStats, userStats, firmFeed, userFeed, pendingQuestions, anomalies, myBriefs, todayEntries] = await Promise.all([
        getPulseFirmStats(workspaceId),
        getPulseUserStats(workspaceId),
        getPulseFeedFirmwide(workspaceId),
        getPulseFeedUser(workspaceId),
        getPendingMatterQuestions(workspaceId).catch(e => { console.error('[Pulse] pendingQuestions failed:', e); return []; }),
        getOpenAnomalies(workspaceId).catch(e => { console.error('[Pulse] anomalies failed:', e); return []; }),
        getMyBriefs(workspaceId),
        getTodayWorkEntries(workspaceId).catch(e => { console.error('[Pulse] workEntries failed:', e); return []; }),
    ]);

    const attentionCount = (firmFeed ?? []).filter(i => i.severity === 'urgent').length;

    return (
        <PulseClient
            firmStats={firmStats}
            userStats={userStats}
            firmFeed={firmFeed}
            userFeed={userFeed}
            userName={session.user.name || ''}
            attentionCount={attentionCount}
            pendingQuestions={pendingQuestions}
            anomalies={anomalies}
            myBriefs={myBriefs}
            todayEntries={todayEntries}
            userId={session.user.id}
            workspaceId={workspaceId}
        />
    );
}
