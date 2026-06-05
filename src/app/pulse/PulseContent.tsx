import {
    getPulseFeedFirmwide,
    getPulseFeedUser,
    getMyBriefs,
} from '@/app/actions/pulse';
import { getPendingMatterQuestions } from '@/app/actions/matterQuestions';
import { getOpenAnomalies } from '@/app/actions/anomalies';
import { getTodayWorkEntries } from '@/app/actions/work-entries';
import { PulseService } from '@/lib/services/pulse/pulse-service';
import PulseClient from './PulseClient';

interface PulseContentProps {
    workspaceId: string;
    userId: string;
    userName: string;
}

export default async function PulseContent({ workspaceId, userId, userName }: PulseContentProps) {
    const [firmStats, userStats, firmFeed, userFeed, pendingQuestions, anomalies, myBriefs, todayEntries] =
        await Promise.all([
            PulseService.getFirmStats(workspaceId),
            PulseService.getUserStats(workspaceId, userId),
            getPulseFeedFirmwide(workspaceId),
            getPulseFeedUser(workspaceId),
            getPendingMatterQuestions(workspaceId).catch(() => [] as any[]),
            getOpenAnomalies(workspaceId).catch(() => [] as any[]),
            getMyBriefs(workspaceId),
            getTodayWorkEntries(workspaceId).catch(() => [] as any[]),
        ]);

    const attentionCount = (firmFeed ?? []).filter(i => i.severity === 'urgent').length;

    return (
        <PulseClient
            firmStats={firmStats}
            userStats={userStats}
            firmFeed={firmFeed}
            userFeed={userFeed}
            userName={userName}
            attentionCount={attentionCount}
            pendingQuestions={pendingQuestions}
            anomalies={anomalies}
            myBriefs={myBriefs}
            todayEntries={todayEntries}
            userId={userId}
            workspaceId={workspaceId}
        />
    );
}
