import { redirect } from 'next/navigation';
import { after } from 'next/server';
import { getCurrentUserWithWorkspace } from '@/lib/workspace';
import { prisma } from '@/lib/prisma';
import {
    listBriefsWithStatus, listRunsAction, listOpenGapsAction, listInstructionsAction,
    getLedgerSummary, getKnowledgeStatusAction,
} from '@/app/actions/ai-native';
import { runKnowledgePass } from '@/lib/ai-native/knowledge-status';
import AiNativeClient from './AiNativeClient';
import type { RunView } from './types';
import type { PracticeFocus } from '@/app/actions/reforma-x';

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

    // Fire-and-forget: a real, bounded check (stale matters, unreviewed
    // drafts, missing next dates), run on each visit rather than on a
    // fabricated schedule. Never blocks the page — results appear on the
    // next load or "Run now" click, whichever comes first.
    const workspaceId = data.workspace.id;
    after(() => runKnowledgePass(workspaceId).catch(err => console.error('[ai-native] background knowledge pass failed:', err)));

    const [briefs, runs, gaps, instructions, ledger, knowledge, workspaceFocus] = await Promise.all([
        listBriefsWithStatus(),
        listRunsAction(null),
        listOpenGapsAction(null),
        listInstructionsAction(null),
        getLedgerSummary(),
        getKnowledgeStatusAction(),
        prisma.workspace.findUnique({ where: { id: data.workspace.id }, select: { practiceFocus: true } }),
    ]);

    return (
        <AiNativeClient
            initialBriefs={briefs}
            initialRuns={runs as unknown as RunView[]}
            initialGaps={gaps}
            initialInstructions={instructions}
            initialLedger={ledger}
            initialKnowledge={knowledge}
            practiceFocus={(workspaceFocus?.practiceFocus ?? null) as PracticeFocus | null}
        />
    );
}
