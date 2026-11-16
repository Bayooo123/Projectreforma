import { redirect } from 'next/navigation';
import { getCurrentUserWithWorkspace } from '@/lib/workspace';
import {
    listBriefsWithStatus, listRunsAction, listOpenGapsAction, listInstructionsAction,
    getLedgerSummary, getKnowledgeStatusAction,
} from '@/app/actions/ai-native';
import AiNativeClient from './AiNativeClient';
import type { RunView } from './types';

export default async function AiNativePage() {
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

    const [briefs, runs, gaps, instructions, ledger, knowledge] = await Promise.all([
        listBriefsWithStatus(),
        listRunsAction(null),
        listOpenGapsAction(null),
        listInstructionsAction(null),
        getLedgerSummary(),
        getKnowledgeStatusAction(),
    ]);

    return (
        <AiNativeClient
            initialBriefs={briefs}
            initialRuns={runs as unknown as RunView[]}
            initialGaps={gaps}
            initialInstructions={instructions}
            initialLedger={ledger}
            initialKnowledge={knowledge}
        />
    );
}
